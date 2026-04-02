// Purpose: User and dashboard stats related API calls.
import apiClient from './apiClient';

export const userService = {
  async getDashboardStats() {
    const response = await apiClient.get('/users/stats/dashboard');
    return response.data.stats;
  },

  async getTeachers() {
    const response = await apiClient.get('/users/teachers');
    return response.data.teachers;
  },

  async getUsers() {
    const response = await apiClient.get('/users');
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
