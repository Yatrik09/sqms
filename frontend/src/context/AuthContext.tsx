import React, { useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { api } from '../services/api';
import { AuthContext } from './auth-context';

export { useAuth } from './auth-context';
export type { AuthContextType } from './auth-context';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('sqms_cached_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(localStorage.getItem('sqms_token'));
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const t = localStorage.getItem('sqms_token');
    const c = localStorage.getItem('sqms_cached_user');
    return Boolean(t && !c);
  });
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [lastWsEvent, setLastWsEvent] = useState<any>(null);
  const [logoutNotice, setLogoutNotice] = useState<string | null>(null);

  const saveUser = (u: User | null) => {
    setUser(u);
    if (u) {
      try {
        localStorage.setItem('sqms_cached_user', JSON.stringify(u));
      } catch {
        // ignore
      }
    } else {
      localStorage.removeItem('sqms_cached_user');
    }
  };

  // Proactive Keepalive to prevent Render free-tier cold starts
  useEffect(() => {
    api.warmupBackend();
    const keepalive = setInterval(() => {
      api.warmupBackend();
    }, 210000); // 3.5 mins
    return () => clearInterval(keepalive);
  }, []);

  // Initialize or revalidate profile once on app mount
  useEffect(() => {
    let isMounted = true;
    async function loadUser() {
      const storedToken = localStorage.getItem('sqms_token');
      if (storedToken) {
        try {
          const profile = await api.getMe();
          if (isMounted && profile) saveUser(profile);
        } catch (err: any) {
          // Only reset session if server explicitly returned 401 Unauthorized
          if (err?.status === 401 || err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
            localStorage.removeItem('sqms_token');
            setToken(null);
            saveUser(null);
          }
        }
      } else {
        saveUser(null);
      }
      if (isMounted) setIsLoading(false);
    }
    loadUser();
    return () => {
      isMounted = false;
    };
  }, []);

  // WebSocket Connection for real-time updates
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    function connectWs() {
      try {
        const defaultWs = 'wss://sqms-backend-gd00.onrender.com/ws';
        const wsUrl = import.meta.env.VITE_WS_URL || defaultWs;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setLastWsEvent(data);
          } catch {
            // keep alive ping
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          reconnectTimeout = setTimeout(connectWs, 3000);
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        setWsConnected(false);
      }
    }

    connectWs();

    // Heartbeat
    const pingInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send('ping');
      }
    }, 15000);

    return () => {
      clearInterval(pingInterval);
      clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    setLogoutNotice(null);
    const res = await api.login(email, pass);
    localStorage.setItem('sqms_token', res.access_token);
    setToken(res.access_token);
    saveUser(res.user);
    return res;
  };

  const register = async (
    name: string,
    email: string,
    pass: string,
    phone?: string,
    city?: string,
    area?: string,
    latitude?: number,
    longitude?: number
  ) => {
    setLogoutNotice(null);
    const res = await api.register(name, email, pass, phone, city, area, latitude, longitude);
    localStorage.setItem('sqms_token', res.access_token);
    setToken(res.access_token);
    saveUser(res.user);
    return res;
  };

  const resetPassword = async (email: string, newPassword: string) => {
    setLogoutNotice(null);
    const res = await api.resetPassword(email, newPassword);
    localStorage.setItem('sqms_token', res.access_token);
    setToken(res.access_token);
    saveUser(res.user);
    return res;
  };

  const requestPasswordResetOTP = async (email: string) => {
    setLogoutNotice(null);
    return await api.requestPasswordResetOTP(email);
  };

  const verifyOTPAndResetPassword = async (email: string, otp: string, newPassword: string) => {
    setLogoutNotice(null);
    const res = await api.verifyOTPAndResetPassword(email, otp, newPassword);
    localStorage.setItem('sqms_token', res.access_token);
    setToken(res.access_token);
    saveUser(res.user);
    return res;
  };

  const updateProfile = async (data: {
    name?: string;
    email?: string;
    phone?: string;
    city?: string;
    area?: string;
    latitude?: number;
    longitude?: number;
    current_password?: string;
    new_password?: string;
  }) => {
    const updatedUser = await api.updateProfile(data);
    saveUser(updatedUser);
    return updatedUser;
  };

  const refreshUser = async () => {
    try {
      const profile = await api.getMe();
      saveUser(profile);
      return profile;
    } catch (e) {
      console.error('Failed to refresh user:', e);
      return undefined;
    }
  };

  const logout = () => {
    localStorage.removeItem('sqms_token');
    setToken(null);
    saveUser(null);
    setLogoutNotice('You have been logged out successfully. Sign in with your credentials to access the system.');
  };

  const clearLogoutNotice = () => {
    setLogoutNotice(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        wsConnected,
        lastWsEvent,
        logoutNotice,
        login,
        register,
        resetPassword,
        requestPasswordResetOTP,
        verifyOTPAndResetPassword,
        updateProfile,
        refreshUser,
        logout,
        clearLogoutNotice,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
