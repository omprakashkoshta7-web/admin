import { request, setAuthToken, clearAuthToken } from './apiClient';

export type AdminAuthUser = {
  _id: string;
  email: string;
  name?: string;
  role: string;
  phone?: string;
  photoURL?: string;
  isActive?: boolean;
  isEmailVerified?: boolean;
  staffProfile?: {
    team?: string;
    permissions?: string[];
    scopes?: string[];
  };
  lastLogin?: string;
  fcmToken?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type AdminLoginResponse = {
  user: AdminAuthUser;
  token: string;
};

export type AdminSessionResponse = {
  _id: string;
  email: string;
  name?: string;
  role: string;
  phone?: string;
  photoURL?: string;
  isActive?: boolean;
  isEmailVerified?: boolean;
  staffProfile?: {
    team?: string;
    permissions?: string[];
    scopes?: string[];
  };
  lastLogin?: string;
  fcmToken?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type AdminSessionListResponse = {
  sessions?: Array<{
    sessionId: string;
    userId: string;
    email: string;
    role: string;
    loginTime: string;
    lastActivity: string;
    ipAddress: string;
    location: string;
    device: string;
    browser: string;
    status: 'active' | 'idle' | 'expired';
    isCurrent: boolean;
  }>;
  [key: string]: unknown;
};

export const loginAdmin = async (email: string, password: string): Promise<AdminLoginResponse> => {
  const response = await request<AdminLoginResponse>('/staff/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setAuthToken(response.token);
  localStorage.setItem('admin_user', JSON.stringify(response.user));
  return response;
};

export const logoutAdmin = () => {
  clearAuthToken();
  localStorage.removeItem('admin_user');
};

export const getStoredAdminUser = (): AdminAuthUser | null => {
  const stored = localStorage.getItem('admin_user');
  if (!stored) return null;
  try {
    return JSON.parse(stored) as AdminAuthUser;
  } catch {
    localStorage.removeItem('admin_user');
    return null;
  }
};

export const getAdminSession = async (): Promise<AdminSessionResponse> => {
  return await request<AdminSessionResponse>('/staff/auth/session');
};

export const getAdminSessions = async (): Promise<AdminSessionListResponse> => {
  return await request<AdminSessionListResponse>('/staff/auth/sessions');
};

export const killAdminSession = async (sessionId: string): Promise<{ success: boolean; message?: string }> => {
  return await request(`/staff/auth/session/${sessionId}`, {
    method: 'DELETE',
  });
};
