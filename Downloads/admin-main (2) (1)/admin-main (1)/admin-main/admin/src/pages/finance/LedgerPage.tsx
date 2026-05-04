import { useState, useEffect } from "react";
import { Lock, Download, Shield, Search, ChevronDown, RefreshCw } from "lucide-react";
import { ADMIN_COLORS } from "../../utils/colors";
import { useAsync } from "../../hooks/useAsync";
import { getAdminAuditLogs } from "../../api/admin";
import LoadingState from "../../components/ui/LoadingState";

export default function LedgerPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  
  // Fetch audit logs from backend
  const { data: auditData, loading, refetch: refetchLogs } = useAsync(() => getAdminAuditLogs(), {}, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => { refetchLogs(); }, 30000);
    return () => clearInterval(interval);
  }, [refetchLogs]);
  
  const logs = Array.isArray((auditData as any)?.logs) ? (auditData as any).logs : [];
  
  // Filter out internal/staff management actions that shouldn't be visible to frontend users
  const hiddenActionPrefixes = [
    'staff.update',
    'staff.activate',
    'staff.deactivate',
    'admin.control',
    'system',
  ];
  
  const shouldShowAction = (action: string) => {
    if (!action) return false;
    return !hiddenActionPrefixes.some(prefix => action.startsWith(prefix));
  };
  
  const filtered = logs.filter((log: any) => {
    if (!log || !shouldShowAction(log.action)) return false;
    const matchesSearch = log.actorId?.toLowerCase().includes(search.toLowerCase()) ||
                         log.action?.toLowerCase().includes(search.toLowerCase()) ||
                         log.targetId?.toLowerCase().includes(search.toLowerCase()) ||
                         log.reason?.toLowerCase().includes(search.toLowerCase());
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const uniqueActions = Array.from(new Set(
    logs
      .filter((l: any) => l && shouldShowAction(l.action))
      .map((l: any) => l.action)
      .filter(Boolean)
  ));

  const exportLogs = () => {
    const csvContent = [
      ['Actor ID', 'Action', 'Target ID', 'Reason', 'Timestamp'].join(','),
      ...filtered.map((log: any) => [
        log.actorId || '',
        log.action || '',
        log.targetId || '',
        `"${(log.reason || '').replace(/"/g, '""')}"`,
        log.createdAt ? new Date(log.createdAt).toISOString() : '',
      ].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingState message="Loading audit logs" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50">
            <Lock size={13} className="text-gray-500" />
            <span className="text-xs font-bold text-gray-600">Audit Log</span>
          </div>
          <button 
            onClick={exportLogs}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold">
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={() => refetchLogs()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search audit logs..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" 
            />
          </div>
          
          <div className="relative">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="appearance-none px-4 py-2.5 pr-8 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition text-sm font-semibold"
            >
              <option value="all">All Actions</option>
              {uniqueActions.map((action: any) => {
                const actionStr = String(action);
                const displayName = actionStr.split('.').slice(-2).join(' ').replace(/_/g, ' ');
                return (
                  <option key={actionStr} value={actionStr}>{displayName}</option>
                );
              })}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full admin-responsive-table min-w-[900px] lg:min-w-0">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Action ID", "Role", "Action", "Target Type", "Target ID", "Reason", "Date & Time"].map(h => (
                  <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide p-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.filter((log: any) => log && log.actorId).map((log: any) => (
                  <tr key={log._id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="p-4">
                      <p className="text-xs font-bold text-gray-700 font-mono">{log.actorId || 'N/A'}</p>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: ADMIN_COLORS.infoBg, color: ADMIN_COLORS.info }}>
                        {log.actorRole || 'unknown'}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="text-xs text-gray-600 font-mono">{(log.action || 'N/A').split('.').slice(-2).join(' ').replace(/_/g, ' ')}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-semibold text-gray-900">{log.targetType || '—'}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-xs text-gray-600 font-mono">{log.targetId || '—'}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-xs text-gray-500">{log.reason || 'No reason'}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-xs text-gray-400">{log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Unknown'}</p>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12">
                    <div className="flex flex-col items-center justify-center gap-2 text-center">
                      <p className="text-sm font-semibold text-gray-500">
                        {logs.length === 0 ? "No audit logs available" : "No logs match your search criteria"}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Immutable Ledger Notice */}
      <div 
        className="p-4 rounded-xl border"
        style={{ 
          backgroundColor: ADMIN_COLORS.criticalBg,
          borderColor: ADMIN_COLORS.critical
        }}
      >
        <div className="flex items-start gap-3">
          <Shield size={16} style={{ color: ADMIN_COLORS.critical }} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold" style={{ color: ADMIN_COLORS.critical }}>Audit Log Protection</p>
            <p className="text-xs mt-1" style={{ color: ADMIN_COLORS.critical }}>
              This audit log is append-only and immutable. All admin actions are permanently recorded with full audit trail for compliance and security. No entries can be edited or deleted.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
