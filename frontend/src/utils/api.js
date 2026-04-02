import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // send cookies
});

// Remove request interceptor that adds authorization header
// API.interceptors.request.use(...)

// Handle response errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Prevent infinite redirect loop when checking initial auth status
      if (error.config.url !== '/auth/me' && error.config.url !== '/auth/login' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default API;
