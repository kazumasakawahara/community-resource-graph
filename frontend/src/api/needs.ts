/**
 * Needs API
 *
 * Needs management and matching API calls
 */

import apiClient from './client';

export interface Need {
  id: string;
  title: string;
  description: string;
  target: string;
  purpose: string;
  status: 'open' | 'matched' | 'closed';
  area: string;
  view_count: number;
  created_at: string;
}

export interface CreateNeedData {
  title: string;
  description: string;
  target: string;
  purpose: string;
  areaId: string;
}

export interface MatchCandidate {
  resource: {
    id: string;
    name: string;
    type: string;
    description?: string;
    address?: string;
  };
  match_quality: 'high' | 'medium' | 'low';
}

export const needsAPI = {
  create: async (data: CreateNeedData) => {
    const response = await apiClient.post('/needs', data);
    return response.data;
  },

  getAll: async (params?: {
    status?: string;
    areaId?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get('/needs', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/needs/${id}`);
    return response.data;
  },

  getMatches: async (id: string) => {
    const response = await apiClient.get(`/needs/${id}/matches`);
    return response.data;
  },

  createMatch: async (
    needId: string,
    resourceId: string,
    note?: string,
    matchQuality?: string
  ) => {
    const response = await apiClient.post(`/needs/${needId}/match`, {
      resourceId,
      note,
      matchQuality
    });
    return response.data;
  }
};
