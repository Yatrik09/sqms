import { createContext, useContext } from 'react';
import type { User } from '../types';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  wsConnected: boolean;
  lastWsEvent: any;
  logoutNotice: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    phone?: string,
    city?: string,
    area?: string,
    latitude?: number,
    longitude?: number
  ) => Promise<void>;
  resetPassword: (email: string, newPassword: string) => Promise<void>;
  requestPasswordResetOTP: (email: string) => Promise<{
    status: string;
    message: string;
    email: string;
    expires_in_seconds: number;
    dev_otp?: string;
  }>;
  verifyOTPAndResetPassword: (email: string, otp: string, newPassword: string) => Promise<void>;
  updateProfile: (data: {
    name?: string;
    email?: string;
    phone?: string;
    city?: string;
    area?: string;
    latitude?: number;
    longitude?: number;
    current_password?: string;
    new_password?: string;
  }) => Promise<User>;
  refreshUser: () => Promise<User | undefined>;
  logout: () => void;
  clearLogoutNotice: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
