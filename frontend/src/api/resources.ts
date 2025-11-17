/**
 * Resources API
 *
 * Resource management API calls
 */

import apiClient from './client';

export interface Resource {
  id: string;
  name: string;
  type: 'place' | 'person' | 'activity' | 'information';
  description?: string;
  address?: string;
  contact?: string;
  hours?: string;
  area?: string;
  feedback_count: number;
  view_count: number;
  tags?: Array<{ name: string; category: string }>;
  created_at: string;
}

export interface CreateResourceData {
  name: string;
  type: string;
  areaId: string;
  description?: string;
  address?: string;
  contact?: string;
  hours?: string;
  tags?: Array<{ name: string; category: string }>;
}

export interface SearchParams {
  tags?: string;
  areaId?: string;
  type?: string;
  keyword?: string;
  sortBy?: 'feedback_count' | 'created_at' | 'view_count';
  page?: number;
  limit?: number;
}

export const resourcesAPI = {
  search: async (params: SearchParams) => {
    const response = await apiClient.get('/resources/search', { params });
    return response.data;
  },

  semanticSearch: async (query: string, limit: number = 5, threshold: number = 0.65) => {
    const response = await apiClient.get('/resources/search/semantic', {
      params: { query, limit, threshold }
    });
    return response.data;
  },

  getRecommendations: async (resourceId: string, limit: number = 10, threshold: number = 0.6) => {
    const response = await apiClient.get(`/resources/${resourceId}/recommendations`, {
      params: { limit, threshold }
    });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/resources/${id}`);
    return response.data;
  },

  create: async (data: CreateResourceData) => {
    const response = await apiClient.post('/resources', data);
    return response.data;
  },

  addTags: async (id: string, tags: Array<{ name: string; category: string }>) => {
    const response = await apiClient.post(`/resources/${id}/tags`, { tags });
    return response.data;
  },

  getSuggestedTags: async (limit: number = 20) => {
    const response = await apiClient.get('/resources/tags/suggestions', {
      params: { limit }
    });
    return response.data;
  },

  getConnections: async (id: string) => {
    const response = await apiClient.get(`/resources/${id}/connections`);
    return response.data;
  },

  getNetwork: async (id: string, depth: number = 2) => {
    const response = await apiClient.get(`/resources/${id}/network`, {
      params: { depth }
    });
    return response.data;
  },

  createRelationship: async (
    fromId: string,
    toId: string,
    relationType: string,
    distance?: string,
    description?: string
  ) => {
    const response = await apiClient.post(`/resources/${fromId}/relationships`, {
      toId,
      relation_type: relationType,
      distance,
      description
    });
    return response.data;
  }
};
