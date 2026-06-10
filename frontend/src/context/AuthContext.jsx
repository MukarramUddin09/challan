import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

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

  // Check if user is authenticated on mount
  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('ghmc_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      if (response.data.success) {
        setUser(response.data.data.user);
      }
    } catch (err) {
      localStorage.removeItem('ghmc_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.success) {
      const { user: userData, token } = response.data.data;
      localStorage.setItem('ghmc_token', token);
      setUser(userData);
      return response.data;
    }
    throw new Error(response.data.message);
  };

  const register = async (data) => {
    const response = await api.post('/auth/register', data);
    if (response.data.success) {
      const { user: userData, token } = response.data.data;
      localStorage.setItem('ghmc_token', token);
      setUser(userData);
      return response.data;
    }
    throw new Error(response.data.message);
  };

  const logout = () => {
    localStorage.removeItem('ghmc_token');
    setUser(null);
    // Also clear cookie via API
    api.post('/auth/logout').catch(() => {});
  };

  const isAdmin = user?.role === 'admin';
  const isWorker = user?.role === 'worker';
  const isApproved = user?.status === 'approved';
  const isPending = user?.status === 'pending';

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAdmin,
    isWorker,
    isApproved,
    isPending,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
