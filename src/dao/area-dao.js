/**
 * Area Data Access Object
 *
 * Handles all Area-related database operations.
 *
 * Requirements: 3 (Area-based Management)
 */

const neo4jDriver = require('../db/neo4j-driver');
const { NotFoundError } = require('../utils/errors');

/**
 * Create new area
 *
 * @param {Object} areaData - Area data
 * @param {string} areaData.name - Area name (e.g., "小倉北区", "八幡東区")
 * @param {string} [areaData.city] - City name (e.g., "北九州市")
 * @param {string} [areaData.prefecture] - Prefecture name (e.g., "福岡県")
 * @param {string} [areaData.type] - Area type (district, city, other)
 * @returns {Promise<Object>} Created area object
 */
async function createArea(areaData) {
  const session = neo4jDriver.getSession();

  try {
    // Generate area ID
    const areaId = `area_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const result = await session.run(
      `
      CREATE (a:Area {
        id: $id,
        name: $name,
        city: $city,
        prefecture: $prefecture,
        type: $type,
        created_at: datetime()
      })
      RETURN a
      `,
      {
        id: areaId,
        name: areaData.name,
        city: areaData.city || null,
        prefecture: areaData.prefecture || '福岡県',
        type: areaData.type || 'other'
      }
    );

    if (result.records.length === 0) {
      throw new Error('Failed to create area');
    }

    const areaNode = result.records[0].get('a');
    return {
      id: areaNode.properties.id,
      name: areaNode.properties.name,
      city: areaNode.properties.city,
      prefecture: areaNode.properties.prefecture,
      type: areaNode.properties.type,
      created_at: areaNode.properties.created_at
    };
  } finally {
    await session.close();
  }
}

/**
 * Get area by ID
 *
 * @param {string} areaId - Area ID
 * @returns {Promise<Object>} Area object
 * @throws {NotFoundError} If area not found
 */
async function getAreaById(areaId) {
  const session = neo4jDriver.getSession();

  try {
    const result = await session.run(
      `
      MATCH (a:Area {id: $areaId})
      RETURN a
      `,
      { areaId }
    );

    if (result.records.length === 0) {
      throw new NotFoundError('Area', areaId);
    }

    const areaNode = result.records[0].get('a');
    return {
      id: areaNode.properties.id,
      name: areaNode.properties.name,
      city: areaNode.properties.city,
      prefecture: areaNode.properties.prefecture,
      type: areaNode.properties.type,
      created_at: areaNode.properties.created_at
    };
  } finally {
    await session.close();
  }
}

/**
 * Get area by name
 *
 * @param {string} name - Area name
 * @returns {Promise<Object|null>} Area object or null if not found
 */
async function getAreaByName(name) {
  const session = neo4jDriver.getSession();

  try {
    const result = await session.run(
      `
      MATCH (a:Area)
      WHERE a.name = $name
      RETURN a
      LIMIT 1
      `,
      { name }
    );

    if (result.records.length === 0) {
      return null;
    }

    const areaNode = result.records[0].get('a');
    return {
      id: areaNode.properties.id,
      name: areaNode.properties.name,
      city: areaNode.properties.city,
      prefecture: areaNode.properties.prefecture,
      type: areaNode.properties.type,
      created_at: areaNode.properties.created_at
    };
  } finally {
    await session.close();
  }
}

/**
 * Find or create area by name
 *
 * If area with the given name exists, return it.
 * Otherwise, create a new area and return it.
 *
 * @param {string} name - Area name
 * @param {Object} [options] - Additional options
 * @param {string} [options.city] - City name
 * @param {string} [options.prefecture] - Prefecture name
 * @param {string} [options.type] - Area type
 * @returns {Promise<Object>} Area object (existing or newly created)
 */
async function findOrCreateArea(name, options = {}) {
  // First, try to find existing area
  const existingArea = await getAreaByName(name);

  if (existingArea) {
    return existingArea;
  }

  // If not found, create new area
  return await createArea({
    name,
    city: options.city || null,
    prefecture: options.prefecture || '福岡県',
    type: options.type || 'other'
  });
}

/**
 * Get all areas
 *
 * @returns {Promise<Array>} List of all areas
 */
async function getAllAreas() {
  const session = neo4jDriver.getSession();

  try {
    const result = await session.run(
      `
      MATCH (a:Area)
      OPTIONAL MATCH (r:Resource)-[:LOCATED_IN]->(a)
      RETURN a, count(r) as resource_count
      ORDER BY a.name
      `
    );

    return result.records.map(record => {
      const areaNode = record.get('a');
      return {
        id: areaNode.properties.id,
        name: areaNode.properties.name,
        city: areaNode.properties.city,
        prefecture: areaNode.properties.prefecture,
        type: areaNode.properties.type,
        resource_count: record.get('resource_count').toNumber(),
        created_at: areaNode.properties.created_at
      };
    });
  } finally {
    await session.close();
  }
}

module.exports = {
  createArea,
  getAreaById,
  getAreaByName,
  findOrCreateArea,
  getAllAreas
};
