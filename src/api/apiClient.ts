const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
const AUTH_TOKEN_KEY = 'admin_token';

export type ApiError = {
  message?: string;
  statusCode?: number;
};

const parseJson = async (response: Response) => {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
};


const getBearerToken = async (): Promise<string | null> => {
  const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);

  // Always use the stored backend JWT — never replace it with a raw Firebase token.
  // The backend JWT is set by loginWithFirebase after the /auth/verify exchange.
  // Sending a raw Firebase ID token to the gateway would fail JWT_SECRET verification.
  return storedToken;
};

// Guard against multiple simultaneous 401 redirects
let _redirecting = false;

export const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const token = await getBearerToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'same-origin',
    ...options,
    headers,
  });

  const data = await parseJson(response);

  if (!response.ok) {
    // If unauthorized or no token, clear stored token and redirect to login
    if (response.status === 401 || (data && typeof data.message === 'string' && /no token|unauthor/i.test(data.message))) {
      if (!_redirecting) {
        _redirecting = true;
        try {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          localStorage.removeItem('admin_user');
        } catch {}
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        // Reset after a short delay to allow future redirects if needed
        setTimeout(() => { _redirecting = false; }, 3000);
      }
    }

    const error = new Error(data?.message || response.statusText || 'API request failed');
    (error as any).statusCode = data?.statusCode || response.status;
    (error as any).errors = data?.errors || null;
    throw error;
  }

  // Backend responses are standardized as { success, message, data }
  return data?.data ?? data;
};

export const setAuthToken = (token: string) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const clearAuthToken = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
};