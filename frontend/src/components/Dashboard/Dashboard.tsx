/**
 * Dashboard Component
 *
 * Display overview statistics and recent activity
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { statsAPI } from '../../api/stats';
import type { OverviewStats, AreaStat, TagStat } from '../../api/stats';

export const Dashboard: React.FC = () => {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [areas, setAreas] = useState<AreaStat[]>([]);
  const [tags, setTags] = useState<TagStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [overviewRes, areasRes, tagsRes] = await Promise.all([
        statsAPI.getOverview(),
        statsAPI.getAreas(),
        statsAPI.getTags(10)
      ]);

      setOverview(overviewRes.data.stats);
      setAreas(areasRes.data.areas.slice(0, 5));
      setTags(tagsRes.data.tags);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div style={{ padding: '20px' }}>読み込み中...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>ダッシュボード</h1>

      {/* Overview Stats */}
      {overview && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div style={{ padding: '20px', backgroundColor: '#007bff', color: 'white', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>資源数</h3>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{overview.resource_count}</div>
          </div>
          <div style={{ padding: '20px', backgroundColor: '#28a745', color: 'white', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>フィードバック数</h3>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{overview.feedback_count}</div>
          </div>
          <div style={{ padding: '20px', backgroundColor: '#ffc107', color: 'white', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>ニーズ数</h3>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{overview.need_count}</div>
          </div>
          <div style={{ padding: '20px', backgroundColor: '#6c757d', color: 'white', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>ユーザー数</h3>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{overview.user_count}</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {/* Top Areas */}
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px', backgroundColor: 'white' }}>
          <h2 style={{ marginTop: 0 }}>エリア別資源数 (Top 5)</h2>
          <div>
            {areas.map((area) => (
              <Link
                key={area.area_id}
                to={`/resources?areaId=${area.area_id}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px',
                  borderBottom: '1px solid #eee',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'background-color 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span>{area.area_name}</span>
                <span style={{ fontWeight: 'bold', color: '#007bff' }}>
                  {area.resource_count} 資源
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Top Tags */}
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px', backgroundColor: 'white' }}>
          <h2 style={{ marginTop: 0 }}>人気のタグ (Top 10)</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {tags.map((tag) => (
              <Link
                key={tag.tag_name}
                to={`/resources?tags=${encodeURIComponent(tag.tag_name)}`}
                style={{
                  display: 'inline-block',
                  padding: '6px 12px',
                  backgroundColor: '#e9ecef',
                  borderRadius: '12px',
                  fontSize: '13px',
                  textDecoration: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#d0d4d8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#e9ecef';
                }}
              >
                {tag.tag_name} ({tag.usage_count})
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h2 style={{ marginTop: 0 }}>クイックリンク</h2>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <Link
            to="/resources"
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px'
            }}
          >
            資源を探す
          </Link>
          <Link
            to="/needs"
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px'
            }}
          >
            ニーズを見る
          </Link>
          <Link
            to="/needs/create"
            style={{
              padding: '10px 20px',
              backgroundColor: '#ffc107',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px'
            }}
          >
            ニーズを登録
          </Link>
        </div>
      </div>
    </div>
  );
};
