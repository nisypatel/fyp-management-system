// Purpose: Notification related API calls.
import apiClient from './apiClient';

export const notificationService = {
  async getNotifications() {
    const response = await apiClient.get('/notifications');
    return response.data;
  }
};
