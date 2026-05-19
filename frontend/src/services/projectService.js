// Purpose: Project related API calls used by student/faculty/admin pages.
import apiClient from './apiClient';

export const projectService = {
  async getProjects(params = {}) {
    const response = await apiClient.get('/projects', { params });
    if (params.page || params.limit) {
      return response.data;
    }
    return response.data.projects;
  },

  async getProjectById(projectId) {
    const response = await apiClient.get(`/projects/${projectId}`);
    return {
      project: response.data.project,
      submissionDeadline: response.data.submissionDeadline
    };
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
    const response = await apiClient.put(`/projects/${projectId}/admin-approval`, { status });
    return response.data.project;
  },

  async adminRemove(projectId, reason) {
    await apiClient.put(`/projects/${projectId}/admin-remove`, { reason });
  },
  async adminRestore(projectId) {
    await apiClient.put(`/projects/${projectId}/admin-restore`);
  },
  async adminDelete(projectId) {
    await apiClient.delete(`/projects/${projectId}/admin-delete`);
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

  async submitPhase(projectId, phaseId, formData) {
    const response = await apiClient.put(`/projects/${projectId}/phases/${phaseId}/submit`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.project;
  },

  async evaluatePhase(projectId, phaseId, status, feedback) {
    const response = await apiClient.put(`/projects/${projectId}/phases/${phaseId}/evaluate`, { status, feedback });
    return response.data.project;
  },

  async uploadScreenRecording(projectId, formData) {
    await apiClient.post(`/projects/${projectId}/screen-recording`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  async reviewScreenRecording(projectId, status, feedback) {
    await apiClient.put(`/projects/${projectId}/screen-recording/review`, { status, feedback });
  },

  async getPhaseTemplate() {
    try {
      const response = await apiClient.get('/presets/active');
      return {
        phases: response.data.data.phases.map((phase, index) => ({
          order: index + 1,
          title: phase.title,
          submissionType: phase.submissionType || 'file'
        })),
        updatedAt: response.data.data.updatedAt,
        updatedBy: response.data.data.updatedBy
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return {
          phases: [],
          updatedAt: null,
          updatedBy: null
        };
      }
      throw error;
    }
  },

  async updatePhaseTemplate(phases) {
    const response = await apiClient.put('/projects/phase-template', { phases });
    return response.data;
  },

  async pauseProject(projectId) {
    await apiClient.put(`/projects/${projectId}/pause`);
  },

  async resetProject(projectId) {
    await apiClient.put(`/projects/${projectId}/reset`);
  }
,
  async downloadCertificate(projectId) {
    const response = await apiClient.get(`/projects/${projectId}/certificate`, { responseType: 'blob' });
    return response.data;
  }
};
