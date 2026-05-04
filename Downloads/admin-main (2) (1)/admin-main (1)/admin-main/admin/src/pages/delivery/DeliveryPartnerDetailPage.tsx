import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, TrendingUp, DollarSign, Clock, Star, Edit2, X } from "lucide-react";
import { ADMIN_COLORS } from "../../utils/colors";
import { useAsync } from "../../hooks/useAsync";
import { getAdminDeliveryPartnerById, getDeliveryPartnerAnalytics, getDeliverySLAMetrics, assignDeliveryZones, setDeliveryPayoutRate } from "../../api/admin";
import LoadingState from "../../components/ui/LoadingState";

export default function DeliveryPartnerDetailPage() {
  const { partnerId } = useParams<{ partnerId: string }>();
  const navigate = useNavigate();
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [zones, setZones] = useState<string>('');
  const [payoutRate, setPayoutRate] = useState<number>(0);

  // Fetch data
  const { data: partnerData } = useAsync(() => partnerId ? getAdminDeliveryPartnerById(partnerId) : Promise.resolve(null), null, [partnerId]);
  const { data: analyticsData } = useAsync(() => partnerId ? getDeliveryPartnerAnalytics(partnerId) : Promise.resolve(null), null, [partnerId]);
  const { data: metricsData } = useAsync(() => partnerId ? getDeliverySLAMetrics({ partnerId }) : Promise.resolve(null), null, [partnerId]);

  const partner = (partnerData as any)?.partner || partnerData;
  const analytics = (analyticsData as any)?.analytics || analyticsData || {};
  const metrics = (metricsData as any)?.metrics || metricsData || {};

  const handleAssignZones = async () => {
    try {
      if (!partnerId) return;
      const zoneList = zones.split(',').map(z => z.trim()).filter(z => z);
      await assignDeliveryZones(partnerId, zoneList);
      setShowZoneModal(false);
      alert('Zones assigned successfully');
    } catch (error) {
      alert('Failed to assign zones');
    }
  };

  const handleSetPayoutRate = async () => {
    try {
      if (!partnerId) return;
      await setDeliveryPayoutRate(partnerId, payoutRate);
      setShowPayoutModal(false);
      alert('Payout rate updated successfully');
    } catch (error) {
      alert('Failed to update payout rate');
    }
  };

  if (!partner) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingState message="Loading partner details" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/delivery')}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-gray-900">{partner.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{partner.email}</p>
        </div>
      </div>

      {/* Partner Profile Card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="grid grid-cols-4 gap-6">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Status</p>
            <span className={`text-sm px-3 py-1 rounded-full font-semibold ${partner.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {partner.status || 'Active'}
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Phone</p>
            <p className="text-sm font-bold text-gray-900">{partner.phone}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Join Date</p>
            <p className="text-sm font-bold text-gray-900">{partner.joinDate || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Rating</p>
            <div className="flex items-center gap-1">
              <Star size={16} className="text-yellow-500 fill-yellow-500" />
              <p className="text-sm font-bold text-gray-900">{partner.rating || '4.5'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Deliveries', value: analytics.totalDeliveries || 0, icon: TrendingUp, color: ADMIN_COLORS.info, bg: ADMIN_COLORS.infoBg },
          { label: 'Success Rate', value: `${analytics.successRate || 0}%`, icon: Star, color: ADMIN_COLORS.success, bg: ADMIN_COLORS.successBg },
          { label: 'Avg Time', value: `${analytics.avgDeliveryTime || 0}h`, icon: Clock, color: ADMIN_COLORS.warning, bg: ADMIN_COLORS.warningBg },
          { label: 'Total Earnings', value: `₹${analytics.totalEarnings || 0}`, icon: DollarSign, color: ADMIN_COLORS.primary, bg: '#f0f4ff' }
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: stat.bg }}>
                <stat.icon size={14} style={{ color: stat.color }} />
              </div>
              <span className="text-xs font-bold text-gray-600 uppercase">{stat.label}</span>
            </div>
            <p className="text-2xl font-black text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Zone Coverage */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Zone Coverage</h2>
          <button
            onClick={() => setShowZoneModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-white font-bold transition text-sm"
            style={{ backgroundColor: ADMIN_COLORS.primary }}
          >
            <Edit2 size={14} />
            Edit Zones
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {partner.zones && Array.isArray(partner.zones) ? (
            partner.zones.map((zone: string, idx: number) => (
              <span key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-100 text-blue-700 text-sm font-semibold">
                <MapPin size={14} />
                {zone}
              </span>
            ))
          ) : (
            <p className="text-sm text-gray-500">No zones assigned</p>
          )}
        </div>
      </div>

      {/* SLA Compliance */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">SLA Compliance</h2>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-gray-700">On-Time Delivery</p>
              <p className="text-sm font-bold text-gray-900">{metrics.onTimePercentage || 0}%</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${metrics.onTimePercentage || 0}%` }}></div>
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-gray-700">SLA Compliance</p>
              <p className="text-sm font-bold text-gray-900">{metrics.complianceRate || 0}%</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${metrics.complianceRate || 0}%` }}></div>
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-gray-700">Customer Satisfaction</p>
              <p className="text-sm font-bold text-gray-900">{metrics.satisfactionScore || 0}%</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${metrics.satisfactionScore || 0}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Payout Information */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Payout Information</h2>
          <button
            onClick={() => setShowPayoutModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-white font-bold transition text-sm"
            style={{ backgroundColor: ADMIN_COLORS.primary }}
          >
            <Edit2 size={14} />
            Edit Rate
          </button>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Current Rate</p>
            <p className="text-2xl font-black text-gray-900">₹{partner.payoutRate || 0}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">This Month</p>
            <p className="text-2xl font-black text-gray-900">₹{analytics.monthlyEarnings || 0}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Total Earned</p>
            <p className="text-2xl font-black text-gray-900">₹{analytics.totalEarnings || 0}</p>
          </div>
        </div>
      </div>

      {/* Recent Deliveries */}
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Recent Deliveries</h2>
        </div>
        
        {analytics.recentDeliveries && analytics.recentDeliveries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-bold text-gray-500 uppercase p-4">Order ID</th>
                  <th className="text-left text-xs font-bold text-gray-500 uppercase p-4">Date</th>
                  <th className="text-left text-xs font-bold text-gray-500 uppercase p-4">Status</th>
                  <th className="text-left text-xs font-bold text-gray-500 uppercase p-4">Amount</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recentDeliveries.map((delivery: any) => (
                  <tr key={delivery.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="p-4">
                      <p className="text-sm font-bold text-gray-900">{delivery.orderId}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-600">{delivery.date}</p>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${delivery.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {delivery.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-bold text-gray-900">₹{delivery.amount}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500">No recent deliveries</p>
          </div>
        )}
      </div>

      {/* Zone Modal */}
      {showZoneModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Assign Zones</h3>
              <button onClick={() => setShowZoneModal(false)} className="p-1">
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">Zones (comma-separated)</label>
              <textarea
                value={zones}
                onChange={(e) => setZones(e.target.value)}
                placeholder="e.g., Delhi, Mumbai, Bangalore"
                className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition"
                rows={4}
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowZoneModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignZones}
                className="flex-1 px-4 py-2 text-white font-bold rounded-xl transition"
                style={{ backgroundColor: ADMIN_COLORS.primary }}
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payout Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Set Payout Rate</h3>
              <button onClick={() => setShowPayoutModal(false)} className="p-1">
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">Payout Rate (₹)</label>
              <input
                type="number"
                value={payoutRate}
                onChange={(e) => setPayoutRate(parseFloat(e.target.value))}
                placeholder="Enter payout rate..."
                className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowPayoutModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSetPayoutRate}
                className="flex-1 px-4 py-2 text-white font-bold rounded-xl transition"
                style={{ backgroundColor: ADMIN_COLORS.primary }}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
