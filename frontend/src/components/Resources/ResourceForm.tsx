/**
 * Resource Form Component
 *
 * Form for creating and editing resources
 * Supports:
 * - Resource type selection (place, person, activity, information)
 * - Area selection (existing areas + new area creation)
 * - Tag selection (multiple tags with suggestions)
 * - Form validation
 * - Create/Update mode
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { resourcesAPI, type CreateResourceData } from '../../api/resources';
import { statsAPI, type AreaStat } from '../../api/stats';
import type { Resource } from '../../api/resources';

interface ResourceFormProps {
  resource?: Resource;
  mode: 'create' | 'edit';
  onSuccess?: (resource: Resource) => void;
  onCancel?: () => void;
}

interface TagInput {
  name: string;
  category: string;
}

const RESOURCE_TYPES = [
  { value: 'place', label: '場所' },
  { value: 'person', label: '人' },
  { value: 'activity', label: '活動' },
  { value: 'information', label: '情報' }
];

const TAG_CATEGORIES = [
  { value: 'atmosphere', label: '雰囲気' },
  { value: 'accessibility', label: 'アクセシビリティ' },
  { value: 'cost', label: '費用' },
  { value: 'support', label: '支援内容' },
  { value: 'other', label: 'その他' }
];

export const ResourceForm: React.FC<ResourceFormProps> = ({
  resource,
  mode,
  onSuccess,
  onCancel
}) => {
  const navigate = useNavigate();

  // Form fields
  const [name, setName] = useState(resource?.name || '');
  const [type, setType] = useState<string>(resource?.type || 'place');
  const [description, setDescription] = useState(resource?.description || '');
  const [address, setAddress] = useState(resource?.address || '');
  const [contact, setContact] = useState(resource?.contact || '');
  const [hours, setHours] = useState(resource?.hours || '');

  // Area selection
  const [areas, setAreas] = useState<AreaStat[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [newAreaName, setNewAreaName] = useState('');
  const [isCreatingNewArea, setIsCreatingNewArea] = useState(false);

  // Tag selection
  const [tags, setTags] = useState<TagInput[]>(resource?.tags || []);
  const [suggestedTags, setSuggestedTags] = useState<Array<{ name: string; category: string }>>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagCategory, setNewTagCategory] = useState('atmosphere');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load areas and suggested tags on mount
  useEffect(() => {
    loadFormData();
  }, []);

  const loadFormData = async () => {
    try {
      const [areasRes, tagsRes] = await Promise.all([
        statsAPI.getAreas(),
        resourcesAPI.getSuggestedTags(30)
      ]);

      setAreas(areasRes.data.areas);
      setSuggestedTags(tagsRes.data.tags);

      // Set default area if in edit mode
      if (resource && areasRes.data.areas.length > 0) {
        const resourceArea = areasRes.data.areas.find(
          (a: AreaStat) => a.area_name === resource.area
        );
        if (resourceArea) {
          setSelectedAreaId(resourceArea.area_id);
        }
      }
    } catch (err) {
      console.error('Failed to load form data:', err);
      setError('フォームデータの読み込みに失敗しました');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = '名前は必須です';
    }

    if (!type) {
      newErrors.type = 'タイプは必須です';
    }

    if (!isCreatingNewArea && !selectedAreaId) {
      newErrors.area = 'エリアを選択してください';
    }

    if (isCreatingNewArea && !newAreaName.trim()) {
      newErrors.newArea = '新しいエリア名を入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddTag = () => {
    if (!newTagName.trim()) return;

    // Check for duplicates
    if (tags.some(t => t.name === newTagName.trim())) {
      alert('このタグは既に追加されています');
      return;
    }

    setTags([...tags, { name: newTagName.trim(), category: newTagCategory }]);
    setNewTagName('');
  };

  const handleAddSuggestedTag = (tag: { name: string; category: string }) => {
    // Check for duplicates
    if (tags.some(t => t.name === tag.name)) {
      alert('このタグは既に追加されています');
      return;
    }

    setTags([...tags, tag]);
  };

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const resourceData: CreateResourceData = {
        name: name.trim(),
        type,
        areaId: isCreatingNewArea ? `area_new_${Date.now()}` : selectedAreaId,
        description: description.trim() || undefined,
        address: address.trim() || undefined,
        contact: contact.trim() || undefined,
        hours: hours.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined
      };

      // If creating new area, add area name to the data
      if (isCreatingNewArea) {
        // Note: Backend should handle new area creation
        // For now, we'll use a temporary ID format
        resourceData.areaId = newAreaName.trim();
      }

      const response = await resourcesAPI.create(resourceData);

      if (response.success) {
        if (onSuccess) {
          onSuccess(response.data.resource);
        } else {
          // Navigate to the new resource
          navigate(`/resources/${response.data.resource.id}`);
        }
      }
    } catch (err: any) {
      console.error('Failed to create resource:', err);
      setError(
        err.response?.data?.error?.message ||
        '資源の登録に失敗しました。もう一度お試しください。'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(-1);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h2>{mode === 'create' ? '新しい資源を登録' : '資源を編集'}</h2>

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '4px',
          marginBottom: '20px',
          color: '#c33'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Resource Name */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            名前 <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 静かなカフェ、相談できる先輩、フットサルの会"
            style={{
              width: '100%',
              padding: '10px',
              border: errors.name ? '2px solid #c33' : '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px'
            }}
          />
          {errors.name && <div style={{ color: '#c33', fontSize: '14px', marginTop: '4px' }}>{errors.name}</div>}
        </div>

        {/* Resource Type */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            タイプ <span style={{ color: 'red' }}>*</span>
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: errors.type ? '2px solid #c33' : '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px'
            }}
          >
            {RESOURCE_TYPES.map(rt => (
              <option key={rt.value} value={rt.value}>{rt.label}</option>
            ))}
          </select>
          {errors.type && <div style={{ color: '#c33', fontSize: '14px', marginTop: '4px' }}>{errors.type}</div>}
        </div>

        {/* Area Selection */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            エリア <span style={{ color: 'red' }}>*</span>
          </label>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                checked={!isCreatingNewArea}
                onChange={() => setIsCreatingNewArea(false)}
                style={{ marginRight: '8px' }}
              />
              既存のエリアから選択
            </label>
          </div>

          {!isCreatingNewArea && (
            <select
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: errors.area ? '2px solid #c33' : '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px',
                marginBottom: '10px'
              }}
            >
              <option value="">エリアを選択してください</option>
              {areas.map(area => (
                <option key={area.area_id} value={area.area_id}>
                  {area.area_name} ({area.resource_count}件)
                </option>
              ))}
            </select>
          )}
          {errors.area && !isCreatingNewArea && (
            <div style={{ color: '#c33', fontSize: '14px', marginTop: '4px' }}>{errors.area}</div>
          )}

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                checked={isCreatingNewArea}
                onChange={() => setIsCreatingNewArea(true)}
                style={{ marginRight: '8px' }}
              />
              新しいエリアを作成
            </label>
          </div>

          {isCreatingNewArea && (
            <>
              <input
                type="text"
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
                placeholder="例: 小倉北区、八幡東区"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: errors.newArea ? '2px solid #c33' : '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '16px'
                }}
              />
              {errors.newArea && (
                <div style={{ color: '#c33', fontSize: '14px', marginTop: '4px' }}>{errors.newArea}</div>
              )}
            </>
          )}
        </div>

        {/* Description */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            説明
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="この資源について詳しく説明してください"
            rows={4}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {/* Address */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            住所
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="例: 福岡県北九州市小倉北区..."
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px'
            }}
          />
        </div>

        {/* Contact */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            連絡先
          </label>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="例: 電話番号、メールアドレス、URL"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px'
            }}
          />
        </div>

        {/* Hours */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            営業時間・開催時間
          </label>
          <input
            type="text"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="例: 平日 10:00-18:00、毎週土曜日 14:00-16:00"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px'
            }}
          />
        </div>

        {/* Tags */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            タグ
          </label>

          {/* Current tags */}
          {tags.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              {tags.map((tag, index) => (
                <span
                  key={index}
                  style={{
                    display: 'inline-block',
                    padding: '4px 8px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    borderRadius: '4px',
                    marginRight: '8px',
                    marginBottom: '8px',
                    fontSize: '14px'
                  }}
                >
                  {tag.name} ({tag.category})
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(index)}
                    style={{
                      marginLeft: '8px',
                      background: 'none',
                      border: 'none',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '0'
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add new tag */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="タグ名"
              style={{
                flex: 1,
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
            />
            <select
              value={newTagCategory}
              onChange={(e) => setNewTagCategory(e.target.value)}
              style={{
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              {TAG_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddTag}
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              追加
            </button>
          </div>

          {/* Suggested tags */}
          {suggestedTags.length > 0 && (
            <div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                よく使われるタグ:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {suggestedTags.slice(0, 15).map((tag, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleAddSuggestedTag(tag)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#f0f0f0',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
          <button
            type="submit"
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: isLoading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? '登録中...' : mode === 'create' ? '登録する' : '更新する'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
};
