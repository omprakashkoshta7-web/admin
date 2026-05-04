import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Shield, AlertTriangle } from "lucide-react";

const FirebaseLoginPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{email?: string; password?: string}>({});
  const [backendError, setBackendError] = useState<string | null>(null);

  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    if (!form.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Invalid email format";
    }
    
    if (!form.password) {
      newErrors.password = "Password is required";
    } else if (form.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setErrors({});
    setBackendError(null);

    try {
      // Dynamically import Firebase to avoid import errors
      const { loginWithFirebase } = await import("../../services/firebase-auth");
      const { user } = await loginWithFirebase(form.email, form.password);
      
      // Store user session
      const session = {
        userId: user.uid,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        sessionId: `sess_${Date.now()}`,
        loginTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      };
      
      localStorage.setItem("admin_session", JSON.stringify(session));
      
      // Navigate to dashboard
      navigate("/dashboard");
    } catch (error: any) {
      const errorMessage = error?.message || 'Authentication failed';
      
      // Handle specific Firebase errors
      if (errorMessage.includes('user-not-found')) {
        setBackendError('User not found. Please check your email.');
      } else if (errorMessage.includes('wrong-password')) {
        setBackendError('Incorrect password. Please try again.');
      } else if (errorMessage.includes('too-many-requests')) {
        setBackendError('Too many failed login attempts. Please try again later.');
      } else {
        setBackendError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4"
      style={{ 
        background: 'radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.82), transparent 24%), radial-gradient(circle at 100% 100%, rgba(124, 92, 255, 0.12), transparent 26%), linear-gradient(135deg, #e7e8ef 0%, #dfe2ea 48%, #d9dce6 100%)'
      }}
    >
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div 
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 text-white"
            style={{ 
              background: 'radial-gradient(circle at top, rgba(255, 255, 255, 0.04), transparent 24%), linear-gradient(180deg, #1e2535 0%, #171f2e 100%)',
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.2)'
            }}
          >
            <Shield size={24} />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Admin Portal</h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">SpeedCopy • Firebase Authentication</p>
        </div>

        <div 
          className="rounded-[28px] border overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.96)',
            borderColor: 'rgba(214, 220, 228, 0.9)',
            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
            backdropFilter: 'blur(18px)'
          }}
        >
          <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-[0.18em]">
                  Admin Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="email" 
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="admin@speedcopy.com"
                    className={`w-full pl-11 pr-10 py-3 rounded-2xl border text-sm focus:outline-none transition bg-gray-50 focus:bg-white ${
                      errors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-gray-900'
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-[0.18em]">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type={showPass ? "text" : "password"}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Enter your password"
                    className={`w-full pl-11 pr-10 py-3 rounded-2xl border text-sm focus:outline-none transition bg-gray-50 focus:bg-white ${
                      errors.password ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-gray-900'
                    }`}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPass(s => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPass ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.password}</p>
                )}
              </div>

              {backendError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                  <span>{backendError}</span>
                </div>
              )}

              {/* Security Notice */}
              <div 
                className="flex items-start gap-3 py-3 px-4 rounded-2xl border"
                style={{ 
                  backgroundColor: 'rgba(99, 102, 241, 0.05)',
                  borderColor: 'rgba(99, 102, 241, 0.2)'
                }}
              >
                <Shield size={18} className="mt-0.5 flex-shrink-0" style={{ color: '#6366f1' }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: '#6366f1' }}>Firebase Secured</p>
                  <p className="text-xs text-gray-600">
                    Your credentials are securely managed by Firebase
                  </p>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 text-white font-bold rounded-2xl text-sm transition disabled:opacity-60"
                style={{ 
                  background: 'radial-gradient(circle at top, rgba(255, 255, 255, 0.04), transparent 24%), linear-gradient(180deg, #1e2535 0%, #171f2e 100%)',
                  boxShadow: '0 4px 12px rgba(30, 37, 53, 0.3)'
                }}
              >
                {loading ? "Authenticating..." : "Login to Admin Portal →"}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs text-center text-gray-400">
                🔒 Admin-only access • All actions are logged
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          SpeedCopy Admin Portal • Powered by Firebase
        </p>
      </div>
    </div>
  );
};

export default FirebaseLoginPage;
