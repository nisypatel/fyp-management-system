// Purpose: Single Axios client configuration used by all service modules.
import axios from 'axios';

const rawApiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const normalizedApiUrl = rawApiUrl.replace(/\/$/, '');
const baseURL = normalizedApiUrl.endsWith('/api') ? normalizedApiUrl : `${normalizedApiUrl}/api`;

const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Database unavailable
      if (error.response.status === 503) {
        window.dispatchEvent(new CustomEvent('db:unavailable', { 
          detail: { message: error.response.data?.message || 'Database is unavailable' }
        }));
      }
      // Session expired or invalid token
      if (error.response.status === 401) {
        const requestUrl = error.config?.url;
        const isAuthCheck = requestUrl === '/auth/me' || requestUrl === '/auth/login';
        const onLoginPage = window.location.pathname === '/login';

        if (!isAuthCheck && !onLoginPage) {
          window.dispatchEvent(new CustomEvent('auth:session-expired'));
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
