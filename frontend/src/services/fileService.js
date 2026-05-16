// Purpose: File download related API calls.
import apiClient from './apiClient';

export const fileService = {
  async download(filename) {
    const response = await apiClient.get(`/files/download/${filename}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  /**
   * Get preview URL for a file
   * Supports Cloudinary URLs and API endpoints
   * @param {string} url - File URL or identifier
   * @returns {string} Preview URL
   */
  getPreviewUrl(url) {
    if (!url) return '';
    if (url.includes('res.cloudinary.com')) return url;
    if (url.startsWith('http')) return url;
    return `/api/files/download/${url}`;
  }
};

