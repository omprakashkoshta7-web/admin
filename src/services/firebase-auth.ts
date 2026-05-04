import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type AuthError,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../config/firebase';
import { setAuthToken, clearAuthToken } from '../api/apiClient';

export interface AdminUser {
  uid: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'staff';
  permissions: string[];
}

type VerifyResponse = {
  token?: string;
  user: {
    _id: string;
    firebaseUid?: string;
    email: string;
    name?: string;
    role: 'admin' | 'staff' | string;
    staffProfile?: {
      permissions?: string[];
    };
  };
};

const mapAdminUser = (user: VerifyResponse['user']): AdminUser => ({
  uid: user.firebaseUid || user._id,
  email: user.email || '',
  displayName: user.name || undefined,
  role: user.role === 'staff' ? 'staff' : 'admin',
  permissions: user.staffProfile?.permissions || [],
});

export const loginWithFirebase = async (
  email: string,
  password: string
): Promise<{ user: AdminUser; token: string }> => {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase login is not configured for this admin app');
  }

  try {
    // Step 1: Sign in with Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseToken = await userCredential.user.getIdToken();

    console.log('Firebase login successful, exchanging token...');

    // Step 2: Exchange Firebase token for backend JWT
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${firebaseToken}`,
      },
      body: JSON.stringify({ role: 'admin' }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      await signOut(auth);
      throw new Error(errorData.message || 'Failed to verify Firebase token with backend');
    }

    const payload = await response.json();
    console.log('Backend verify response:', payload);

    // Backend returns: { success: true, message: "...", data: { user, token } }
    // OR direct format: { user, token }
    const responseData = payload?.data || payload;
    const backendToken = responseData?.token;
    const user = responseData?.user;

    console.log('Extracted data:', { hasToken: !!backendToken, hasUser: !!user, userRole: user?.role });

    if (!backendToken || !user) {
      await signOut(auth);
      throw new Error('Invalid response from backend - missing token or user data');
    }

    if (!user.role) {
      await signOut(auth);
      throw new Error('Invalid user data - role is missing');
    }

    if (user.role !== 'admin' && user.role !== 'staff') {
      await signOut(auth);
      throw new Error('This Firebase account is not approved for admin access');
    }

    // Step 3: Store backend JWT (not Firebase token)
    const adminUser = mapAdminUser(user);
    setAuthToken(backendToken);
    localStorage.setItem('admin_user', JSON.stringify(user));

    console.log('✅ Login successful - backend JWT stored');

    return { user: adminUser, token: backendToken };
  } catch (error) {
    const authError = error as AuthError & { message?: string };

    if (authError.code === 'auth/invalid-credential') {
      throw new Error('Invalid email or password');
    }

    throw new Error(authError.message || 'Login failed');
  }
};

export const logoutFirebase = async (): Promise<void> => {
  try {
    // Step 1: Sign out from Firebase
    await signOut(auth);
    
    // Step 2: Clear backend JWT
    clearAuthToken();
    localStorage.removeItem('admin_user');
    
    console.log('✅ Logged out successfully');
  } catch (error) {
    const authError = error as AuthError;
    throw new Error(authError.message || 'Logout failed');
  }
};

export const getCurrentUser = (): Promise<AdminUser | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        clearAuthToken();
        localStorage.removeItem('admin_user');
        resolve(null);
        unsubscribe();
        return;
      }

      try {
        // Get fresh Firebase token
        const firebaseToken = await firebaseUser.getIdToken();
        
        // Exchange for backend JWT
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${firebaseToken}`,
          },
          body: JSON.stringify({ role: 'admin' }),
        });

        if (!response.ok) {
          clearAuthToken();
          localStorage.removeItem('admin_user');
          resolve(null);
          unsubscribe();
          return;
        }

        const payload = await response.json();
        const responseData = payload?.data || payload;
        const backendToken = responseData?.token;
        const user = responseData?.user;

        if (!backendToken || !user || !user.role || (user.role !== 'admin' && user.role !== 'staff')) {
          clearAuthToken();
          localStorage.removeItem('admin_user');
          resolve(null);
        } else {
          setAuthToken(backendToken);
          localStorage.setItem('admin_user', JSON.stringify(user));
          resolve(mapAdminUser(user));
        }
      } catch (error) {
        console.error('getCurrentUser Error:', error);
        clearAuthToken();
        localStorage.removeItem('admin_user');
        resolve(null);
      } finally {
        unsubscribe();
      }
    });
  });
};

export const getAuthToken = async (): Promise<string | null> => {
  return localStorage.getItem('admin_token');
};

export const isAuthenticated = (): boolean => {
  return auth.currentUser !== null && Boolean(localStorage.getItem('admin_token'));
};

export { auth };
