/**
 * Statistics API
 *
 * Statistics and analytics API calls
 */

import apiClient from './client';

export interface OverviewStats {
  resource_count: number;
  feedback_count: number;
  need_count: number;
  user_count: number;
}

export interface AreaStat {
  area_id: string;
  area_name: string;
  area_type: string;
  resource_count: number;
  need_count: number;
}

export interface TagStat {
  tag_name: string;
  tag_category: string;
  usage_count: number;
}

export interface ContributorStat {
  user_id: string;
  user_name: string;
  user_role: string;
  resource_count: number;
  feedback_count: number;
  need_count: number;
  contribution_score: number;
}

export const statsAPI = {
  getOverview: async () => {
    const response = await apiClient.get('/stats/overview');
    return response.data;
  },

  getAreas: async () => {
    const response = await apiClient.get('/stats/areas');
    return response.data;
  },

  getTags: async (limit: number = 20) => {
    const response = await apiClient.get('/stats/tags', { params: { limit } });
    return response.data;
  },

  getContributors: async (limit: number = 20) => {
    const response = await apiClient.get('/stats/contributors', { params: { limit } });
    return response.data;
  }
};
