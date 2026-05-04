import { useState } from "react";
import { Shield, Plus, RefreshCw, Search, AlertTriangle, CheckCircle, X, ChevronDown, Eye, Edit2, MessageSquare } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getRiskCases, getRiskCasesSummary, createRiskCase, updateRiskCase, addRiskCaseAction, getAdminStaff } from "../../api/admin";
import { ADMIN_COLORS } from "../../utils/colors";
import AdminMetricCard from "../../components/ui/AdminMetricCard";
import LoadingState from "../../components/ui/LoadingState";

const SEV_COLOR: Record<string, { color: string; bg: string }> = {
  critical: { color: "#dc2626", bg: "#fef2f2" },
  high:     { color: "#ea580c", bg: "#fff7ed" },
  medium:   { color: "#d97706", bg: "#fffbeb" },
  low:      { color: "#16a34a", bg: "#f0fdf4" },
};
const STATUS_COLOR: Record<string, { color: string; bg: string }> = {
  open:          { color: "#dc2626", bg: "#fef2f2" },
  investigating: { color: "#d97706", bg: "#fffbeb" },
  restricted:    { color: "#7c3aed", bg: "#f5f3ff" },
  resolved:      { color: "#16a34a", bg: "#f0fdf4" },
  closed:        { color: "#6b7280", bg: "#f9fafb" },
};

const CATEGORIES = ["fraud","abuse","chargeback","refund","sla","compliance","other"];
const SEVERITIES  = ["low","medium","high","critical"];
const STATUSES    = ["open","investigating","restricted","resolved","closed"];
const ENTITY_TYPES = ["customer","vendor","order","delivery_partner","staff","system","other"];

const emptyForm = {
  subject: "", entityType: "", entityId: "", category: "fraud",
  severity: "medium", description: "", assignedTo: "", tags: "", evidence: "",
};

export default function RiskCasesPage() {
  const [search, setSearch]           = useState("");
  const [statusF, setStatusF]         = useState("all");
  const [severityF, setSeverityF]     = useState("all");
  const [categoryF, setCategoryF]     = useState("all");
  const [showCreate, setShowCreate]   = useState(false);
  const [form, setForm]               = useState(emptyForm);
  const [saving, setSaving]           = useState(false);
  const [formErr, setFormErr]         = useState("");
  const [detailCase, setDetailCase]   = useState<any>(null);
  const [editCase, setEditCase]       = useState<any>(null);
  const [actionModal, setActionModal] = useState<any>(null);
  const [actionForm, setActionForm]   = useState({ action: "note_added", note: "" });
  const [actionSaving, setActionSaving] = useState(false);
  const [resolveNote, setResolveNote] = useState("");
  const [toast, setToast]             = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const { data: casesData, loading: casesLoading, refetch } = useAsync(
    () => getRiskCases({ status: statusF === "all" ? undefined : statusF, severity: severityF === "all" ? undefined : severityF, category: categoryF === "all" ? undefined : categoryF, search: search || undefined, limit: 50 }),
    {}, [statusF, severityF, categoryF]
  );
  const { data: summaryData, refetch: refetchSummary } = useAsync(() => getRiskCasesSummary(), {}, []);
  const { data: staffData } = useAsync(() => getAdminStaff(), {}, []);

  const cases: any[]  = (casesData as any)?.cases || [];
  const summary: any  = (summaryData as any) || {};
  const staff: any[]  = (staffData as any)?.staff || [];

  const statuses   = summary.statuses   || [];
  const severities = summary.severities || [];
  const openCount  = statuses.find((s: any) => s._id === "open")?.count || 0;
  const invCount   = statuses.find((s: any) => s._id === "investigating")?.count || 0;
  const resCount   = statuses.find((s: any) => s._id === "resolved")?.count || 0;
  const critCount  = severities.find((s: any) => s._id === "critical")?.count || 0;

  const filtered = cases.filter((c: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.subject?.toLowerCase().includes(q) || c.entityId?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q);
  });

  const handleCreate = async () => {
    if (!form.subject.trim()) { setFormErr("Subject is required."); return; }
    setSaving(true); setFormErr("");
    try {
      await createRiskCase({
        subject: form.subject.trim(),
        entityType: form.entityType || undefined,
        entityId: form.entityId || undefined,
        category: form.category,
        severity: form.severity,
        description: form.description || undefined,
        assignedTo: form.assignedTo || undefined,
        tags: form.tags ? form.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : undefined,
        evidence: form.evidence ? form.evidence.split(",").map((e: string) => e.trim()).filter(Boolean) : undefined,
      });
      setShowCreate(false); setForm(emptyForm);
      refetch(); refetchSummary();
      showToast("Risk case created.");
    } catch (e: any) { setFormErr(e?.message || "Failed to create case."); }
    finally { setSaving(false); }
  };

  const handleUpdateStatus = async (id: string, status: string, resolution?: string) => {
    try {
      await updateRiskCase(id, { status, ...(resolution ? { resolution, note: resolution } : {}) });
      refetch(); refetchSummary();
      setDetailCase(null); setEditCase(null); setResolveNote("");
      showToast("Case updated.");
    } catch (e: any) { showToast(e?.message || "Failed to update."); }
  };

  const handleAddAction = async () => {
    if (!actionForm.note.trim()) return;
    setActionSaving(true);
    try {
      await addRiskCaseAction(actionModal._id, { action: actionForm.action, note: actionForm.note });
      setActionModal(null); setActionForm({ action: "note_added", note: "" });
      refetch(); showToast("Action added.");
    } catch (e: any) { showToast(e?.message || "Failed to add action."); }
    finally { setActionSaving(false); }
  };

  const CS = { border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(15,23,42,0.06)" };

  return (
    <div className="space-y-5">

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white bg-slate-800">
          <CheckCircle size={15} /> {toast}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <AdminMetricCard index={0} label="Open Cases"    value={String(openCount)}  accent={ADMIN_COLORS.error}    accentBg={ADMIN_COLORS.errorBg}    icon={AlertTriangle} />
        <AdminMetricCard label="Investigating"           value={String(invCount)}   accent={ADMIN_COLORS.warning}  accentBg={ADMIN_COLORS.warningBg}  icon={Search} />
        <AdminMetricCard label="Resolved"                value={String(resCount)}   accent={ADMIN_COLORS.success}  accentBg={ADMIN_COLORS.successBg}  icon={CheckCircle} />
        <AdminMetricCard label="Critical"                value={String(critCount)}  accent="#dc2626"               accentBg="#fef2f2"                  icon={Shield} />
      </div>

      {/* Filters + Actions */}
      <div className="bg-white rounded-xl p-4 flex flex-wrap items-center gap-3" style={CS}>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search subject, entity ID..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
        </div>
        {[
          { val: statusF,   set: setStatusF,   opts: STATUSES,    label: "All Status" },
          { val: severityF, set: setSeverityF, opts: SEVERITIES,  label: "All Severity" },
          { val: categoryF, set: setCategoryF, opts: CATEGORIES,  label: "All Category" },
        ].map(({ val, set, opts, label }) => (
          <div key={label} className="relative">
            <select value={val} onChange={e => set(e.target.value)}
              className="appearance-none px-4 py-2.5 pr-8 rounded-xl border border-gray-200 text-sm font-semibold focus:outline-none focus:border-gray-900 transition capitalize">
              <option value="all">{label}</option>
              {opts.map(o => <option key={o} value={o} className="capitalize">{o}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        ))}
        <button onClick={() => refetch()} className="p-2.5 rounded-xl border border-gray-200 hover:border-gray-900 transition">
          <RefreshCw size={14} className={casesLoading ? "animate-spin" : ""} />
        </button>
        <button onClick={() => { setShowCreate(true); setFormErr(""); setForm(emptyForm); }}
          className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-bold rounded-xl transition ml-auto"
          style={{ backgroundColor: ADMIN_COLORS.primary }}>
          <Plus size={14} /> New Case
        </button>
      </div>

      {/* Cases Table */}
      <div className="bg-white rounded-xl overflow-hidden" style={CS}>
        {casesLoading ? (
          <div className="flex items-center justify-center py-16"><LoadingState message="Loading risk cases" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Shield size={40} className="text-gray-200" />
            <p className="text-sm font-semibold text-gray-500">No risk cases found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Case", "Entity", "Category", "Severity", "Status", "Assigned To", "Created", "Actions"].map(h => (
                    <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: any) => {
                  const sev = SEV_COLOR[c.severity] || SEV_COLOR.medium;
                  const sta = STATUS_COLOR[c.status] || STATUS_COLOR.open;
                  const assignedName = staff.find((s: any) => (s._id || s.id) === c.assignedTo)?.name || (c.assignedTo ? String(c.assignedTo).slice(-8) : "Unassigned");
                  return (
                    <tr key={c._id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <p className="text-xs font-mono text-gray-400">{String(c._id).slice(-8)}</p>
                        <p className="text-sm font-bold text-gray-900 mt-0.5 max-w-[200px] truncate">{c.subject}</p>
                        {c.tags?.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {c.tags.slice(0,3).map((t: string) => (
                              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">{t}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-gray-700 capitalize">{c.entityType || "—"}</p>
                        {c.entityId && <p className="text-xs font-mono text-gray-400 mt-0.5">{String(c.entityId).slice(-10)}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-semibold capitalize">{c.category || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded-full font-bold capitalize" style={{ backgroundColor: sev.bg, color: sev.color }}>{c.severity}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded-full font-bold capitalize" style={{ backgroundColor: sta.bg, color: sta.color }}>{c.status?.replace("_"," ")}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-600">{assignedName}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-500">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setDetailCase(c)} className="p-1.5 rounded-lg hover:bg-gray-100 transition" title="View">
                            <Eye size={14} className="text-gray-500" />
                          </button>
                          <button onClick={() => setEditCase(c)} className="p-1.5 rounded-lg hover:bg-blue-50 transition" title="Update Status">
                            <Edit2 size={14} style={{ color: ADMIN_COLORS.info }} />
                          </button>
                          <button onClick={() => { setActionModal(c); setActionForm({ action: "note_added", note: "" }); }} className="p-1.5 rounded-lg hover:bg-purple-50 transition" title="Add Action">
                            <MessageSquare size={14} style={{ color: "#8b5cf6" }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">New Risk Case</h3>
              <button onClick={() => setShowCreate(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              {[
                { label: "Subject *", key: "subject", placeholder: "e.g. Fraudulent refund request" },
                { label: "Entity ID", key: "entityId", placeholder: "Customer/Order/Vendor ID" },
                { label: "Description", key: "description", placeholder: "Describe the issue..." },
                { label: "Evidence URLs (comma separated)", key: "evidence", placeholder: "https://..." },
                { label: "Tags (comma separated)", key: "tags", placeholder: "fraud, repeat-offender" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
                  <input value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Entity Type", key: "entityType", opts: ENTITY_TYPES },
                  { label: "Category",    key: "category",   opts: CATEGORIES },
                  { label: "Severity",    key: "severity",   opts: SEVERITIES },
                ].map(({ label, key, opts }) => (
                  <div key={key}>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
                    <select value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 capitalize">
                      <option value="">Select...</option>
                      {opts.map(o => <option key={o} value={o} className="capitalize">{o}</option>)}
                    </select>
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Assign To</label>
                  <select value={form.assignedTo} onChange={e => setForm(p => ({ ...p, assignedTo: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900">
                    <option value="">Unassigned</option>
                    {staff.map((s: any) => <option key={s._id || s.id} value={s._id || s.id}>{s.name || s.email}</option>)}
                  </select>
                </div>
              </div>
            </div>
            {formErr && <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-600">{formErr}</div>}
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleCreate} disabled={saving} className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl transition disabled:opacity-50" style={{ backgroundColor: ADMIN_COLORS.primary }}>
                {saving ? "Creating..." : "Create Case"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailCase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Case Details</h3>
              <button onClick={() => setDetailCase(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              {[
                { label: "Subject",     value: detailCase.subject },
                { label: "Category",    value: detailCase.category },
                { label: "Severity",    value: detailCase.severity },
                { label: "Status",      value: detailCase.status },
                { label: "Entity Type", value: detailCase.entityType },
                { label: "Entity ID",   value: detailCase.entityId },
                { label: "Description", value: detailCase.description },
                { label: "Resolution",  value: detailCase.resolution },
              ].filter(r => r.value).map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between p-3 rounded-xl bg-gray-50">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</span>
                  <span className="text-sm font-semibold text-gray-900 text-right max-w-[60%] capitalize">{value}</span>
                </div>
              ))}
              {detailCase.actions?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Action History</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {detailCase.actions.map((a: any, i: number) => (
                      <div key={i} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-gray-700 capitalize">{a.action?.replace(/_/g," ")}</span>
                          <span className="text-xs text-gray-400">{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ""}</span>
                        </div>
                        {a.note && <p className="text-xs text-gray-600">{a.note}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setDetailCase(null)} className="w-full mt-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Close</button>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {editCase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Update Case</h3>
              <button onClick={() => setEditCase(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">New Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUSES.map(s => {
                    const sc = STATUS_COLOR[s] || STATUS_COLOR.open;
                    return (
                      <button key={s} onClick={() => handleUpdateStatus(editCase._id, s, resolveNote)}
                        className="py-2 rounded-xl text-xs font-bold capitalize border-2 transition"
                        style={{ borderColor: sc.color, backgroundColor: sc.bg, color: sc.color }}>
                        {s.replace("_"," ")}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Resolution Note (for resolved/closed)</label>
                <input value={resolveNote} onChange={e => setResolveNote(e.target.value)} placeholder="Describe resolution..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
              </div>
            </div>
            <button onClick={() => setEditCase(null)} className="w-full mt-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
          </div>
        </div>
      )}

      {/* Add Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Add Action</h3>
              <button onClick={() => setActionModal(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Action Type</label>
                <select value={actionForm.action} onChange={e => setActionForm(p => ({ ...p, action: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900">
                  {["note_added","escalated","restricted","warning_issued","investigated","resolved","closed"].map(a => (
                    <option key={a} value={a} className="capitalize">{a.replace(/_/g," ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Note</label>
                <textarea value={actionForm.note} onChange={e => setActionForm(p => ({ ...p, note: e.target.value }))}
                  placeholder="Describe the action taken..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setActionModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleAddAction} disabled={actionSaving || !actionForm.note.trim()}
                className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl transition disabled:opacity-50"
                style={{ backgroundColor: "#8b5cf6" }}>
                {actionSaving ? "Adding..." : "Add Action"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
