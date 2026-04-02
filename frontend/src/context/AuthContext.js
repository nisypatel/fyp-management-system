import React, { createContext, useState, useEffect, useContext } from 'react';
import API from '../utils/api';

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
        const response = await API.get('/auth/me');
        setUser(response.data.user);
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
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const triggerSync = () => {
    // Ping localStorage to alert other tabs to reload user state
    localStorage.setItem('session-sync', Date.now().toString());
  };

  const login = async (email, password) => {
    try {
      const response = await API.post('/auth/login', { email, password });
      const { user } = response.data;
      
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
      const response = await API.post('/auth/register', userData);
      const { user } = response.data;
      
      setUser(user);
      triggerSync();
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const logout = async () => {
    try {
      await API.post('/auth/logout');
    } catch (error) {
      console.error('Logout error', error);
    }
    setUser(null);
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
