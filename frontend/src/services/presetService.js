// Purpose: Preset related API calls used by admin pages.
import apiClient from './apiClient';

export const presetService = {
  async getPresets() {
    const response = await apiClient.get('/presets');
    return response.data.data;
  },

  async getPresetById(presetId) {
    const response = await apiClient.get(`/presets/${presetId}`);
    return response.data.data;
  },

  async createPreset(presetData) {
    const response = await apiClient.post('/presets', presetData);
    return response.data.data;
  },

  async updatePreset(presetId, presetData) {
    const response = await apiClient.put(`/presets/${presetId}`, presetData);
    return response.data.data;
  },

  async deletePreset(presetId) {
    await apiClient.delete(`/presets/${presetId}`);
  },

  async activatePreset(presetId) {
    const response = await apiClient.put(`/presets/${presetId}/activate`);
    return response.data.data;
  },

  async getActivePreset() {
    const response = await apiClient.get('/presets/active');
    return response.data.data;
  }
};