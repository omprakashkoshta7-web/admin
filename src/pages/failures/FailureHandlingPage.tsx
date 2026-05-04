import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, RefreshCw, DollarSign, ShieldAlert,
  CheckCircle, Clock, Zap, ChevronRight, X, Store, Truck, Download
} from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getAdminOrders } from "../../api/admin";
import LoadingState from "../../components/ui/LoadingState";

const CS = { border: "1px solid rgba(197,206,255,0.52)", boxShadow: "0 12px 30px rgba(15,23,42,0.08)" };

const typeConfig: Record<string, { icon: typeof AlertTriangle; color: string; bg: string; label: string }> = {
  vendor_collapse:  { icon: Store,        color: "#ef4444", bg: "#fef2f2", label: "Vendor Collapse" },
  sla_breach:       { icon: Clock,        color: "#ef4444", bg: "#fef2f2", label: "SLA Breach" },
  payment_mismatch: { icon: DollarSign,   color: "#f59e0b", bg: "#fffbeb", label: "Payment Mismatch" },
  fraud:            { icon: ShieldAlert,  color: "#f59e0b", bg: "#fffbeb", label: "Fraud Flag" },
  delivery_failure: { icon: Truck,        color: "#f59e0b", bg: "#fffbeb", label: "Delivery Failure" },
};

// Automation rules
const automationRules = [
  { scenario: "Vendor goes offline mid-production", trigger: "Vendor heartbeat lost > 5 min", action: "Auto-reassign to next available vendor", status: "active" },
  { scenario: "SLA breach (delivery)", trigger: "Delivery SLA exceeded", action: "Escalate to admin + ₹50 compensation credit", status: "active" },
  { scenario: "Payment mismatch", trigger: "Captured ≠ Order total", action: "Finance alert + hold payout", status: "active" },
  { scenario: "Wallet abuse / fraud", trigger: "3+ fraud flags on account", action: "Auto-freeze wallet + admin review", status: "active" },
  { scenario: "Delivery partner rejection", trigger: "Partner rejects pickup", action: "Fallback to next partner → aggregator", status: "active" },
  { scenario: "Vendor capacity full", trigger: "Vendor load > 95%", action: "Route new orders to next vendor", status: "active" },
];

export default function FailureHandlingPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [resolved, setResolved] = useState<any[]>([]);
  const [actionDone, setActionDone] = useState<string[]>([]);

  // Fetch orders from backend
  const { data: ordersData, loading, refetch: refetchOrders } = useAsync(
    () => getAdminOrders({ limit: 100 }),
    [],
    []
  );

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => { refetchOrders(); }, 30000);
    return () => clearInterval(interval);
  }, [refetchOrders]);

  // Transform orders to failure events
  useEffect(() => {
    if (ordersData) {
      const orders = (ordersData as any)?.orders || [];
      
      // Filter for orders with potential issues
      const failureEvents = orders
        .filter((order: any) => {
          // Show orders with any problematic status or payment status
          const problematicStatuses = ['failed', 'cancelled', 'rejected', 'error'];
          const problematicPaymentStatuses = ['failed', 'pending', 'error'];
          
          return problematicStatuses.includes(order.status?.toLowerCase()) || 
                 problematicPaymentStatuses.includes(order.paymentStatus?.toLowerCase()) ||
                 order.deliveryStatus?.toLowerCase() === 'failed';
        })
        .map((order: any) => {
          let type = 'delivery_failure';
          let severity = 'warning';
          
          if (order.paymentStatus?.toLowerCase() === 'failed') {
            type = 'payment_mismatch';
            severity = 'critical';
          } else if (order.status?.toLowerCase() === 'cancelled') {
            type = 'sla_breach';
            severity = 'warning';
          } else if (order.status?.toLowerCase() === 'rejected') {
            type = 'vendor_collapse';
            severity = 'critical';
          }
          
          return {
            id: order._id,
            type,
            severity,
            title: `Order ${order._id?.toString().slice(-6) || 'Unknown'}`,
            desc: `Status: ${order.status || 'unknown'} | Payment: ${order.paymentStatus || 'unknown'}`,
            orders: [order._id],
            action: 'Resolve',
            time: order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A',
          };
        });
      
      // If no failures found, show first few orders as examples
      if (failureEvents.length === 0 && orders.length > 0) {
        const sampleEvents = orders.slice(0, 3).map((order: any) => ({
          id: order._id,
          type: 'delivery_failure',
          severity: 'warning',
          title: `Order ${order._id?.toString().slice(-6) || 'Unknown'}`,
          desc: `Status: ${order.status || 'unknown'} | Payment: ${order.paymentStatus || 'unknown'}`,
          orders: [order._id],
          action: 'Review',
          time: order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A',
        }));
        setEvents(sampleEvents);
      } else {
        setEvents(failureEvents);
      }
    }
  }, [ordersData]);

  const handleAction = (id: string, action: string) => {
    setActionDone(p => [...p, id]);
    setTimeout(() => {
      const ev = events.find(e => e.id === id);
      if (ev) {
        setResolved(p => [{
          id: ev.id, type: ev.type, title: ev.title,
          resolvedAt: "Just now",
          resolution: `${action} — triggered by admin`
        }, ...p]);
        setEvents(p => p.filter(e => e.id !== id));
        setActionDone(p => p.filter(x => x !== id));
      }
    }, 1200);
  };

  const criticalCount = events.filter(e => e.severity === "critical").length;
  const warningCount = events.filter(e => e.severity === "warning").length;

  const exportEvents = () => {
    const csvContent = [
      ['Order ID', 'Type', 'Severity', 'Status', 'Time'].join(','),
      ...events.map((ev: any) => [
        ev.id || '',
        ev.type || '',
        ev.severity || '',
        typeConfig[ev.type]?.label || ev.type || '',
        ev.time || '',
      ].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `failure-events-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingState message="Loading failure events" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-2">

      {/* Header Actions */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={exportEvents}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold"
        >
          <Download size={14} />
          Export
        </button>
        <button
          onClick={() => refetchOrders()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Active Failures", value: events.length, color: "#ef4444", bg: "#fef2f2", icon: Zap },
          { label: "Critical", value: criticalCount, color: "#ef4444", bg: "#fef2f2", icon: AlertTriangle },
          { label: "Warnings", value: warningCount, color: "#f59e0b", bg: "#fffbeb", icon: Clock },
          { label: "Resolved Today", value: resolved.length, color: "#10b981", bg: "#f0fdf4", icon: CheckCircle },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl p-3.5" style={CS}>
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: k.bg }}>
                <k.icon size={15} style={{ color: k.color }} />
              </div>
            </div>
            <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Active Failure Events */}
      <div className="bg-white rounded-2xl overflow-hidden" style={CS}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(197,206,255,0.4)", backgroundColor: "rgba(248,249,255,0.78)" }}>
          <Zap size={13} className="text-red-500" />
          <span className="text-xs font-black uppercase tracking-widest text-gray-400">Active Failures</span>
          {events.length > 0 && (
            <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-500">
              {events.length} active
            </span>
          )}
        </div>

        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <CheckCircle size={28} className="text-green-400" />
            <p className="text-sm font-bold text-gray-500">All clear — no active failures</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "rgba(197,206,255,0.2)" }}>
            {events.map(ev => {
              const cfg = typeConfig[ev.type];
              const Icon = cfg.icon;
              const isDoing = actionDone.includes(ev.id);
              return (
                <div key={ev.id} className="px-4 py-3.5 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: cfg.bg }}>
                    <Icon size={16} style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold text-gray-900">{ev.title}</p>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-1.5">{ev.desc}</p>
                    {ev.orders.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {ev.orders.map((o: string) => (
                          <button key={o} onClick={() => navigate(`/orders/${o}`)}
                            className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg"
                            style={{ backgroundColor: "#f1f5f9", color: "#334155" }}>
                            {o} <ChevronRight size={10} />
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-1.5">{ev.time}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleAction(ev.id, ev.action)}
                      disabled={isDoing}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-bold rounded-xl disabled:opacity-60 transition"
                      style={{ backgroundColor: ev.severity === "critical" ? "#ef4444" : "#f59e0b" }}>
                      {isDoing ? <><RefreshCw size={11} className="animate-spin" /> Processing...</> : <><Zap size={11} /> {ev.action}</>}
                    </button>
                    <button onClick={() => setEvents(p => p.filter(e => e.id !== ev.id))}
                      className="text-gray-300 hover:text-gray-500">
                      <X size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Automation Rules */}
      <div className="bg-white rounded-2xl overflow-hidden" style={CS}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(197,206,255,0.4)", backgroundColor: "rgba(248,249,255,0.78)" }}>
          <div className="flex items-center gap-2">
            <RefreshCw size={13} className="text-slate-600" />
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">Automation Rules</span>
          </div>
          <span className="text-xs text-gray-400">Rule-based · No manual intervention needed</span>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full admin-responsive-table min-w-[800px] lg:min-w-0">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(197,206,255,0.3)" }}>
              {["Scenario", "Trigger", "Auto Action", "Status"].map(h => (
                <th key={h} className="text-left text-xs font-bold text-gray-400 uppercase tracking-wide px-4 py-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {automationRules.map((r, i) => (
              <tr key={r.scenario} className="hover-row"
                style={{ borderBottom: i < automationRules.length - 1 ? "1px solid rgba(197,206,255,0.2)" : "none" }}>
                <td className="px-4 py-2.5 text-xs font-bold text-gray-900">{r.scenario}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{r.trigger}</td>
                <td className="px-4 py-2.5 text-xs text-gray-700">{r.action}</td>
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full w-fit"
                    style={{ backgroundColor: "#f0fdf4", color: "#10b981" }}>
                    <CheckCircle size={10} /> Active
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Resolved Events */}
      <div className="bg-white rounded-2xl overflow-hidden" style={CS}>
        <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(197,206,255,0.4)", backgroundColor: "rgba(248,249,255,0.78)" }}>
          <span className="text-xs font-black uppercase tracking-widest text-gray-400">Recently Resolved</span>
        </div>
        <div className="divide-y" style={{ borderColor: "rgba(197,206,255,0.2)" }}>
          {resolved.map(r => {
            const cfg = typeConfig[r.type];
            return (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "#f0fdf4" }}>
                  <CheckCircle size={13} className="text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-900">{r.title}</p>
                  <p className="text-xs text-gray-400">{r.resolution}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                  <span className="text-xs text-gray-400">{r.resolvedAt}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
