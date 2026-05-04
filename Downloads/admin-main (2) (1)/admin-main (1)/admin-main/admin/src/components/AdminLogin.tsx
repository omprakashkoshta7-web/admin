import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Shield, AlertCircle } from 'lucide-react';
import { loginWithFirebase } from '../services/firebase-auth';
import { loginAdmin } from '../api/auth';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

const authMode = (import.meta.env.VITE_AUTH_MODE || 'backend').toLowerCase();
const useFirebaseAuth = authMode === 'firebase';

const AdminLogin = ({ onLoginSuccess }: AdminLoginProps) => {
  const [email, setEmail] = useState('admin@speedcopy.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (useFirebaseAuth) {
        await loginWithFirebase(email, password);
      } else {
        await loginAdmin(email, password);
      }

      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          'radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.82), transparent 24%), radial-gradient(circle at 100% 100%, rgba(124, 92, 255, 0.12), transparent 26%), linear-gradient(135deg, #e7e8ef 0%, #dfe2ea 48%, #d9dce6 100%)',
      }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 text-white"
            style={{
              background:
                'radial-gradient(circle at top, rgba(255, 255, 255, 0.04), transparent 24%), linear-gradient(180deg, #1e2535 0%, #171f2e 100%)',
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.2)',
            }}
          >
            <Shield size={24} />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Admin Portal</h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">
            {useFirebaseAuth ? 'SpeedCopy • Firebase Admin Access' : 'SpeedCopy • Backend Admin Access'}
          </p>
        </div>

        <div
          className="rounded-[28px] border overflow-hidden w-full min-h-[420px] sm:aspect-square"
          style={{
            background: 'rgba(255, 255, 255, 0.96)',
            borderColor: 'rgba(214, 220, 228, 0.9)',
            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
            backdropFilter: 'blur(18px)',
          }}
        >
          <div className="p-8 h-full flex flex-col justify-center">
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-[0.18em]">
                  Admin Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@speedcopy.com"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none transition bg-gray-50 focus:bg-white focus:border-gray-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-[0.18em]">
                  {useFirebaseAuth ? 'Firebase Password' : 'Admin Password'}
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={useFirebaseAuth ? 'Enter your Firebase password' : 'Enter your admin password'}
                    className="w-full pl-11 pr-10 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none transition bg-gray-50 focus:bg-white focus:border-gray-900"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-white font-bold rounded-2xl text-sm transition disabled:opacity-60"
                style={{
                  background:
                    'radial-gradient(circle at top, rgba(255, 255, 255, 0.04), transparent 24%), linear-gradient(180deg, #1e2535 0%, #171f2e 100%)',
                  boxShadow: '0 4px 12px rgba(30, 37, 53, 0.3)',
                }}
              >
                {loading ? 'Signing in...' : useFirebaseAuth ? 'Sign In with Firebase' : 'Sign In to Admin Portal'}
              </button>
            </form>

          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">SpeedCopy Admin Portal • All access is monitored</p>
      </div>
    </div>
  );
};

export default AdminLogin;
