/**
 * Network Graph Component
 *
 * Visualize ego network using neovis.js
 */

import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { resourcesAPI } from '../../api/resources';

// Note: In a production app, you would import neovis.js properly
// For this implementation, we'll create a simple D3-like visualization
// or use neovis.js with proper TypeScript declarations

export const NetworkGraph: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [depth, setDepth] = useState(2);
  const [networkData, setNetworkData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      loadNetwork();
    }
  }, [id, depth]);

  const loadNetwork = async () => {
    try {
      setIsLoading(true);
      const response = await resourcesAPI.getNetwork(id!, depth);
      setNetworkData(response.data.network);
    } catch (err: any) {
      setError('ネットワークの読み込みに失敗しました');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (networkData && canvasRef.current) {
      renderNetwork();
    }
  }, [networkData]);

  const renderNetwork = () => {
    if (!canvasRef.current || !networkData) return;

    // Clear previous content
    canvasRef.current.innerHTML = '';

    // Create a simple SVG visualization
    const width = canvasRef.current.clientWidth;
    const height = 600;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.style.border = '1px solid #ddd';
    svg.style.backgroundColor = '#f9f9f9';

    // Simple force-directed layout (basic implementation)
    const allNodes = [networkData.center, ...networkData.nodes];
    const nodePositions = new Map();

    // Center node in the middle
    nodePositions.set(networkData.center.id, {
      x: width / 2,
      y: height / 2,
      ...networkData.center
    });

    // Arrange other nodes in a circle around center
    const radius = Math.min(width, height) / 3;
    networkData.nodes.forEach((node: any, index: number) => {
      const angle = (2 * Math.PI * index) / networkData.nodes.length;
      nodePositions.set(node.id, {
        x: width / 2 + radius * Math.cos(angle),
        y: height / 2 + radius * Math.sin(angle),
        ...node
      });
    });

    // Draw edges
    networkData.edges.forEach((edge: any) => {
      const source = nodePositions.get(edge.source);
      const target = nodePositions.get(edge.target);

      if (source && target) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(source.x));
        line.setAttribute('y1', String(source.y));
        line.setAttribute('x2', String(target.x));
        line.setAttribute('y2', String(target.y));
        line.setAttribute('stroke', getRelationColor(edge.relation_type));
        line.setAttribute('stroke-width', '2');
        line.setAttribute('opacity', '0.6');
        svg.appendChild(line);
      }
    });

    // Draw nodes
    nodePositions.forEach((node) => {
      const isCenter = node.id === networkData.center.id;

      // Node circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(node.x));
      circle.setAttribute('cy', String(node.y));
      circle.setAttribute('r', isCenter ? '20' : '15');
      circle.setAttribute('fill', isCenter ? '#007bff' : '#28a745');
      circle.setAttribute('stroke', 'white');
      circle.setAttribute('stroke-width', '2');
      circle.style.cursor = 'pointer';

      circle.addEventListener('click', () => {
        window.location.href = `/resources/${node.id}`;
      });

      svg.appendChild(circle);

      // Node label
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(node.x));
      text.setAttribute('y', String(node.y - 25));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '12');
      text.setAttribute('fill', '#333');
      text.textContent = node.name.length > 15 ? node.name.substring(0, 15) + '...' : node.name;
      svg.appendChild(text);
    });

    canvasRef.current.appendChild(svg);
  };

  const getRelationColor = (relationType: string) => {
    switch (relationType) {
      case 'nearby':
        return '#4CAF50'; // Green
      case 'similar':
        return '#2196F3'; // Blue
      case 'sequential':
        return '#FF9800'; // Orange
      default:
        return '#9E9E9E'; // Gray
    }
  };

  if (isLoading) {
    return <div style={{ padding: '20px' }}>読み込み中...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>
        <Link to="/resources">資源一覧に戻る</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link to={`/resources/${id}`} style={{ color: '#007bff', textDecoration: 'none' }}>
          ← 資源詳細に戻る
        </Link>
      </div>

      <h1>ネットワーク可視化</h1>

      {networkData && (
        <div style={{ marginBottom: '20px' }}>
          <h3>{networkData.center.name}</h3>
          <div style={{ color: '#666', fontSize: '14px' }}>
            接続数: {networkData.nodes.length} 資源
          </div>
        </div>
      )}

      {/* Depth Control */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <label style={{ marginRight: '10px' }}>ネットワークの深さ:</label>
        <select
          value={depth}
          onChange={(e) => setDepth(Number(e.target.value))}
          style={{ padding: '5px', fontSize: '14px' }}
        >
          <option value="1">1段階</option>
          <option value="2">2段階</option>
          <option value="3">3段階</option>
        </select>
      </div>

      {networkData?.warning && (
        <div style={{ padding: '10px', marginBottom: '15px', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px' }}>
          ⚠️ {networkData.warning}
        </div>
      )}

      {/* Legend */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <h4 style={{ marginTop: 0 }}>凡例</h4>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#007bff' }}></div>
            <span>中心資源</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '15px', height: '15px', borderRadius: '50%', backgroundColor: '#28a745' }}></div>
            <span>関連資源</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '30px', height: '2px', backgroundColor: '#4CAF50' }}></div>
            <span>近接</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '30px', height: '2px', backgroundColor: '#2196F3' }}></div>
            <span>類似</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '30px', height: '2px', backgroundColor: '#FF9800' }}></div>
            <span>連続</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '30px', height: '2px', backgroundColor: '#9E9E9E' }}></div>
            <span>関連</span>
          </div>
        </div>
      </div>

      {/* Graph Canvas */}
      <div ref={canvasRef} style={{ width: '100%', minHeight: '600px' }}></div>
    </div>
  );
};
