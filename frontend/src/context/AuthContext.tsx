import React, { useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { api } from '../services/api';
import { AuthContext } from './auth-context';

export { useAuth } from './auth-context';
export type { AuthContextType } from './auth-context';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('sqms_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [lastWsEvent, setLastWsEvent] = useState<any>(null);
  const [logoutNotice, setLogoutNotice] = useState<string | null>(null);

  // Initialize or load profile
  useEffect(() => {
    async function loadUser() {
      if (token && !user) {
        try {
          const profile = await api.getMe();
          setUser(profile);
        } catch {
          localStorage.removeItem('sqms_token');
          setToken(null);
          setUser(null);
        }
      } else if (!token) {
        setUser(null);
      }
      setIsLoading(false);
    }
    loadUser();
  }, [token]);

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
    setUser(res.user);
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
    setUser(res.user);
    return res;
  };

  const resetPassword = async (email: string, newPassword: string) => {
    setLogoutNotice(null);
    const res = await api.resetPassword(email, newPassword);
    localStorage.setItem('sqms_token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
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
    setUser(res.user);
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
    setUser(updatedUser);
    return updatedUser;
  };

  const refreshUser = async () => {
    try {
      const profile = await api.getMe();
      setUser(profile);
      return profile;
    } catch (e) {
      console.error('Failed to refresh user:', e);
      return undefined;
    }
  };

  const logout = () => {
    localStorage.removeItem('sqms_token');
    setToken(null);
    setUser(null);
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
