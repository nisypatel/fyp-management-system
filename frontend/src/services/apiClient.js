// Purpose: Single Axios client configuration used by all service modules.
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const requestUrl = error.config?.url;
      const isAuthCheck = requestUrl === '/auth/me' || requestUrl === '/auth/login';
      const onLoginPage = window.location.pathname === '/login';

      if (!isAuthCheck && !onLoginPage) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
