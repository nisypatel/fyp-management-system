// Purpose: Authentication and profile related API calls.
import apiClient from './apiClient';

export const authService = {
  async getCurrentUser() {
    const response = await apiClient.get('/auth/me');
    return response.data.user;
  },

  async login(email, password) {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  async register(userData) {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  async logout() {
    await apiClient.post('/auth/logout');
  },

  async updateProfile(formData) {
    const response = await apiClient.put('/auth/updateprofile', formData);
    return response.data.user;
  },

  async updatePassword(passwordData) {
    await apiClient.put('/auth/updatepassword', passwordData);
  },

  async forgotPassword(email) {
    const response = await apiClient.post('/auth/forgotpassword', { email });
    return response.data;
  },

  async resetPassword(token, password) {
    const response = await apiClient.put(`/auth/resetpassword/${token}`, { password });
    return response.data;
  }
};
