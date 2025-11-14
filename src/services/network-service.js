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
 * @returns {Promise<Object>} - Network with nodes and relationships
 */
async function getEgoNetwork(resourceId, depth = 2) {
  // Validate depth
  if (depth < 1 || depth > 3) {
    throw new ValidationError('Depth must be between 1 and 3');
  }

  const session = neo4jDriver.getSession();

  try {
    // First, verify the resource exists and get center node
    const resourceCheck = await session.run(
      `MATCH (r:Resource {id: $resourceId})
       OPTIONAL MATCH (r)-[:LOCATED_IN]->(area:Area)
       RETURN r, area`,
      { resourceId }
    );

    if (resourceCheck.records.length === 0) {
      throw new NotFoundError('Resource not found');
    }

    const centerRecord = resourceCheck.records[0];
    const centerNode = centerRecord.get('r').properties;
    const centerArea = centerRecord.get('area');

    // Format center node
    const formattedCenterNode = {
      id: centerNode.id,
      name: centerNode.name,
      type: centerNode.type,
      description: centerNode.description,
      area: centerArea ? centerArea.properties.name : null,
      feedback_count: centerNode.feedback_count,
      view_count: centerNode.view_count
    };

    // Get all nodes in the ego network using variable-length path
    // Note: Use undirected pattern to traverse in both directions
    const nodesQuery = `
      MATCH (center:Resource {id: $resourceId})
      OPTIONAL MATCH path = (center)-[:RELATED_TO*1..${depth}]-(connected:Resource)
      WHERE connected.id <> $resourceId OR connected IS NULL
      WITH DISTINCT connected
      WHERE connected IS NOT NULL
      OPTIONAL MATCH (connected)-[:LOCATED_IN]->(area:Area)
      RETURN connected as resource, area
    `;

    const nodesResult = await session.run(nodesQuery, { resourceId });

    const allNodes = [formattedCenterNode];
    const nodeIds = new Set([centerNode.id]);

    nodesResult.records.forEach(record => {
      const resource = record.get('resource');
      const area = record.get('area');

      if (resource && resource.properties && !nodeIds.has(resource.properties.id)) {
        nodeIds.add(resource.properties.id);
        allNodes.push({
          id: resource.properties.id,
          name: resource.properties.name,
          type: resource.properties.type,
          description: resource.properties.description,
          area: area ? area.properties.name : null,
          feedback_count: resource.properties.feedback_count,
          view_count: resource.properties.view_count
        });
      }
    });

    // Get all relationships in the ego network
    const relsResult = await session.run(
      `MATCH (center:Resource {id: $resourceId})
       MATCH path = (center)-[:RELATED_TO*1..${depth}]-(connected:Resource)
       WITH relationships(path) as rels
       UNWIND rels as rel
       MATCH (start:Resource)-[rel]-(end:Resource)
       RETURN DISTINCT start.id as startId, end.id as endId,
              rel.relation_type as relation_type,
              rel.distance as distance,
              rel.description as description,
              rel.created_at as created_at`,
      { resourceId }
    );

    const relationships = [];
    const seenPairs = new Set();

    relsResult.records.forEach(record => {
      const startId = record.get('startId');
      const endId = record.get('endId');

      if (!startId || !endId) return;

      // Create unique key for undirected relationship
      const pairKey = `${startId < endId ? startId : endId}-${startId < endId ? endId : startId}`;

      if (!seenPairs.has(pairKey)) {
        seenPairs.add(pairKey);
        relationships.push({
          source: startId,
          target: endId,
          relation_type: record.get('relation_type') || 'related',
          distance: record.get('distance'),
          description: record.get('description'),
          created_at: record.get('created_at')
        });
      }
    });

    return {
      nodes: allNodes,
      relationships: relationships
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
