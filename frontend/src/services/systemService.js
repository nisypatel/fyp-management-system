import apiClient from './apiClient';

export const systemService = {
  async getSettings() {
    const response = await apiClient.get('/system');
    return response.data.settings || {};
  },

  async updateSettings({ collegeName, collegeLogoUrl }) {
    const response = await apiClient.put('/system', { collegeName, collegeLogoUrl });
    return response.data;
  }
  ,
  async uploadLogo(formData) {
    const response = await apiClient.put('/system/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
};

export default systemService;
