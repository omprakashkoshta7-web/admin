import { useState, useEffect } from "react";
import { Monitor, Smartphone, MapPin, Clock, Shield, AlertTriangle, LogOut, RefreshCw } from "lucide-react";
import { ADMIN_COLORS, getStatusColor } from "../../utils/colors";
import { getAdminSessions, killAdminSession } from "../../api/auth";
import LoadingState from "../../components/ui/LoadingState";

interface ActiveSession {
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
}

// Reusable Components
const SectionCard = ({ 
  icon: Icon, 
  title, 
  badge, 
  children 
}: { 
  icon: any; 
  title: string; 
  badge?: { text: string; type: 'info' | 'warning' | 'success' | 'error' }; 
  children: React.ReactNode; 
}) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
    <div className="flex items-center gap-2 mb-5">
      <Icon size={16} className="text-gray-500" />
      <h2 className="font-bold text-gray-900 text-sm">{title}</h2>
      {badge && (
        <span 
          className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold border"
          style={{
            backgroundColor: badge.type === 'warning' ? ADMIN_COLORS.warningBg : 
                           badge.type === 'success' ? ADMIN_COLORS.successBg : 
                           badge.type === 'error' ? ADMIN_COLORS.errorBg : ADMIN_COLORS.infoBg,
            color: badge.type === 'warning' ? ADMIN_COLORS.warning : 
                   badge.type === 'success' ? ADMIN_COLORS.success : 
                   badge.type === 'error' ? ADMIN_COLORS.error : ADMIN_COLORS.info,
            borderColor: badge.type === 'warning' ? ADMIN_COLORS.warningBorder : 
                        badge.type === 'success' ? ADMIN_COLORS.successBorder : 
                        badge.type === 'error' ? ADMIN_COLORS.errorBorder : ADMIN_COLORS.infoBorder
          }}
        >
          {badge.text}
        </span>
      )}
    </div>
    {children}
  </div>
);

const SessionRow = ({ 
  session, 
  onForceLogout 
}: { 
  session: ActiveSession; 
  onForceLogout: (sessionId: string) => void; 
}) => {
  const statusColors = getStatusColor(session.status);
  const timeSinceLogin = new Date().getTime() - new Date(session.loginTime).getTime();
  const hoursSinceLogin = Math.floor(timeSinceLogin / (1000 * 60 * 60));
  const minutesSinceLogin = Math.floor((timeSinceLogin % (1000 * 60 * 60)) / (1000 * 60));
  
  const timeSinceActivity = new Date().getTime() - new Date(session.lastActivity).getTime();
  const minutesSinceActivity = Math.floor(timeSinceActivity / (1000 * 60));

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition">
      {/* Device Icon */}
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: statusColors.bg }}
      >
        {session.device.includes('Mobile') ? 
          <Smartphone size={16} style={{ color: statusColors.text }} /> : 
          <Monitor size={16} style={{ color: statusColors.text }} />
        }
      </div>

      {/* Session Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-bold text-gray-900 truncate">{session.email}</p>
          {session.isCurrent && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-600 border border-blue-200">
              Current Session
            </span>
          )}
          <span 
            className="text-xs px-2 py-0.5 rounded-full font-semibold border"
            style={{
              backgroundColor: statusColors.bg,
              color: statusColors.text,
              borderColor: statusColors.border
            }}
          >
            {session.status}
          </span>
        </div>
        
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Shield size={12} />
            <span>{session.role}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin size={12} />
            <span>{session.location}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>
              {hoursSinceLogin > 0 ? `${hoursSinceLogin}h ${minutesSinceLogin}m` : `${minutesSinceLogin}m`} ago
            </span>
          </div>
        </div>
        
        <div className="mt-1 text-xs text-gray-400">
          <span>{session.browser} • {session.ipAddress}</span>
          {session.status === 'active' && (
            <span className="ml-2">• Active {minutesSinceActivity}m ago</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {!session.isCurrent && (
          <button
            onClick={() => onForceLogout(session.sessionId)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition hover:bg-red-50"
            style={{ color: ADMIN_COLORS.error }}
          >
            <LogOut size={12} />
            Force Logout
          </button>
        )}
      </div>
    </div>
  );
};

const SessionPage = () => {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [forceLogoutModal, setForceLogoutModal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch sessions from backend API
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getAdminSessions();
        const sessionsList = Array.isArray(response?.sessions) ? response.sessions : [];
        setSessions(sessionsList);
      } catch (err) {
        console.error('Failed to fetch sessions:', err);
        setError('Failed to load sessions. Please try again.');
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const handleForceLogout = async (sessionId: string) => {
    try {
      await killAdminSession(sessionId);
      setSessions(prev => prev.filter(s => s.sessionId !== sessionId));
      setForceLogoutModal(null);
    } catch (err) {
      console.error('Failed to force logout session:', err);
      setError('Failed to terminate session. Please try again.');
      setForceLogoutModal(null);
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAdminSessions();
      const sessionsList = Array.isArray(response?.sessions) ? response.sessions : [];
      setSessions(sessionsList);
    } catch (err) {
      console.error('Failed to refresh sessions:', err);
      setError('Failed to refresh sessions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const activeSessions = sessions.filter(s => s.status === 'active');
  const idleSessions = sessions.filter(s => s.status === 'idle');
  const expiredSessions = sessions.filter(s => s.status === 'expired');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingState message="Loading active sessions..." />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Session Management</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor and control active admin sessions</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div 
          className="p-4 rounded-xl border"
          style={{ 
            backgroundColor: ADMIN_COLORS.errorBg,
            borderColor: ADMIN_COLORS.errorBorder
          }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} style={{ color: ADMIN_COLORS.error }} className="mt-0.5 flex-shrink-0" />
            <p className="text-sm" style={{ color: ADMIN_COLORS.error }}>{error}</p>
          </div>
        </div>
      )}

      {/* Session Statistics */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Sessions", value: sessions.length.toString(), color: ADMIN_COLORS.info, bg: ADMIN_COLORS.infoBg },
          { label: "Active Now", value: activeSessions.length.toString(), color: ADMIN_COLORS.success, bg: ADMIN_COLORS.successBg },
          { label: "Idle Sessions", value: idleSessions.length.toString(), color: ADMIN_COLORS.warning, bg: ADMIN_COLORS.warningBg },
          { label: "Expired", value: expiredSessions.length.toString(), color: ADMIN_COLORS.error, bg: ADMIN_COLORS.errorBg }
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: stat.bg }}
              >
                <Monitor size={14} style={{ color: stat.color }} />
              </div>
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">{stat.label}</span>
            </div>
            <p className="text-2xl font-black text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Active Sessions */}
      <SectionCard 
        icon={Shield} 
        title="Active Sessions" 
        badge={{ text: `${activeSessions.length} active`, type: "success" }}
      >
        <div className="space-y-3">
          {activeSessions.length > 0 ? (
            activeSessions.map((session) => (
              <SessionRow 
                key={session.sessionId} 
                session={session} 
                onForceLogout={(id) => setForceLogoutModal(id)} 
              />
            ))
          ) : (
            <div className="text-center py-8">
              <Monitor size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No active sessions</p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Idle Sessions */}
      {idleSessions.length > 0 && (
        <SectionCard 
          icon={Clock} 
          title="Idle Sessions" 
          badge={{ text: `${idleSessions.length} idle`, type: "warning" }}
        >
          <div className="space-y-3">
            {idleSessions.map((session) => (
              <SessionRow 
                key={session.sessionId} 
                session={session} 
                onForceLogout={(id) => setForceLogoutModal(id)} 
              />
            ))}
          </div>
        </SectionCard>
      )}

      {/* Expired Sessions */}
      {expiredSessions.length > 0 && (
        <SectionCard 
          icon={AlertTriangle} 
          title="Expired Sessions" 
          badge={{ text: `${expiredSessions.length} expired`, type: "error" }}
        >
          <div className="space-y-3">
            {expiredSessions.map((session) => (
              <SessionRow 
                key={session.sessionId} 
                session={session} 
                onForceLogout={(id) => setForceLogoutModal(id)} 
              />
            ))}
          </div>
        </SectionCard>
      )}

      {/* Security Notice */}
      <div 
        className="p-4 rounded-xl border"
        style={{ 
          backgroundColor: ADMIN_COLORS.infoBg,
          borderColor: ADMIN_COLORS.infoBorder
        }}
      >
        <div className="flex items-start gap-3">
          <Shield size={16} style={{ color: ADMIN_COLORS.info }} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold" style={{ color: ADMIN_COLORS.info }}>Security Notice</p>
            <p className="text-xs mt-1" style={{ color: ADMIN_COLORS.info }}>
              All admin sessions are monitored and logged. Sessions automatically expire after 8 hours of inactivity. 
              Force logout immediately terminates the session and requires re-authentication.
            </p>
          </div>
        </div>
      </div>

      {/* Force Logout Confirmation Modal */}
      {forceLogoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: ADMIN_COLORS.errorBg }}
              >
                <AlertTriangle size={18} style={{ color: ADMIN_COLORS.error }} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Force Logout Session</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to force logout this session? The user will be immediately 
              disconnected and will need to re-authenticate.
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setForceLogoutModal(null)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleForceLogout(forceLogoutModal)}
                className="flex-1 px-4 py-2 text-white font-bold rounded-xl transition"
                style={{ backgroundColor: ADMIN_COLORS.error }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = ADMIN_COLORS.errorLight}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ADMIN_COLORS.error}
              >
                Force Logout
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SessionPage;
