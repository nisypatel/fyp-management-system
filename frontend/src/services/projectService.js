// Purpose: Project related API calls used by student/faculty/admin pages.
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

  async getTeamInvites() {
    const response = await apiClient.get('/projects/team/invites');
    return response.data.invites;
  },

  async respondToTeamInvite(projectId, status) {
    await apiClient.put(`/projects/${projectId}/team-invite-response`, { status });
  },

  async addFeedback(projectId, message) {
    await apiClient.post(`/projects/${projectId}/feedback`, { message });
  },

  async addDocument(projectId, formData) {
    await apiClient.post(`/projects/${projectId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  async submitPhase(projectId, phaseId, formData) {
    await apiClient.put(`/projects/${projectId}/phases/${phaseId}/submit`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  async evaluatePhase(projectId, phaseId, status, feedback) {
    await apiClient.put(`/projects/${projectId}/phases/${phaseId}/evaluate`, { status, feedback });
  },

  async updateProgress(projectId, progress) {
    await apiClient.put(`/projects/${projectId}/progress`, { progress });
  },

  async uploadScreenRecording(projectId, formData) {
    await apiClient.post(`/projects/${projectId}/screen-recording`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  async reviewScreenRecording(projectId, status, feedback) {
    await apiClient.put(`/projects/${projectId}/screen-recording/review`, { status, feedback });
  }
};
