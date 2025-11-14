/**
 * Resource Detail Component
 *
 * Display detailed information about a resource
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { resourcesAPI } from '../../api/resources';
import type { Resource } from '../../api/resources';
import { feedbackAPI } from '../../api/feedback';
import type { Feedback } from '../../api/feedback';
import { useAuth } from '../../contexts/AuthContext';
import { FeedbackForm } from './FeedbackForm';

export const ResourceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const [resource, setResource] = useState<Resource | null>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [relatedResources, setRelatedResources] = useState<Resource[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Feedback form state
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  useEffect(() => {
    if (id) {
      loadResourceAndFeedback();
    }
  }, [id]);

  const loadResourceAndFeedback = async () => {
    try {
      setIsLoading(true);
      const [resourceRes, feedbackRes, connectionsRes, recommendationsRes] = await Promise.all([
        resourcesAPI.getById(id!),
        feedbackAPI.getByResource(id!),
        resourcesAPI.getConnections(id!),
        resourcesAPI.getRecommendations(id!, 5, 0.6).catch(() => ({ data: { recommendations: [] } }))
      ]);

      setResource(resourceRes.data.resource);
      setFeedbacks(feedbackRes.data.feedbacks);
      setRelatedResources(connectionsRes.data.connections || []);
      setRecommendations(recommendationsRes.data.recommendations || []);

      console.log('🔗 関連資源を取得:', connectionsRes.data.connections?.length || 0, '件');
      console.log('💡 レコメンデーションを取得:', recommendationsRes.data.recommendations?.length || 0, '件');
    } catch (err: any) {
      setError('資源情報の読み込みに失敗しました');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedbackSuccess = async () => {
    if (!id) return;

    try {
      // Reload feedbacks and resource data
      const feedbackRes = await feedbackAPI.getByResource(id);
      setFeedbacks(feedbackRes.data.feedbacks);

      // Hide form
      setShowFeedbackForm(false);
    } catch (err: any) {
      console.error('Failed to reload feedbacks:', err);
    }
  };

  const handleMarkHelpful = async (feedbackId: string) => {
    try {
      await feedbackAPI.markHelpful(feedbackId);
      // Reload feedbacks
      if (id) {
        const feedbackRes = await feedbackAPI.getByResource(id);
        setFeedbacks(feedbackRes.data.feedbacks);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  if (isLoading) {
    return <div style={{ padding: '20px' }}>読み込み中...</div>;
  }

  if (error || !resource) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ color: 'red' }}>{error || '資源が見つかりませんでした'}</div>
        <Link to="/resources">資源一覧に戻る</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Breadcrumbs */}
      <nav style={{ marginBottom: '20px', fontSize: '14px', color: '#666' }}>
        <Link to="/" style={{ color: '#007bff', textDecoration: 'none' }}>
          ホーム
        </Link>
        <span style={{ margin: '0 8px' }}>›</span>
        <Link to="/resources" style={{ color: '#007bff', textDecoration: 'none' }}>
          資源一覧
        </Link>
        <span style={{ margin: '0 8px' }}>›</span>
        <span style={{ color: '#333' }}>{resource.name}</span>
      </nav>

      {/* Resource Info */}
      <div style={{ marginBottom: '30px' }}>
        <h1>{resource.name}</h1>

        <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
          <span style={{ marginRight: '15px' }}>
            種類: {typeof resource.type === 'object' ? resource.type.name : resource.type === 'place' ? '場所' : resource.type === 'person' ? '人' : resource.type === 'activity' ? '活動' : '情報'}
          </span>
          {resource.area && <span style={{ marginRight: '15px' }}>エリア: {typeof resource.area === 'object' ? resource.area.name : resource.area}</span>}
          <span style={{ marginRight: '15px' }}>閲覧数: {resource.view_count}</span>
          <span>フィードバック数: {resource.feedback_count}</span>
        </div>

        {resource.description && (
          <p style={{ lineHeight: 1.6 }}>{resource.description}</p>
        )}

        {resource.address && (
          <div style={{ marginTop: '10px' }}>
            <strong>住所:</strong> {resource.address}
          </div>
        )}

        {resource.contact && (
          <div style={{ marginTop: '10px' }}>
            <strong>連絡先:</strong> {resource.contact}
          </div>
        )}

        {resource.hours && (
          <div style={{ marginTop: '10px' }}>
            <strong>営業時間:</strong> {resource.hours}
          </div>
        )}

        {resource.tags && resource.tags.length > 0 && (
          <div style={{ marginTop: '15px' }}>
            {resource.tags.map((tag, index) => (
              <span
                key={index}
                style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  marginRight: '8px',
                  marginBottom: '8px',
                  backgroundColor: '#e9ecef',
                  borderRadius: '12px',
                  fontSize: '12px'
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        <div style={{ marginTop: '20px' }}>
          <Link
            to={`/resources/${id}/network`}
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px'
            }}
          >
            ネットワーク表示
          </Link>
        </div>
      </div>

      {/* Recommendations Section (AI-based) */}
      {recommendations.length > 0 && (
        <div style={{ borderTop: '2px solid #ddd', paddingTop: '30px', marginBottom: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <h2>おすすめの資源 ({recommendations.length})</h2>
            <span style={{ fontSize: '13px', color: '#856404', backgroundColor: '#fff3cd', padding: '4px 10px', borderRadius: '12px' }}>
              💡 AIベースのレコメンデーション
            </span>
          </div>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
            この資源と似た内容や関連性の高い資源を、AIが選んでいます。
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
            {recommendations.map((rec) => (
              <Link
                key={rec.id}
                to={`/resources/${rec.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  style={{
                    border: '2px solid #ffc107',
                    borderRadius: '8px',
                    padding: '15px',
                    backgroundColor: '#fffbf0',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    height: '100%',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 6px 12px rgba(255, 193, 7, 0.3)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    padding: '4px 8px',
                    backgroundColor: '#ffc107',
                    color: '#000',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    fontSize: '11px'
                  }}>
                    類似度: {(rec.similarity * 100).toFixed(0)}%
                  </div>
                  <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '16px', paddingRight: '60px' }}>
                    {rec.name}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                    種類: {typeof rec.type === 'object' && rec.type ? rec.type.name : typeof rec.type === 'string' ? (rec.type === 'place' ? '場所' : rec.type === 'person' ? '人' : rec.type === 'activity' ? '活動' : rec.type === 'information' ? '情報' : rec.type) : '不明'}
                  </div>
                  {rec.description && (
                    <p style={{ fontSize: '13px', color: '#333', marginBottom: '8px', lineHeight: 1.4 }}>
                      {rec.description.length > 80
                        ? `${rec.description.substring(0, 80)}...`
                        : rec.description}
                    </p>
                  )}
                  <div style={{ fontSize: '12px', color: '#999', display: 'flex', gap: '10px' }}>
                    <span>👍 {rec.feedback_count}</span>
                    <span>👁️ {rec.view_count}</span>
                    {rec.is_connected && (
                      <span style={{ marginLeft: 'auto', color: '#28a745', fontWeight: 'bold' }}>
                        🔗 既に繋がっています
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Related Resources Section */}
      {relatedResources.length > 0 && (
        <div style={{ borderTop: '2px solid #ddd', paddingTop: '30px', marginBottom: '30px' }}>
          <h2>関連する資源 ({relatedResources.length})</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px', marginTop: '20px' }}>
            {relatedResources.map((related) => (
              <Link
                key={related.id}
                to={`/resources/${related.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '15px',
                    backgroundColor: 'white',
                    transition: 'box-shadow 0.2s',
                    cursor: 'pointer',
                    height: '100%'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '16px' }}>
                    {related.name}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                    種類: {typeof related.type === 'object' ? related.type.name : related.type === 'place' ? '場所' : related.type === 'person' ? '人' : related.type === 'activity' ? '活動' : '情報'}
                  </div>
                  {related.description && (
                    <p style={{ fontSize: '13px', color: '#333', marginBottom: '8px', lineHeight: 1.4 }}>
                      {related.description.length > 80
                        ? `${related.description.substring(0, 80)}...`
                        : related.description}
                    </p>
                  )}
                  <div style={{ fontSize: '12px', color: '#999', display: 'flex', gap: '10px' }}>
                    <span>👍 {related.feedback_count}</span>
                    <span>👁️ {related.view_count}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Feedback Section */}
      <div style={{ borderTop: '2px solid #ddd', paddingTop: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>フィードバック ({feedbacks.length})</h2>
          {isAuthenticated && !showFeedbackForm && (
            <button
              onClick={() => setShowFeedbackForm(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              フィードバックを投稿
            </button>
          )}
        </div>

        {/* Feedback Form */}
        {showFeedbackForm && id && (
          <FeedbackForm
            resourceId={id}
            onSuccess={handleFeedbackSuccess}
            onCancel={() => setShowFeedbackForm(false)}
          />
        )}

        {/* Feedback List */}
        {feedbacks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            まだフィードバックがありません
          </div>
        ) : (
          <div>
            {feedbacks.map((feedback) => (
              <div
                key={feedback.id}
                style={{
                  marginBottom: '20px',
                  padding: '15px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: 'white'
                }}
              >
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                  <strong>{feedback.author_name}</strong> - 訪問日: {typeof feedback.visit_date === 'string' ? feedback.visit_date : `${feedback.visit_date.year.low}-${String(feedback.visit_date.month.low).padStart(2, '0')}-${String(feedback.visit_date.day.low).padStart(2, '0')}`}
                </div>
                <p style={{ marginBottom: '10px' }}>{feedback.content}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <button
                    onClick={() => handleMarkHelpful(feedback.id)}
                    style={{
                      padding: '4px 12px',
                      backgroundColor: '#e9ecef',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    👍 役に立った ({feedback.helpful_count})
                  </button>
                  <span style={{ fontSize: '12px', color: '#999' }}>
                    {new Date(feedback.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
