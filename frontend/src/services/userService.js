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
  }
};
