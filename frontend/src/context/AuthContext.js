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
        setUser(currentUser);
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
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed' 
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
