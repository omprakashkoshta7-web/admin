import { useState, useEffect } from "react";
import { Truck, Plus, MapPin, X, CheckCircle, Edit, Trash2, Power, DollarSign, TrendingUp, Activity, Search, Filter, Download, AlertTriangle } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { 
  getAdminDeliveryPartners, 
  createAdminDeliveryPartner, 
  updateAdminDeliveryPartner, 
  deleteAdminDeliveryPartner, 
  suspendAdminDeliveryPartner,
  resumeDeliveryPartner,

  assignDeliveryZones,
  setDeliveryPayoutRate,
  getDeliverySLAMetrics,
  getDeliveryPartnerAnalytics
} from "../../api/admin";
import { ADMIN_COLORS } from "../../utils/colors";
import AdminMetricCard from "../../components/ui/AdminMetricCard";

export default function DeliveryPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", vehicleType: "bike", zoneAssignments: "" });
  const [added, setAdded] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // New states for enhanced features
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [zoneForm, setZoneForm] = useState({ zones: "" });
  const [payoutForm, setPayoutForm] = useState({ payoutRatePerKm: "", payoutRatePerOrder: "" });
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [payoutSuccess, setPayoutSuccess] = useState(false);
  const [zoneSuccess, setZoneSuccess] = useState(false);
  const [statusError, setStatusError] = useState<string>("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string>("");

  const normalizePartner = (p: any) => ({
    id: String(p._id || p.id || p.partnerId || ''),
    name: p.name || '',
    type: p.deliveryDetails?.vehicleType || p.vehicleType || 'bike',
    cities: Array.isArray(p.deliveryDetails?.zoneAssignments) 
      ? p.deliveryDetails.zoneAssignments.join(', ') 
      : (Array.isArray(p.zoneAssignments) ? p.zoneAssignments.join(', ') : ''),
    rate: p.rate ?? p.payoutRate ?? p.payout_rate ?? '',
    sla: p.sla ?? p.averageDeliveryTime ?? 'N/A',
    status: (p.isActive && !p.isBlocked) ? 'active' : 'suspended',
    logo: p.logo || p.logoUrl || '',
    raw: p,
  });

  // Fetch delivery data from backend
  const { data: partnersData, refetch } = useAsync(() => getAdminDeliveryPartners(), {}, []);
  
  // Fetch SLA metrics
  const { data: slaMetrics } = useAsync(() => getDeliverySLAMetrics(), {}, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => { refetch(); }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Use real data from backend
  useEffect(() => {
    if ((partnersData as any)) {
      const res: any = partnersData as any;
      // possible shapes: { partners: [...] } or array
      const rawCandidate = res;
      const raw = Array.isArray(rawCandidate)
        ? rawCandidate
        : (Array.isArray(rawCandidate?.partners) ? rawCandidate.partners
          : (Array.isArray(rawCandidate?.data) ? rawCandidate.data
            : (rawCandidate?.partner ? [rawCandidate.partner] : [])));

      setItems((raw || []).map((p: any) => normalizePartner(p)));
    }
  }, [partnersData]);
  
  // Filter partners based on search and status
  const filteredItems = items.filter(p => {
    const matchesSearch = !searchTerm || 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cities.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportDelivery = () => {
    const csvContent = [
      ['ID', 'Name', 'Type', 'Cities', 'Status', 'Rate', 'SLA'].join(','),
      ...items.map((p: any) => [
        p.id,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        p.type || '',
        `"${(p.cities || '').replace(/"/g, '""')}"`,
        p.status || '',
        p.rate || '',
        p.sla || '',
      ].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `delivery-partners-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const add = async () => {
    if (!form.name) return;
    setFormError("");
    try {
      setUploadingImage(true);
      
      // Prepare plain object for API call
      const dataToSend = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        vehicleType: form.vehicleType,
        zoneAssignments: form.zoneAssignments 
          ? form.zoneAssignments.split(',').map(z => z.trim())
          : [],
      };

      if (editing && currentId) {
        const res: any = await updateAdminDeliveryPartner(currentId, dataToSend as any);
        const updated = res?.partner ? normalizePartner(res.partner) : null;
        if (updated) {
          setItems(prev => prev.map(it => it.id === currentId ? updated : it));
        } else {
          await refetch();
        }
      } else {
        const res: any = await createAdminDeliveryPartner(dataToSend as any);
        const created = res?.partner ? normalizePartner(res.partner) : null;
        if (created) {
          setItems(prev => [created, ...prev]);
        } else {
          await refetch();
        }
      }

      setAdded(true);
      setTimeout(() => {
        setShowAdd(false);
        setAdded(false);
        setForm({ name: "", email: "", phone: "", vehicleType: "bike", zoneAssignments: "" });
        setEditing(false);
        setCurrentId(null);
        setUploadingImage(false);
      }, 900);
    } catch (error: any) {
      console.error('Failed to save delivery partner:', error);
      setUploadingImage(false);
      // Parse a user-friendly message from the error
      const msg: string =
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong. Please try again.";
      // Map common backend messages to friendlier copy
      if (msg.toLowerCase().includes("email already exists") || error?.response?.status === 409) {
        setFormError("A delivery partner with this email already exists. Please use a different email address.");
      } else {
        setFormError(msg);
      }
    }
  };

  const onEdit = (p: any) => {
    setForm({ name: p.name || '', email: p.raw?.email || '', phone: p.raw?.phone || '', vehicleType: p.type || 'bike', zoneAssignments: p.cities || '' });
    setEditing(true);
    setCurrentId(p.id);
    setShowAdd(true);
  };

  const onDelete = async (id: string) => {
    if (!confirm('Delete this partner?')) return;
    try {
      const res: any = await deleteAdminDeliveryPartner(id);
      // update local state immediately when delete succeeds
      if (res && (res.success === true || res.deleted)) {
        setItems(prev => prev.filter(it => it.id !== id));
      } else {
        // fallback to refetch
        refetch();
      }
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const toggleStatus = async (p: any) => {
    if (togglingId === p.id) return; // prevent double-click
    setTogglingId(p.id);
    setStatusError("");

    const suspend = p.status === 'active';
    const newStatus = suspend ? 'suspended' : 'active';

    // Optimistic update — flip immediately in UI
    setItems(prev => prev.map(it => it.id === p.id ? { ...it, status: newStatus } : it));

    try {
      if (suspend) {
        await suspendAdminDeliveryPartner(p.id, true);
      } else {
        await resumeDeliveryPartner(p.id);
      }
      refetch(); // sync with server
    } catch (err: any) {
      console.error('Toggle status failed', err);
      // Revert optimistic update on failure
      setItems(prev => prev.map(it => it.id === p.id ? { ...it, status: p.status } : it));
      setStatusError(err?.message || `Failed to ${suspend ? 'suspend' : 'resume'} partner`);
      setTimeout(() => setStatusError(""), 4000);
    } finally {
      setTogglingId(null);
    }
  };
  
  // Handle zone assignment
  const handleZoneAssignment = async () => {
    if (!selectedPartner || !zoneForm.zones.trim()) return;
    try {
      const zones = zoneForm.zones.split(',').map(z => z.trim()).filter(Boolean);
      await assignDeliveryZones(selectedPartner.id, zones);
      setZoneSuccess(true);
      refetch();
      setTimeout(() => {
        setShowZoneModal(false);
        setZoneForm({ zones: "" });
        setSelectedPartner(null);
        setZoneSuccess(false);
      }, 1200);
    } catch (err) {
      console.error('Zone assignment failed', err);
      alert('Failed to assign zones');
    }
  };
  
  // Handle payout rate update
  const handlePayoutUpdate = async () => {
    if (!selectedPartner) return;
    try {
      const payoutRatePerKm = parseFloat(payoutForm.payoutRatePerKm) || 0;
      await setDeliveryPayoutRate(selectedPartner.id, payoutRatePerKm);
      setPayoutSuccess(true);
      refetch();
      setTimeout(() => {
        setShowPayoutModal(false);
        setPayoutForm({ payoutRatePerKm: "", payoutRatePerOrder: "" });
        setSelectedPartner(null);
        setPayoutSuccess(false);
      }, 1200);
    } catch (err) {
      console.error('Payout update failed', err);
      alert('Failed to update payout rate');
    }
  };
  
  // View partner analytics
  const viewAnalytics = async (partner: any) => {
    try {
      const data = await getDeliveryPartnerAnalytics(partner.id);
      setAnalyticsData(data);
      setSelectedPartner(partner);
      setShowAnalyticsModal(true);
    } catch (err) {
      console.error('Failed to load analytics', err);
      alert('Failed to load analytics');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"></div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportDelivery}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold"
          >
            <Download size={14} />
            Export
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-bold rounded-xl transition" style={{ backgroundColor: ADMIN_COLORS.primary }}>
            <Plus size={15} /> Add Partner
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <AdminMetricCard 
          index={0}
          label="Total Partners" 
          value={items.length.toString()} 
          accent={ADMIN_COLORS.info} 
          accentBg={ADMIN_COLORS.infoBg}
          icon={Truck} 
        />
        <AdminMetricCard 
          label="Active Partners" 
          value={items.filter(p => p.status === 'active').length.toString()} 
          accent={ADMIN_COLORS.success} 
          accentBg={ADMIN_COLORS.successBg}
          icon={CheckCircle} 
        />
        <AdminMetricCard 
          label="Success Rate" 
          value={`${(slaMetrics as any)?.successRate || 0}%`}
          accent={ADMIN_COLORS.warning} 
          accentBg={ADMIN_COLORS.warningBg}
          icon={TrendingUp} 
        />
        <AdminMetricCard 
          label="Avg Delivery Time" 
          value={`${(slaMetrics as any)?.avgDeliveryMinutes || 0}m`}
          accent={ADMIN_COLORS.primary} 
          accentBg="#f0f4ff"
          icon={Activity} 
        />
      </div>

      {/* Status toggle error banner */}
      {statusError && (
        <div className="p-3 rounded-xl border flex items-center gap-2"
          style={{ backgroundColor: ADMIN_COLORS.errorBg, borderColor: ADMIN_COLORS.errorBorder }}>
          <AlertTriangle size={15} style={{ color: ADMIN_COLORS.error }} />
          <p className="text-sm font-semibold" style={{ color: ADMIN_COLORS.error }}>{statusError}</p>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search delivery partners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition text-sm font-semibold"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Partners List */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
        {filteredItems.length > 0 ? (
          filteredItems.map((p: any) => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition">
              <div className="flex items-center gap-4">
                {/* Partner Icon */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: ADMIN_COLORS.infoBg }}>
                  <Truck size={20} style={{ color: ADMIN_COLORS.info }} />
                </div>
                
                {/* Partner Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-gray-900">{p.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      p.type === "bike" ? "bg-blue-50 text-blue-700" : 
                      p.type === "car" ? "bg-purple-50 text-purple-700" :
                      p.type === "van" ? "bg-green-50 text-green-700" :
                      "bg-orange-50 text-orange-700"
                    }`}>
                      {p.type}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      p.status === "active" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                    }`}>
                      {p.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {p.cities || 'No zones assigned'}
                    </span>
                    <span>SLA: {p.sla}</span>
                    {p.rate && <span>Rate: {p.rate}</span>}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => viewAnalytics(p)}
                    className="p-2 rounded-lg hover:bg-blue-50 transition"
                    title="View Analytics"
                  >
                    <TrendingUp size={16} style={{ color: ADMIN_COLORS.info }} />
                  </button>
                  
                  <button
                    onClick={() => {
                      setSelectedPartner(p);
                      setZoneForm({ zones: p.cities || "" });
                      setShowZoneModal(true);
                    }}
                    className="p-2 rounded-lg hover:bg-purple-50 transition"
                    title="Manage Zones"
                  >
                    <MapPin size={16} style={{ color: ADMIN_COLORS.accent }} />
                  </button>
                  
                  <button
                    onClick={() => {
                      setSelectedPartner(p);
                      // Pre-fill existing payout values
                      setPayoutForm({
                        payoutRatePerKm: String(p.raw?.deliveryDetails?.payoutRatePerKm ?? p.raw?.payoutRatePerKm ?? p.rate ?? ""),
                        payoutRatePerOrder: String(p.raw?.deliveryDetails?.payoutRatePerOrder ?? p.raw?.payoutRatePerOrder ?? ""),
                      });
                      setPayoutSuccess(false);
                      setShowPayoutModal(true);
                    }}
                    className="p-2 rounded-lg hover:bg-green-50 transition"
                    title="Update Payout Rate"
                  >
                    <DollarSign size={16} style={{ color: ADMIN_COLORS.success }} />
                  </button>
                  
                  <button
                    onClick={() => toggleStatus(p)}
                    disabled={togglingId === p.id}
                    className={`p-2 rounded-lg transition ${
                      p.status === "active" ? "hover:bg-red-50" : "hover:bg-green-50"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={p.status === "active" ? "Suspend Partner" : "Resume Partner"}
                  >
                    <Power size={16} style={{ color: togglingId === p.id ? '#9ca3af' : (p.status === "active" ? ADMIN_COLORS.error : ADMIN_COLORS.success) }} />
                  </button>
                  
                  <button
                    onClick={() => onEdit(p)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition"
                    title="Edit Partner"
                  >
                    <Edit size={16} className="text-gray-500" />
                  </button>
                  
                  <button
                    onClick={() => onDelete(p.id)}
                    className="p-2 rounded-lg hover:bg-red-50 transition"
                    title="Delete Partner"
                  >
                    <Trash2 size={16} style={{ color: ADMIN_COLORS.error }} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <Truck size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-lg font-semibold text-gray-600 mb-2">No delivery partners found</p>
            <p className="text-sm text-gray-500 mb-4">
              {items.length === 0 
                ? "Add your first delivery partner to get started" 
                : "No partners match your current filters"}
            </p>
            {items.length === 0 && (
              <button 
                onClick={() => setShowAdd(true)} 
                className="px-4 py-2 text-white text-sm font-bold rounded-xl transition"
                style={{ backgroundColor: ADMIN_COLORS.primary }}
              >
                Add First Partner
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Partner Modal */}
      {showAdd && (
        <div className="admin-modal-overlay">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">{editing ? 'Edit Delivery Partner' : 'Add Delivery Partner'}</h2>
              <button onClick={() => { 
                setShowAdd(false); 
                setEditing(false); 
                setCurrentId(null); 
                setForm({ name: "", email: "", phone: "", vehicleType: "bike", zoneAssignments: "" }); 
                setFormError("");
              }}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            
            {added ? (
              <div className="flex items-center gap-2 p-4 rounded-xl border" style={{ backgroundColor: ADMIN_COLORS.successBg, borderColor: ADMIN_COLORS.successBorder }}>
                <CheckCircle size={16} style={{ color: ADMIN_COLORS.success }} />
                <p className="text-sm font-bold" style={{ color: ADMIN_COLORS.success }}>
                  Partner {editing ? 'updated' : 'added'} successfully.
                </p>
              </div>
            ) : (
              <>
                {formError && (
                  <div className="flex items-start gap-2 p-3 mb-4 rounded-xl border" style={{ backgroundColor: ADMIN_COLORS.errorBg, borderColor: ADMIN_COLORS.errorBorder }}>
                    <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" style={{ color: ADMIN_COLORS.error }} />
                    <p className="text-sm font-semibold" style={{ color: ADMIN_COLORS.error }}>{formError}</p>
                  </div>
                )}
                <div className="space-y-4 mb-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Partner Name *</label>
                    <input 
                      value={form.name} 
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))} 
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" 
                      placeholder="Enter partner name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Email *</label>
                    <input 
                      type="email"
                      value={form.email} 
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))} 
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" 
                      placeholder="partner@example.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Phone *</label>
                    <input 
                      type="tel"
                      value={form.phone} 
                      onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} 
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" 
                      placeholder="Enter phone number"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Vehicle Type</label>
                    <select 
                      value={form.vehicleType} 
                      onChange={e => setForm(p => ({ ...p, vehicleType: e.target.value }))} 
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900"
                    >
                      <option value="bike">Bike</option>
                      <option value="car">Car</option>
                      <option value="van">Van</option>
                      <option value="truck">Truck</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Zone Assignments</label>
                    <input 
                      value={form.zoneAssignments} 
                      onChange={e => setForm(p => ({ ...p, zoneAssignments: e.target.value }))} 
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" 
                      placeholder="Mumbai, Delhi, Bangalore"
                    />
                    <p className="text-xs text-gray-500 mt-1">Comma-separated list of cities/zones</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => { 
                      setShowAdd(false); 
                      setEditing(false); 
                      setCurrentId(null); 
                      setFormError("");
                    }} 
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={add} 
                    disabled={uploadingImage || !form.name || !form.email || !form.phone}
                    className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl transition disabled:opacity-50"
                    style={{ backgroundColor: ADMIN_COLORS.primary }}
                  >
                    {uploadingImage ? 'Saving...' : (editing ? 'Update Partner' : 'Add Partner')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Zone Assignment Modal */}
      {showZoneModal && selectedPartner && (
        <div className="admin-modal-overlay">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Manage Zones - {selectedPartner.name}</h2>
              <button onClick={() => { setShowZoneModal(false); setSelectedPartner(null); setZoneForm({ zones: "" }); setZoneSuccess(false); }}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            {zoneSuccess ? (
              <div className="flex items-center gap-2 p-4 rounded-xl border" style={{ backgroundColor: ADMIN_COLORS.successBg, borderColor: ADMIN_COLORS.successBorder }}>
                <CheckCircle size={16} style={{ color: ADMIN_COLORS.success }} />
                <p className="text-sm font-bold" style={{ color: ADMIN_COLORS.success }}>
                  Zones updated successfully.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Zone Assignments</label>
                    <textarea
                      value={zoneForm.zones}
                      onChange={e => setZoneForm({ zones: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition resize-none"
                      rows={4}
                      placeholder="Mumbai, Delhi, Bangalore, Pune"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter comma-separated list of cities/zones this partner can serve</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowZoneModal(false); setSelectedPartner(null); setZoneForm({ zones: "" }); }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleZoneAssignment}
                    disabled={!zoneForm.zones.trim()}
                    className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl transition disabled:opacity-50"
                    style={{ backgroundColor: ADMIN_COLORS.primary }}
                  >
                    Update Zones
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Payout Rate Modal */}
      {showPayoutModal && selectedPartner && (
        <div className="admin-modal-overlay">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Update Payout Rate - {selectedPartner.name}</h2>
              <button onClick={() => { setShowPayoutModal(false); setSelectedPartner(null); setPayoutForm({ payoutRatePerKm: "", payoutRatePerOrder: "" }); setPayoutSuccess(false); }}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            {payoutSuccess ? (
              <div className="flex items-center gap-2 p-4 rounded-xl border" style={{ backgroundColor: ADMIN_COLORS.successBg, borderColor: ADMIN_COLORS.successBorder }}>
                <CheckCircle size={16} style={{ color: ADMIN_COLORS.success }} />
                <p className="text-sm font-bold" style={{ color: ADMIN_COLORS.success }}>
                  Payout rate updated successfully.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Payout Rate per KM (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={payoutForm.payoutRatePerKm}
                      onChange={e => setPayoutForm(p => ({ ...p, payoutRatePerKm: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition"
                      placeholder="e.g., 10.50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Payout Rate per Order (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={payoutForm.payoutRatePerOrder}
                      onChange={e => setPayoutForm(p => ({ ...p, payoutRatePerOrder: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition"
                      placeholder="e.g., 50.00"
                    />
                  </div>
                  <div className="p-3 rounded-xl border" style={{ backgroundColor: ADMIN_COLORS.infoBg, borderColor: ADMIN_COLORS.infoBorder }}>
                    <p className="text-xs font-bold" style={{ color: ADMIN_COLORS.info }}>Payout Calculation</p>
                    <p className="text-xs mt-1" style={{ color: ADMIN_COLORS.info }}>
                      Total payout = (Distance × Rate per KM) + Rate per Order
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowPayoutModal(false); setSelectedPartner(null); setPayoutForm({ payoutRatePerKm: "", payoutRatePerOrder: "" }); }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePayoutUpdate}
                    disabled={!payoutForm.payoutRatePerKm && !payoutForm.payoutRatePerOrder}
                    className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl transition disabled:opacity-50"
                    style={{ backgroundColor: ADMIN_COLORS.success }}
                  >
                    Update Payout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {showAnalyticsModal && selectedPartner && analyticsData && (
        <div className="admin-modal-overlay">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Analytics - {selectedPartner.name}</h2>
              <button onClick={() => { setShowAnalyticsModal(false); setSelectedPartner(null); setAnalyticsData(null); }}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            
            {/* Analytics Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Total Tasks</p>
                <p className="text-2xl font-black text-gray-900">{analyticsData.totalTasks || 0}</p>
              </div>
              
              <div className="p-4 rounded-xl border" style={{ backgroundColor: ADMIN_COLORS.successBg, borderColor: ADMIN_COLORS.successBorder }}>
                <p className="text-xs font-semibold mb-1" style={{ color: ADMIN_COLORS.success }}>Success Rate</p>
                <p className="text-2xl font-black" style={{ color: ADMIN_COLORS.success }}>{analyticsData.successRate || 0}%</p>
              </div>
              
              <div className="p-4 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Delivered</p>
                <p className="text-2xl font-black text-gray-900">{analyticsData.deliveredCount || 0}</p>
              </div>
              
              <div className="p-4 rounded-xl border" style={{ backgroundColor: ADMIN_COLORS.errorBg, borderColor: ADMIN_COLORS.errorBorder }}>
                <p className="text-xs font-semibold mb-1" style={{ color: ADMIN_COLORS.error }}>Failed</p>
                <p className="text-2xl font-black" style={{ color: ADMIN_COLORS.error }}>{analyticsData.failedCount || 0}</p>
              </div>
              
              <div className="p-4 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Avg Delivery Time</p>
                <p className="text-2xl font-black text-gray-900">{analyticsData.avgDeliveryMinutes || 0}m</p>
              </div>
              
              <div className="p-4 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Total Distance</p>
                <p className="text-2xl font-black text-gray-900">{analyticsData.totalDistanceKm || 0} km</p>
              </div>
            </div>
            
            {/* Status Breakdown */}
            {analyticsData.byStatus && Object.keys(analyticsData.byStatus).length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Status Breakdown</h3>
                <div className="space-y-2">
                  {Object.entries(analyticsData.byStatus).map(([status, count]: [string, any]) => (
                    <div key={status} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <span className="text-sm font-semibold text-gray-700 capitalize">{status.replace(/_/g, ' ')}</span>
                      <span className="text-sm font-bold text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Recent Tasks */}
            {analyticsData.recentTasks && analyticsData.recentTasks.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3">Recent Tasks</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {analyticsData.recentTasks.slice(0, 10).map((task: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                      <div>
                        <p className="text-xs font-bold text-gray-900">{task.orderId || task._id}</p>
                        <p className="text-xs text-gray-500">{new Date(task.createdAt || task.updatedAt).toLocaleString()}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        task.status === 'delivered' ? 'bg-green-50 text-green-700' :
                        task.status === 'failed' ? 'bg-red-50 text-red-600' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <button 
              onClick={() => { setShowAnalyticsModal(false); setSelectedPartner(null); setAnalyticsData(null); }}
              className="w-full mt-6 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
