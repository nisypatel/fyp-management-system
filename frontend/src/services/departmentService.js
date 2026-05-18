import apiClient from './apiClient';

export const departmentService = {
  async getDepartments() {
    const response = await apiClient.get('/departments');
    return response.data.departments;
  },

  async createDepartment(payload) {
    const response = await apiClient.post('/departments', payload);
    return response.data.department;
  },

  async updateDepartment(id, payload) {
    const response = await apiClient.put(`/departments/${id}`, payload);
    return response.data.department;
  },

  async deleteDepartment(id) {
    const response = await apiClient.delete(`/departments/${id}`);
    return response.data;
  }
};
