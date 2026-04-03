// Purpose: Notification related API calls.
import apiClient from './apiClient';

export const notificationService = {
  async getNotifications() {
    const response = await apiClient.get('/notifications');
    return response.data;
  },

  async markAsRead(notificationId) {
    const response = await apiClient.put(`/notifications/${notificationId}/read`);
    return response.data;
  },

  async markAllAsRead() {
    const response = await apiClient.put('/notifications/read-all');
    return response.data;
  },

  async deleteNotification(notificationId) {
    const response = await apiClient.delete(`/notifications/${notificationId}`);
    return response.data;
  },

  async deleteAllNotifications() {
    const response = await apiClient.delete('/notifications');
    return response.data;
  }
};
