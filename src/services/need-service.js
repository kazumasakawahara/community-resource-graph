/**
 * Need Service
 *
 * Handles need (support request) business logic and matching.
 *
 * Requirements: 8 (Need Recording and Matching)
 * Task: 12.1 ニーズ記録機能実装（NeedService）
 */

const needDAO = require('../dao/need-dao');
const {
  NotFoundError,
  ValidationError
} = require('../utils/errors');

/**
 * Create a new need
 *
 * @param {Object} needData - Need data
 * @param {string} needData.title - Need title
 * @param {string} needData.description - Need description
 * @param {string} needData.target - Target person/group
 * @param {string} needData.purpose - Purpose of the need
 * @param {string} needData.areaId - Area ID where need is located
 * @param {string} userId - User ID who creates the need
 * @returns {Promise<Object>} Created need object
 * @throws {ValidationError} If validation fails
 */
async function createNeed(needData, userId) {
  // Validate required fields
  if (!needData.title || !needData.description || !needData.target || !needData.purpose || !needData.areaId) {
    throw new ValidationError('Missing required fields: title, description, target, purpose, areaId');
  }

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  // Create need (DAO handles area relationship)
  const need = await needDAO.create(
    {
      title: needData.title,
      description: needData.description,
      target: needData.target,
      purpose: needData.purpose
    },
    userId,
    needData.areaId
  );

  return need;
}

/**
 * Get needs with filters
 *
 * @param {Object} filters - Filter options
 * @param {string} [filters.status] - Need status (open, matched, closed)
 * @param {string} [filters.areaId] - Area ID
 * @param {number} [filters.page=1] - Page number
 * @param {number} [filters.limit=20] - Items per page
 * @returns {Promise<Array>} Array of needs
 */
async function getNeeds(filters = {}) {
  // Set defaults
  const page = filters.page || 1;
  const limit = filters.limit || 20;

  // Validate pagination
  if (page < 1) {
    throw new ValidationError('Page must be >= 1');
  }
  if (limit < 1 || limit > 100) {
    throw new ValidationError('Limit must be between 1 and 100');
  }

  // Validate status
  const validStatuses = ['open', 'matched', 'closed'];
  if (filters.status && !validStatuses.includes(filters.status)) {
    throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  // Get needs
  const needs = await needDAO.findAll({
    status: filters.status,
    areaId: filters.areaId,
    page,
    limit
  });

  return needs;
}

/**
 * Get need by ID
 *
 * @param {string} needId - Need ID
 * @returns {Promise<Object>} Need detail object
 * @throws {NotFoundError} If need not found
 * @throws {ValidationError} If needId is missing
 */
async function getNeedById(needId) {
  if (!needId) {
    throw new ValidationError('Need ID is required');
  }

  // Get need
  const need = await needDAO.findById(needId);
  if (!need) {
    throw new NotFoundError('Need not found');
  }

  return need;
}

/**
 * Calculate match quality based on resource attributes
 *
 * Quality factors:
 * - Feedback count (more feedback = higher quality)
 * - View count (more views = more visibility)
 * - Resource type alignment with need
 *
 * @param {Object} resource - Resource object
 * @returns {string} Match quality: 'high', 'medium', or 'low'
 */
function calculateMatchQuality(resource) {
  const feedbackCount = resource.feedback_count || 0;
  const viewCount = resource.view_count || 0;

  // High quality: feedback >= 3 OR views >= 10
  if (feedbackCount >= 3 || viewCount >= 10) {
    return 'high';
  }

  // Medium quality: feedback >= 1 OR views >= 3
  if (feedbackCount >= 1 || viewCount >= 3) {
    return 'medium';
  }

  // Low quality: new or rarely used resources
  return 'low';
}

/**
 * Find matching resource candidates for a need
 *
 * Matches based on:
 * - Same area
 * - Match quality calculation (feedback_count, view_count)
 *
 * @param {string} needId - Need ID
 * @returns {Promise<Array>} Array of matching resource candidates with match_quality
 * @throws {NotFoundError} If need not found
 * @throws {ValidationError} If needId is missing
 */
async function findMatchingCandidates(needId) {
  if (!needId) {
    throw new ValidationError('Need ID is required');
  }

  // Verify need exists
  const need = await needDAO.findById(needId);
  if (!need) {
    throw new NotFoundError('Need not found');
  }

  // Find resources in the same area
  const candidates = await needDAO.findResourcesByArea(needId);

  // Calculate match quality for each candidate
  const candidatesWithQuality = candidates.map(resource => ({
    resource: resource,
    match_quality: calculateMatchQuality(resource)
  }));

  // Sort by match quality (high > medium > low) and feedback_count
  const qualityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
  candidatesWithQuality.sort((a, b) => {
    // First sort by quality
    const qualityDiff = qualityOrder[b.match_quality] - qualityOrder[a.match_quality];
    if (qualityDiff !== 0) return qualityDiff;

    // Then by feedback_count
    const feedbackDiff = (b.resource.feedback_count || 0) - (a.resource.feedback_count || 0);
    if (feedbackDiff !== 0) return feedbackDiff;

    // Finally by view_count
    return (b.resource.view_count || 0) - (a.resource.view_count || 0);
  });

  return candidatesWithQuality;
}

/**
 * Create a match between need and resource
 *
 * Updates need.status to 'matched'
 *
 * @param {string} needId - Need ID
 * @param {string} resourceId - Resource ID
 * @param {string} userId - User ID who creates the match
 * @param {string} [matchQuality] - Match quality (high, medium, low)
 * @param {string} [note] - Optional match note
 * @returns {Promise<Object>} Match details
 * @throws {NotFoundError} If need or resource not found
 * @throws {ValidationError} If validation fails
 */
async function createMatch(needId, resourceId, userId, matchQuality, note) {
  if (!needId || !resourceId) {
    throw new ValidationError('Need ID and Resource ID are required');
  }

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  // Verify need exists
  const need = await needDAO.findById(needId);
  if (!need) {
    throw new NotFoundError('Need not found');
  }

  // If match_quality not provided, calculate it
  let quality = matchQuality;
  if (!quality) {
    // Get resource to calculate quality
    const resources = await needDAO.findResourcesByArea(needId);
    const resource = resources.find(r => r.id === resourceId);

    if (!resource) {
      throw new NotFoundError('Resource not found in the same area');
    }

    quality = calculateMatchQuality(resource);
  }

  // Validate match quality
  const validQualities = ['high', 'medium', 'low'];
  if (!validQualities.includes(quality)) {
    throw new ValidationError(`Invalid match quality. Must be one of: ${validQualities.join(', ')}`);
  }

  // Create match (DAO handles status update)
  await needDAO.createMatch(needId, resourceId, {
    match_quality: quality,
    matched_by: userId,
    note: note || null
  });

  // Update need status to 'matched'
  await needDAO.updateStatus(needId, 'matched');

  return {
    need_id: needId,
    resource_id: resourceId,
    match_quality: quality,
    matched_by: userId,
    note: note || null
  };
}

module.exports = {
  createNeed,
  getNeeds,
  getNeedById,
  findMatchingCandidates,
  createMatch
};
