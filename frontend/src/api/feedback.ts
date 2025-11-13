/**
 * Feedback API
 *
 * Feedback management API calls
 */

import apiClient from './client';

export interface Feedback {
  id: string;
  content: string;
  visit_date: string | { year: { low: number }; month: { low: number }; day: { low: number } };
  helpful_count: number;
  author_name: string;
  created_at: string;
}

export interface CreateFeedbackData {
  content: string;
  visit_date: string;
}

export const feedbackAPI = {
  create: async (resourceId: string, data: CreateFeedbackData) => {
    const response = await apiClient.post(`/resources/${resourceId}/feedback`, data);
    return response.data;
  },

  getByResource: async (resourceId: string) => {
    const response = await apiClient.get(`/resources/${resourceId}/feedback`);
    return response.data;
  },

  markHelpful: async (feedbackId: string) => {
    const response = await apiClient.post(`/feedback/${feedbackId}/helpful`);
    return response.data;
  }
};
