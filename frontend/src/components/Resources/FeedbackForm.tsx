/**
 * Feedback Form Component
 *
 * Form for posting feedback on a resource
 * Integrated into ResourceDetail component
 */

import React, { useState } from 'react';
import { feedbackAPI, type CreateFeedbackData } from '../../api/feedback';

interface FeedbackFormProps {
  resourceId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({
  resourceId,
  onSuccess,
  onCancel
}) => {
  const [content, setContent] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!content.trim()) {
      newErrors.content = 'フィードバック内容は必須です';
    }

    if (content.trim().length < 10) {
      newErrors.content = 'フィードバックは10文字以上で入力してください';
    }

    if (!visitDate) {
      newErrors.visitDate = '訪問日は必須です';
    }

    // Check if visit date is in the future
    if (visitDate) {
      const selectedDate = new Date(visitDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate > today) {
        newErrors.visitDate = '未来の日付は選択できません';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const feedbackData: CreateFeedbackData = {
        content: content.trim(),
        visit_date: visitDate
      };

      await feedbackAPI.create(resourceId, feedbackData);

      // Reset form
      setContent('');
      setVisitDate('');
      setErrors({});

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Failed to submit feedback:', err);
      setError(
        err.response?.data?.error?.message ||
        'フィードバックの投稿に失敗しました。もう一度お試しください。'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setContent('');
    setVisitDate('');
    setErrors({});
    setError('');

    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      padding: '20px',
      borderRadius: '8px',
      border: '1px solid #dee2e6',
      marginTop: '20px'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '15px' }}>フィードバックを投稿</h3>

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '4px',
          marginBottom: '15px',
          color: '#c33'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Feedback Content */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
            フィードバック内容 <span style={{ color: 'red' }}>*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="実際に利用した感想や、役立った情報を共有してください。&#10;例: 静かな環境で、スタッフの方が親切でした。車椅子でもアクセスしやすかったです。"
            rows={5}
            style={{
              width: '100%',
              padding: '10px',
              border: errors.content ? '2px solid #c33' : '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
          {errors.content && (
            <div style={{ color: '#c33', fontSize: '13px', marginTop: '4px' }}>
              {errors.content}
            </div>
          )}
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            {content.length} / 最低10文字
          </div>
        </div>

        {/* Visit Date */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
            訪問日 <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="date"
            value={visitDate}
            onChange={(e) => setVisitDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            style={{
              padding: '10px',
              border: errors.visitDate ? '2px solid #c33' : '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
          {errors.visitDate && (
            <div style={{ color: '#c33', fontSize: '13px', marginTop: '4px' }}>
              {errors.visitDate}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div style={{
          padding: '12px',
          backgroundColor: '#e7f3ff',
          border: '1px solid #b3d9ff',
          borderRadius: '4px',
          marginBottom: '15px',
          fontSize: '13px',
          color: '#004085'
        }}>
          💡 <strong>フィードバックのポイント</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li>実際に体験した具体的な内容を書きましょう</li>
            <li>他の人が参考にできる情報を共有しましょう</li>
            <li>良かった点だけでなく、注意点も書くと役立ちます</li>
          </ul>
        </div>

        {/* Submit Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '10px 20px',
              backgroundColor: isSubmitting ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? '投稿中...' : '投稿する'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            style={{
              padding: '10px 20px',
              backgroundColor: 'white',
              color: '#666',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
};
