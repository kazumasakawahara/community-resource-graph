/**
 * Need DAO
 * Handles need CRUD operations
 * Requirements: 8 (Need Recording)
 */

const crypto = require('crypto');
const neo4j = require('neo4j-driver');
const neo4jDriver = require('../db/neo4j-driver');

/**
 * Create a new need
 * @param {Object} needData - Need data (title, description, target, purpose)
 * @param {string} userId - User ID who recorded the need
 * @param {string} areaId - Area ID where the need exists
 * @returns {Promise<Object>} Created need object
 */
async function create(needData, userId, areaId) {
  const session = neo4jDriver.getSession();

  try {
    const { title, description, target, purpose } = needData;
    const needId = `need_${crypto.randomUUID()}`;

    const result = await session.run(
      `
      MATCH (a:Area {id: $areaId})
      MATCH (u:User {id: $userId})
      CREATE (n:Need {
        id: $needId,
        title: $title,
        description: $description,
        target: $target,
        purpose: $purpose,
        status: 'open',
        view_count: 0,
        created_at: datetime()
      })
      CREATE (n)-[:IN_AREA]->(a)
      CREATE (n)-[:RECORDED_BY]->(u)
      RETURN n
      `,
      {
        needId,
        title,
        description,
        target,
        purpose,
        areaId,
        userId
      }
    );

    const needNode = result.records[0].get('n').properties;

    return {
      id: needNode.id,
      title: needNode.title,
      description: needNode.description,
      target: needNode.target,
      purpose: needNode.purpose,
      status: needNode.status,
      view_count: typeof needNode.view_count === 'object'
        ? needNode.view_count.toNumber()
        : needNode.view_count,
      created_at: needNode.created_at.toString()
    };
  } finally {
    await session.close();
  }
}

/**
 * Find all needs with optional filters and pagination
 * @param {Object} options - Filter options (status, areaId, skip, limit)
 * @returns {Promise<Array>} Array of need objects with area information
 */
async function findAll(options = {}) {
  const session = neo4jDriver.getSession();

  try {
    const { status, areaId, skip = 0, limit = 20 } = options;

    // Build WHERE clause based on filters
    const whereConditions = [];
    const params = {
      skip: neo4j.int(skip),
      limit: neo4j.int(limit)
    };

    if (status) {
      whereConditions.push('n.status = $status');
      params.status = status;
    }

    if (areaId) {
      whereConditions.push('a.id = $areaId');
      params.areaId = areaId;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const result = await session.run(
      `
      MATCH (n:Need)-[:IN_AREA]->(a:Area)
      ${whereClause}
      RETURN n, a.id as area_id, a.name as area_name
      ORDER BY
        CASE n.status
          WHEN 'open' THEN 1
          WHEN 'matched' THEN 2
          WHEN 'closed' THEN 3
        END,
        n.created_at DESC
      SKIP $skip
      LIMIT $limit
      `,
      params
    );

    return result.records.map(record => {
      const need = record.get('n').properties;
      const areaId = record.get('area_id');
      const areaName = record.get('area_name');

      return {
        id: need.id,
        title: need.title,
        description: need.description,
        target: need.target,
        purpose: need.purpose,
        status: need.status,
        view_count: typeof need.view_count === 'object'
          ? need.view_count.toNumber()
          : need.view_count,
        created_at: need.created_at.toString(),
        area_id: areaId,
        area_name: areaName
      };
    });
  } finally {
    await session.close();
  }
}

/**
 * Find need by ID
 * @param {string} needId - Need ID
 * @returns {Promise<Object|null>} Need object with area and user information, or null if not found
 */
async function findById(needId) {
  const session = neo4jDriver.getSession();

  try {
    const result = await session.run(
      `
      MATCH (n:Need {id: $needId})
      MATCH (n)-[:IN_AREA]->(a:Area)
      MATCH (n)-[:RECORDED_BY]->(u:User)
      RETURN n,
        a.id as area_id, a.name as area_name,
        u.id as recorded_by_id, u.name as recorded_by_name
      `,
      { needId }
    );

    if (result.records.length === 0) {
      return null;
    }

    const record = result.records[0];
    const need = record.get('n').properties;
    const areaId = record.get('area_id');
    const areaName = record.get('area_name');
    const recordedById = record.get('recorded_by_id');
    const recordedByName = record.get('recorded_by_name');

    return {
      id: need.id,
      title: need.title,
      description: need.description,
      target: need.target,
      purpose: need.purpose,
      status: need.status,
      view_count: typeof need.view_count === 'object'
        ? need.view_count.toNumber()
        : need.view_count,
      created_at: need.created_at.toString(),
      area_id: areaId,
      area_name: areaName,
      recorded_by_id: recordedById,
      recorded_by_name: recordedByName
    };
  } finally {
    await session.close();
  }
}

/**
 * Update need status
 * @param {string} needId - Need ID
 * @param {string} newStatus - New status (open, matched, closed)
 * @returns {Promise<void>}
 */
async function updateStatus(needId, newStatus) {
  const session = neo4jDriver.getSession();

  try {
    await session.run(
      `
      MATCH (n:Need {id: $needId})
      SET n.status = $newStatus
      `,
      { needId, newStatus }
    );
  } finally {
    await session.close();
  }
}

/**
 * Find resources in the same area as the need
 * @param {string} needId - Need ID
 * @returns {Promise<Array>} Array of resource objects in the same area with feedback/view counts
 */
async function findResourcesByArea(needId) {
  const session = neo4jDriver.getSession();

  try {
    const result = await session.run(
      `
      MATCH (n:Need {id: $needId})-[:IN_AREA]->(a:Area)
      MATCH (r:Resource)-[:LOCATED_IN]->(a)
      RETURN r
      `,
      { needId }
    );

    return result.records.map(record => {
      const resource = record.get('r').properties;

      return {
        id: resource.id,
        name: resource.name,
        type: resource.type,
        description: resource.description,
        address: resource.address,
        feedback_count: typeof resource.feedback_count === 'object'
          ? resource.feedback_count.toNumber()
          : resource.feedback_count || 0,
        view_count: typeof resource.view_count === 'object'
          ? resource.view_count.toNumber()
          : resource.view_count || 0
      };
    });
  } finally {
    await session.close();
  }
}

/**
 * Create a match between a need and a resource
 * @param {string} needId - Need ID
 * @param {string} resourceId - Resource ID
 * @param {Object} matchData - Match data (match_quality, matched_by, note)
 * @returns {Promise<void>}
 */
async function createMatch(needId, resourceId, matchData) {
  const session = neo4jDriver.getSession();

  try {
    const { match_quality, matched_by, note } = matchData;

    await session.run(
      `
      MATCH (n:Need {id: $needId})
      MATCH (r:Resource {id: $resourceId})
      CREATE (n)-[m:MATCHED_BY {
        match_quality: $match_quality,
        matched_by: $matched_by,
        note: $note,
        matched_at: datetime()
      }]->(r)
      SET n.status = 'matched'
      `,
      {
        needId,
        resourceId,
        match_quality,
        matched_by,
        note: note || null
      }
    );
  } finally {
    await session.close();
  }
}

/**
 * Get all matched resources for a need
 * @param {string} needId - Need ID
 * @returns {Promise<Array>} Array of matched resources with match information
 */
async function getMatchedResources(needId) {
  const session = neo4jDriver.getSession();

  try {
    const result = await session.run(
      `
      MATCH (n:Need {id: $needId})-[m:MATCHED_BY]->(r:Resource)
      RETURN r, m
      `,
      { needId }
    );

    return result.records.map(record => {
      const resource = record.get('r').properties;
      const match = record.get('m').properties;

      return {
        resource: {
          id: resource.id,
          name: resource.name,
          type: resource.type,
          description: resource.description,
          address: resource.address
        },
        match_quality: match.match_quality,
        matched_by: match.matched_by,
        matched_at: match.matched_at.toString(),
        note: match.note
      };
    });
  } finally {
    await session.close();
  }
}

module.exports = {
  create,
  findAll,
  findById,
  updateStatus,
  findResourcesByArea,
  createMatch,
  getMatchedResources
};
