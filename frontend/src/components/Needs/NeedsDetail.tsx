/**
 * Needs Detail Component
 *
 * Display detailed information about a need
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { needsAPI } from '../../api/needs';
import type { Need } from '../../api/needs';

export const NeedsDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [need, setNeed] = useState<Need | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      loadNeed();
    }
  }, [id]);

  const loadNeed = async () => {
    try {
      setIsLoading(true);
      const response = await needsAPI.getById(id!);
      setNeed(response.data.need);
    } catch (err: any) {
      setError('ニーズ情報の読み込みに失敗しました');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open':
        return '募集中';
      case 'matched':
        return 'マッチング済み';
      case 'closed':
        return '終了';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return '#28a745';
      case 'matched':
        return '#007bff';
      case 'closed':
        return '#6c757d';
      default:
        return '#999';
    }
  };

  if (isLoading) {
    return <div style={{ padding: '20px' }}>読み込み中...</div>;
  }

  if (error || !need) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ color: 'red' }}>{error || 'ニーズが見つかりませんでした'}</div>
        <Link to="/needs">ニーズ一覧に戻る</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Need Info */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ marginBottom: '15px' }}>
          <Link to="/needs" style={{ color: '#007bff', textDecoration: 'none' }}>
            ← ニーズ一覧に戻る
          </Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
          <h1 style={{ margin: 0 }}>{need.title}</h1>
          <span
            style={{
              padding: '8px 16px',
              backgroundColor: getStatusColor(need.status),
              color: 'white',
              borderRadius: '16px',
              fontSize: '14px',
              whiteSpace: 'nowrap'
            }}
          >
            {getStatusLabel(need.status)}
          </span>
        </div>

        <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
          <span style={{ marginRight: '15px' }}>対象: {need.target}</span>
          <span style={{ marginRight: '15px' }}>目的: {need.purpose}</span>
          {need.area && <span style={{ marginRight: '15px' }}>エリア: {typeof need.area === 'object' ? need.area.name : need.area}</span>}
          <span>閲覧数: {need.view_count}</span>
        </div>

        <p style={{ lineHeight: 1.6, marginBottom: '20px' }}>{need.description}</p>

        {need.deadline && (
          <div style={{ marginTop: '10px' }}>
            <strong>期限:</strong> {new Date(need.deadline).toLocaleDateString()}
          </div>
        )}

        {need.tags && need.tags.length > 0 && (
          <div style={{ marginTop: '15px' }}>
            {need.tags.map((tag, index) => (
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
                {typeof tag === 'object' ? tag.name : tag}
              </span>
            ))}
          </div>
        )}

        <div style={{ marginTop: '20px' }}>
          <div style={{ fontSize: '12px', color: '#999' }}>
            登録日: {new Date(need.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Matched Resources Section */}
      {need.matched_resources && need.matched_resources.length > 0 && (
        <div style={{ borderTop: '2px solid #ddd', paddingTop: '30px' }}>
          <h2>マッチした資源 ({need.matched_resources.length})</h2>
          <div style={{ display: 'grid', gap: '15px' }}>
            {need.matched_resources.map((resource: any) => (
              <Link
                key={resource.id}
                to={`/resources/${resource.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '15px',
                    backgroundColor: 'white',
                    transition: 'box-shadow 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <h3 style={{ marginTop: 0, marginBottom: '10px' }}>{resource.name}</h3>
                  {resource.description && (
                    <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                      {resource.description.length > 100
                        ? `${resource.description.substring(0, 100)}...`
                        : resource.description}
                    </p>
                  )}
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    種類: {typeof resource.type === 'object' ? resource.type.name : resource.type}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
