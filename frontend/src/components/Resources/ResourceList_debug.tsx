/**
 * Resource List Component (Debug Version)
 *
 * Display list of resources with search and filter
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { resourcesAPI } from '../../api/resources';
import type { Resource, SearchParams } from '../../api/resources';

export const ResourceList: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Search parameters
  const [keyword, setKeyword] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [sortBy, setSortBy] = useState<'feedback_count' | 'created_at' | 'view_count'>('created_at');

  console.log('🔄 Component rendered', {
    keyword,
    searchKeyword,
    resourcesCount: resources.length,
    selectedType,
    sortBy
  });

  const loadResources = useCallback(async () => {
    console.log('📡 loadResources called with:', { searchKeyword, sortBy });
    
    try {
      setIsLoading(true);
      const params: SearchParams = {
        keyword: searchKeyword || undefined,
        sortBy,
        limit: 50
      };

      console.log('🚀 Sending API request with params:', params);
      const response = await resourcesAPI.search(params);
      console.log('📥 API response received:', {
        success: response.success,
        resourceCount: response.data?.resources?.length,
        fullResponse: response
      });

      setResources(response.data.resources);
      console.log('✅ Resources updated:', response.data.resources.length);
    } catch (err: any) {
      setError('資源の読み込みに失敗しました');
      console.error('❌ Error loading resources:', err);
    } finally {
      setIsLoading(false);
    }
  }, [sortBy, searchKeyword]);

  useEffect(() => {
    console.log('⚡ useEffect triggered, calling loadResources');
    loadResources();
  }, [loadResources]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔍 Search button clicked', {
      currentKeyword: keyword,
      willSetSearchKeywordTo: keyword
    });
    setSearchKeyword(keyword);
    console.log('✨ searchKeyword state update dispatched');
  };

  const handleClearSearch = () => {
    console.log('🧹 Clear button clicked');
    setKeyword('');
    setSearchKeyword('');
    setSelectedType('');
  };

  const filteredResources = selectedType
    ? resources.filter((r) => {
        const resourceType = typeof r.type === 'object' ? r.type.name : r.type;
        return resourceType === selectedType;
      })
    : resources;

  console.log('📊 Filtered resources:', {
    total: resources.length,
    filtered: filteredResources.length,
    selectedType
  });

  if (isLoading && resources.length === 0) {
    return <div style={{ padding: '20px' }}>読み込み中...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>資源一覧</h1>

      {/* Debug Info */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        backgroundColor: '#fff3cd', 
        border: '1px solid #ffc107',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace'
      }}>
        <strong>🐛 デバッグ情報:</strong><br/>
        入力キーワード: "{keyword}"<br/>
        検索キーワード: "{searchKeyword}"<br/>
        全資源数: {resources.length}<br/>
        表示資源数: {filteredResources.length}<br/>
        選択種類: {selectedType || '(なし)'}<br/>
        <em>※ ブラウザのコンソール（F12）で詳細なログを確認してください</em>
      </div>

      {/* Search and Filter Section */}
      <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <form onSubmit={handleSearch} style={{ marginBottom: '15px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="キーワード検索..."
              value={keyword}
              onChange={(e) => {
                console.log('⌨️ Input changed:', e.target.value);
                setKeyword(e.target.value);
              }}
              style={{ flex: 1, padding: '8px', fontSize: '14px' }}
            />
            <button
              type="submit"
              style={{
                padding: '8px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              検索
            </button>
            {(searchKeyword || keyword || selectedType) && (
              <button
                type="button"
                onClick={handleClearSearch}
                style={{
                  padding: '8px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                クリア
              </button>
            )}
          </div>
        </form>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div>
            <label style={{ marginRight: '5px' }}>種類:</label>
            <select
              value={selectedType}
              onChange={(e) => {
                console.log('📑 Type filter changed:', e.target.value);
                setSelectedType(e.target.value);
              }}
              style={{ padding: '5px', fontSize: '14px' }}
            >
              <option value="">すべて</option>
              <option value="place">場所</option>
              <option value="person">人</option>
              <option value="activity">活動</option>
              <option value="information">情報</option>
            </select>
          </div>

          <div>
            <label style={{ marginRight: '5px' }}>並び順:</label>
            <select
              value={sortBy}
              onChange={(e) => {
                console.log('🔀 Sort order changed:', e.target.value);
                setSortBy(e.target.value as any);
              }}
              style={{ padding: '5px', fontSize: '14px' }}
            >
              <option value="created_at">登録日順</option>
              <option value="feedback_count">フィードバック数順</option>
              <option value="view_count">閲覧数順</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ color: 'red', marginBottom: '15px' }}>
          {error}
        </div>
      )}

      {/* Resource List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {filteredResources.map((resource) => (
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
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                <span style={{ marginRight: '10px' }}>
                  種類: {resource.type?.name || resource.type || '不明'}
                </span>
                {resource.area && <span>エリア: {typeof resource.area === 'object' ? resource.area.name : resource.area}</span>}
              </div>
              {resource.description && (
                <p style={{ fontSize: '14px', color: '#333', marginBottom: '10px' }}>
                  {resource.description.length > 100
                    ? `${resource.description.substring(0, 100)}...`
                    : resource.description}
                </p>
              )}
              <div style={{ fontSize: '12px', color: '#999', display: 'flex', gap: '15px' }}>
                <span>👍 {resource.feedback_count}</span>
                <span>👁️ {resource.view_count}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredResources.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          資源が見つかりませんでした
        </div>
      )}
    </div>
  );
};
