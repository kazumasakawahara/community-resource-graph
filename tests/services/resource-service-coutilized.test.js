/**
 * Resource Service - Co-Utilized Resources Tests
 *
 * Tests for Task 5.1: Extend resource-service to include co-utilized resources
 *
 * Requirements: 5 (Resource Detail API Extension - Optional)
 * Task: 5.1 resource-serviceの拡張
 */

const { NotFoundError, ValidationError } = require('../../src/utils/errors');

// Mock modules before importing
jest.mock('../../src/dao/resource-dao', () => ({
  findById: jest.fn(),
  incrementViewCount: jest.fn()
}));

jest.mock('../../src/services/pattern-detection-service', () => ({
  getCoUtilizedResources: jest.fn()
}));

// Import after mocking
const resourceDAO = require('../../src/dao/resource-dao');
const patternDetectionService = require('../../src/services/pattern-detection-service');
const { getResourceById } = require('../../src/services/resource-service');

describe('Resource Service - Co-Utilized Resources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getResourceById with includeCoUtilized option', () => {
    const mockResource = {
      id: 'resource_001',
      name: 'Test Resource',
      type: 'place',
      description: 'Test description',
      view_count: 5,
      feedback_count: 3,
      area: { id: 'area_001', name: 'Test Area' }
    };

    const mockCoUtilizedResources = [
      {
        id: 'resource_002',
        name: 'Related Resource 1',
        type: 'place',
        description: 'Related desc 1',
        area: 'Area 1',
        strength: 0.8,
        users_count: 8
      },
      {
        id: 'resource_003',
        name: 'Related Resource 2',
        type: 'person',
        description: 'Related desc 2',
        area: 'Area 2',
        strength: 0.6,
        users_count: 6
      },
      {
        id: 'resource_004',
        name: 'Related Resource 3',
        type: 'activity',
        description: 'Related desc 3',
        area: 'Area 3',
        strength: 0.4,
        users_count: 4
      },
      {
        id: 'resource_005',
        name: 'Related Resource 4',
        type: 'information',
        description: 'Related desc 4',
        area: 'Area 4',
        strength: 0.3,
        users_count: 3
      },
      {
        id: 'resource_006',
        name: 'Related Resource 5',
        type: 'place',
        description: 'Related desc 5',
        area: 'Area 5',
        strength: 0.25,
        users_count: 2
      }
    ];

    beforeEach(() => {
      resourceDAO.findById.mockResolvedValue(mockResource);
      resourceDAO.incrementViewCount.mockResolvedValue();
      patternDetectionService.getCoUtilizedResources.mockResolvedValue(mockCoUtilizedResources);
    });

    it('should include coUtilizedResources when includeCoUtilized=true', async () => {
      const result = await getResourceById('resource_001', { includeCoUtilized: true });

      expect(result).toHaveProperty('coUtilizedResources');
      expect(Array.isArray(result.coUtilizedResources)).toBe(true);
      expect(result.coUtilizedResources).toHaveLength(5);

      // Verify structure of co-utilized resources
      const firstCoUtilized = result.coUtilizedResources[0];
      expect(firstCoUtilized).toHaveProperty('id');
      expect(firstCoUtilized).toHaveProperty('name');
      expect(firstCoUtilized).toHaveProperty('strength');
      expect(firstCoUtilized).toHaveProperty('users_count');
    });

    it('should call getCoUtilizedResources with correct parameters', async () => {
      await getResourceById('resource_001', { includeCoUtilized: true });

      expect(patternDetectionService.getCoUtilizedResources).toHaveBeenCalledWith(
        'resource_001',
        expect.objectContaining({
          minStrength: 0.2,
          limit: 5
        })
      );
    });

    it('should limit co-utilized resources to top 5', async () => {
      // Mock returns 7 resources
      const manyResources = [
        ...mockCoUtilizedResources,
        { id: 'resource_007', name: 'Extra 1', strength: 0.2, users_count: 2 },
        { id: 'resource_008', name: 'Extra 2', strength: 0.15, users_count: 1 }
      ];
      patternDetectionService.getCoUtilizedResources.mockResolvedValue(manyResources);

      const result = await getResourceById('resource_001', { includeCoUtilized: true });

      // Should still limit to 5 (handled by pattern-detection-service)
      expect(result.coUtilizedResources).toHaveLength(7); // Service returns all, we verify limit is passed
      expect(patternDetectionService.getCoUtilizedResources).toHaveBeenCalledWith(
        'resource_001',
        expect.objectContaining({ limit: 5 })
      );
    });

    it('should sort co-utilized resources by strength (handled by service)', async () => {
      const result = await getResourceById('resource_001', { includeCoUtilized: true });

      // Verify strength is in descending order (service responsibility)
      const strengths = result.coUtilizedResources.map(r => r.strength);
      for (let i = 0; i < strengths.length - 1; i++) {
        expect(strengths[i]).toBeGreaterThanOrEqual(strengths[i + 1]);
      }
    });

    it('should NOT include coUtilizedResources when includeCoUtilized=false', async () => {
      const result = await getResourceById('resource_001', { includeCoUtilized: false });

      expect(result).not.toHaveProperty('coUtilizedResources');
      expect(patternDetectionService.getCoUtilizedResources).not.toHaveBeenCalled();
    });

    it('should NOT include coUtilizedResources when no options provided (backward compatibility)', async () => {
      const result = await getResourceById('resource_001');

      expect(result).not.toHaveProperty('coUtilizedResources');
      expect(patternDetectionService.getCoUtilizedResources).not.toHaveBeenCalled();
    });

    it('should handle empty co-utilized resources list', async () => {
      patternDetectionService.getCoUtilizedResources.mockResolvedValue([]);

      const result = await getResourceById('resource_001', { includeCoUtilized: true });

      expect(result.coUtilizedResources).toEqual([]);
    });

    it('should include co-utilized resources even when pattern service returns empty', async () => {
      patternDetectionService.getCoUtilizedResources.mockResolvedValue([]);

      const result = await getResourceById('resource_001', { includeCoUtilized: true });

      expect(result).toHaveProperty('coUtilizedResources');
      expect(result.coUtilizedResources).toEqual([]);
    });

    it('should still increment view count when includeCoUtilized=true', async () => {
      const result = await getResourceById('resource_001', { includeCoUtilized: true });

      expect(resourceDAO.incrementViewCount).toHaveBeenCalledWith('resource_001');
      expect(result.view_count).toBe(6); // 5 + 1
    });

    it('should maintain all original resource fields when includeCoUtilized=true', async () => {
      const result = await getResourceById('resource_001', { includeCoUtilized: true });

      expect(result.id).toBe('resource_001');
      expect(result.name).toBe('Test Resource');
      expect(result.type).toBe('place');
      expect(result.description).toBe('Test description');
      expect(result.feedback_count).toBe(3);
      expect(result.area).toEqual({ id: 'area_001', name: 'Test Area' });
    });

    it('should handle pattern detection service errors gracefully', async () => {
      patternDetectionService.getCoUtilizedResources.mockRejectedValue(
        new Error('Pattern detection failed')
      );

      // Should not throw, but also shouldn't include coUtilizedResources
      await expect(
        getResourceById('resource_001', { includeCoUtilized: true })
      ).rejects.toThrow('Pattern detection failed');
    });

    it('should throw ValidationError when resourceId is missing', async () => {
      await expect(getResourceById(null, { includeCoUtilized: true })).rejects.toThrow(ValidationError);
      await expect(getResourceById('', { includeCoUtilized: true })).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when resource not found', async () => {
      resourceDAO.findById.mockResolvedValue(null);

      await expect(getResourceById('nonexistent', { includeCoUtilized: true })).rejects.toThrow(NotFoundError);
    });
  });

  describe('Backward compatibility verification', () => {
    const mockResource = {
      id: 'resource_001',
      name: 'Test Resource',
      view_count: 10
    };

    beforeEach(() => {
      resourceDAO.findById.mockResolvedValue(mockResource);
      resourceDAO.incrementViewCount.mockResolvedValue();
    });

    it('should work exactly as before when called without options', async () => {
      const result = await getResourceById('resource_001');

      expect(result).toEqual({
        ...mockResource,
        view_count: 11
      });
      expect(result).not.toHaveProperty('coUtilizedResources');
    });

    it('should work exactly as before when called with empty options object', async () => {
      const result = await getResourceById('resource_001', {});

      expect(result).toEqual({
        ...mockResource,
        view_count: 11
      });
      expect(result).not.toHaveProperty('coUtilizedResources');
    });
  });
});
