import { useState, useEffect } from "react";
import { LogOut, Monitor, Clock, MapPin, Smartphone, AlertTriangle } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import LoadingState from "../../components/ui/LoadingState";

interface Session {
  id: string;
  userId: string;
  email: string;
  role: string;
  loginTime: string;
  lastActivity: string;
  ipAddress: string;
  userAgent: string;
  device?: string;
}

const SessionControlPage = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [killConfirm, setKillConfirm] = useState<string | null>(null);

  // Fetch sessions from backend
  const { data: sessionsData, loading, refetch } = useAsync(
    async () => {
      // This will call the backend endpoint when it's implemented
      // For now, return empty array as backend returns placeholder
      return { sessions: [] };
    },
    { sessions: [] },
    []
  );

  useEffect(() => {
    if (sessionsData) {
      setSessions((sessionsData as any)?.sessions || []);
    }
  }, [sessionsData]);

  const handleKillSession = async (sessionId: string) => {
    try {
      // Call backend to kill session
      // await killAdminSession(sessionId);
      setSessions(sessions.filter(s => s.id !== sessionId));
      setKillConfirm(null);
      refetch();
    } catch (error) {
      console.error('Failed to kill session:', error);
      alert('Failed to terminate session');
    }
  };

  const getDeviceInfo = (userAgent: string) => {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('Android')) return 'Android';
    return 'Unknown';
  };

  const formatTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const getTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (seconds < 60) return 'Just now';
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
      return `${Math.floor(seconds / 86400)}d ago`;
    } catch {
      return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingState message="Loading sessions" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Session Control</h1>
        <p className="text-gray-600 mt-1">Manage active staff sessions and security</p>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
        {sessions.length === 0 ? (
          <div className="p-12 text-center">
            <Monitor size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-600 mb-2">No active sessions</p>
            <p className="text-sm text-gray-500">No staff members are currently logged in</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full admin-responsive-table min-w-[900px] lg:min-w-0">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide p-4">User</th>
                  <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide p-4">Role</th>
                  <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide p-4">Device</th>
                  <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide p-4">IP Address</th>
                  <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide p-4">Login Time</th>
                  <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide p-4">Last Activity</th>
                  <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="p-4">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{session.email}</p>
                        <p className="text-xs text-gray-500 mt-1">{session.userId}</p>
                      </div>
                    </td>
                    
                    <td className="p-4">
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold">
                        {session.role}
                      </span>
                    </td>
                    
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Smartphone size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600">{getDeviceInfo(session.userAgent)}</span>
                      </div>
                    </td>
                    
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600">{session.ipAddress}</span>
                      </div>
                    </td>
                    
                    <td className="p-4">
                      <div>
                        <p className="text-sm text-gray-900">{formatTime(session.loginTime)}</p>
                      </div>
                    </td>
                    
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600">{getTimeAgo(session.lastActivity)}</span>
                      </div>
                    </td>
                    
                    <td className="p-4">
                      <button
                        onClick={() => setKillConfirm(session.id)}
                        className="flex items-center gap-2 px-3 py-1.5 text-white text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 transition"
                      >
                        <LogOut size={12} />
                        Terminate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Kill Session Confirmation Modal */}
      {killConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={24} className="text-red-600" />
              <h3 className="text-lg font-bold text-gray-900">Terminate Session</h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to terminate this session? The user will be logged out immediately.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setKillConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleKillSession(killConfirm)}
                className="flex-1 px-4 py-2 text-white font-bold rounded-xl bg-red-600 hover:bg-red-700 transition"
              >
                Terminate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionControlPage;
