// Purpose: Global auth state (user/session) and auth actions for the app.
import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        // Normalize user object so code can rely on `id` field across login and reload
        if (currentUser) {
          const normalized = {
            ...currentUser,
            id: currentUser.id || currentUser._id || (currentUser._doc && currentUser._doc._id) || null
          };
          setUser(normalized);
        } else {
          setUser(null);
        }
      } catch (error) {
        setUser(null);
      }
      setLoading(false);
    };

    loadUser();

    // Listen for tab sync events (login/logout from other tabs)
    const handleStorageChange = (e) => {
      if (e.key === 'session-sync') {
        loadUser(); // Re-verify with backend to get the exact identical state
      }
    };

    const handleSessionExpired = () => {
      setUser(null);
      triggerSync();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    };

    const handleDBUnavailable = (event) => {
      window.dispatchEvent(new CustomEvent('app:notification', {
        detail: {
          type: 'error',
          message: event.detail?.message || 'Database connection lost. Please try again later.'
        }
      }));
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth:session-expired', handleSessionExpired);
    window.addEventListener('db:unavailable', handleDBUnavailable);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth:session-expired', handleSessionExpired);
      window.removeEventListener('db:unavailable', handleDBUnavailable);
    };
  }, []);

  const triggerSync = () => {
    // Ping localStorage to alert other tabs to reload user state
    localStorage.setItem('session-sync', Date.now().toString());
  };

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      const { user } = response;
      
      setUser(user);
      triggerSync();
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      const { user } = response;
      
      setUser(user);
      triggerSync();
      
      return { success: true };
    } catch (error) {
      console.error('Full Registration Error:', error.response?.data || error);
      const errMsg = error.response?.data?.message || error.message || 'Registration failed';
      const errors = Array.isArray(error.response?.data?.errors) ? error.response.data.errors : [];
      return { 
        success: false, 
        message: errMsg,
        errors
      };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error', error);
    }
    setUser(null);
    // Clear all session and storage data
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(';').forEach(cookie => {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
    triggerSync();
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
