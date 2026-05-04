import { useState, useEffect } from "react";
import { AlertTriangle, TrendingDown, CheckCircle, Zap, DollarSign, ChevronDown, Plus, X, RefreshCw, Shield, BarChart2, Search } from "lucide-react";
import { ADMIN_COLORS } from "../../utils/colors";
import AdminMetricCard from "../../components/ui/AdminMetricCard";
import { useAsync } from "../../hooks/useAsync";
import { getSLARisks, escalateOrder, compensateOrder, getSLAPolicies, createSLAPolicy, getSLAMetrics, getSLABreaches } from "../../api/admin";

const ORDER_STATUSES = ["pending","confirmed","assigned_vendor","vendor_accepted","in_production","qc_pending","ready_for_pickup","delivery_assigned","out_for_delivery","delivered"];
const FLOW_TYPES = ["printing","gifting","shopping","all"];
const ESCALATION_LEVELS = ["low","medium","high","critical"];
const COMPENSATION_TYPES = ["none","refund","wallet_credit","coupon"];

const defaultPolicyForm = {
  name: "", description: "", flowType: "printing",
  fromStatus: "confirmed", toStatus: "delivered",
  maxMinutes: 1440, warningMinutes: 1080,
  escalationLevel: "medium", compensationType: "none", compensationValue: 0,
};

export default function SLADashboardPage() {
  const [activeTab, setActiveTab] = useState<"risks"|"breaches"|"policies"|"metrics">("risks");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [flowFilter, setFlowFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [escalateModal, setEscalateModal] = useState<string|null>(null);
  const [compensateModal, setCompensateModal] = useState<string|null>(null);
  const [policyModal, setPolicyModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [escalateForm, setEscalateForm] = useState({ note: "", policyId: "" });
  const [compensateForm, setCompensateForm] = useState({ compensationType: "refund", compensationValue: 0, note: "" });
  const [policyForm, setPolicyForm] = useState(defaultPolicyForm);

  const { data: risksData, refetch: refetchRisks, loading: risksLoading } = useAsync(
    () => getSLARisks(), { atRisk: [], totalRisks: 0 }, []
  );
  const { data: metricsData, refetch: refetchMetrics } = useAsync(
    () => getSLAMetrics(), {}, []
  );
  const { data: breachesData, refetch: refetchBreaches } = useAsync(
    () => getSLABreaches(), { breaches: [] }, []
  );
  const { data: policiesData, refetch: refetchPolicies } = useAsync(
    () => getSLAPolicies(), { policies: [] }, []
  );

  const risks: any[] = (risksData as any)?.atRisk || [];
  const breaches: any[] = (breachesData as any)?.breaches || [];
  const policies: any[] = (policiesData as any)?.policies || [];
  const metrics: any = metricsData || {};

  const totalRisks = (risksData as any)?.totalRisks || risks.length;
  const criticalCount = risks.filter((r: any) => r.severity === "breach" || r.severity === "critical").length;
  const complianceRate = totalRisks === 0 ? 100 : Math.max(0, 100 - Math.round((criticalCount / Math.max(totalRisks, 1)) * 100));

  const filteredRisks = risks.filter((r: any) => {
    const matchSeverity = severityFilter === "all" || r.severity === severityFilter;
    const matchFlow = flowFilter === "all" || r.flowType === flowFilter;
    const matchSearch = !searchTerm || (r.orderNumber || r.orderId || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchSeverity && matchFlow && matchSearch;
  });

  const filteredBreaches = breaches.filter((b: any) => {
    const matchSeverity = severityFilter === "all" || b.severity === severityFilter;
    const matchFlow = flowFilter === "all" || b.flowType === flowFilter;
    return matchSeverity && matchFlow;
  });

  const handleEscalate = async () => {
    // Validate note length (without trim to match UI counter)
    if (!escalateModal) return;
    
    if (escalateForm.note.length < 10) {
      alert(`Escalation note must be at least 10 characters long. Current: ${escalateForm.note.length} characters`);
      return;
    }
    
    setActionLoading(true);
    try {
      console.log("Escalating order:", escalateModal, "with note:", escalateForm.note);
      await escalateOrder(escalateModal, escalateForm.note, undefined, undefined);
      refetchRisks(); 
      refetchBreaches();
      setEscalateModal(null);
      setEscalateForm({ note: "", policyId: "" });
      alert("✓ Order escalated successfully");
    } catch (error: any) {
      console.error("Escalation error full:", error);
      console.error("Error message:", error?.message);
      console.error("Error statusCode:", error?.statusCode);
      console.error("Error errors:", error?.errors);
      const errorMsg = error?.message || "Failed to escalate order";
      alert(`✗ Escalation failed: ${errorMsg}`);
    }
    finally { setActionLoading(false); }
  };

  const handleCompensate = async () => {
    if (!compensateModal || !compensateForm.compensationValue || compensateForm.compensationValue <= 0) {
      alert("Please enter a valid compensation amount");
      return;
    }
    setActionLoading(true);
    try {
      await compensateOrder(compensateModal, compensateForm.compensationType, compensateForm.compensationValue, compensateForm.note);
      refetchRisks(); 
      refetchBreaches();
      setCompensateModal(null);
      setCompensateForm({ compensationType: "refund", compensationValue: 0, note: "" });
      alert("Compensation processed successfully");
    } catch (error: any) {
      console.error("Compensation error:", error);
      alert(error?.response?.data?.message || error?.message || "Failed to process compensation. Please try again.");
    }
    finally { setActionLoading(false); }
  };

  const handleCreatePolicy = async () => {
    if (!policyForm.name || !policyForm.flowType || !policyForm.fromStatus || !policyForm.toStatus) {
      alert("Please fill all required fields"); 
      return;
    }
    if (policyForm.warningMinutes >= policyForm.maxMinutes) {
      alert("Warning time must be less than max time"); 
      return;
    }
    setActionLoading(true);
    try {
      await createSLAPolicy(policyForm);
      refetchPolicies();
      setPolicyModal(false);
      setPolicyForm(defaultPolicyForm);
      alert("SLA policy created successfully");
    } catch (error: any) {
      console.error("Policy creation error:", error);
      alert(error?.response?.data?.message || error?.message || "Failed to create SLA policy. Please try again.");
    }
    finally { setActionLoading(false); }
  };

  const getSeverityColor = (s: string) => {
    if (s === "breach" || s === "critical") return { color: ADMIN_COLORS.critical, bg: ADMIN_COLORS.criticalBg };
    if (s === "warning") return { color: ADMIN_COLORS.warning, bg: ADMIN_COLORS.warningBg };
    return { color: ADMIN_COLORS.info, bg: ADMIN_COLORS.infoBg };
  };

  const refetchAll = () => { refetchRisks(); refetchMetrics(); refetchBreaches(); refetchPolicies(); };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => { refetchAll(); }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={refetchAll} 
            disabled={risksLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold disabled:opacity-60"
          >
            <RefreshCw size={14} className={risksLoading ? "animate-spin" : ""} /> 
            {risksLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        <button onClick={() => setPolicyModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-bold transition" style={{ backgroundColor: ADMIN_COLORS.primary }}>
          <Plus size={16} /> New SLA Policy
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-4">
        <AdminMetricCard index={0} label="At-Risk Orders" value={totalRisks.toString()} accent={ADMIN_COLORS.critical} accentBg={ADMIN_COLORS.criticalBg} icon={AlertTriangle} note={`${criticalCount} critical`} />
        <AdminMetricCard label="SLA Breaches" value={(metrics.totalBreaches || 0).toString()} accent={ADMIN_COLORS.error} accentBg={ADMIN_COLORS.errorBg} icon={TrendingDown} note={`${metrics.escalatedCount || 0} escalated`} />
        <AdminMetricCard label="Compensated" value={(metrics.compensatedCount || 0).toString()} accent={ADMIN_COLORS.warning} accentBg={ADMIN_COLORS.warningBg} icon={DollarSign} />
        <AdminMetricCard label="Compliance Rate" value={`${complianceRate}%`} accent={ADMIN_COLORS.success} accentBg={ADMIN_COLORS.successBg} icon={CheckCircle} />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100">
          {[
            { key: "risks", label: "At-Risk Orders", icon: AlertTriangle, count: filteredRisks.length },
            { key: "breaches", label: "SLA Breaches", icon: TrendingDown, count: filteredBreaches.length },
            { key: "policies", label: "Policies", icon: Shield, count: policies.length },
            { key: "metrics", label: "Metrics", icon: BarChart2, count: null },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition"
              style={{
                color: activeTab === tab.key ? ADMIN_COLORS.primary : "#6b7280",
                borderBottom: activeTab === tab.key ? `2px solid ${ADMIN_COLORS.primary}` : "2px solid transparent",
                backgroundColor: activeTab === tab.key ? "#f8faff" : "transparent",
              }}>
              <tab.icon size={15} />
              {tab.label}
              {tab.count !== null && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Filters Bar */}
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3 flex-wrap">
          {(activeTab === "risks" || activeTab === "breaches") && (
            <>
              <div className="relative flex-1 min-w-48">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search by order ID..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
              </div>
              <div className="relative">
                <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}
                  className="appearance-none px-4 py-2 pr-8 rounded-xl border border-gray-200 text-sm font-semibold focus:outline-none focus:border-gray-900">
                  <option value="all">All Severities</option>
                  <option value="breach">Breach</option>
                  <option value="critical">Critical</option>
                  <option value="warning">Warning</option>
                </select>
                <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select value={flowFilter} onChange={e => setFlowFilter(e.target.value)}
                  className="appearance-none px-4 py-2 pr-8 rounded-xl border border-gray-200 text-sm font-semibold focus:outline-none focus:border-gray-900">
                  <option value="all">All Flows</option>
                  {FLOW_TYPES.filter(f => f !== "all").map(f => <option key={f} value={f} className="capitalize">{f}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </>
          )}
        </div>

        {/* Tab: At-Risk Orders */}
        {activeTab === "risks" && (
          <div className="overflow-x-auto">
            {filteredRisks.length > 0 ? (
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {["Order", "Flow", "Status", "Severity", "Elapsed", "Max SLA", "Remaining", "Actions"].map(h => (
                      <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase p-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRisks.map((risk: any) => {
                    const sc = getSeverityColor(risk.severity);
                    const remaining = Math.max(0, (risk.maxMinutes || 0) - (risk.elapsedMinutes || 0));
                    const pct = Math.min(100, Math.round(((risk.elapsedMinutes || 0) / Math.max(risk.maxMinutes || 1, 1)) * 100));
                    return (
                      <tr key={risk.orderId} className="border-b border-gray-50 hover:bg-gray-50 transition">
                        <td className="p-4">
                          <p className="text-sm font-bold text-gray-900 font-mono">{risk.orderNumber || `#${String(risk.orderId).slice(-8).toUpperCase()}`}</p>
                          <p className="text-xs text-gray-400">{risk.vendorId ? `Vendor: ${String(risk.vendorId).slice(-6)}` : "Unassigned"}</p>
                        </td>
                        <td className="p-4">
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold capitalize">{risk.flowType || "—"}</span>
                        </td>
                        <td className="p-4">
                          <p className="text-xs text-gray-700 capitalize">{(risk.status || "").replace(/_/g, " ")}</p>
                        </td>
                        <td className="p-4">
                          <span className="text-xs px-2 py-1 rounded-full font-bold uppercase" style={{ backgroundColor: sc.bg, color: sc.color }}>{risk.severity}</span>
                        </td>
                        <td className="p-4">
                          <p className="text-sm font-bold text-gray-900">{risk.elapsedMinutes || 0}m</p>
                          <div className="w-20 h-1.5 bg-gray-200 rounded-full mt-1">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: sc.color }} />
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-gray-600">{risk.maxMinutes || 0}m</p>
                        </td>
                        <td className="p-4">
                          <p className="text-sm font-bold" style={{ color: remaining === 0 ? ADMIN_COLORS.critical : ADMIN_COLORS.warning }}>
                            {remaining === 0 ? "Breached" : `${remaining}m`}
                          </p>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setEscalateModal(risk.orderId)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition"
                              style={{ backgroundColor: ADMIN_COLORS.errorBg, color: ADMIN_COLORS.error }}>
                              <Zap size={12} /> Escalate
                            </button>
                            <button onClick={() => setCompensateModal(risk.orderId)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition"
                              style={{ backgroundColor: ADMIN_COLORS.successBg, color: ADMIN_COLORS.success }}>
                              <DollarSign size={12} /> Compensate
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-16 text-center">
                <CheckCircle size={48} className="mx-auto mb-4" style={{ color: ADMIN_COLORS.success }} />
                <p className="text-lg font-semibold text-gray-600">No at-risk orders</p>
                <p className="text-sm text-gray-400 mt-1">All orders are within SLA compliance</p>
              </div>
            )}
          </div>
        )}

        {/* Tab: SLA Breaches */}
        {activeTab === "breaches" && (
          <div className="overflow-x-auto">
            {filteredBreaches.length > 0 ? (
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {["Order ID", "Policy", "Flow", "Severity", "Elapsed / Max", "Escalated", "Compensated", "Breach Time"].map(h => (
                      <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase p-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredBreaches.map((b: any) => {
                    const sc = getSeverityColor(b.severity || "breach");
                    return (
                      <tr key={b._id || b.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                        <td className="p-4">
                          <p className="text-sm font-bold text-gray-900 font-mono">#{String(b.orderId || "").slice(-8).toUpperCase()}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-sm font-semibold text-gray-900">{b.policyName || "Default"}</p>
                          <p className="text-xs text-gray-400">{b.fromStatus} → {b.toStatus}</p>
                        </td>
                        <td className="p-4">
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold capitalize">{b.flowType || "N/A"}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-xs px-2 py-1 rounded-full font-bold uppercase" style={{ backgroundColor: sc.bg, color: sc.color }}>{b.severity || "breach"}</span>
                        </td>
                        <td className="p-4">
                          <p className="text-sm font-bold text-red-600">{b.elapsedMinutes || 0}m / {b.maxMinutes || 0}m</p>
                          <p className="text-xs text-gray-400">+{Math.max(0, (b.elapsedMinutes || 0) - (b.maxMinutes || 0))}m over</p>
                        </td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${b.isEscalated ? "bg-orange-50 text-orange-600" : "bg-gray-100 text-gray-500"}`}>
                            {b.isEscalated ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${b.isCompensated ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                            {b.isCompensated ? `₹${b.compensationValue || 0}` : "No"}
                          </span>
                        </td>
                        <td className="p-4">
                          <p className="text-xs text-gray-600">{b.createdAt ? new Date(b.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "N/A"}</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-16 text-center">
                <CheckCircle size={48} className="mx-auto mb-4" style={{ color: ADMIN_COLORS.success }} />
                <p className="text-lg font-semibold text-gray-600">No SLA breaches</p>
                <p className="text-sm text-gray-400 mt-1">All orders are meeting their SLA commitments</p>
              </div>
            )}
          </div>
        )}

        {/* Tab: Policies */}
        {activeTab === "policies" && (
          <div className="overflow-x-auto">
            {policies.length > 0 ? (
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {["Policy Name", "Flow Type", "Status Transition", "Max Time", "Warning At", "Escalation", "Compensation"].map(h => (
                      <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase p-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {policies.map((p: any) => (
                    <tr key={p._id || p.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="p-4">
                        <p className="text-sm font-bold text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>
                      </td>
                      <td className="p-4">
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold capitalize">{p.flowType}</span>
                      </td>
                      <td className="p-4">
                        <p className="text-xs text-gray-700 capitalize">{(p.fromStatus || "").replace(/_/g, " ")} → {(p.toStatus || "").replace(/_/g, " ")}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-gray-900">{p.maxMinutes >= 60 ? `${Math.round(p.maxMinutes / 60)}h` : `${p.maxMinutes}m`}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-gray-700">{p.warningMinutes >= 60 ? `${Math.round(p.warningMinutes / 60)}h` : `${p.warningMinutes}m`}</p>
                      </td>
                      <td className="p-4">
                        <span className="text-xs px-2 py-1 rounded-full font-semibold capitalize" style={{ backgroundColor: getSeverityColor(p.escalationLevel || "medium").bg, color: getSeverityColor(p.escalationLevel || "medium").color }}>
                          {p.escalationLevel || "medium"}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-semibold text-gray-900 capitalize">{p.compensationType || "none"}</p>
                        {p.compensationValue > 0 && <p className="text-xs text-gray-500">₹{p.compensationValue}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-16 text-center">
                <Shield size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-semibold text-gray-600">No SLA policies</p>
                <p className="text-sm text-gray-400 mt-1">Create your first SLA policy to start tracking</p>
                <button onClick={() => setPolicyModal(true)} className="mt-4 px-4 py-2 rounded-xl text-white font-bold text-sm" style={{ backgroundColor: ADMIN_COLORS.primary }}>
                  Create Policy
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab: Metrics */}
        {activeTab === "metrics" && (
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Summary */}
              <div className="space-y-4">
                <h3 className="font-bold text-gray-900">Breach Summary</h3>
                {[
                  { label: "Total Breaches", value: metrics.totalBreaches || 0, color: ADMIN_COLORS.error },
                  { label: "Escalated", value: metrics.escalatedCount || 0, color: ADMIN_COLORS.warning },
                  { label: "Compensated", value: metrics.compensatedCount || 0, color: ADMIN_COLORS.success },
                  { label: "Avg Elapsed (min)", value: metrics.avgElapsedMinutes || 0, color: ADMIN_COLORS.info },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-4 rounded-xl border border-gray-200">
                    <p className="text-sm font-semibold text-gray-700">{item.label}</p>
                    <p className="text-xl font-black" style={{ color: item.color }}>{item.value}</p>
                  </div>
                ))}
              </div>

              {/* By Severity */}
              <div className="space-y-4">
                <h3 className="font-bold text-gray-900">By Severity</h3>
                {Object.entries(metrics.bySeverity || {}).length > 0 ? (
                  Object.entries(metrics.bySeverity || {}).map(([sev, count]: [string, any]) => {
                    const sc = getSeverityColor(sev);
                    return (
                      <div key={sev} className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: sc.color + "40", backgroundColor: sc.bg }}>
                        <p className="text-sm font-bold capitalize" style={{ color: sc.color }}>{sev}</p>
                        <p className="text-xl font-black" style={{ color: sc.color }}>{count}</p>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-gray-400">
                    <BarChart2 size={32} className="mx-auto mb-2" />
                    <p className="text-sm">No breach data available</p>
                  </div>
                )}

                {/* By Flow */}
                {Object.entries(metrics.byFlow || {}).length > 0 && (
                  <>
                    <h3 className="font-bold text-gray-900 mt-6">By Flow Type</h3>
                    {Object.entries(metrics.byFlow || {}).map(([flow, count]: [string, any]) => (
                      <div key={flow} className="flex items-center justify-between p-4 rounded-xl border border-gray-200">
                        <p className="text-sm font-semibold text-gray-700 capitalize">{flow}</p>
                        <p className="text-xl font-black text-gray-900">{count}</p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Escalate Modal */}
      {escalateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Escalate Order</h3>
              <button onClick={() => setEscalateModal(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-3 rounded-xl mb-4" style={{ backgroundColor: ADMIN_COLORS.errorBg }}>
              <p className="text-xs font-bold" style={{ color: ADMIN_COLORS.error }}>Order: #{String(escalateModal).slice(-8).toUpperCase()}</p>
            </div>
            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Escalation Note * <span className="text-red-500">(Minimum 10 characters required)</span>
                </label>
                <textarea 
                  value={escalateForm.note} 
                  onChange={e => setEscalateForm(p => ({ ...p, note: e.target.value }))}
                  placeholder="Describe why this order needs escalation (minimum 10 characters)..."
                  className={`w-full p-3 rounded-xl border ${
                    escalateForm.note.length > 0 && escalateForm.note.length < 10 
                      ? 'border-red-300 bg-red-50' 
                      : escalateForm.note.length >= 10
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200'
                  } focus:outline-none focus:border-gray-900 transition resize-none`}
                  rows={4}
                  minLength={10}
                />
                <div className="flex items-center justify-between mt-1">
                  <p className={`text-xs font-semibold ${
                    escalateForm.note.length < 10 
                      ? 'text-red-600' 
                      : 'text-green-600'
                  }`}>
                    {escalateForm.note.length >= 10 
                      ? '✓ Valid note length' 
                      : `${escalateForm.note.length}/10 characters - ${10 - escalateForm.note.length} more needed`
                    }
                  </p>
                  <p className="text-xs text-gray-500">
                    {escalateForm.note.length} characters
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setEscalateModal(null)} 
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleEscalate} 
                disabled={actionLoading || escalateForm.note.length < 10}
                className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: ADMIN_COLORS.error }}
                title={escalateForm.note.length < 10 ? `Need ${10 - escalateForm.note.length} more characters` : 'Click to escalate'}
              >
                {actionLoading ? "Escalating..." : "Escalate Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compensate Modal */}
      {compensateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Process Compensation</h3>
              <button onClick={() => setCompensateModal(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-3 rounded-xl mb-4" style={{ backgroundColor: ADMIN_COLORS.successBg }}>
              <p className="text-xs font-bold" style={{ color: ADMIN_COLORS.success }}>Order: #{String(compensateModal).slice(-8).toUpperCase()}</p>
            </div>
            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Compensation Type *</label>
                <select value={compensateForm.compensationType} onChange={e => setCompensateForm(p => ({ ...p, compensationType: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition">
                  <option value="refund">Refund</option>
                  <option value="wallet_credit">Wallet Credit</option>
                  <option value="coupon">Coupon</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Amount (₹) *</label>
                <input type="number" min="1" value={compensateForm.compensationValue || ""}
                  onChange={e => setCompensateForm(p => ({ ...p, compensationValue: parseFloat(e.target.value) || 0 }))}
                  placeholder="Enter compensation amount"
                  className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Note</label>
                <textarea value={compensateForm.note} onChange={e => setCompensateForm(p => ({ ...p, note: e.target.value }))}
                  placeholder="Reason for compensation..."
                  className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition resize-none" rows={2} />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCompensateModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleCompensate} disabled={actionLoading || !compensateForm.compensationValue}
                className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl transition disabled:opacity-50"
                style={{ backgroundColor: ADMIN_COLORS.success }}>
                {actionLoading ? "Processing..." : "Process Compensation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Policy Modal */}
      {policyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">Create SLA Policy</h3>
              <button onClick={() => setPolicyModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition"><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Policy Name *</label>
                  <input value={policyForm.name} onChange={e => setPolicyForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g., Standard Printing SLA"
                    className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Description</label>
                  <textarea value={policyForm.description} onChange={e => setPolicyForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Describe this policy..."
                    className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition resize-none" rows={2} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Flow Type *</label>
                  <select value={policyForm.flowType} onChange={e => setPolicyForm(p => ({ ...p, flowType: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition">
                    {FLOW_TYPES.filter(f => f !== "all").map(f => <option key={f} value={f} className="capitalize">{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Escalation Level</label>
                  <select value={policyForm.escalationLevel} onChange={e => setPolicyForm(p => ({ ...p, escalationLevel: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition">
                    {ESCALATION_LEVELS.map(l => <option key={l} value={l} className="capitalize">{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">From Status *</label>
                  <select value={policyForm.fromStatus} onChange={e => setPolicyForm(p => ({ ...p, fromStatus: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition">
                    {ORDER_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">To Status *</label>
                  <select value={policyForm.toStatus} onChange={e => setPolicyForm(p => ({ ...p, toStatus: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition">
                    {ORDER_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Max Time (minutes) *</label>
                  <input type="number" min="1" value={policyForm.maxMinutes}
                    onChange={e => setPolicyForm(p => ({ ...p, maxMinutes: parseInt(e.target.value) || 0 }))}
                    className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition" />
                  <p className="text-xs text-gray-400 mt-1">{policyForm.maxMinutes >= 60 ? `= ${Math.round(policyForm.maxMinutes / 60)}h` : ""}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Warning At (minutes) *</label>
                  <input type="number" min="1" value={policyForm.warningMinutes}
                    onChange={e => setPolicyForm(p => ({ ...p, warningMinutes: parseInt(e.target.value) || 0 }))}
                    className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition" />
                  <p className="text-xs text-gray-400 mt-1">{policyForm.warningMinutes >= 60 ? `= ${Math.round(policyForm.warningMinutes / 60)}h` : ""}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Compensation Type</label>
                  <select value={policyForm.compensationType} onChange={e => setPolicyForm(p => ({ ...p, compensationType: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition">
                    {COMPENSATION_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                {policyForm.compensationType !== "none" && (
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Compensation Value (₹)</label>
                    <input type="number" min="0" value={policyForm.compensationValue}
                      onChange={e => setPolicyForm(p => ({ ...p, compensationValue: parseFloat(e.target.value) || 0 }))}
                      className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition" />
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button onClick={() => setPolicyModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleCreatePolicy} disabled={actionLoading || !policyForm.name}
                className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl transition disabled:opacity-50"
                style={{ backgroundColor: ADMIN_COLORS.primary }}>
                {actionLoading ? "Creating..." : "Create Policy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
