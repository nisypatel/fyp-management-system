import React, { useState, useEffect } from 'react';
import type { User } from '../types';
import type { LoginCredentials, RegisterData, AuthResponse } from '../types';
import { authUtils } from '../lib/auth';
import api from '../lib/api';
import { AuthContext } from './AuthContext';
import type { AuthContextType, AuthProviderProps } from './AuthContext';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore user session on mount
  useEffect(() => {
    const initAuth = () => {
      const storedUser = authUtils.getUser();
      const accessToken = authUtils.getAccessToken();

      if (storedUser && accessToken) {
        setUser(storedUser);
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await api.post<AuthResponse>('/auth/login', credentials);

      const { user: userData, accessToken, refreshToken } = response.data.data;

      // Store tokens and user data
      authUtils.setTokens(accessToken, refreshToken);
      authUtils.setUser(userData);

      setUser(userData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      throw new Error(errorMessage);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await api.post<AuthResponse>('/auth/register', data);

      const { user: userData, accessToken, refreshToken } = response.data.data;

      // Store tokens and user data
      authUtils.setTokens(accessToken, refreshToken);
      authUtils.setUser(userData);

      setUser(userData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      const refreshToken = authUtils.getRefreshToken();

      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear auth data regardless of API call success
      authUtils.clearAuth();
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
