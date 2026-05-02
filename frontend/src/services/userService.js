// Purpose: User and dashboard stats related API calls.
import apiClient from './apiClient';

export const userService = {
  async getDashboardStats() {
    const response = await apiClient.get('/users/stats/dashboard');
    return response.data.stats;
  },

  async getFaculty(params = {}) {
    const response = await apiClient.get('/users/faculty', { params });
    return response.data.faculty;
  },

  async getUsers(params = {}) {
    const response = await apiClient.get('/users', { params });
    if (params.page || params.limit) {
      return response.data;
    }
    return response.data.users;
  },

  async createUser(userForm) {
    await apiClient.post('/users', userForm);
  },

  async updateUser(userId, userForm) {
    await apiClient.put(`/users/${userId}`, userForm);
  },

  async deleteUser(userId) {
    await apiClient.delete(`/users/${userId}`);
  },

  async getVerificationConfig() {
    const response = await apiClient.get('/users/verification/config');
    return response.data;
  },

  async updateVerificationConfig(verificationDomain) {
    const response = await apiClient.put('/users/verification/config', { verificationDomain });
    return response.data;
  },

  async requestOTPVerification(emailLocalPart) {
    const response = await apiClient.post('/users/verification/otp', { emailLocalPart });
    return response.data;
  },

  async confirmOTPVerification(otp) {
    await apiClient.post('/users/verification/otp/confirm', { otp });
  },

  async uploadIDCard(formData) {
    await apiClient.post('/users/verification/id-card', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  async getPendingVerifications() {
    const response = await apiClient.get('/users/verification/pending');
    return response.data.data;
  },

  async reviewIDCardVerification(userId, status, notes) {
    await apiClient.put(`/users/${userId}/verification/review`, { status, notes });
  }
};
