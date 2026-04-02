// Purpose: Project related API calls used by student/teacher/admin pages.
import apiClient from './apiClient';

export const projectService = {
  async getProjects() {
    const response = await apiClient.get('/projects');
    return response.data.projects;
  },

  async getProjectById(projectId) {
    const response = await apiClient.get(`/projects/${projectId}`);
    return response.data.project;
  },

  async createProject(formData) {
    await apiClient.post('/projects', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  async requestSupervisor(projectId, supervisorId) {
    await apiClient.put(`/projects/${projectId}/request-supervisor`, { supervisorId });
  },

  async adminApprove(projectId, status) {
    await apiClient.put(`/projects/${projectId}/admin-approval`, { status });
  },

  async supervisorResponse(projectId, status) {
    await apiClient.put(`/projects/${projectId}/supervisor-response`, { status });
  },

  async getSupervisorRequests() {
    const response = await apiClient.get('/projects/supervisor/requests');
    return response.data.projects;
  },

  async addFeedback(projectId, message) {
    await apiClient.post(`/projects/${projectId}/feedback`, { message });
  },

  async addDocument(projectId, formData) {
    await apiClient.post(`/projects/${projectId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  async updateProgress(projectId, progress) {
    await apiClient.put(`/projects/${projectId}/progress`, { progress });
  }
};
