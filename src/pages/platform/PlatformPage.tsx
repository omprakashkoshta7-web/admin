import { useState, useEffect } from "react";
import { 
  Settings, ToggleLeft, ToggleRight, AlertTriangle, Zap,
  MapPin, RefreshCw, Shield, Activity, Power, Flag,
  XCircle
} from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getAdminControlState, updateAdminControl } from "../../api/admin";
import type { AdminControlStateResponse } from "../../api/admin";
import { ADMIN_COLORS } from "../../utils/colors";
import AdminMetricCard from "../../components/ui/AdminMetricCard";

export default function PlatformPage() {
  const { data: controlData, refetch, loading: controlLoading } = useAsync<AdminControlStateResponse>(getAdminControlState, null, []);
  const [orderIntake, setOrderIntake] = useState(true);
  const [vendorIntake, setVendorIntake] = useState(true);
  const [systemKill, setSystemKill] = useState(false);
  const [cityPause, setCityPause] = useState<Record<string, boolean>>({});
  const [confirm, setConfirm] = useState("");
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cityDetails, setCityDetails] = useState<Record<string, { reason?: string; pausedAt?: string }>>({});
  const [viewCityModal, setViewCityModal] = useState<string | null>(null);
  const [showCityPause, setShowCityPause] = useState(false);
  const [selectedCity, setSelectedCity] = useState("");
  const [pauseReason, setPauseReason] = useState("");

  // Available cities for pause control
  const availableCities = [
    "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai",
    "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow"
  ];

  // Auto-refresh control state every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  useEffect(() => {
    if (controlData) {
      setOrderIntake((controlData as any).orderIntakeEnabled ?? true);
      setVendorIntake((controlData as any).vendorIntakeEnabled ?? true);
      setSystemKill((controlData as any).systemKillSwitchEnabled ?? false);

      // Backend returns pausedCities as an array ["Mumbai", "Delhi"]
      // Convert to { Mumbai: true, Delhi: true } for easy lookup
      const pausedArr: string[] = (controlData as any).pausedCities || [];
      const pauseMap: Record<string, boolean> = {};
      pausedArr.forEach((city: string) => { pauseMap[city] = true; });
      setCityPause(pauseMap);

      // Load reason + pausedAt from pausedCityDetails array
      const details: any[] = (controlData as any).pausedCityDetails || [];
      const detailsMap: Record<string, { reason?: string; pausedAt?: string }> = {};
      details.forEach((d: any) => {
        if (d.city) detailsMap[d.city] = { reason: d.reason, pausedAt: d.pausedAt };
      });
      setCityDetails(detailsMap);
      
      // Transform featureFlags object to array format for display
      const flagsArray = Object.entries((controlData as any).featureFlags || {}).map(([key, value]: [string, any]) => ({
        id: key,
        name: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
        desc: `${key} feature control`,
        enabled: value === true,
      }));
      setFlags(flagsArray);
    }
  }, [controlData]);

  const toggleFlag = async (id: string) => {
    const currentFlag = flags.find(f => f.id === id);
    if (!currentFlag) return;
    
    const newFlags = flags.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f);
    setFlags(newFlags);
    setError("");
    
    try {
      setLoading(true);
      const flagValue = !currentFlag.enabled;
      await updateAdminControl('feature-flags', { [id]: flagValue });
      refetch();
    } catch (error: any) {
      console.error('Failed to update feature flag:', error);
      setError(error?.message || 'Failed to update feature flag');
      // Revert on error
      setFlags(flags);
    } finally {
      setLoading(false);
    }
  };

  const toggleOrderIntake = async () => {
    const newState = !orderIntake;
    setOrderIntake(newState);
    setError("");
    
    try {
      setLoading(true);
      await updateAdminControl('order-intake', { enabled: newState });
      refetch();
    } catch (error: any) {
      console.error('Failed to update order intake:', error);
      setError(error?.message || 'Failed to update order intake');
      setOrderIntake(!newState);
    } finally {
      setLoading(false);
    }
  };

  const toggleVendorIntake = async () => {
    const newState = !vendorIntake;
    setVendorIntake(newState);
    setError("");
    
    try {
      setLoading(true);
      await updateAdminControl('vendor-intake', { enabled: newState });
      refetch();
    } catch (error: any) {
      console.error('Failed to update vendor intake:', error);
      setError(error?.message || 'Failed to update vendor intake');
      setVendorIntake(!newState);
    } finally {
      setLoading(false);
    }
  };

  const toggleSystemKill = async () => {
    if (!systemKill) {
      setConfirm("system");
    } else {
      setSystemKill(false);
      setError("");
      try {
        setLoading(true);
        await updateAdminControl('kill-switch', { enabled: false });
        refetch();
      } catch (error: any) {
        console.error('Failed to update system kill switch:', error);
        setError(error?.message || 'Failed to update system kill switch');
        setSystemKill(true);
      } finally {
        setLoading(false);
      }
    }
  };

  const confirmSystemKill = async () => {
    setSystemKill(true);
    setConfirm("");
    setError("");
    
    try {
      setLoading(true);
      await updateAdminControl('kill-switch', { enabled: true });
      refetch();
    } catch (error: any) {
      console.error('Failed to update system kill switch:', error);
      setError(error?.message || 'Failed to update system kill switch');
      setSystemKill(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCityPause = async () => {
    if (!selectedCity) {
      setError('Please select a city');
      return;
    }

    const isPaused = cityPause[selectedCity] || false;
    const newState = !isPaused;

    // Reason is required only when pausing, not when resuming
    if (newState && !pauseReason.trim()) {
      setError('Please provide a reason for pausing');
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      await updateAdminControl('city-pause', { 
        city: selectedCity, 
        paused: newState,
        reason: pauseReason.trim(),
      });
      // Update local state immediately so View Details shows the reason right away
      setCityPause(prev => ({ ...prev, [selectedCity]: newState }));
      if (newState) {
        setCityDetails(prev => ({ ...prev, [selectedCity]: { reason: pauseReason.trim(), pausedAt: new Date().toISOString() } }));
      } else {
        setCityDetails(prev => { const n = { ...prev }; delete n[selectedCity]; return n; });
      }
      setShowCityPause(false);
      setSelectedCity("");
      setPauseReason("");
      refetch();
    } catch (error: any) {
      console.error('Failed to update city pause:', error);
      setError(error?.message || 'Failed to update city pause');
    } finally {
      setLoading(false);
    }
  };

  const pausedCities = Object.entries(cityPause).filter(([_, paused]) => paused).length;
  const activeFlags = flags.filter(f => f.enabled).length;

  return (
    <div className="space-y-6">
      {/* Critical System Alert */}
      {systemKill && (
        <div 
          className="p-4 rounded-2xl border-2"
          style={{ 
            backgroundColor: ADMIN_COLORS.criticalBg,
            borderColor: ADMIN_COLORS.critical
          }}
        >
          <div className="flex items-center gap-3">
            <Power size={20} style={{ color: ADMIN_COLORS.critical }} />
            <div className="flex-1">
              <p className="font-bold" style={{ color: ADMIN_COLORS.critical }}>
                SYSTEM KILL SWITCH ACTIVE
              </p>
              <p className="text-sm mt-1" style={{ color: ADMIN_COLORS.critical }}>
                All order intake is paused. Customers see maintenance banner.
              </p>
            </div>
            <button
              onClick={toggleSystemKill}
              className="px-4 py-2 rounded-xl font-bold text-white transition"
              style={{ backgroundColor: ADMIN_COLORS.critical }}
            >
              Deactivate System Kill
            </button>
          </div>
        </div>
      )}

      {/* Refresh button — above stats cards */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => refetch()}
          disabled={controlLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold disabled:opacity-60"
        >
          <RefreshCw size={14} className={controlLoading ? "animate-spin" : ""} />
          {controlLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Stats Cards — full width 4 columns */}
      <div className="grid grid-cols-4 gap-4">
        <AdminMetricCard 
          index={0}
          label="Order Intake" 
          value={orderIntake ? "Active" : "Paused"} 
          accent={orderIntake ? ADMIN_COLORS.success : ADMIN_COLORS.error} 
          accentBg={orderIntake ? ADMIN_COLORS.successBg : ADMIN_COLORS.errorBg}
          icon={Activity} 
        />
        <AdminMetricCard 
          label="Vendor Intake" 
          value={vendorIntake ? "Active" : "Paused"} 
          accent={vendorIntake ? ADMIN_COLORS.success : ADMIN_COLORS.error} 
          accentBg={vendorIntake ? ADMIN_COLORS.successBg : ADMIN_COLORS.errorBg}
          icon={Shield} 
        />
        <AdminMetricCard 
          label="Paused Cities" 
          value={pausedCities.toString()} 
          accent={pausedCities > 0 ? ADMIN_COLORS.warning : ADMIN_COLORS.success} 
          accentBg={pausedCities > 0 ? ADMIN_COLORS.warningBg : ADMIN_COLORS.successBg}
          icon={MapPin} 
        />
        <AdminMetricCard 
          label="Active Flags" 
          value={activeFlags.toString()} 
          accent={ADMIN_COLORS.info} 
          accentBg={ADMIN_COLORS.infoBg}
          icon={Flag} 
        />
      </div>

      {/* Error Display */}
      {error && (
        <div 
          className="p-4 rounded-2xl border"
          style={{ 
            backgroundColor: ADMIN_COLORS.errorBg,
            borderColor: ADMIN_COLORS.errorBorder
          }}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle size={16} style={{ color: ADMIN_COLORS.error }} />
            <p className="text-sm font-bold" style={{ color: ADMIN_COLORS.error }}>
              {error}
            </p>
          </div>
        </div>
      )}      {/* City Pause Control */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <MapPin size={18} style={{ color: ADMIN_COLORS.warning }} />
            <h2 className="font-bold text-gray-900 text-lg">City-Specific Pause</h2>
          </div>
          <button
            onClick={() => setShowCityPause(true)}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition"
            style={{ backgroundColor: ADMIN_COLORS.primary, color: "white" }}
          >
            Manage Cities
          </button>
        </div>

        {/* Cities Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide">City</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide">Reason</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide">Paused At</th>
                <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {availableCities.map((city, i) => {
                const isPaused = cityPause[city] || false;
                const details = cityDetails[city];
                return (
                  <tr key={city} className={`border-b border-gray-50 hover:bg-gray-50 transition ${i === availableCities.length - 1 ? "border-0" : ""}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <MapPin size={13} style={{ color: isPaused ? ADMIN_COLORS.warning : ADMIN_COLORS.success }} />
                        <span className="font-semibold text-gray-900">{city}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                        isPaused ? "bg-orange-50 text-orange-600" : "bg-green-50 text-green-600"
                      }`}>
                        {isPaused ? "Paused" : "Active"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500 max-w-[180px] truncate">
                      {isPaused && details?.reason ? details.reason : (isPaused ? "—" : "Operational")}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500">
                      {isPaused && details?.pausedAt
                        ? new Date(details.pausedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setViewCityModal(city)}
                          className="text-xs px-2.5 py-1.5 rounded-lg font-semibold transition"
                          style={{ backgroundColor: ADMIN_COLORS.infoBg, color: ADMIN_COLORS.info }}
                          title="View Details"
                        >
                          View
                        </button>
                        <button
                          onClick={() => { setSelectedCity(city); setPauseReason(""); setShowCityPause(true); }}
                          className="text-xs px-2.5 py-1.5 rounded-lg font-semibold transition"
                          style={{
                            backgroundColor: isPaused ? ADMIN_COLORS.successBg : ADMIN_COLORS.warningBg,
                            color: isPaused ? ADMIN_COLORS.success : ADMIN_COLORS.warning
                          }}
                        >
                          {isPaused ? "Resume" : "Pause"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feature Flags */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Settings size={18} className="text-gray-500" />
          <h2 className="font-bold text-gray-900 text-lg">Feature Flags</h2>
          <span className="ml-auto text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-600 font-semibold">
            No redeploy needed
          </span>
        </div>
        
        {flags.length > 0 ? (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {flags.map(f => (
              <div key={f.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-gray-300 transition">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Flag size={14} style={{ color: f.enabled ? ADMIN_COLORS.success : "#9ca3af" }} />
                    <p className="text-sm font-bold text-gray-900">{f.name}</p>
                  </div>
                  <p className="text-xs text-gray-500">{f.desc}</p>
                </div>
                <button 
                  onClick={() => toggleFlag(f.id)}
                  disabled={loading}
                  className="ml-4"
                >
                  {f.enabled ? 
                    <ToggleRight size={28} style={{ color: ADMIN_COLORS.success }} /> : 
                    <ToggleLeft size={28} className="text-gray-400" />
                  }
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Flag size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No feature flags configured</p>
            <p className="text-xs text-gray-400 mt-1">Feature flags will appear here when configured</p>
          </div>
        )}
      </div>

      {/* Kill Switches */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Zap size={18} style={{ color: ADMIN_COLORS.critical }} />
          <h2 className="font-bold text-gray-900 text-lg">Kill Switches</h2>
          <span className="ml-auto text-xs px-3 py-1 rounded-full font-semibold" 
            style={{ backgroundColor: ADMIN_COLORS.criticalBg, color: ADMIN_COLORS.critical }}>
            Critical Controls
          </span>
        </div>
        
        <div className="space-y-4">
          {/* Order Intake */}
          <div className="flex items-center justify-between p-4 rounded-xl border-2 transition"
            style={{ 
              backgroundColor: orderIntake ? ADMIN_COLORS.successBg : ADMIN_COLORS.errorBg,
              borderColor: orderIntake ? ADMIN_COLORS.successBorder : ADMIN_COLORS.errorBorder
            }}>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Activity size={16} style={{ color: orderIntake ? ADMIN_COLORS.success : ADMIN_COLORS.error }} />
                <p className="text-sm font-bold text-gray-900">Order Intake Control</p>
              </div>
              <p className="text-xs text-gray-600">
                {orderIntake ? "Accepting new orders from customers" : "All new orders are paused"}
              </p>
            </div>
            <button 
              onClick={toggleOrderIntake}
              disabled={loading}
              className="ml-4"
            >
              {orderIntake ? 
                <ToggleRight size={32} style={{ color: ADMIN_COLORS.success }} /> : 
                <ToggleLeft size={32} className="text-gray-400" />
              }
            </button>
          </div>

          {/* Vendor Intake */}
          <div className="flex items-center justify-between p-4 rounded-xl border-2 transition"
            style={{ 
              backgroundColor: vendorIntake ? ADMIN_COLORS.successBg : ADMIN_COLORS.warningBg,
              borderColor: vendorIntake ? ADMIN_COLORS.successBorder : ADMIN_COLORS.warningBorder
            }}>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Shield size={16} style={{ color: vendorIntake ? ADMIN_COLORS.success : ADMIN_COLORS.warning }} />
                <p className="text-sm font-bold text-gray-900">Vendor Intake Control</p>
              </div>
              <p className="text-xs text-gray-600">
                {vendorIntake ? "Assigning new jobs to vendors" : "Orders queued — no new jobs assigned to vendors"}
              </p>
            </div>
            <button 
              onClick={toggleVendorIntake}
              disabled={loading}
              className="ml-4"
            >
              {vendorIntake ? 
                <ToggleRight size={32} style={{ color: ADMIN_COLORS.success }} /> : 
                <ToggleLeft size={32} className="text-gray-400" />
              }
            </button>
          </div>

          {/* System Kill Switch */}
          <div className="flex items-center justify-between p-4 rounded-xl border-2 transition"
            style={{ 
              backgroundColor: systemKill ? ADMIN_COLORS.criticalBg : "#f9fafb",
              borderColor: systemKill ? ADMIN_COLORS.critical : "#e5e7eb"
            }}>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Power size={16} style={{ color: systemKill ? ADMIN_COLORS.critical : "#6b7280" }} />
                <p className="text-sm font-bold text-gray-900">System Kill Switch</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">
                  Super Admin Only
                </span>
              </div>
              <p className="text-xs text-gray-600">
                {systemKill ? "SYSTEM PAUSED — No new orders accepted" : "Pause all order intake · Requires double approval"}
              </p>
            </div>
            <button 
              onClick={toggleSystemKill}
              disabled={loading}
              className="ml-4"
            >
              {systemKill ? 
                <ToggleRight size={32} style={{ color: ADMIN_COLORS.critical }} /> : 
                <ToggleLeft size={32} className="text-gray-400" />
              }
            </button>
          </div>
        </div>
      </div>

      {/* System Kill Confirmation Modal */}
      {confirm === "system" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full" style={{ backgroundColor: ADMIN_COLORS.criticalBg }}>
                <AlertTriangle size={24} style={{ color: ADMIN_COLORS.critical }} />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">System Kill Switch</h2>
                <p className="text-xs text-gray-500">Super Admin Action Required</p>
              </div>
            </div>
            
            <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: ADMIN_COLORS.criticalBg }}>
              <p className="text-sm font-bold mb-2" style={{ color: ADMIN_COLORS.critical }}>
                ⚠️ Critical Action
              </p>
              <p className="text-xs" style={{ color: ADMIN_COLORS.critical }}>
                This will pause ALL order intake system-wide. Customers will see a maintenance banner. 
                This action requires double approval.
              </p>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              Are you absolutely sure you want to activate the system kill switch?
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirm("")} 
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button 
                onClick={confirmSystemKill} 
                disabled={loading}
                className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl transition disabled:opacity-50"
                style={{ backgroundColor: ADMIN_COLORS.critical }}
              >
                {loading ? "Activating..." : "Confirm & Activate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View City Details Modal */}
      {viewCityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <MapPin size={18} style={{ color: cityPause[viewCityModal] ? ADMIN_COLORS.warning : ADMIN_COLORS.success }} />
                <h2 className="font-bold text-gray-900">{viewCityModal} — Details</h2>
              </div>
              <button onClick={() => setViewCityModal(null)}>
                <XCircle size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Status</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                  cityPause[viewCityModal] ? "bg-orange-50 text-orange-600" : "bg-green-50 text-green-600"
                }`}>
                  {cityPause[viewCityModal] ? "Paused" : "Active"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Reason</span>
                <p className="text-sm text-gray-700">
                  {cityDetails[viewCityModal]?.reason || (cityPause[viewCityModal] ? "No reason provided" : "City is operational")}
                </p>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Paused At</span>
                <span className="text-xs text-gray-700">
                  {cityDetails[viewCityModal]?.pausedAt
                    ? new Date(cityDetails[viewCityModal]!.pausedAt!).toLocaleString()
                    : "—"}
                </span>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setViewCityModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                Close
              </button>
              <button
                onClick={() => { setViewCityModal(null); setSelectedCity(viewCityModal); setPauseReason(""); setShowCityPause(true); }}
                className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl transition"
                style={{ backgroundColor: cityPause[viewCityModal] ? ADMIN_COLORS.success : ADMIN_COLORS.warning }}
              >
                {cityPause[viewCityModal] ? "Resume City" : "Pause City"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* City Pause Modal */}
      {showCityPause && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <MapPin size={20} style={{ color: ADMIN_COLORS.warning }} />
                <h2 className="font-bold text-gray-900">City Pause Control</h2>
              </div>
              <button onClick={() => {
                setShowCityPause(false);
                setSelectedCity("");
                setPauseReason("");
                setError("");
              }}>
                <XCircle size={20} className="text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
                  Select City
                </label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900"
                >
                  <option value="">Choose a city</option>
                  {availableCities.map(city => (
                    <option key={city} value={city}>
                      {city} {cityPause[city] ? "(Currently Paused)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedCity && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
                      Reason for {cityPause[selectedCity] ? "Resuming" : "Pausing"}{cityPause[selectedCity] ? " (optional)" : " *"}
                    </label>
                    <textarea
                      value={pauseReason}
                      onChange={(e) => setPauseReason(e.target.value)}
                      placeholder={`Enter reason for ${cityPause[selectedCity] ? "resuming" : "pausing"} ${selectedCity}...`}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 resize-none"
                      rows={3}
                    />
                  </div>
                  
                  <div className="p-3 rounded-xl" style={{ backgroundColor: ADMIN_COLORS.infoBg }}>
                    <p className="text-xs font-semibold" style={{ color: ADMIN_COLORS.info }}>
                      {cityPause[selectedCity] ? 
                        `Resuming ${selectedCity} will allow new orders from this city.` :
                        `Pausing ${selectedCity} will stop accepting new orders from this city.`
                      }
                    </p>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setShowCityPause(false);
                  setSelectedCity("");
                  setPauseReason("");
                  setError("");
                }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleCityPause}
                disabled={!selectedCity || (!(cityPause[selectedCity]) && !pauseReason.trim()) || loading}
                className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl transition disabled:opacity-50"
                style={{ 
                  backgroundColor: cityPause[selectedCity] ? ADMIN_COLORS.success : ADMIN_COLORS.warning 
                }}
              >
                {loading ? "Processing..." : cityPause[selectedCity] ? "Resume City" : "Pause City"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
