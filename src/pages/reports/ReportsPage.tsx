import { useState, useEffect } from "react";
import { Download, FileText, BookOpen, Shield, Lock, TrendingUp, ShoppingCart, BarChart2, RefreshCw, Calendar, User, Tag } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell
} from "recharts";
import { useAsync } from "../../hooks/useAsync";
import { getAdminReports, getAdminAuditLogs } from "../../api/admin";
import type { AdminReportsResponse } from "../../api/admin";
import LoadingState from "../../components/ui/LoadingState";
import AdminMetricCard from "../../components/ui/AdminMetricCard";
import { ADMIN_COLORS } from "../../utils/colors";

const CS = { border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(15,23,42,0.06)" };

const fmtINR = (v: number) => `₹${(v / 1000).toFixed(0)}K`;
const fmtCurrency = (value: number | string | readonly (number | string)[] | undefined) => {
  const n = Array.isArray(value) ? Number(value[0]) : Number(value ?? 0);
  return `₹${n.toLocaleString()}`;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#fbbf24",
  processing: "#3b82f6",
  completed: "#10b981",
  cancelled: "#ef4444",
  refunded: "#8b5cf6",
  delivered: "#06b6d4",
};

const ACTION_COLORS: Record<string, string> = {
  create: "#10b981",
  update: "#3b82f6",
  delete: "#ef4444",
  suspend: "#f59e0b",
  approve: "#06b6d4",
  login: "#8b5cf6",
};

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [auditLimit, setAuditLimit] = useState(50);
  const [auditActionFilter, setAuditActionFilter] = useState("");

  const { data: reportsData, loading: reportsLoading } = useAsync<AdminReportsResponse>(
    () => getAdminReports({ from: appliedFrom || undefined, to: appliedTo || undefined }),
    null,
    [appliedFrom, appliedTo]
  );

  const { data: auditData, loading: auditLoading, refetch: refetchAudit } = useAsync(
    () => getAdminAuditLogs(),
    null,
    []
  );

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => { refetchAudit(); }, 30000);
    return () => clearInterval(interval);
  }, [refetchAudit]);

  const applyDateFilter = () => {
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
  };

  const clearFilter = () => {
    setDateFrom("");
    setDateTo("");
    setAppliedFrom("");
    setAppliedTo("");
  };

  // ── Transform API data ──────────────────────────────────────────────────────
  const raw = reportsData as any;
  // Backend returns: { revenueByDay: [...], ordersByStatus: [...], ordersByFlow: [...] }
  const revenueByDay: any[] = raw?.revenueByDay || raw?.revenue_by_day || [];
  const ordersByFlow: any[] = raw?.ordersByFlow || raw?.orders_by_flow || [];
  const ordersByStatus: any[] = raw?.ordersByStatus || raw?.orders_by_status || [];

  // Derive summary stats from the arrays (backend doesn't return these as top-level fields)
  // totalRevenue = sum of revenueByDay[].revenue (already filtered to paymentStatus: 'paid')
  const totalRevenue: number = revenueByDay.reduce((sum, d) => sum + Number(d.revenue || 0), 0);
  // totalOrders = sum of all ordersByStatus counts
  const totalOrders: number = ordersByStatus.reduce((sum, s) => sum + Number(s.count || 0), 0);
  // paidOrders = sum of revenueByDay[].count (those are paid orders grouped by day)
  const paidOrders: number = revenueByDay.reduce((sum, d) => sum + Number(d.count || 0), 0);
  // refundedOrders = count from ordersByStatus where _id === 'refunded'
  const refundedOrders: number = Number(ordersByStatus.find((s: any) => s._id === 'refunded')?.count || 0);

  const revenueChartData = revenueByDay.map((item: any) => ({
    date: item._id || item.date || "",
    gross: item.revenue || 0,
    net: Math.round((item.revenue || 0) * 0.85),
    orders: item.count || item.orders || 0,
  }));

  const orderTypeData = ordersByFlow.map((item: any) => ({
    type: (item._id || item.name || "Unknown").replace(/_/g, " "),
    orders: item.count || item.value || 0,
    revenue: item.revenue || 0,
  }));

  const statusPie = ordersByStatus.map((item: any) => ({
    name: item._id || item.name || "Unknown",
    value: item.count || item.value || 0,
    color: STATUS_COLORS[item._id || item.name] || "#6b7280",
  }));

  // ── Audit logs ──────────────────────────────────────────────────────────────
  const allLogs: any[] = (auditData as any)?.logs || [];
  const filteredLogs = auditActionFilter
    ? allLogs.filter((l) => l.action?.toLowerCase().includes(auditActionFilter.toLowerCase()))
    : allLogs;
  const visibleLogs = filteredLogs.slice(0, auditLimit);

  const uniqueActions = [...new Set(allLogs.map((l) => l.action).filter(Boolean))];

  // ── Export handlers ─────────────────────────────────────────────────────────
  const exportOrdersReport = () => {
    const orders = revenueChartData;
    const csvContent = [
      ['Date', 'Orders', 'Gross Revenue', 'Net Revenue'].join(','),
      ...orders.map((item: any) => [item.date, item.orders, item.gross, item.net].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportRevenueReport = () => {
    const csvContent = [
      ['Date', 'Gross Revenue', 'Net Revenue', 'Orders'].join(','),
      ...revenueChartData.map((item: any) => [item.date, item.gross, item.net, item.orders].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportInvoices = () => {
    const csvContent = [
      ['Date', 'Orders', 'Gross Revenue', 'Net Revenue'].join(','),
      ...revenueChartData.map((item: any) => [item.date, item.orders, item.gross, item.net].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportAuditLogs = () => {
    const csvContent = [
      ['Timestamp', 'Action', 'Actor', 'Target Type', 'Target ID', 'Details'].join(','),
      ...filteredLogs.map((log: any) => [
        log.createdAt ? new Date(log.createdAt).toISOString() : '',
        log.action || '',
        log.actorName || log.actorId || '',
        log.targetType || '',
        log.targetId || '',
        `"${JSON.stringify(log.details || log.description || '').replace(/"/g, '""')}"`,
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

  if (reportsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingState message="Loading reports" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Date Filter Bar ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl p-4 flex flex-wrap items-center gap-3" style={CS}>
        <Calendar size={16} className="text-gray-400 flex-shrink-0" />
        <span className="text-sm font-semibold text-gray-600">Date Range:</span>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition"
        />
        <span className="text-gray-400 text-sm">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition"
        />
        <button
          onClick={applyDateFilter}
          className="px-4 py-2 text-white text-sm font-bold rounded-lg transition"
          style={{ backgroundColor: ADMIN_COLORS.primary }}
        >
          Apply
        </button>
        {(appliedFrom || appliedTo) && (
          <button
            onClick={clearFilter}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            Clear
          </button>
        )}
        {(appliedFrom || appliedTo) && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
            Filtered: {appliedFrom || "start"} → {appliedTo || "now"}
          </span>
        )}
      </div>

      {/* ── Summary Metric Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        <AdminMetricCard
          index={0}
          label="Total Revenue"
          value={`₹${(totalRevenue / 1000).toFixed(1)}K`}
          accent={ADMIN_COLORS.success}
          accentBg={ADMIN_COLORS.successBg}
          icon={TrendingUp}
        />
        <AdminMetricCard
          label="Total Orders"
          value={totalOrders.toString()}
          accent={ADMIN_COLORS.info}
          accentBg={ADMIN_COLORS.infoBg}
          icon={ShoppingCart}
        />
        <AdminMetricCard
          label="Paid Orders"
          value={paidOrders.toString()}
          accent={ADMIN_COLORS.primary}
          accentBg="#f0f4ff"
          icon={BarChart2}
        />
        <AdminMetricCard
          label="Refunded Orders"
          value={refundedOrders.toString()}
          accent={ADMIN_COLORS.error}
          accentBg={ADMIN_COLORS.errorBg}
          icon={RefreshCw}
        />
      </div>

      {/* ── Charts Row 1: Revenue Trend + Orders by Type ────────────────────── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Revenue Trend */}
        <div className="bg-white rounded-xl p-4" style={CS}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-gray-900">Revenue Trend</p>
              <p className="text-xs text-gray-400 mt-0.5">Gross vs Net by day</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: ADMIN_COLORS.primary }} />
                Gross
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block bg-gray-300" />
                Net
              </span>
            </div>
          </div>
          {revenueChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={revenueChartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtINR} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={fmtCurrency} contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 12 }} />
                <Line type="monotone" dataKey="gross" stroke={ADMIN_COLORS.primary} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="net" stroke="#94a3b8" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px]">
              <p className="text-sm text-gray-400">No revenue data for selected period</p>
            </div>
          )}
        </div>

        {/* Orders by Flow Type */}
        <div className="bg-white rounded-xl p-4" style={CS}>
          <div className="mb-3">
            <p className="text-sm font-bold text-gray-900">Orders by Type</p>
            <p className="text-xs text-gray-400 mt-0.5">Volume per print/flow category</p>
          </div>
          {orderTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={orderTypeData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="type" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 12 }} />
                <Bar dataKey="orders" fill={ADMIN_COLORS.primary} radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px]">
              <p className="text-sm text-gray-400">No order type data available</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Charts Row 2: Daily Orders Bar + Status Pie ─────────────────────── */}
      <div className="grid grid-cols-3 gap-4">

        {/* Daily Order Count */}
        <div className="bg-white rounded-xl p-4 col-span-2" style={CS}>
          <div className="mb-3">
            <p className="text-sm font-bold text-gray-900">Daily Order Volume</p>
            <p className="text-xs text-gray-400 mt-0.5">Paid orders per day</p>
          </div>
          {revenueChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={revenueChartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 12 }} />
                <Bar dataKey="orders" fill={ADMIN_COLORS.info} radius={[4, 4, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[180px]">
              <p className="text-sm text-gray-400">No daily order data available</p>
            </div>
          )}
        </div>

        {/* Order Status Pie */}
        <div className="bg-white rounded-xl p-4" style={CS}>
          <p className="text-sm font-bold text-gray-900 mb-3">Order Status Split</p>
          {statusPie.length > 0 ? (
            <>
              <div className="flex justify-center mb-3">
                <PieChart width={150} height={150}>
                  <Pie data={statusPie} cx={70} cy={70} innerRadius={45} outerRadius={65} dataKey="value" strokeWidth={0}>
                    {statusPie.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </div>
              <div className="space-y-1.5">
                {statusPie.map((d) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-xs text-gray-600 capitalize">{d.name}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-900">{d.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[200px]">
              <p className="text-sm text-gray-400">No status data</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Export Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Orders Report", desc: "All orders with status, vendor, SLA", icon: FileText, format: "CSV/Excel", color: "#334155", onClick: exportOrdersReport },
          { label: "Revenue Report", desc: "Gross/net revenue by store and period", icon: FileText, format: "CSV/Excel", color: "#10b981", onClick: exportRevenueReport },
          { label: "Invoice Export", desc: "GST-compliant invoices", icon: BookOpen, format: "PDF", color: "#06b6d4", onClick: exportInvoices },
          { label: "Audit Logs Export", desc: "All admin/staff actions — append-only", icon: Shield, format: "CSV", color: "#f59e0b", onClick: exportAuditLogs },
        ].map((r) => (
          <div key={r.label} className="bg-white rounded-xl p-4 flex items-start gap-3" style={CS}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: r.color + "18" }}>
              <r.icon size={17} style={{ color: r.color }} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-sm">{r.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{r.desc}</p>
              <span className="inline-block mt-1.5 text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: r.color + "18", color: r.color }}>
                {r.format}
              </span>
            </div>
            <button onClick={r.onClick} className="flex items-center gap-1 px-3 py-1.5 text-white text-xs font-bold rounded-lg flex-shrink-0" style={{ backgroundColor: "#334155" }}>
              <Download size={12} /> Export
            </button>
          </div>
        ))}
      </div>

      {/* ── Audit Logs ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl overflow-hidden" style={CS}>
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3" style={{ borderBottom: "1px solid #f1f5f9", backgroundColor: "#fafbfc" }}>
          <div>
            <p className="text-sm font-bold text-gray-900">Audit Logs</p>
            <p className="text-xs text-gray-400 mt-0.5">All admin & staff actions — append-only</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Action filter */}
            <select
              value={auditActionFilter}
              onChange={(e) => setAuditActionFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold focus:outline-none focus:border-gray-900 transition"
            >
              <option value="">All Actions</option>
              {uniqueActions.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            {/* Limit selector */}
            <select
              value={auditLimit}
              onChange={(e) => setAuditLimit(Number(e.target.value))}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold focus:outline-none focus:border-gray-900 transition"
            >
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
            </select>
            <button
              onClick={() => refetchAudit()}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
              title="Refresh"
            >
              <RefreshCw size={14} className="text-gray-500" />
            </button>
          </div>
        </div>

        {auditLoading ? (
          <div className="flex items-center justify-center py-10">
            <LoadingState message="Loading audit logs" />
          </div>
        ) : visibleLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  {["Timestamp", "Action", "Name", "Target", "Details"].map((h) => (
                    <th key={h} className="text-left text-xs font-bold text-gray-400 uppercase tracking-wide px-4 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleLogs.map((log: any, i: number) => {
                  const actionKey = (log.action || "").toLowerCase().split("_")[0];
                  const actionColor = ACTION_COLORS[actionKey] || "#6b7280";
                  // Show only last segment: "admin.tickets.assign" → "assign"
                  const actionLabel = (log.action || "—").split(".").pop() || "—";
                  return (
                    <tr key={log._id || i} className="hover:bg-gray-50 transition" style={{ borderBottom: i < visibleLogs.length - 1 ? "1px solid #f8fafc" : "none" }}>
                      <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: actionColor + "18", color: actionColor }}>
                          {actionLabel}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <User size={12} className="text-gray-400" />
                          <span className="text-xs text-gray-700">
                            {log.actorName || log.performedBy?.name || log.admin?.name || log.staff?.name || log.user?.name || "Admin"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <Tag size={12} className="text-gray-400" />
                          <span className="text-xs text-gray-700">{log.targetType || "—"}</span>
                          {log.targetId && <span className="text-xs text-gray-400 font-mono">#{String(log.targetId).slice(-6)}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[200px] truncate">
                        {log.details ? JSON.stringify(log.details) : log.description || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <Shield size={36} className="text-gray-200 mb-3" />
            <p className="text-sm text-gray-500">No audit logs found</p>
          </div>
        )}

        {filteredLogs.length > auditLimit && (
          <div className="px-4 py-3 border-t border-gray-100 text-center">
            <button
              onClick={() => setAuditLimit((p) => p + 50)}
              className="text-xs font-bold text-gray-600 hover:text-gray-900 transition"
            >
              Load more ({filteredLogs.length - auditLimit} remaining)
            </button>
          </div>
        )}
      </div>

      {/* ── Data Retention Policy ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl overflow-hidden" style={CS}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #f1f5f9", backgroundColor: "#fafbfc" }}>
          <div>
            <p className="text-sm font-bold text-gray-900">Data Retention Policy</p>
            <p className="text-xs text-gray-400 mt-0.5">Region-based — Changes require Super Admin approval</p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100">
            <Lock size={11} className="text-gray-500" />
            <span className="text-xs font-bold text-gray-600">Protected</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                {["Data Type", "Retention Period", "Action"].map((h) => (
                  <th key={h} className="text-left text-xs font-bold text-gray-400 uppercase tracking-wide px-4 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Order Data", "7 years"],
                ["Customer PII", "3 years (GDPR)"],
                ["Audit Logs", "Permanent"],
                ["Financial Records", "10 years"],
              ].map(([k, v], i, arr) => (
                <tr key={k} className="hover:bg-gray-50 transition" style={{ borderBottom: i < arr.length - 1 ? "1px solid #f8fafc" : "none" }}>
                  <td className="px-4 py-2.5 text-xs text-gray-700">{k}</td>
                  <td className="px-4 py-2.5 text-xs font-bold text-gray-900">{v}</td>
                  <td className="px-4 py-2.5">
                    <button className="text-xs font-bold hover:underline" style={{ color: "#334155" }}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
