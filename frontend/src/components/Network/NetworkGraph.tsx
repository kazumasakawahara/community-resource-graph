/**
 * Network Graph Component
 *
 * Interactive network visualization with D3.js force simulation
 * Features:
 * - Drag and zoom interactions
 * - Responsive design with mobile optimization
 * - Hover tooltips
 * - Enhanced loading/error states with retry functionality
 * - Performance optimizations with memoization
 * - Accessibility improvements
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as d3 from 'd3';
import { resourcesAPI } from '../../api/resources';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: string;
  isCenter?: boolean;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  relation_type: string;
}

interface NetworkData {
  nodes: Node[];
  relationships: Link[];
}

export const NetworkGraph: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [depth, setDepth] = useState(2);
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<Node, undefined> | null>(null);

  // Responsive breakpoints
  const isMobile = useMemo(() => {
    return window.innerWidth < 768;
  }, []);

  useEffect(() => {
    if (id) {
      loadNetwork();
    }
  }, [id, depth]);

  const loadNetwork = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await resourcesAPI.getNetwork(id!, depth);

      // Transform API response to D3-compatible format
      const allNodes: Node[] = response.data.network.nodes.map((node: any) => ({
        id: node.id,
        name: node.name,
        type: node.type,
        isCenter: node.id === id // Mark center node
      }));

      const links: Link[] = response.data.network.relationships.map((rel: any) => ({
        source: rel.source,
        target: rel.target,
        relation_type: rel.relation_type
      }));

      setNetworkData({ nodes: allNodes, relationships: links });
      setRetryCount(0); // Reset retry count on success
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'ネットワークの読み込みに失敗しました';
      setError(errorMessage);
      console.error('Network loading error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id, depth]);

  // Retry function
  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    loadNetwork();
  }, [loadNetwork]);

  useEffect(() => {
    if (networkData && svgRef.current && containerRef.current) {
      renderNetwork();
    }

    // Cleanup simulation on unmount
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [networkData]);

  // Debounced resize handler
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (networkData && svgRef.current && containerRef.current) {
          renderNetwork();
        }
      }, 250); // Debounce resize events
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [networkData, isMobile]);

  const renderNetwork = useCallback(() => {
    if (!svgRef.current || !containerRef.current || !networkData) return;

    // Stop existing simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const width = containerRef.current.clientWidth;
    // Responsive height calculation
    const height = isMobile
      ? Math.min(500, window.innerHeight * 0.5)
      : Math.max(600, window.innerHeight * 0.6);

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])
      .attr('role', 'img')
      .attr('aria-label', `ネットワーク図: ${networkData.nodes.length}個の資源と${networkData.relationships.length}個の関係を表示`);

    // Add zoom behavior with responsive limits
    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent(isMobile ? [0.3, 2] : [0.5, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Responsive force simulation parameters
    const linkDistance = isMobile ? 80 : 120;
    const chargeStrength = isMobile ? -200 : -300;
    const collisionRadius = isMobile ? 30 : 40;

    // Create force simulation
    const simulation = d3.forceSimulation<Node>(networkData.nodes)
      .force('link', d3.forceLink<Node, Link>(networkData.relationships)
        .id(d => d.id)
        .distance(linkDistance))
      .force('charge', d3.forceManyBody().strength(chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(collisionRadius));

    // Store simulation reference for cleanup
    simulationRef.current = simulation;

    // Draw links
    const link = g.append('g')
      .selectAll('line')
      .data(networkData.relationships)
      .join('line')
      .attr('stroke', d => getRelationColor(d.relation_type))
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6);

    // Draw nodes
    const node = g.append('g')
      .selectAll('g')
      .data(networkData.nodes)
      .join('g')
      .call(drag(simulation) as any);

    // Node circles with accessibility
    node.append('circle')
      .attr('r', d => {
        const baseRadius = d.isCenter ? 20 : 15;
        return isMobile ? baseRadius * 0.8 : baseRadius;
      })
      .attr('fill', d => d.isCenter ? '#007bff' : '#28a745')
      .attr('stroke', '#fff')
      .attr('stroke-width', isMobile ? 1.5 : 2)
      .style('cursor', 'pointer')
      .attr('role', 'button')
      .attr('aria-label', d => `${d.name} (${d.type})`)
      .attr('tabindex', 0)
      .on('click', (event, d) => {
        event.stopPropagation();
        window.location.href = `/resources/${d.id}`;
      })
      .on('keydown', (event, d) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          window.location.href = `/resources/${d.id}`;
        }
      })
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', d => {
            const hoverRadius = d.isCenter ? 24 : 18;
            return isMobile ? hoverRadius * 0.8 : hoverRadius;
          });

        // Show tooltip
        showTooltip(event, d);
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', d => {
            const baseRadius = d.isCenter ? 20 : 15;
            return isMobile ? baseRadius * 0.8 : baseRadius;
          });

        hideTooltip();
      });

    // Node labels with responsive font size
    node.append('text')
      .text(d => {
        const maxLength = isMobile ? 10 : 15;
        return d.name.length > maxLength ? d.name.substring(0, maxLength) + '...' : d.name;
      })
      .attr('x', 0)
      .attr('y', d => {
        const offset = d.isCenter ? -22 : -18;
        return isMobile ? offset * 0.8 : offset;
      })
      .attr('text-anchor', 'middle')
      .attr('font-size', isMobile ? 10 : 12)
      .attr('font-weight', d => d.isCenter ? '600' : '400')
      .attr('fill', '#333')
      .style('pointer-events', 'none')
      .style('user-select', 'none');

    // Update positions on each tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as Node).x!)
        .attr('y1', d => (d.source as Node).y!)
        .attr('x2', d => (d.target as Node).x!)
        .attr('y2', d => (d.target as Node).y!);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Tooltip functions
    function showTooltip(event: any, d: Node) {
      const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'network-tooltip')
        .style('position', 'absolute')
        .style('background', '#333')
        .style('color', '#fff')
        .style('padding', '8px 12px')
        .style('border-radius', '4px')
        .style('font-size', '14px')
        .style('pointer-events', 'none')
        .style('z-index', '1000')
        .style('opacity', 0);

      tooltip.html(`<strong>${d.name}</strong><br/>種別: ${d.type}`)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 20) + 'px')
        .transition()
        .duration(200)
        .style('opacity', 0.9);
    }

    function hideTooltip() {
      d3.selectAll('.network-tooltip')
        .transition()
        .duration(200)
        .style('opacity', 0)
        .remove();
    }

  }, [networkData]);

  // Drag behavior
  const drag = (simulation: d3.Simulation<Node, undefined>) => {
    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
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
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: '6px solid #f3f3f3',
          borderTop: '6px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{ fontSize: '18px', color: '#666' }}>ネットワークを読み込んでいます...</div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{
          padding: '20px',
          marginBottom: '20px',
          backgroundColor: '#ffebee',
          border: '1px solid #ef5350',
          borderRadius: '8px',
          color: '#c62828'
        }}
        role="alert"
        aria-live="assertive">
          <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>
            ⚠️ エラーが発生しました
          </h3>
          <p style={{ margin: '0 0 15px 0', fontSize: '14px' }}>{error}</p>
          {retryCount < 3 && (
            <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
              リトライ回数: {retryCount}/3
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {retryCount < 3 && (
            <button
              onClick={handleRetry}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
              aria-label="ネットワークの再読み込み"
            >
              🔄 再試行
            </button>
          )}
          <Link
            to={`/resources/${id}`}
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            ← 資源詳細に戻る
          </Link>
          <Link
            to="/resources"
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            資源一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? '15px' : '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        flexWrap: 'wrap'
      }}>
        <Link
          to={`/resources/${id}`}
          style={{
            color: '#007bff',
            textDecoration: 'none',
            fontSize: isMobile ? '14px' : '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          ← 資源詳細に戻る
        </Link>
      </div>

      <h1 style={{
        marginBottom: '10px',
        fontSize: isMobile ? '24px' : '32px'
      }}>
        ネットワーク可視化
      </h1>

      {networkData && (
        <div style={{
          marginBottom: '20px',
          color: '#666',
          fontSize: isMobile ? '13px' : '14px'
        }}
        role="status"
        aria-live="polite">
          接続数: {networkData.nodes.length} 資源 | {networkData.relationships.length} 関係
        </div>
      )}

      {/* Controls */}
      <div style={{
        marginBottom: '20px',
        padding: isMobile ? '12px 15px' : '15px 20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        flexWrap: 'wrap'
      }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: isMobile ? '13px' : '14px',
          fontWeight: '500',
          flex: isMobile ? '1 1 100%' : 'auto'
        }}>
          ネットワークの深さ:
          <select
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            style={{
              padding: isMobile ? '6px 10px' : '8px 12px',
              fontSize: isMobile ? '13px' : '14px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: 'white',
              flex: isMobile ? '1' : 'auto'
            }}
            aria-label="ネットワーク深さの選択"
          >
            <option value="1">1段階（直接接続のみ）</option>
            <option value="2">2段階（推奨）</option>
            <option value="3">3段階（広範囲）</option>
          </select>
        </label>
        {!isMobile && (
          <div style={{ fontSize: '13px', color: '#666', fontStyle: 'italic' }}>
            💡 ノードをドラッグして移動、マウスホイールでズーム
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{
        marginBottom: '20px',
        padding: isMobile ? '12px 15px' : '15px 20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <h4 style={{
          marginTop: 0,
          marginBottom: '12px',
          fontSize: isMobile ? '14px' : '16px'
        }}>
          凡例
        </h4>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile
            ? '1fr 1fr'
            : 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: isMobile ? '8px' : '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: '#007bff',
              border: '2px solid white'
            }}></div>
            <span style={{ fontSize: '14px' }}>中心資源</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '15px',
              height: '15px',
              borderRadius: '50%',
              backgroundColor: '#28a745',
              border: '2px solid white'
            }}></div>
            <span style={{ fontSize: '14px' }}>関連資源</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '30px', height: '3px', backgroundColor: '#4CAF50', opacity: 0.6 }}></div>
            <span style={{ fontSize: '14px' }}>近接</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '30px', height: '3px', backgroundColor: '#2196F3', opacity: 0.6 }}></div>
            <span style={{ fontSize: '14px' }}>類似</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '30px', height: '3px', backgroundColor: '#FF9800', opacity: 0.6 }}></div>
            <span style={{ fontSize: '14px' }}>連続</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '30px', height: '3px', backgroundColor: '#9E9E9E', opacity: 0.6 }}></div>
            <span style={{ fontSize: '14px' }}>関連</span>
          </div>
        </div>
      </div>

      {/* Graph Canvas */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          border: '1px solid #ddd',
          borderRadius: '8px',
          backgroundColor: '#fafafa',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
      >
        <svg ref={svgRef} style={{ display: 'block' }}></svg>
      </div>

      {/* Usage Instructions */}
      <div style={{
        marginTop: '20px',
        padding: isMobile ? '12px 15px' : '15px 20px',
        backgroundColor: '#e3f2fd',
        borderRadius: '8px',
        fontSize: isMobile ? '13px' : '14px',
        lineHeight: '1.6'
      }}
      role="region"
      aria-label="使用方法">
        <strong style={{ fontSize: isMobile ? '14px' : '15px' }}>使い方:</strong>
        <ul style={{ margin: '8px 0', paddingLeft: isMobile ? '18px' : '20px' }}>
          <li>ノードをクリック{isMobile ? 'またはタップ' : ''}して資源詳細ページに移動</li>
          <li>ノードをドラッグして配置を調整</li>
          <li>{isMobile ? 'ピンチ' : 'マウスホイール（またはピンチ）'}でズームイン/アウト</li>
          <li>ノードに{isMobile ? 'タップ' : 'マウスを重ねて'}詳細情報を表示</li>
        </ul>
      </div>
    </div>
  );
};
