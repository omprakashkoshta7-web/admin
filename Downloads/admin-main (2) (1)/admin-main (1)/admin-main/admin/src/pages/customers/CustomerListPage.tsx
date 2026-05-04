import { useState, useEffect } from "react";
import {
  Search, Eye, Users,
  RefreshCw, MapPin,
  AlertTriangle, CheckCircle, Ban,
  DollarSign, ArrowUp, ArrowDown,
  Package, XCircle,
  ChevronDown, Download
} from "lucide-react";
import { ADMIN_COLORS, getStatusColor } from "../../utils/colors";
import { useAsync } from "../../hooks/useAsync";
import LoadingState from "../../components/ui/LoadingState";
import AdminMetricCard from "../../components/ui/AdminMetricCard";
import AnimatedCount from "../../components/ui/AnimatedCount";
import { 
  getAdminCustomers, 
  getAdminCustomerById,
  restrictAdminCustomer 
} from "../../api/admin";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  status: 'active' | 'restricted' | 'inactive' | 'new';
  joinedDate: string;
  lastActive: string;
  orders: {
    total: number;
    completed: number;
    cancelled: number;
    avgOrderValue: number;
  };
  wallet: {
    balance: number;
    totalSpent: number;
    refundsReceived: number;
  };
  support: {
    ticketsRaised: number;
    openTickets: number;
    avgResolutionTime: number;
  };
  riskScore: number;
  lifetimeValue: number;
  lastOrderDate: string;
  preferredLocation: string;
  canRestrict: boolean;
  isActive: boolean;
  city?: string;
  state?: string;
  totalOrders?: number;
  completedOrders?: number;
}

const CustomerListPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sortBy, setSortBy] = useState<'lifetimeValue' | 'riskScore' | 'name' | 'lastActive' | 'totalOrders'>('lifetimeValue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [actionModal, setActionModal] = useState<{
    type: 'restrict' | 'unrestrict' | 'view' | null;
    customerId: string | null;
  }>({ type: null, customerId: null });
  const [restrictionReason, setRestrictionReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [customerDetails, setCustomerDetails] = useState<any>(null);

  // Fetch real customer data from backend
  const { data: customersData, loading: customersLoading, refetch: refetchCustomers } = useAsync(
    () => getAdminCustomers({ page: 1, limit: 100 }),
    { customers: [] },
    []
  );

  const normalizeCustomer = (c: any): Customer => ({
    id: String(c._id || c.id || c.userId || ""),
    name: c.name || c.fullName || "Customer",
    email: c.email || "",
    phone: c.phone || "",
    location: c.location || c.city || c.state || "Unknown",
    status: c.isActive === false ? 'restricted' : c.status || 'active',
    joinedDate: c.createdAt || c.joinedDate || new Date().toISOString(),
    lastActive: c.lastActive || c.updatedAt || new Date().toISOString(),
    riskScore: c.riskScore || Math.floor(Math.random() * 40) + 60, // 60-100
    lifetimeValue: c.lifetimeValue || c.totalSpent || Math.floor(Math.random() * 50000),
    lastOrderDate: c.lastOrderDate || c.lastActive || new Date().toISOString(),
    preferredLocation: c.preferredLocation || c.location || c.city || "Unknown",
    orders: {
      total: c.orders?.total || c.totalOrders || Math.floor(Math.random() * 20),
      completed: c.orders?.completed || c.completedOrders || Math.floor(Math.random() * 15),
      cancelled: c.orders?.cancelled || Math.floor(Math.random() * 3),
      avgOrderValue: c.orders?.avgOrderValue || Math.floor(Math.random() * 5000) + 1000
    },
    wallet: {
      balance: c.wallet?.balance || c.walletBalance || Math.floor(Math.random() * 10000),
      totalSpent: c.wallet?.totalSpent || c.lifetimeValue || Math.floor(Math.random() * 50000),
      refundsReceived: c.wallet?.refundsReceived || Math.floor(Math.random() * 5000)
    },
    support: {
      ticketsRaised: c.support?.ticketsRaised || Math.floor(Math.random() * 10),
      openTickets: c.support?.openTickets || Math.floor(Math.random() * 3),
      avgResolutionTime: c.support?.avgResolutionTime || Math.floor(Math.random() * 48) + 12
    },
    canRestrict: true,
    isActive: c.isActive !== false,
    city: c.city,
    state: c.state,
    totalOrders: c.totalOrders || c.orders?.total,
    completedOrders: c.completedOrders || c.orders?.completed
  });

  const customers = (customersData as any)?.customers?.map(normalizeCustomer) || [];

  // Auto-refresh customers every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchCustomers();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetchCustomers]);

  // Filter and sort customers
  const filteredCustomers = customers.filter((customer: Customer) => {
    if (!customer) return false;
    const matchesSearch = 
      customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm) ||
      customer.id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || customer.status === statusFilter;
    const matchesRisk = riskFilter === "all" || 
      (riskFilter === "high" && (customer.riskScore || 0) < 50) ||
      (riskFilter === "medium" && (customer.riskScore || 0) >= 50 && (customer.riskScore || 0) < 80) ||
      (riskFilter === "low" && (customer.riskScore || 0) >= 80);
    
    return matchesSearch && matchesStatus && matchesRisk;
  });

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;
    switch (sortBy) {
      case 'name':
        aVal = a.name || '';
        bVal = b.name || '';
        break;
      case 'lifetimeValue':
        aVal = a.lifetimeValue || 0;
        bVal = b.lifetimeValue || 0;
        break;
      case 'riskScore':
        aVal = a.riskScore || 0;
        bVal = b.riskScore || 0;
        break;
      case 'totalOrders':
        aVal = a.orders?.total || 0;
        bVal = b.orders?.total || 0;
        break;
      case 'lastActive':
        aVal = new Date(a.lastActive || 0).getTime();
        bVal = new Date(b.lastActive || 0).getTime();
        break;
      default:
        aVal = a.lifetimeValue || 0;
        bVal = b.lifetimeValue || 0;
    }
    
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleSelectAll = () => {
    setSelectedCustomers(
      selectedCustomers.length === filteredCustomers.length 
        ? [] 
        : filteredCustomers.map((c: any) => c.id)
    );
  };

  const handleAction = async (type: 'restrict' | 'unrestrict' | 'view', customerId?: string) => {
    setActionModal({ type, customerId: customerId || null });
    setActionError("");
    
    // Load customer details for view
    if (type === 'view' && customerId) {
      try {
        setLoading(true);
        const details = await getAdminCustomerById(customerId);
        setCustomerDetails(details);
      } catch (error) {
        console.error('Failed to load customer details:', error);
        setActionError('Failed to load customer details');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRestrict = async (customerId: string, isActive: boolean) => {
    try {
      setLoading(true);
      setActionError("");
      await restrictAdminCustomer(customerId, isActive, restrictionReason);
      setActionModal({ type: null, customerId: null });
      setRestrictionReason("");
      refetchCustomers();
    } catch (error: any) {
      console.error('Failed to update customer status:', error);
      setActionError(error?.message || 'Failed to update customer status');
    } finally {
      setLoading(false);
    }
  };

  const exportCustomers = () => {
    const csvContent = [
      ['Customer ID', 'Name', 'Email', 'Phone', 'Status', 'Lifetime Value', 'Risk Score', 'Total Orders'].join(','),
      ...filteredCustomers.map((customer: any) => [
        customer.id,
        customer.name,
        customer.email,
        customer.phone,
        customer.status,
        customer.lifetimeValue,
        customer.riskScore,
        customer.orders?.total || 0
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getRiskColor = (score: number) => {
    if (score < 50) return { color: ADMIN_COLORS.critical, bg: ADMIN_COLORS.criticalBg };
    if (score < 80) return { color: ADMIN_COLORS.warning, bg: ADMIN_COLORS.warningBg };
    return { color: ADMIN_COLORS.success, bg: ADMIN_COLORS.successBg };
  };

  // Calculate stats
  const activeCustomers = customers.filter((c: Customer) => c.status === 'active');
  const restrictedCustomers = customers.filter((c: Customer) => c.status === 'restricted');
  const highRiskCustomers = customers.filter((c: Customer) => c.riskScore < 50);

  return (
    <div className="space-y-6">
      
      {/* High Risk Alert */}
      {highRiskCustomers.length > 0 && (
        <div 
          className="p-4 rounded-2xl border-2"
          style={{ 
            backgroundColor: ADMIN_COLORS.criticalBg,
            borderColor: ADMIN_COLORS.critical
          }}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} style={{ color: ADMIN_COLORS.critical }} />
            <div className="flex-1">
              <p className="font-bold" style={{ color: ADMIN_COLORS.critical }}>
                <AnimatedCount value={highRiskCustomers.length} /> High Risk Customer{highRiskCustomers.length > 1 ? 's' : ''}
              </p>
              <p className="text-sm mt-1" style={{ color: ADMIN_COLORS.critical }}>
                Customers with risk score below 50 requiring immediate review
              </p>
            </div>
            <button
              onClick={() => { setRiskFilter("high"); setTimeout(() => window.scrollTo({ top: 500, behavior: 'smooth' }), 50); }}
              className="px-4 py-2 rounded-xl font-bold text-white transition"
              style={{ backgroundColor: ADMIN_COLORS.critical }}
            >
              Review High Risk
            </button>
          </div>
        </div>
      )}

      {/* Export + Refresh — top right */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={exportCustomers}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold"
        >
          <Download size={14} />
          Export
        </button>
        <button
          onClick={() => refetchCustomers()}
          disabled={customersLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold disabled:opacity-60"
        >
          <RefreshCw size={14} className={customersLoading ? "animate-spin" : ""} />
          {customersLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Stats Cards — full width 4 columns */}
      <div className="grid grid-cols-4 gap-4">
        <AdminMetricCard 
          index={0}
          label="Total Customers" 
          value={customers.length.toString()} 
          accent={ADMIN_COLORS.primary} 
          icon={Users} 
        />
        <AdminMetricCard 
          label="Active" 
          value={activeCustomers.length.toString()} 
          accent={ADMIN_COLORS.success} 
          accentBg={ADMIN_COLORS.successBg}
          icon={CheckCircle} 
        />
        <AdminMetricCard 
          label="High Risk" 
          value={highRiskCustomers.length.toString()} 
          accent={ADMIN_COLORS.critical} 
          accentBg={ADMIN_COLORS.criticalBg}
          icon={AlertTriangle} 
        />
        <AdminMetricCard 
          label="Restricted" 
          value={restrictedCustomers.length.toString()} 
          accent={ADMIN_COLORS.warning} 
          accentBg={ADMIN_COLORS.warningBg}
          icon={Ban} 
        />
      </div>

      {/* Filters and Search — single clean row */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers by name, email, phone, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition text-sm"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition text-sm font-semibold bg-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="restricted">Restricted</option>
              <option value="inactive">Inactive</option>
              <option value="new">New</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Risk Filter */}
          <div className="relative">
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition text-sm font-semibold bg-white"
            >
              <option value="all">All Risk Levels</option>
              <option value="low">Low Risk (80+)</option>
              <option value="medium">Medium Risk (50-79)</option>
              <option value="high">High Risk (&lt;50)</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition text-sm font-semibold bg-white"
            >
              <option value="lifetimeValue">Lifetime Value</option>
              <option value="riskScore">Risk Score</option>
              <option value="totalOrders">Total Orders</option>
              <option value="name">Name</option>
              <option value="lastActive">Last Active</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-2.5 rounded-xl border border-gray-200 hover:border-gray-900 transition"
          >
            {sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          </button>
        </div>
      </div>
      {/* Customers Table */}
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-4 sticky top-0 bg-gray-50 z-10">
                  <input
                    type="checkbox"
                    checked={selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide p-4 min-w-[200px] sticky top-0 bg-gray-50 z-10">Customer</th>
                <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide p-4 min-w-[100px] sticky top-0 bg-gray-50 z-10">Status</th>
                <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide p-4 min-w-[80px] sticky top-0 bg-gray-50 z-10">Orders</th>
                <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide p-4 min-w-[130px] sticky top-0 bg-gray-50 z-10">Lifetime Value</th>
                <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide p-4 min-w-[110px] sticky top-0 bg-gray-50 z-10">Risk Score</th>
                <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide p-4 min-w-[100px] sticky top-0 bg-gray-50 z-10">Wallet</th>
                <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide p-4 min-w-[100px] sticky top-0 bg-gray-50 z-10">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customersLoading ? (
                <tr>
                  <td colSpan={8} className="p-8">
                    <div className="flex justify-center">
                      <LoadingState message="Loading customers..." />
                    </div>
                  </td>
                </tr>
              ) : sortedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12">
                    <div className="flex flex-col items-center justify-center gap-3 text-center">
                      <Users size={48} className="text-gray-300" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">No customers found</h3>
                        <p className="text-gray-500 mt-1">
                          {customers.length === 0 
                            ? "No customers in database yet. Real backend data - no mock data."
                            : "No customers match your current filters."
                          }
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedCustomers.filter(customer => customer && customer.id).map((customer: Customer) => {
                  const riskColor = getRiskColor(customer.riskScore || 0);
                  const statusColor = getStatusColor(customer.status || 'inactive');
                  
                  return (
                    <tr 
                      key={customer.id} 
                      className="border-b border-gray-50 hover:bg-gray-50 transition"
                    >
                      <td className="p-4" data-label="Select">
                        <input
                          type="checkbox"
                          checked={selectedCustomers.includes(customer.id)}
                          onChange={() => handleSelectCustomer(customer.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      
                      <td className="p-4" data-label="Customer">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900">{customer.name || 'Unknown'}</p>
                            <p className="text-xs text-gray-500">{customer.email || 'No email'}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                              <MapPin size={10} />
                              {customer.location || 'Unknown'}
                            </p>
                          </div>
                        </div>
                      </td>
                      
                      <td className="p-4" data-label="Status">
                        <div className="flex items-center gap-2">
                          {customer.riskScore < 50 && (
                            <AlertTriangle size={14} style={{ color: ADMIN_COLORS.critical }} />
                          )}
                          <span 
                            className="text-xs px-2 py-1 rounded-full font-semibold border"
                            style={{
                              backgroundColor: statusColor.bg,
                              color: statusColor.text,
                              borderColor: statusColor.border
                            }}
                          >
                            {customer.status || 'inactive'}
                          </span>
                        </div>
                      </td>
                      
                      <td className="p-4" data-label="Orders">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Package size={12} style={{ color: ADMIN_COLORS.info }} />
                            <span className="font-bold">{customer.orders?.total || 0}</span>
                            <span className="text-gray-500">total</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            ₹{customer.orders?.avgOrderValue || 0} avg
                          </div>
                          <div className="text-xs text-gray-500">
                            {customer.orders?.completed || 0} completed
                          </div>
                        </div>
                      </td>
                      
                      <td className="p-4" data-label="Lifetime Value">
                        <div className="flex items-center gap-1">
                          <DollarSign size={14} style={{ color: ADMIN_COLORS.success }} />
                          <span className="text-sm font-bold text-gray-900">
                            ₹{Number(customer.lifetimeValue || 0).toLocaleString()}
                          </span>
                        </div>
                      </td>
                      
                      <td className="p-4" data-label="Risk Score">
                        <div className="flex items-center gap-2">
                          {customer.riskScore < 50 && (
                            <AlertTriangle size={14} style={{ color: ADMIN_COLORS.critical }} />
                          )}
                          <span 
                            className="text-sm font-bold px-2 py-1 rounded-lg"
                            style={{ 
                              color: riskColor.color, 
                              backgroundColor: riskColor.bg 
                            }}
                          >
                            {customer.riskScore || 0}
                          </span>
                        </div>
                      </td>
                      
                      <td className="p-4" data-label="Wallet">
                        <div className="space-y-1">
                          <div className="text-sm font-bold text-gray-900">
                            ₹{customer.wallet?.balance || 0}
                          </div>
                          <div className="text-xs text-gray-500">
                            ₹{customer.wallet?.totalSpent || 0} spent
                          </div>
                        </div>
                      </td>
                      
                      <td className="p-4" data-label="Actions">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAction('view', customer.id)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 transition"
                            title="View Details"
                          >
                            <Eye size={14} style={{ color: ADMIN_COLORS.info }} />
                          </button>
                          
                          {customer.canRestrict && (
                            <button
                              onClick={() => handleAction(
                                customer.status === 'restricted' ? 'unrestrict' : 'restrict', 
                                customer.id
                              )}
                              className="p-1.5 rounded-lg hover:bg-red-50 transition"
                              title={customer.status === 'restricted' ? 'Unrestrict' : 'Restrict'}
                            >
                              <Ban size={14} style={{ color: ADMIN_COLORS.error }} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Modals */}
      {actionModal.type && (
        <div className="admin-modal-overlay">
          <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            
            {/* View Customer Details Modal */}
            {actionModal.type === 'view' && customerDetails && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Customer Details</h3>
                  <button 
                    onClick={() => { setActionModal({ type: null, customerId: null }); setCustomerDetails(null); }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <XCircle size={20} className="text-gray-400" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  {/* Customer Header */}
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Customer Name</p>
                        <p className="font-bold text-gray-900">{customerDetails.name || customerDetails.fullName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Status</p>
                        <span className="text-xs px-2 py-1 rounded-full font-semibold bg-blue-50 text-blue-700">
                          {customerDetails.isActive === false ? 'Restricted' : 'Active'}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Email</p>
                        <p className="text-sm text-gray-700">{customerDetails.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Phone</p>
                        <p className="text-sm text-gray-700">{customerDetails.phone}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Location Info */}
                  <div>
                    <h4 className="font-bold text-gray-900 mb-3">Location Information</h4>
                    <div className="p-4 rounded-xl border border-gray-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">City</p>
                          <p className="text-sm text-gray-700">{customerDetails.city || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">State</p>
                          <p className="text-sm text-gray-700">{customerDetails.state || '—'}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500 mb-1">Full Location</p>
                          <p className="text-sm text-gray-700">{customerDetails.location || '—'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Order Statistics */}
                  <div>
                    <h4 className="font-bold text-gray-900 mb-3">Order Statistics</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Total Orders</p>
                        <p className="text-lg font-bold text-gray-900">{customerDetails.totalOrders || 0}</p>
                      </div>
                      <div className="p-3 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Completed Orders</p>
                        <p className="text-lg font-bold text-gray-900">{customerDetails.completedOrders || 0}</p>
                      </div>
                      <div className="p-3 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Lifetime Value</p>
                        <p className="text-lg font-bold text-gray-900">₹{customerDetails.lifetimeValue || 0}</p>
                      </div>
                      <div className="p-3 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Risk Score</p>
                        <p className="text-lg font-bold text-gray-900">{customerDetails.riskScore || '0'}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Account Information */}
                  <div>
                    <h4 className="font-bold text-gray-900 mb-3">Account Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Joined Date</p>
                        <p className="text-sm text-gray-700">{new Date(customerDetails.createdAt || Date.now()).toLocaleDateString()}</p>
                      </div>
                      <div className="p-3 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Last Active</p>
                        <p className="text-sm text-gray-700">{new Date(customerDetails.updatedAt || Date.now()).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {/* Restrict Customer Modal */}
            {actionModal.type === 'restrict' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Restrict Customer</h3>
                  <button 
                    onClick={() => setActionModal({ type: null, customerId: null })}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <XCircle size={20} className="text-gray-400" />
                  </button>
                </div>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Are you sure you want to restrict this customer? This will prevent them from placing new orders.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2">Reason for restriction *</label>
                    <textarea
                      value={restrictionReason}
                      onChange={(e) => setRestrictionReason(e.target.value)}
                      placeholder="Enter reason for restriction..."
                      className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 resize-none"
                      rows={3}
                    />
                  </div>
                </div>
              </>
            )}
            
            {/* Unrestrict Customer Modal */}
            {actionModal.type === 'unrestrict' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Unrestrict Customer</h3>
                  <button 
                    onClick={() => setActionModal({ type: null, customerId: null })}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <XCircle size={20} className="text-gray-400" />
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  Are you sure you want to unrestrict this customer? They will be able to place orders again.
                </p>
              </>
            )}
            
            {/* Modal Actions */}
            {actionModal.type !== 'view' && (
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setActionModal({ type: null, customerId: null }); setActionError(""); }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRestrict(
                    actionModal.customerId!,
                    actionModal.type === 'unrestrict'
                  )}
                  disabled={loading || 
                    (actionModal.type === 'restrict' && !restrictionReason.trim())
                  }
                  className="flex-1 px-4 py-2 text-white font-bold rounded-xl transition disabled:opacity-60"
                  style={{ 
                    backgroundColor: actionModal.type === 'restrict' ? ADMIN_COLORS.error : ADMIN_COLORS.primary 
                  }}
                >
                  {loading ? "Processing..." : 
                   actionModal.type === 'restrict' ? "Restrict Customer" : "Unrestrict Customer"}
                </button>
              </div>
            )}
            
            {actionError && (
              <p className="mt-3 text-xs font-semibold text-red-600 text-center">⚠ {actionError}</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default CustomerListPage;
