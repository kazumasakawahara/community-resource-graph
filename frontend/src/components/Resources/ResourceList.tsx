/**
 * Resource List Component
 *
 * Display list of resources with search and filter
 */

import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { resourcesAPI } from '../../api/resources';
import type { Resource, SearchParams } from '../../api/resources';
import { statsAPI } from '../../api/stats';
import type { AreaStat, TagStat } from '../../api/stats';
import { useAuth } from '../../contexts/AuthContext';

export const ResourceList: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Available filter options
  const [areas, setAreas] = useState<AreaStat[]>([]);
  const [tags, setTags] = useState<TagStat[]>([]);

  // Search parameters
  const [keyword, setKeyword] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [sortBy, setSortBy] = useState<'feedback_count' | 'created_at' | 'view_count'>('created_at');

  // Semantic search
  const [useSemanticSearch, setUseSemanticSearch] = useState(false);
  const [semanticQuery, setSemanticQuery] = useState('');

  // Load filter options on mount
  useEffect(() => {
    loadFilterOptions();
  }, []);

  // Initial load - handle URL parameters
  useEffect(() => {
    loadInitialResources();
  }, [searchParams]);

  const loadFilterOptions = async () => {
    try {
      const [areasRes, tagsRes] = await Promise.all([
        statsAPI.getAreas(),
        statsAPI.getTags(50)
      ]);
      setAreas(areasRes.data.areas);
      setTags(tagsRes.data.tags);
    } catch (err) {
      console.error('Failed to load filter options:', err);
    }
  };

  const loadInitialResources = async () => {
    try {
      setIsLoading(true);

      // Read URL parameters
      const areaId = searchParams.get('areaId');
      const tags = searchParams.get('tags');

      const params: SearchParams = {
        sortBy: 'created_at',
        limit: 100
      };

      // Add URL filters if present
      if (areaId) {
        params.areaId = areaId;
        console.log('🗺️ Filtering by area:', areaId);
      }

      if (tags) {
        params.tags = tags;
        console.log('🏷️ Filtering by tag:', tags);
      }

      const response = await resourcesAPI.search(params);
      setResources(response.data.resources);

      console.log(`✅ Loaded ${response.data.resources.length} resources with filters:`, { areaId, tags });
    } catch (err: any) {
      setError('資源の読み込みに失敗しました');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔍 Search button clicked, filters:', { keyword, type: selectedType, area: selectedArea, tag: selectedTag });

    try {
      setIsLoading(true);
      const params: SearchParams = {
        keyword: keyword || undefined,
        type: selectedType || undefined,
        areaId: selectedArea || undefined,
        tags: selectedTag || undefined,
        sortBy,
        limit: 100
      };

      console.log('📡 Sending API request with params:', params);
      const response = await resourcesAPI.search(params);
      console.log('📥 API response received:', {
        success: response.data ? true : false,
        resourceCount: response.data?.resources?.length
      });

      setResources(response.data.resources);
      console.log('✅ Resources updated');
    } catch (err: any) {
      setError('検索に失敗しました');
      console.error('❌ Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSearch = () => {
    setKeyword('');
    setSelectedType('');
    setSelectedArea('');
    setSelectedTag('');
    setSemanticQuery('');
    setUseSemanticSearch(false);
    loadInitialResources();
  };

  const handleSemanticSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔍 Semantic search button clicked, query:', semanticQuery);

    if (!semanticQuery.trim()) {
      setError('検索クエリを入力してください');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      console.log('📡 Sending semantic search API request');
      const response = await resourcesAPI.semanticSearch(semanticQuery, 5, 0.65);
      console.log('📥 Semantic search response:', response);

      setResources(response.data.resources);
      console.log('✅ Resources updated with semantic search results');
    } catch (err: any) {
      setError('セマンティック検索に失敗しました');
      console.error('❌ Semantic search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Highlight matching text in search results
  const highlightText = (text: string, searchKeyword: string) => {
    if (!searchKeyword || !text) return text;

    const regex = new RegExp(`(${searchKeyword})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} style={{ backgroundColor: '#fff3cd', padding: '2px 4px', borderRadius: '2px' }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  if (isLoading && resources.length === 0) {
    return <div style={{ padding: '20px' }}>読み込み中...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>資源一覧 [更新版 v2.0]</h1>
        {isAuthenticated && (
          <button
            onClick={() => navigate('/resources/new')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '18px' }}>+</span>
            新しい資源を登録
          </button>
        )}
      </div>

      {/* Search Result Count and Active Filters */}
      {!isLoading && (
        <div>
          <div style={{ marginBottom: '15px', fontSize: '20px', fontWeight: 'bold', color: '#007bff', padding: '10px', backgroundColor: '#e7f3ff', borderRadius: '4px' }}>
            🔍 検索結果: {resources.length} 件
          </div>
          {(keyword || selectedType || selectedArea || selectedTag) && (
            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <strong>絞り込み条件:</strong>
              <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {keyword && (
                  <span style={{ padding: '4px 10px', backgroundColor: '#007bff', color: 'white', borderRadius: '12px', fontSize: '13px' }}>
                    キーワード: {keyword}
                  </span>
                )}
                {selectedType && (
                  <span style={{ padding: '4px 10px', backgroundColor: '#28a745', color: 'white', borderRadius: '12px', fontSize: '13px' }}>
                    種類: {selectedType === 'place' ? '場所' : selectedType === 'person' ? '人' : selectedType === 'activity' ? '活動' : '情報'}
                  </span>
                )}
                {selectedArea && (
                  <span style={{ padding: '4px 10px', backgroundColor: '#ffc107', color: 'white', borderRadius: '12px', fontSize: '13px' }}>
                    エリア: {areas.find(a => a.area_id === selectedArea)?.area_name || selectedArea}
                  </span>
                )}
                {selectedTag && (
                  <span style={{ padding: '4px 10px', backgroundColor: '#6c757d', color: 'white', borderRadius: '12px', fontSize: '13px' }}>
                    タグ: {selectedTag}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search Mode Toggle */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>検索モード:</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="radio"
            checked={!useSemanticSearch}
            onChange={() => setUseSemanticSearch(false)}
          />
          <span style={{ color: '#333' }}>通常検索</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="radio"
            checked={useSemanticSearch}
            onChange={() => setUseSemanticSearch(true)}
          />
          <span style={{ color: '#333' }}>🔍 セマンティック検索 (意味検索)</span>
        </label>
      </div>

      {/* Semantic Search Section */}
      {useSemanticSearch && (
        <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
          <div style={{ marginBottom: '10px', fontSize: '13px', color: '#856404' }}>
            💡 セマンティック検索では、キーワードの意味に基づいて関連する資源を探します。例: "仲間と話したい"、"気軽に参加できる活動"
          </div>
          <form onSubmit={handleSemanticSearch}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="探したい内容を自然な言葉で入力..."
                value={semanticQuery}
                onChange={(e) => setSemanticQuery(e.target.value)}
                style={{ flex: 1, padding: '10px', fontSize: '14px', borderRadius: '4px', border: '2px solid #ffc107' }}
              />
              <button
                type="submit"
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#ffc107',
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                🔍 検索
              </button>
              {semanticQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  style={{
                    padding: '10px 20px',
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
        </div>
      )}

      {/* Standard Search and Filter Section */}
      {!useSemanticSearch && (
        <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <form onSubmit={handleSearch} style={{ marginBottom: '15px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="キーワード検索..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
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
            {(keyword || selectedType || selectedArea || selectedTag) && (
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
                すべてクリア
              </button>
            )}
          </div>
        </form>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold' }}>種類:</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={{ width: '100%', padding: '6px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="">すべて</option>
              <option value="place">場所</option>
              <option value="person">人</option>
              <option value="activity">活動</option>
              <option value="information">情報</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold' }}>エリア:</label>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              style={{ width: '100%', padding: '6px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="">すべて</option>
              {areas.map((area) => (
                <option key={area.area_id} value={area.area_id}>
                  {area.area_name} ({area.resource_count})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold' }}>タグ:</label>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              style={{ width: '100%', padding: '6px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="">すべて</option>
              {tags.map((tag) => (
                <option key={tag.tag_name} value={tag.tag_name}>
                  {tag.tag_name} ({tag.usage_count})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold' }}>並び順:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{ width: '100%', padding: '6px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="created_at">登録日順</option>
              <option value="feedback_count">フィードバック数順</option>
              <option value="view_count">閲覧数順</option>
            </select>
          </div>
        </div>
        </div>
      )}

      {error && (
        <div style={{ color: 'red', marginBottom: '15px' }}>
          {error}
        </div>
      )}

      {/* Resource List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {resources.map((resource) => (
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
              <h3 style={{ marginTop: 0, marginBottom: '10px', color: '#333' }}>{highlightText(resource.name, keyword)}</h3>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                <span style={{ marginRight: '10px' }}>
                  種類: {resource.type?.name || resource.type || '不明'}
                </span>
                {resource.area && <span>エリア: {typeof resource.area === 'object' ? resource.area.name : resource.area}</span>}
              </div>
              {resource.description && (
                <p style={{ fontSize: '14px', color: '#333', marginBottom: '10px' }}>
                  {resource.description.length > 100
                    ? highlightText(resource.description.substring(0, 100) + '...', keyword)
                    : highlightText(resource.description, keyword)}
                </p>
              )}
              <div style={{ fontSize: '12px', color: '#999', display: 'flex', gap: '15px', alignItems: 'center' }}>
                <span>👍 {resource.feedback_count}</span>
                <span>👁️ {resource.view_count}</span>
                {useSemanticSearch && resource.similarity !== undefined && (
                  <span style={{
                    marginLeft: 'auto',
                    padding: '4px 8px',
                    backgroundColor: '#ffc107',
                    color: '#000',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    fontSize: '11px'
                  }}>
                    類似度: {(resource.similarity * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {resources.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          資源が見つかりませんでした
        </div>
      )}
    </div>
  );
};
