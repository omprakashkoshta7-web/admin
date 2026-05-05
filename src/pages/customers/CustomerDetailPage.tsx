import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Mail, Phone, MapPin, Clock, ShoppingCart,
  Wallet, HeadphonesIcon, Ban, Activity, Eye, Download,
  Package, DollarSign, AlertTriangle
} from "lucide-react";
import { ADMIN_COLORS, getStatusColor } from "../../utils/colors";
import { useAsync } from "../../hooks/useAsync";
import { getAdminCustomerById, restrictAdminCustomer } from "../../api/admin";
import LoadingState from "../../components/ui/LoadingState";
import type { AdminCustomerDetailResponse } from "../../api/admin";

const CustomerDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<'orders' | 'wallet' | 'support' | 'activity'>('orders');
  const [restrictModal, setRestrictModal] = useState(false);
  const [restrictionReason, setRestrictionReason] = useState("");

  // Fetch customer data from backend with error handling
  const { data: customerData, loading: customerLoading, error: customerError, refetch: refetchCustomer } = useAsync<AdminCustomerDetailResponse | null>(
    () => id ? getAdminCustomerById(id) : Promise.resolve(null),
    null,
    [id]
  );

  if (customerLoading) {
    return (
      <div className="admin-content-wrapper">
        <LoadingState message="Loading customer data" />
      </div>
    );
  }

  if (customerError || !customerData) {
    return (
      <div className="admin-content-wrapper">
        <div className="admin-empty-state">
          <AlertTriangle size={48} className="admin-empty-icon" style={{ color: ADMIN_COLORS.critical }} />
          <h3>Customer Not Found</h3>
          <p>
            {customerError 
              ? "Failed to load customer data. This might be due to backend connection issues or the customer doesn't exist."
              : "The requested customer could not be found in the database."
            }
          </p>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => navigate("/customers")}
              className="admin-btn admin-btn-primary"
            >
              <ArrowLeft size={16} />
              Back to Customers
            </button>
            {customerError && (
              <button
                onClick={() => refetchCustomer()}
                className="admin-btn admin-btn-secondary"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const handleRestrict = async () => {
    if (!restrictionReason.trim()) return;
    
    try {
      await restrictAdminCustomer(id!, false);
      refetchCustomer();
      setRestrictModal(false);
      setRestrictionReason("");
    } catch (error) {
      console.error('Failed to restrict customer:', error);
    }
  };

  const statusColors = getStatusColor(customerData.status);
  const riskColors = customerData.riskScore >= 70 
    ? { color: ADMIN_COLORS.critical, bg: ADMIN_COLORS.criticalBg }
    : customerData.riskScore >= 30
    ? { color: ADMIN_COLORS.warning, bg: ADMIN_COLORS.warningBg }
    : { color: ADMIN_COLORS.success, bg: ADMIN_COLORS.successBg };

  return (
    <div className="admin-content-wrapper">
      
      {/* Back Button */}
      <button
        onClick={() => navigate("/customers")}
        className="admin-btn admin-btn-secondary"
        style={{ marginBottom: '1.5rem' }}
      >
        <ArrowLeft size={16} />
        Back to Customers
      </button>

      {/* Customer Header */}
      <div className="admin-surface" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderRadius: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ 
              width: '4rem', 
              height: '4rem', 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, #6d5dfc 0%, #5b4df7 100%)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'white', 
              fontWeight: '800', 
              fontSize: '1.5rem',
              overflow: 'hidden'
            }}>
              {(customerData as any)?.photoURL || (customerData as any)?.profileImage || (customerData as any)?.avatar || (customerData as any)?.image ? (
                <img 
                  src={(customerData as any)?.photoURL || (customerData as any)?.profileImage || (customerData as any)?.avatar || (customerData as any)?.image} 
                  alt={customerData.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                customerData.name.charAt(0)
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <h1 className="admin-page-title" style={{ margin: 0, fontSize: '1.5rem' }}>{customerData.name}</h1>
                <span 
                  className="admin-status-badge"
                  style={{
                    backgroundColor: statusColors.bg,
                    color: statusColors.text,
                  }}
                >
                  {customerData.status}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <Mail size={14} />
                  {customerData.email}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <Phone size={14} />
                  {customerData.phone}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <MapPin size={14} />
                  {(customerData as any)?.location || 'Not provided'}
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {customerData.status === 'active' && (
              <button
                onClick={() => setRestrictModal(true)}
                className="admin-btn admin-btn-danger"
              >
                <Ban size={14} />
                Restrict Customer
              </button>
            )}
            <button className="admin-btn admin-btn-secondary">
              <Download size={14} />
              Export Data
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(229, 231, 235, 0.8)' }}>
          <div className="admin-stat-card" style={{ textAlign: 'center', padding: '1rem' }}>
            <div className="admin-stat-label">Lifetime Value</div>
            <div className="admin-stat-value" style={{ fontSize: '1.25rem' }}>₹{((customerData as any)?.lifetimeValue || 0 / 1000).toFixed(1)}K</div>
          </div>
          <div className="admin-stat-card" style={{ textAlign: 'center', padding: '1rem' }}>
            <div className="admin-stat-label">Total Orders</div>
            <div className="admin-stat-value" style={{ fontSize: '1.25rem' }}>{customerData.orders.total}</div>
          </div>
          <div className="admin-stat-card" style={{ textAlign: 'center', padding: '1rem' }}>
            <div className="admin-stat-label">Wallet Balance</div>
            <div className="admin-stat-value" style={{ fontSize: '1.25rem' }}>₹{customerData.wallet.balance}</div>
          </div>
          <div className="admin-stat-card" style={{ textAlign: 'center', padding: '1rem' }}>
            <div className="admin-stat-label">Risk Score</div>
            <div className="admin-stat-value" style={{ fontSize: '1.25rem', color: riskColors.color }}>{customerData.riskScore}</div>
          </div>
          <div className="admin-stat-card" style={{ textAlign: 'center', padding: '1rem' }}>
            <div className="admin-stat-label">Member Since</div>
            <div className="admin-stat-value" style={{ fontSize: '0.875rem' }}>{customerData.joinedDate}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-surface" style={{ borderRadius: '1rem', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(229, 231, 235, 0.8)' }}>
          {[
            { key: 'orders', label: 'Orders', icon: ShoppingCart, count: customerData.orders.total },
            { key: 'wallet', label: 'Wallet', icon: Wallet, count: customerData.wallet.transactions.length },
            { key: 'support', label: 'Support', icon: HeadphonesIcon, count: customerData.support.ticketsRaised },
            { key: 'activity', label: 'Activity Log', icon: Activity, count: customerData.activityLog.length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '1rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                backgroundColor: activeTab === tab.key ? 'rgba(248, 250, 252, 0.8)' : 'transparent',
                color: activeTab === tab.key ? '#1f2937' : '#6b7280',
                borderBottom: activeTab === tab.key ? '2px solid #1f2937' : '2px solid transparent',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <tab.icon size={16} />
              {tab.label}
              <span style={{
                fontSize: '0.75rem',
                padding: '0.125rem 0.5rem',
                borderRadius: '9999px',
                backgroundColor: '#e5e7eb',
                color: '#374151'
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Order History</h3>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">
                    Completion Rate: <span className="font-bold text-gray-900">
                      {((customerData.orders.completed / customerData.orders.total) * 100).toFixed(1)}%
                    </span>
                  </span>
                  <span className="text-gray-500">
                    Avg Order Value: <span className="font-bold text-gray-900">
                      ₹{customerData.orders.avgOrderValue}
                    </span>
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {customerData.orders.recentOrders.map(order => {
                  const orderStatusColors = getStatusColor(order.status);
                  return (
                    <div 
                      key={order.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition cursor-pointer"
                      onClick={() => navigate(`/orders/${order.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Package size={16} className="text-gray-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{order.id}</p>
                          <p className="text-xs text-gray-500">{order.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Date</p>
                          <p className="text-sm font-semibold text-gray-900">{order.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Amount</p>
                          <p className="text-sm font-bold text-gray-900">₹{order.amount}</p>
                        </div>
                        <span 
                          className="text-xs px-3 py-1 rounded-full font-semibold"
                          style={{
                            backgroundColor: orderStatusColors.bg,
                            color: orderStatusColors.text
                          }}
                        >
                          {order.status}
                        </span>
                        <Eye size={16} className="text-gray-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Wallet Tab */}
          {activeTab === 'wallet' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                  <p className="text-xs text-green-600 mb-1">Current Balance</p>
                  <p className="text-2xl font-black text-green-700">₹{customerData.wallet.balance}</p>
                </div>
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <p className="text-xs text-blue-600 mb-1">Total Spent</p>
                  <p className="text-2xl font-black text-blue-700">₹{Number(customerData.wallet.totalSpent || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl bg-orange-50 border border-orange-200">
                  <p className="text-xs text-orange-600 mb-1">Refunds Received</p>
                  <p className="text-2xl font-black text-orange-700">₹{customerData.wallet.refundsReceived}</p>
                </div>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-4">Transaction History</h3>
              <div className="space-y-2">
                {customerData.wallet.transactions.map(txn => (
                  <div 
                    key={txn.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-gray-100"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        txn.amount > 0 ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        <DollarSign size={16} className={txn.amount > 0 ? 'text-green-600' : 'text-red-600'} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{txn.type}</p>
                        <p className="text-xs text-gray-500">{txn.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${txn.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {txn.amount > 0 ? '+' : ''}₹{Math.abs(txn.amount)}
                      </p>
                      <p className="text-xs text-gray-500">Balance: ₹{txn.balance}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Support Tab */}
          {activeTab === 'support' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Total Tickets</p>
                  <p className="text-2xl font-black text-gray-900">{customerData.support.ticketsRaised}</p>
                </div>
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <p className="text-xs text-blue-600 mb-1">Open Tickets</p>
                  <p className="text-2xl font-black text-blue-700">{customerData.support.openTickets}</p>
                </div>
                <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                  <p className="text-xs text-green-600 mb-1">Avg Resolution</p>
                  <p className="text-2xl font-black text-green-700">{customerData.support.avgResolutionTime}h</p>
                </div>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-4">Support Tickets</h3>
              <div className="space-y-3">
                {customerData.support.tickets.map(ticket => {
                  const ticketStatusColors = getStatusColor(ticket.status);
                  return (
                    <div 
                      key={ticket.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition cursor-pointer"
                      onClick={() => navigate(`/support/${ticket.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <HeadphonesIcon size={16} className="text-gray-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{ticket.subject}</p>
                          <p className="text-xs text-gray-500">{ticket.id} • {ticket.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          ticket.priority === 'High' ? 'bg-red-50 text-red-600' :
                          ticket.priority === 'Medium' ? 'bg-yellow-50 text-yellow-600' :
                          'bg-gray-50 text-gray-600'
                        }`}>
                          {ticket.priority}
                        </span>
                        <span 
                          className="text-xs px-3 py-1 rounded-full font-semibold"
                          style={{
                            backgroundColor: ticketStatusColors.bg,
                            color: ticketStatusColors.text
                          }}
                        >
                          {ticket.status}
                        </span>
                        <Eye size={16} className="text-gray-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Activity Log Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {customerData.activityLog.map((activity, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 rounded-xl border border-gray-100">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      activity.type === 'order' ? 'bg-blue-100' :
                      activity.type === 'wallet' ? 'bg-green-100' :
                      'bg-orange-100'
                    }`}>
                      {activity.type === 'order' && <ShoppingCart size={16} className="text-blue-600" />}
                      {activity.type === 'wallet' && <Wallet size={16} className="text-green-600" />}
                      {activity.type === 'support' && <HeadphonesIcon size={16} className="text-orange-600" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Clock size={10} />
                        {activity.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Restrict Customer Modal */}
      {restrictModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h3>Restrict Customer</h3>
            </div>
            
            <div className="admin-modal-content">
              <div 
                style={{ 
                  padding: '0.75rem',
                  borderRadius: '0.75rem',
                  border: '1px solid',
                  backgroundColor: ADMIN_COLORS.warningBg,
                  borderColor: ADMIN_COLORS.warningBorder,
                  marginBottom: '1rem'
                }}
              >
                <p style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: '600', 
                  color: ADMIN_COLORS.warning,
                  margin: 0,
                  marginBottom: '0.25rem'
                }}>
                  ⚠️ Soft Restriction Policy
                </p>
                <p style={{ 
                  fontSize: '0.75rem', 
                  color: ADMIN_COLORS.warning,
                  margin: 0
                }}>
                  Customer will be restricted from placing new orders but account remains active. No hard deletion allowed.
                </p>
              </div>
              
              <div className="admin-form-group">
                <label>Reason for restriction (required):</label>
                <textarea
                  value={restrictionReason}
                  onChange={(e) => setRestrictionReason(e.target.value)}
                  placeholder="Enter reason for restriction..."
                  className="admin-textarea"
                />
              </div>
            </div>
            
            <div className="admin-modal-actions">
              <button
                onClick={() => setRestrictModal(false)}
                className="admin-btn admin-btn-secondary"
              >
                Cancel
              </button>
              <button
                disabled={!restrictionReason.trim()}
                onClick={handleRestrict}
                className="admin-btn admin-btn-danger"
                style={{ opacity: !restrictionReason.trim() ? 0.6 : 1 }}
              >
                Restrict Customer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CustomerDetailPage;
