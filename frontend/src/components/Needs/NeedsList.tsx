/**
 * Needs List Component
 *
 * Display list of needs with filtering
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { needsAPI } from '../../api/needs';
import type { Need } from '../../api/needs';
import { useAuth } from '../../contexts/AuthContext';

export const NeedsList: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [needs, setNeeds] = useState<Need[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('open');

  useEffect(() => {
    loadNeeds();
  }, [statusFilter]);

  const loadNeeds = async () => {
    try {
      setIsLoading(true);
      const params = statusFilter ? { status: statusFilter } : {};
      const response = await needsAPI.getAll(params);
      setNeeds(response.data.needs);
    } catch (err: any) {
      setError('ニーズの読み込みに失敗しました');
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

  if (isLoading && needs.length === 0) {
    return <div style={{ padding: '20px' }}>読み込み中...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>ニーズ一覧</h1>
        {isAuthenticated && (
          <Link
            to="/needs/create"
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px'
            }}
          >
            ニーズを登録
          </Link>
        )}
      </div>

      {/* Status Filter */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <label style={{ marginRight: '10px' }}>ステータス:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '5px', fontSize: '14px' }}
        >
          <option value="">すべて</option>
          <option value="open">募集中</option>
          <option value="matched">マッチング済み</option>
          <option value="closed">終了</option>
        </select>
      </div>

      {error && (
        <div style={{ color: 'red', marginBottom: '15px' }}>
          {error}
        </div>
      )}

      {/* Needs List */}
      <div style={{ display: 'grid', gap: '15px' }}>
        {needs.map((need) => (
          <Link
            key={need.id}
            to={`/needs/${need.id}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '20px',
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                <h3 style={{ margin: 0 }}>{need.title}</h3>
                <span
                  style={{
                    padding: '4px 12px',
                    backgroundColor: getStatusColor(need.status),
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '12px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {getStatusLabel(need.status)}
                </span>
              </div>

              <p style={{ marginBottom: '10px', color: '#666' }}>
                {need.description.length > 150
                  ? `${need.description.substring(0, 150)}...`
                  : need.description}
              </p>

              <div style={{ fontSize: '12px', color: '#999', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <span>対象: {need.target}</span>
                <span>目的: {need.purpose}</span>
                {need.area && <span>エリア: {need.area}</span>}
                <span>閲覧数: {need.view_count}</span>
                <span>登録日: {new Date(need.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {needs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          {statusFilter ? `「${getStatusLabel(statusFilter)}」のニーズが見つかりませんでした` : 'ニーズが見つかりませんでした'}
        </div>
      )}
    </div>
  );
};
