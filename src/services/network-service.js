/**
 * Network Service
 *
 * Business logic for network operations (ego network retrieval)
 *
 * Requirements: 7 (Ego Network Visualization)
 * Task: 13.1 エゴネットワーク取得実装
 */

const neo4jDriver = require('../db/neo4j-driver');
const { NotFoundError, ValidationError } = require('../utils/errors');

/**
 * Get ego network for a resource
 * @param {string} resourceId - Resource ID
 * @param {number} depth - Network depth (1-3)
 * @returns {Promise<Object>} - Network with nodes and edges
 */
async function getEgoNetwork(resourceId, depth = 2) {
  // Validate depth
  if (depth < 1 || depth > 3) {
    throw new ValidationError('Depth must be between 1 and 3');
  }

  const session = neo4jDriver.getSession();

  try {
    // First, verify the resource exists
    const resourceCheck = await session.run(
      'MATCH (r:Resource {id: $resourceId}) RETURN r',
      { resourceId }
    );

    if (resourceCheck.records.length === 0) {
      throw new NotFoundError('Resource not found');
    }

    // Get ego network with specified depth
    const result = await session.run(
      `MATCH (center:Resource {id: $resourceId})
       OPTIONAL MATCH path = (center)-[rel:RELATED_TO*1..${depth}]-(connected:Resource)
       WITH center, collect(DISTINCT connected) as connectedResources,
            collect(DISTINCT rel) as relationships,
            count(DISTINCT connected) as nodeCount

       // Return warning if too many nodes
       WITH center, connectedResources, relationships, nodeCount,
            CASE WHEN nodeCount > 100 THEN true ELSE false END as warning

       // Limit to 100 nodes if exceeded
       WITH center,
            CASE WHEN warning THEN connectedResources[0..100] ELSE connectedResources END as limitedResources,
            relationships[0..100] as limitedRelationships,
            warning

       UNWIND limitedResources as resource
       OPTIONAL MATCH (resource)-[:LOCATED_IN]->(area:Area)
       WITH center, collect(DISTINCT {
         id: resource.id,
         name: resource.name,
         type: resource.type,
         description: resource.description,
         area: area.name,
         feedback_count: resource.feedback_count,
         view_count: resource.view_count
       }) as nodes, limitedRelationships, warning

       // Get center node area
       OPTIONAL MATCH (center)-[:LOCATED_IN]->(centerArea:Area)

       RETURN {
         id: center.id,
         name: center.name,
         type: center.type,
         description: center.description,
         area: centerArea.name,
         feedback_count: center.feedback_count,
         view_count: center.view_count
       } as centerNode, nodes, limitedRelationships as relationships, warning`,
      { resourceId }
    );

    if (result.records.length === 0) {
      // Resource exists but has no connections
      const centerData = resourceCheck.records[0].get('r').properties;
      return {
        center: {
          id: centerData.id,
          name: centerData.name,
          type: centerData.type,
          description: centerData.description
        },
        nodes: [],
        edges: [],
        warning: null
      };
    }

    const record = result.records[0];
    const centerNode = record.get('centerNode');
    const nodes = record.get('nodes');
    const relationships = record.get('relationships');
    const warning = record.get('warning');

    // Process edges from relationships
    const edges = [];
    const processedPairs = new Set();

    relationships.forEach(relArray => {
      if (!relArray) return;

      // relArray is an array of relationship objects
      relArray.forEach(rel => {
        const startId = rel.start.low || rel.start;
        const endId = rel.end.low || rel.end;
        const pairKey = `${Math.min(startId, endId)}-${Math.max(startId, endId)}`;

        // Avoid duplicate edges for undirected relationships
        if (!processedPairs.has(pairKey)) {
          processedPairs.add(pairKey);

          edges.push({
            source: startId,
            target: endId,
            relation_type: rel.properties.relation_type || 'related',
            distance: rel.properties.distance || null,
            description: rel.properties.description || null,
            created_at: rel.properties.created_at || null
          });
        }
      });
    });

    return {
      center: centerNode,
      nodes: nodes.filter(n => n.id !== centerNode.id), // Exclude center from nodes list
      edges: edges,
      depth: depth,
      warning: warning
        ? 'Network size exceeded 100 nodes. Results have been limited.'
        : null
    };
  } finally {
    await session.close();
  }
}

/**
 * Get relation types for styling
 * @returns {Object} - Relation type styles
 */
function getRelationTypeStyles() {
  return {
    nearby: {
      color: '#4CAF50',
      style: 'solid',
      label: '近接'
    },
    similar: {
      color: '#2196F3',
      style: 'dashed',
      label: '類似'
    },
    sequential: {
      color: '#FF9800',
      style: 'solid',
      label: '連続'
    },
    related: {
      color: '#9E9E9E',
      style: 'dotted',
      label: '関連'
    }
  };
}

module.exports = {
  getEgoNetwork,
  getRelationTypeStyles
};
