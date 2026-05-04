import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Shield, Smartphone, CheckCircle, AlertTriangle, Monitor } from "lucide-react";
import { loginAdmin } from "../../api/auth";
import { loginWithFirebase } from "../../services/firebase-auth";
import { getRoleColor } from "../../utils/colors";

type Step = "login" | "mfa" | "role-select";
type AdminRole = "SuperAdmin" | "Admin" | "Moderator" | "Support";

interface AdminSession {
  userId: string;
  email: string;
  role: AdminRole;
  permissions: string[];
  sessionId: string;
  loginTime: string;
  lastActivity: string;
  ipAddress: string;
  userAgent: string;
}

// Reusable Components
const InputField = ({ 
  label, 
  type = "text", 
  value, 
  onChange, 
  placeholder, 
  icon: Icon,
  showToggle,
  onToggle,
  error 
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: any;
  showToggle?: boolean;
  onToggle?: () => void;
  error?: string;
}) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-[0.18em]">
      {label}
    </label>
    <div className="relative">
      <Icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
      <input 
        type={type} 
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full pl-11 pr-10 py-3 rounded-2xl border text-sm focus:outline-none transition bg-gray-50 focus:bg-white ${
          error ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-gray-900'
        }`}
      />
      {showToggle && (
        <button 
          type="button" 
          onClick={onToggle}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {type === "password" ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      )}
    </div>
    {error && (
      <p className="text-xs text-red-500 mt-1.5 font-medium">{error}</p>
    )}
  </div>
);

const RoleCard = ({ 
  role, 
  onClick,
  permissions 
}: { 
  role: AdminRole; 
  onClick: () => void;
  permissions: string[];
}) => {
  const roleConfig = {
    SuperAdmin: { 
      icon: Shield, 
      description: "Full system access including kill switches and financial controls",
      badge: "Highest Access"
    },
    Admin: { 
      icon: Monitor, 
      description: "Operations management, vendor control, and customer oversight",
      badge: "Full Operations"
    },
    Moderator: { 
      icon: CheckCircle, 
      description: "Content moderation, support escalation, and basic reporting",
      badge: "Limited Access"
    },
    Support: { 
      icon: AlertTriangle, 
      description: "Customer support, ticket management, and basic order operations",
      badge: "Support Only"
    }
  };

  const { icon: Icon, description, badge } = roleConfig[role];
  const colors = getRoleColor(role);

  return (
    <button
      onClick={onClick}
      className="w-full p-4 rounded-2xl border border-gray-200 hover:border-gray-900 transition text-left group"
    >
      <div className="flex items-start gap-3">
        <div 
          className="w-10 h-10 rounded-xl transition flex items-center justify-center flex-shrink-0"
          style={{ 
            backgroundColor: colors.bg,
            color: colors.text
          }}
        >
          <Icon size={18} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-bold text-gray-900">{role}</p>
            <span 
              className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
              style={{
                backgroundColor: colors.bg,
                color: colors.text
              }}
            >
              {badge}
            </span>
          </div>
          <p className="text-xs text-gray-600 mb-2">{description}</p>
          <p className="text-xs text-gray-400">{permissions.length} permissions</p>
        </div>
      </div>
    </button>
  );
};

const LoginPage = () => {
  const authMode = (import.meta.env.VITE_AUTH_MODE || "backend").toLowerCase();
  const useFirebaseAuth = authMode === "firebase";
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("login");
  const [form, setForm] = useState({ email: "", password: "" });
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{email?: string; password?: string; otp?: string}>({});
  const [backendError, setBackendError] = useState<string | null>(null);
  const [availableRoles, setAvailableRoles] = useState<AdminRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const session = localStorage.getItem("admin_session");
    if (session) {
      try {
        const parsedSession = JSON.parse(session);
        // Validate session is still valid (not expired)
        const loginTime = new Date(parsedSession.loginTime);
        const now = new Date();
        const hoursSinceLogin = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceLogin < 8) { // 8 hour session timeout
          navigate("/dashboard");
        } else {
          localStorage.removeItem("admin_session");
        }
      } catch (error) {
        localStorage.removeItem("admin_session");
      }
    }
  }, [navigate]);

  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    if (!form.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Invalid email format";
    }
    
    if (!form.password) {
      newErrors.password = "Password is required";
    } else if (form.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLocked) {
      setErrors({ email: "Account temporarily locked due to multiple failed attempts" });
      return;
    }
    
    if (!validateForm()) return;
    
    setLoading(true);
    setErrors({});
    setBackendError(null);

    try {
      const { user } = useFirebaseAuth
        ? await loginWithFirebase(form.email, form.password)
        : await loginAdmin(form.email, form.password);

      // Allow admin, super_admin — block only non-admin roles
      const allowedRoles = ['admin', 'super_admin', 'superadmin', 'staff'];
      if (!allowedRoles.includes(user.role?.toLowerCase?.())) {
        throw new Error('Only admin users can access this portal');
      }

      const mappedRole: AdminRole = 
        (user.role === 'super_admin' || user.role === 'superadmin') ? 'SuperAdmin' :
        user.role === 'admin' ? 'SuperAdmin' :
        'Support';
      setAvailableRoles([mappedRole]);
      setSelectedRole(mappedRole);
      setStep('mfa');
    } catch (error: any) {
      setLoginAttempts(prev => prev + 1);
      if (loginAttempts >= 2) {
        setIsLocked(true);
        setTimeout(() => setIsLocked(false), 300000); // 5 minute lockout
      }
      setErrors({ password: error?.message ? '' : 'Invalid credentials' });
      setBackendError(error?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = (role: AdminRole) => {
    setSelectedRole(role);
    setStep("mfa");
  };

  const getPermissionsByRole = (role: AdminRole): string[] => {
    switch (role) {
      case "SuperAdmin":
        return [
          "system.kill_switch", "system.feature_flags", "finance.full_access", 
          "orders.full_control", "vendors.full_control", "customers.full_control",
          "staff.management", "reports.all", "audit.full_access", "platform.config"
        ];
      case "Admin":
        return [
          "orders.management", "vendors.control", "customers.management", 
          "sla.management", "delivery.control", "support.escalation", "reports.operational"
        ];
      case "Moderator":
        return [
          "orders.view", "customers.basic", "support.tickets", "reports.basic"
        ];
      case "Support":
        return [
          "support.tickets", "orders.basic_view", "customers.basic"
        ];
      default:
        return [];
    }
  };

  const completeLogin = (role: AdminRole) => {
    const permissions = getPermissionsByRole(role);
    const now = new Date();
    
    const session: AdminSession = {
      userId: "ADM_001",
      email: form.email,
      role,
      permissions,
      sessionId: `sess_${Date.now()}`,
      loginTime: now.toISOString(),
      lastActivity: now.toISOString(),
      ipAddress: 'Unknown',
      userAgent: navigator.userAgent
    };
    
    localStorage.setItem("admin_session", JSON.stringify(session));

    // Ensure admin_user has the correct role for permission checks (e.g. city-pause)
    const storedUser = (() => { try { return JSON.parse(localStorage.getItem('admin_user') || '{}'); } catch { return {}; } })();
    if (storedUser && Object.keys(storedUser).length > 0) {
      const backendRole = storedUser.role;
      // Only override if backend didn't already return super_admin
      if (backendRole !== 'super_admin' && role === 'SuperAdmin') {
        localStorage.setItem('admin_user', JSON.stringify({ ...storedUser, role: 'super_admin' }));
      }
    }
    
    if (role === "SuperAdmin") navigate("/dashboard");
    else if (role === "Admin") navigate("/orders");
    else if (role === "Moderator") navigate("/support");
    else navigate("/support");
  };

  const handleOtpChange = (val: string, idx: number) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) {
      const el = document.getElementById(`otp-${idx + 1}`);
      el?.focus();
    }
  };

  const handleMfaVerify = () => {
    const code = otp.join("");
    if (code.length < 6) { 
      setErrors({ otp: "Enter complete 6-digit code" }); 
      return; 
    }
    
    setLoading(true);
    setErrors({});
    
    setTimeout(() => { 
      setLoading(false); 
      if (code === "123456") { // Mock MFA validation
        completeLogin(selectedRole!);
      } else {
        setErrors({ otp: "Invalid verification code" });
        setOtp(["","","","","",""]);
      }
    }, 800);
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
          <p className="text-sm text-gray-500 mt-2 font-medium">
            {useFirebaseAuth ? "SpeedCopy • Firebase Secure Access" : "SpeedCopy • Secure Access"}
          </p>
          {isLocked && (
            <div className="mt-3 p-3 rounded-2xl bg-red-50 border border-red-200">
              <p className="text-xs text-red-600 font-medium">Account temporarily locked</p>
            </div>
          )}
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

          {/* Step 1: Login */}
          {step === "login" && (
            <div className="p-8">
              <form onSubmit={handleLogin} className="space-y-5">
                <InputField
                  label="Admin Email"
                  value={form.email}
                  onChange={(value) => setForm(f => ({ ...f, email: value }))}
                  placeholder="admin@speedcopy.com"
                  icon={Mail}
                  error={errors.email}
                />

                <InputField
                  label="Password"
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={(value) => setForm(f => ({ ...f, password: value }))}
                  placeholder="Enter secure password"
                  icon={Lock}
                  showToggle
                  onToggle={() => setShowPass(s => !s)}
                  error={errors.password}
                />

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
                  <Smartphone size={18} className="mt-0.5 flex-shrink-0" style={{ color: '#6366f1' }} />
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#6366f1' }}>MFA Required</p>
                    <p className="text-xs text-gray-600">
                      Two-factor authentication is mandatory for all admin accounts
                    </p>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading || isLocked}
                  className="w-full py-3 text-white font-bold rounded-2xl text-sm transition disabled:opacity-60"
                  style={{ 
                    background: 'radial-gradient(circle at top, rgba(255, 255, 255, 0.04), transparent 24%), linear-gradient(180deg, #1e2535 0%, #171f2e 100%)',
                    boxShadow: '0 4px 12px rgba(30, 37, 53, 0.3)'
                  }}
                >
                  {loading ? "Authenticating..." : isLocked ? "Account Locked" : "Continue to MFA →"}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-xs text-center text-gray-400">
                  🔒 Admin-only access • All actions are logged
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Role Selection */}
          {step === "role-select" && (
            <div className="p-8">
              <div className="text-center mb-6">
                <div 
                  className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3"
                  style={{ 
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    color: '#6366f1'
                  }}
                >
                  <Shield size={20} />
                </div>
                <h2 className="text-lg font-black text-gray-900">Select Access Level</h2>
                <p className="text-sm text-gray-600 mt-2">Choose your administrative role for this session</p>
              </div>

              <div className="space-y-3 mb-6">
                {availableRoles.map((role) => (
                  <RoleCard 
                    key={role} 
                    role={role} 
                    onClick={() => handleRoleSelect(role)}
                    permissions={getPermissionsByRole(role)}
                  />
                ))}
              </div>

              <button 
                onClick={() => { setStep("login"); setErrors({}); }}
                className="w-full py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 transition"
              >
                ← Back to login
              </button>
            </div>
          )}

          {/* Step 3: MFA */}
          {step === "mfa" && (
            <div className="p-8">
              <div className="text-center mb-6">
                <div 
                  className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3"
                  style={{ 
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    color: '#22c55e'
                  }}
                >
                  <Smartphone size={20} />
                </div>
                <h2 className="text-lg font-black text-gray-900">Two-Factor Authentication</h2>
                <p className="text-sm text-gray-600 mt-2">
                  Enter the 6-digit code from your authenticator app
                </p>
                {selectedRole && (
                  <div className="mt-3">
                    <span 
                      className="text-xs px-3 py-1.5 rounded-full font-semibold"
                      style={{
                        backgroundColor: getRoleColor(selectedRole).bg,
                        color: getRoleColor(selectedRole).text
                      }}
                    >
                      Logging in as {selectedRole}
                    </span>
                  </div>
                )}
              </div>

              {errors.otp && (
                <div 
                  className="px-4 py-3 rounded-2xl text-sm font-semibold mb-4 border flex items-start gap-2"
                  style={{ 
                    backgroundColor: 'rgba(239, 68, 68, 0.05)',
                    borderColor: 'rgba(239, 68, 68, 0.2)',
                    color: '#ef4444'
                  }}
                >
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                  <span>{errors.otp}</span>
                </div>
              )}

              {/* OTP inputs */}
              <div className="flex gap-3 justify-center mb-6">
                {otp.map((digit, i) => (
                  <input 
                    key={i} 
                    id={`otp-${i}`}
                    type="text" 
                    inputMode="numeric" 
                    maxLength={1} 
                    value={digit}
                    onChange={e => handleOtpChange(e.target.value, i)}
                    onKeyDown={e => { 
                      if (e.key === "Backspace" && !digit && i > 0) 
                        document.getElementById(`otp-${i - 1}`)?.focus(); 
                    }}
                    className="w-12 h-12 text-center text-lg font-black rounded-2xl border border-gray-200 focus:outline-none focus:border-gray-900 bg-gray-50 focus:bg-white transition" 
                  />
                ))}
              </div>

              <button 
                onClick={handleMfaVerify} 
                disabled={loading}
                className="w-full py-3 text-white font-bold rounded-2xl text-sm transition disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ 
                  background: 'radial-gradient(circle at top, rgba(255, 255, 255, 0.04), transparent 24%), linear-gradient(180deg, #1e2535 0%, #171f2e 100%)',
                  boxShadow: '0 4px 12px rgba(30, 37, 53, 0.3)'
                }}
              >
                {loading ? "Verifying..." : <><CheckCircle size={16} /> Verify & Access Portal</>}
              </button>

              <button 
                onClick={() => { 
                  const prevStep = availableRoles.length > 1 ? "role-select" : "login";
                  setStep(prevStep); 
                  setOtp(["","","","","",""]); 
                  setErrors({}); 
                }}
                className="w-full mt-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 transition"
              >
                ← Back to {availableRoles.length > 1 ? "role selection" : "login"}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          SpeedCopy Admin Portal • All access is monitored
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
