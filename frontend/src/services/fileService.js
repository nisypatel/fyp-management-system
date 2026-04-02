// Purpose: File download related API calls.
import apiClient from './apiClient';

export const fileService = {
  async download(filename) {
    const response = await apiClient.get(`/files/download/${filename}`, {
      responseType: 'blob'
    });
    return response.data;
  }
};
