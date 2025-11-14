/**
 * Need Controller
 *
 * Handles need-related HTTP requests.
 *
 * Requirements: 8 (Need Recording and Matching)
 * Task: 21.1 ニーズエンドポイント実装（NeedController）
 */

const needService = require('../services/need-service');

/**
 * Create a new need
 * POST /api/needs
 *
 * Requires authentication
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.title - Need title
 * @param {string} req.body.description - Need description
 * @param {string} req.body.target - Target person/group
 * @param {string} req.body.purpose - Purpose
 * @param {string} req.body.areaId - Area ID
 * @param {Object} req.user - Authenticated user
 * @param {Object} res - Express response object
 */
async function createNeed(req, res, next) {
  try {
    const userId = req.user.userId;
    const needData = req.body;

    const need = await needService.createNeed(needData, userId);

    res.status(201).json({
      success: true,
      data: {
        need
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get needs with filters
 * GET /api/needs
 *
 * Query parameters:
 * - status: Need status (open, matched, closed)
 * - areaId: Area ID
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getNeeds(req, res, next) {
  try {
    const { status, areaId, page, limit } = req.query;

    const filters = {
      status: status || undefined,
      areaId: areaId || undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20
    };

    const needs = await needService.getNeeds(filters);

    res.status(200).json({
      success: true,
      data: {
        needs,
        page: filters.page,
        limit: filters.limit
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get need by ID
 * GET /api/needs/:id
 *
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Need ID
 * @param {Object} res - Express response object
 */
async function getNeedById(req, res, next) {
  try {
    const needId = req.params.id;

    const need = await needService.getNeedById(needId);

    res.status(200).json({
      success: true,
      data: {
        need
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get matching candidates for a need
 * GET /api/needs/:id/matches
 *
 * Returns resources with match_quality (high, medium, low) sorted by quality
 *
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Need ID
 * @param {Object} res - Express response object
 */
async function getMatchingCandidates(req, res, next) {
  try {
    const needId = req.params.id;

    const matches = await needService.findMatchingCandidates(needId);

    res.status(200).json({
      success: true,
      data: {
        matches
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create match between need and resource
 * POST /api/needs/:id/match
 *
 * Requires authentication
 * Automatically calculates match_quality if not provided
 *
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Need ID
 * @param {Object} req.body - Request body
 * @param {string} req.body.resourceId - Resource ID to match
 * @param {string} [req.body.matchQuality] - Optional match quality (high, medium, low)
 * @param {string} [req.body.note] - Optional match note
 * @param {Object} req.user - Authenticated user
 * @param {Object} res - Express response object
 */
async function createMatch(req, res, next) {
  try {
    const needId = req.params.id;
    const userId = req.user.userId;
    const { resourceId, matchQuality, note } = req.body;

    const match = await needService.createMatch(needId, resourceId, userId, matchQuality, note);

    res.status(201).json({
      success: true,
      data: {
        match
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createNeed,
  getNeeds,
  getNeedById,
  getMatchingCandidates,
  createMatch
};
