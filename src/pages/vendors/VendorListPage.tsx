import { useState, useEffect } from "react";
import {
  Search, Eye, Store, TrendingUp,
  RefreshCw, MapPin, Star,
  CheckCircle, XCircle,
  Clock, Award,
  ArrowUp, ArrowDown, AlertTriangle,
  Package, ChevronDown, Download
} from "lucide-react";
import { ADMIN_COLORS, getStatusColor } from "../../utils/colors";
import LoadingState from "../../components/ui/LoadingState";
import AdminMetricCard from "../../components/ui/AdminMetricCard";
import AnimatedCount from "../../components/ui/AnimatedCount";
import { useAsync } from "../../hooks/useAsync";
import { 
  getAdminVendors, 
  getAdminVendorById,
  suspendAdminVendor,
  resumeAdminVendor,
  approveAdminVendor,
  rejectAdminVendor,
  setAdminVendorPriority, 
  createAdminVendor,
  getAdminOrders
} from "../../api/admin";

interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  status: 'active' | 'suspended' | 'pending' | 'inactive';
  healthScore: number;
  stores: {
    total: number;
    active: number;
    capacity: number;
  };
  performance: {
    rejectionRate: number;
    avgDeliveryTime: number;
    customerRating: number;
    ordersCompleted: number;
    slaCompliance: number;
  };
  joinedDate: string;
  lastActive: string;
  tier: 'gold' | 'silver' | 'bronze';
  priority: number;
  canSuspend: boolean;
  canAdjustPriority: boolean;
  isApproved: boolean;
  isSuspended: boolean;
  businessName?: string;
  city?: string;
  state?: string;
}

export default function VendorListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [sortBy, setSortBy] = useState<'healthScore' | 'ordersCompleted' | 'name' | 'lastActive' | 'priority'>('healthScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [actionModal, setActionModal] = useState<{
    type: 'suspend' | 'unsuspend' | 'priority' | 'create' | 'view' | 'approve' | 'reject' | null;
    vendorId: string | null;
  }>({ type: null, vendorId: null });
  const [suspensionReason, setSuspensionReason] = useState("");
  const [priorityLevel, setPriorityLevel] = useState(1);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [vendorDetails, setVendorDetails] = useState<any>(null);
  const [bulkAction, setBulkAction] = useState("");
  const [newVendorForm, setNewVendorForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    location: '',
    tier: 'bronze' as 'gold' | 'silver' | 'bronze',
  });

  // Fetch real vendor data from backend
  const { data: vendorsData, loading: vendorsLoading, refetch: refetchVendors } = useAsync(
    () => getAdminVendors({ page: 1, limit: 100 }),
    { vendors: [] },
    []
  );

  // Fetch orders to calculate real performance metrics per vendor
  const { data: ordersData, refetch: refetchOrders } = useAsync(
    () => getAdminOrders({ page: 1, limit: 1000 }), // Fetch more orders for accurate stats
    { orders: [] },
    []
  );

  // Calculate real performance metrics from orders
  const calculateVendorMetrics = (vendorId: string) => {
    const allOrders = (ordersData as any)?.orders || [];
    const vendorOrders = allOrders.filter((o: any) => 
      String(o.vendorId) === String(vendorId) || 
      String(o.vendor?._id) === String(vendorId) ||
      String(o.vendor?.id) === String(vendorId)
    );
    
    if (vendorOrders.length === 0) {
      return {
        ordersCompleted: 0,
        avgDeliveryTime: 0,
        customerRating: 0,
        rejectionRate: 0,
        slaCompliance: 0
      };
    }
    
    const completedOrders = vendorOrders.filter((o: any) => o.status === 'delivered');
    const cancelledOrders = vendorOrders.filter((o: any) => o.status === 'cancelled');
    
    // Calculate average delivery time (in minutes)
    let totalDeliveryTime = 0;
    let deliveryCount = 0;
    completedOrders.forEach((o: any) => {
      if (o.deliveredAt && o.createdAt) {
        const deliveryTime = (new Date(o.deliveredAt).getTime() - new Date(o.createdAt).getTime()) / (1000 * 60);
        totalDeliveryTime += deliveryTime;
        deliveryCount++;
      }
    });
    
    const avgDeliveryTime = deliveryCount > 0 ? Math.round(totalDeliveryTime / deliveryCount) : 0;
    const rejectionRate = vendorOrders.length > 0 ? Math.round((cancelledOrders.length / vendorOrders.length) * 100) : 0;
    const slaCompliance = vendorOrders.length > 0 ? Math.round(((vendorOrders.length - cancelledOrders.length) / vendorOrders.length) * 100) : 0;
    
    // Calculate average rating (if available in orders)
    const ordersWithRating = completedOrders.filter((o: any) => o.rating && o.rating > 0);
    const avgRating = ordersWithRating.length > 0 
      ? parseFloat((ordersWithRating.reduce((sum: number, o: any) => sum + (o.rating || 0), 0) / ordersWithRating.length).toFixed(1))
      : 0;
    
    return {
      ordersCompleted: completedOrders.length,
      totalOrders: vendorOrders.length,
      avgDeliveryTime,
      customerRating: avgRating,
      rejectionRate,
      slaCompliance
    };
  };

  const normalizeVendor = (v: any): Vendor => {
    // Calculate real metrics from orders
    const realMetrics = calculateVendorMetrics(v._id || v.id || v.userId);
    
    // Use calculated metrics or fallback to backend data
    const realHealthScore = v.healthScore || (realMetrics.slaCompliance > 0 ? realMetrics.slaCompliance : 0);
    const realOrdersCompleted = realMetrics.ordersCompleted;
    const realAvgDeliveryTime = realMetrics.avgDeliveryTime;
    const realCustomerRating = realMetrics.customerRating;
    const realRejectionRate = realMetrics.rejectionRate;
    const realSlaCompliance = realMetrics.slaCompliance;
    
    // Real store data from backend
    const realTotalStores = v.stores?.total || 0;
    const realActiveStores = v.stores?.active || 0;
    const realCapacity = v.stores?.capacity || 0;
    
    return {
      id: String(v._id || v.id || v.userId || ""),
      name: v.name || v.businessName || "Vendor",
      email: v.email || "",
      phone: v.phone || "",
      location: v.location || v.city || v.state || "Unknown",
      status: v.isSuspended ? 'suspended' : v.isApproved ? 'active' : 'pending',
      tier: v.tier || 'bronze',
      priority: v.priority || 1,
      healthScore: realHealthScore,
      performance: {
        ordersCompleted: realOrdersCompleted,
        avgDeliveryTime: realAvgDeliveryTime,
        customerRating: realCustomerRating,
        rejectionRate: realRejectionRate,
        slaCompliance: realSlaCompliance
      },
      stores: {
        total: realTotalStores,
        active: realActiveStores,
        capacity: realCapacity
      },
      joinedDate: v.createdAt || v.joinedDate || new Date().toISOString(),
      lastActive: v.lastActive || v.updatedAt || new Date().toISOString(),
      canSuspend: true,
      canAdjustPriority: true,
      isApproved: v.isApproved || false,
      isSuspended: v.isSuspended || false,
      businessName: v.businessName,
      city: v.city,
      state: v.state
    };
  };

  const vendors = (vendorsData as any)?.vendors?.map(normalizeVendor) || [];

  // Auto-refresh vendors and orders every 30 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      refetchVendors();
      refetchOrders();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetchVendors, refetchOrders]);

  // Filter and sort vendors
  const filteredVendors = vendors.filter((vendor: Vendor) => {
    const matchesSearch = !searchTerm || 
      vendor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || vendor.status === statusFilter;
    const matchesTier = tierFilter === "all" || vendor.tier === tierFilter;
    
    return matchesSearch && matchesStatus && matchesTier;
  });

  const sortedVendors = [...filteredVendors].sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;
    switch (sortBy) {
      case 'name':
        aVal = a.name || '';
        bVal = b.name || '';
        break;
      case 'healthScore':
        aVal = a.healthScore || 0;
        bVal = b.healthScore || 0;
        break;
      case 'ordersCompleted':
        aVal = a.performance?.ordersCompleted || 0;
        bVal = b.performance?.ordersCompleted || 0;
        break;
      case 'priority':
        aVal = a.priority || 0;
        bVal = b.priority || 0;
        break;
      case 'lastActive':
        aVal = new Date(a.lastActive || 0).getTime();
        bVal = new Date(b.lastActive || 0).getTime();
        break;
      default:
        aVal = a.healthScore || 0;
        bVal = b.healthScore || 0;
    }
    
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const handleSelectVendor = (vendorId: string) => {
    setSelectedVendors(prev => 
      prev.includes(vendorId) 
        ? prev.filter(id => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  const handleSelectAll = () => {
    setSelectedVendors(
      selectedVendors.length === filteredVendors.length 
        ? [] 
        : filteredVendors.map((v: any) => v.id)
    );
  };

  const handleAction = async (type: 'suspend' | 'unsuspend' | 'priority' | 'create' | 'view' | 'approve' | 'reject', vendorId?: string) => {
    setActionModal({ type, vendorId: vendorId || null });
    setActionError("");
    
    // Load vendor details for view
    if (type === 'view' && vendorId) {
      try {
        setLoading(true);
        const details = await getAdminVendorById(vendorId);
        setVendorDetails(details);
      } catch (error) {
        console.error('Failed to load vendor details:', error);
        setActionError('Failed to load vendor details');
      } finally {
        setLoading(false);
      }
    }
    
    // Pre-fill priority for existing vendor
    if (type === 'priority' && vendorId) {
      const vendor = vendors.find((v: any) => v.id === vendorId);
      if (vendor) {
        setPriorityLevel(vendor.priority || 1);
      }
    }
  };

  const handleSuspend = async (vendorId: string, suspend: boolean) => {
    try {
      setLoading(true);
      setActionError("");
      if (suspend) {
        await suspendAdminVendor(vendorId, suspensionReason || undefined);
      } else {
        await resumeAdminVendor(vendorId);
      }
      setActionModal({ type: null, vendorId: null });
      setSuspensionReason("");
      refetchVendors();
    } catch (error: any) {
      console.error('Failed to update vendor status:', error);
      setActionError(error?.message || 'Failed to update vendor status');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (vendorId: string) => {
    try {
      setLoading(true);
      setActionError("");
      await approveAdminVendor(vendorId);
      setActionModal({ type: null, vendorId: null });
      refetchVendors();
    } catch (error: any) {
      setActionError(error?.message || 'Failed to approve vendor');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (vendorId: string) => {
    try {
      setLoading(true);
      setActionError("");
      await rejectAdminVendor(vendorId, suspensionReason || undefined);
      setActionModal({ type: null, vendorId: null });
      setSuspensionReason("");
      refetchVendors();
    } catch (error: any) {
      setActionError(error?.message || 'Failed to reject vendor');
    } finally {
      setLoading(false);
    }
  };

  const handlePriorityChange = async (vendorId: string) => {
    try {
      setLoading(true);
      setActionError("");
      await setAdminVendorPriority(vendorId, priorityLevel);
      setActionModal({ type: null, vendorId: null });
      setPriorityLevel(1);
      refetchVendors();
    } catch (error: any) {
      console.error('Failed to update vendor priority:', error);
      setActionError(error?.message || 'Failed to update vendor priority');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVendor = async () => {
    try {
      if (!newVendorForm.name || !newVendorForm.email || !newVendorForm.phone || !newVendorForm.password) {
        setActionError('Please fill in all required fields (name, email, phone, password)');
        return;
      }
      setLoading(true);
      setActionError("");
      await createAdminVendor(newVendorForm);
      setActionModal({ type: null, vendorId: null });
      setNewVendorForm({ name: '', email: '', phone: '', password: '', location: '', tier: 'bronze' });
      refetchVendors();
    } catch (error: any) {
      console.error('Failed to create vendor:', error);
      setActionError(error?.response?.data?.message || error?.message || 'Failed to create vendor');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedVendors.length === 0) return;
    
    if (!confirm(`Are you sure you want to ${bulkAction} ${selectedVendors.length} vendors?`)) return;
    
    try {
      setLoading(true);
      for (const vendorId of selectedVendors) {
        if (bulkAction === 'suspend') {
          await suspendAdminVendor(vendorId, 'Bulk suspension');
        }
        // Add other bulk actions as needed
      }
      refetchVendors();
      setSelectedVendors([]);
      setBulkAction("");
    } catch (error) {
      console.error('Bulk action failed:', error);
      alert('Some operations failed. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const exportVendors = () => {
    const csvContent = [
      ['Vendor ID', 'Name', 'Email', 'Phone', 'Location', 'Status', 'Health Score', 'Tier', 'Priority'].join(','),
      ...filteredVendors.map((vendor: any) => [
        vendor.id,
        vendor.name,
        vendor.email,
        vendor.phone,
        vendor.location,
        vendor.status,
        vendor.healthScore,
        vendor.tier,
        vendor.priority
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendors-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return { color: ADMIN_COLORS.success, bg: ADMIN_COLORS.successBg };
    if (score >= 70) return { color: ADMIN_COLORS.warning, bg: ADMIN_COLORS.warningBg };
    return { color: ADMIN_COLORS.critical, bg: ADMIN_COLORS.criticalBg };
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'gold': return { color: '#f59e0b', bg: '#fffbeb' };
      case 'silver': return { color: '#6b7280', bg: '#f9fafb' };
      case 'bronze': return { color: '#92400e', bg: '#fef3c7' };
      default: return { color: '#6b7280', bg: '#f9fafb' };
    }
  };

  // Calculate stats
  const activeVendors = vendors.filter((v: Vendor) => v.status === 'active');
  const pendingVendors = vendors.filter((v: Vendor) => v.status === 'pending');
  const criticalHealthVendors = vendors.filter((v: Vendor) => v.healthScore < 70);

  return (
    <div className="space-y-6">
      
      {/* Page Header with Title and Actions */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={exportVendors}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold"
          >
            <Download size={14} />
            Export
          </button>
          <button
            onClick={() => refetchVendors()}
            disabled={vendorsLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold disabled:opacity-60"
          >
            <RefreshCw size={14} className={vendorsLoading ? "animate-spin" : ""} />
            {vendorsLoading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            onClick={() => setActionModal({ type: 'create', vendorId: null })}
            className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-bold rounded-xl transition"
            style={{ backgroundColor: ADMIN_COLORS.primary }}
          >
            <Store size={15} /> Create Vendor
          </button>
        </div>
      </div>

      {/* Stats Summary - Full Width */}
      <div className="grid grid-cols-4 gap-4">
        <AdminMetricCard 
          index={0}
          label="Total Vendors" 
          value={vendors.length.toString()} 
          accent={ADMIN_COLORS.primary} 
          icon={Store} 
        />
        <AdminMetricCard 
          label="Active" 
          value={activeVendors.length.toString()} 
          accent={ADMIN_COLORS.success} 
          accentBg={ADMIN_COLORS.successBg}
          icon={CheckCircle} 
        />
        <AdminMetricCard 
          label="Pending" 
          value={pendingVendors.length.toString()} 
          accent={ADMIN_COLORS.warning} 
          accentBg={ADMIN_COLORS.warningBg}
          icon={Clock} 
        />
        <AdminMetricCard 
          label="Critical Health" 
          value={criticalHealthVendors.length.toString()} 
          accent={ADMIN_COLORS.critical} 
          accentBg={ADMIN_COLORS.criticalBg}
          icon={AlertTriangle} 
        />
      </div>
      
      {/* Critical Health Alert */}
      {criticalHealthVendors.length > 0 && (
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
                <AnimatedCount value={criticalHealthVendors.length} /> Vendor{criticalHealthVendors.length > 1 ? 's' : ''} Need Attention
              </p>
              <p className="text-sm mt-1" style={{ color: ADMIN_COLORS.critical }}>
                Vendors with health score below 70% requiring immediate review
              </p>
            </div>
            <button
              onClick={() => { setSortBy('healthScore'); setSortOrder('asc'); setStatusFilter('all'); setTimeout(() => window.scrollTo({ top: 500, behavior: 'smooth' }), 50); }}
              className="px-4 py-2 rounded-xl font-bold text-white transition"
              style={{ backgroundColor: ADMIN_COLORS.critical }}
            >
              Review Critical Vendors
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedVendors.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
          <p className="text-sm font-semibold text-blue-900">
            {selectedVendors.length} vendor{selectedVendors.length > 1 ? 's' : ''} selected
          </p>
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="px-3 py-2 rounded-lg border border-blue-200 text-sm bg-white"
          >
            <option value="">Choose Action</option>
            <option value="suspend">Suspend Selected</option>
            <option value="export">Export Selected</option>
          </select>
          <button
            onClick={handleBulkAction}
            disabled={!bulkAction || loading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg disabled:opacity-50 hover:bg-blue-700 transition"
          >
            Apply
          </button>
          <button
            onClick={() => setSelectedVendors([])}
            className="ml-auto text-sm text-blue-600 hover:text-blue-800 font-semibold"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Search + Filters — combined in one bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search vendors by name, email, or location..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none px-4 py-2.5 pr-8 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition text-sm font-semibold"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Tier Filter */}
          <div className="relative">
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="appearance-none px-4 py-2.5 pr-8 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition text-sm font-semibold"
            >
              <option value="all">All Tiers</option>
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
              <option value="bronze">Bronze</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="appearance-none px-4 py-2.5 pr-8 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition text-sm font-semibold"
            >
              <option value="healthScore">Health Score</option>
              <option value="ordersCompleted">Orders Completed</option>
              <option value="priority">Priority</option>
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

      {/* Vendors Table */}
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-4 sticky top-0 bg-gray-50 z-10">
                  <input
                    type="checkbox"
                    checked={selectedVendors.length === filteredVendors.length && filteredVendors.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide p-4 min-w-[200px] sticky top-0 bg-gray-50 z-10">Vendor</th>
                <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide p-4 min-w-[100px] sticky top-0 bg-gray-50 z-10">Status</th>
                <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide p-4 min-w-[120px] sticky top-0 bg-gray-50 z-10">Health Score</th>
                <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide p-4 min-w-[140px] sticky top-0 bg-gray-50 z-10">Performance</th>
                <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide p-4 min-w-[80px] sticky top-0 bg-gray-50 z-10">Stores</th>
                <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide p-4 min-w-[80px] sticky top-0 bg-gray-50 z-10">Tier</th>
                <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide p-4 min-w-[80px] sticky top-0 bg-gray-50 z-10">Priority</th>
                <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide p-4 min-w-[100px] sticky top-0 bg-gray-50 z-10">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendorsLoading ? (
                <tr>
                  <td colSpan={9} className="p-8">
                    <div className="flex justify-center">
                      <LoadingState message="Loading vendors..." />
                    </div>
                  </td>
                </tr>
              ) : sortedVendors.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12">
                    <div className="flex flex-col items-center justify-center gap-3 text-center">
                      <Store size={48} className="text-gray-300" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">No vendors found</h3>
                        <p className="text-gray-500 mt-1">
                          {vendors.length === 0 
                            ? "No vendors in database yet. Real backend data - no mock data."
                            : "No vendors match your current filters."
                          }
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedVendors.map((vendor: Vendor) => {
                  const healthColor = getHealthColor(vendor.healthScore);
                  const statusColor = getStatusColor(vendor.status);
                  const tierColor = getTierColor(vendor.tier);
                  
                  return (
                    <tr 
                      key={vendor.id} 
                      className="border-b border-gray-50 hover:bg-gray-50 transition"
                    >
                      <td className="p-4" data-label="Select">
                        <input
                          type="checkbox"
                          checked={selectedVendors.includes(vendor.id)}
                          onChange={() => handleSelectVendor(vendor.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      
                      <td className="p-4" data-label="Vendor">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900">{vendor.name}</p>
                            <p className="text-xs text-gray-500">{vendor.email}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                              <MapPin size={10} />
                              {vendor.location}
                            </p>
                          </div>
                        </div>
                      </td>
                      
                      <td className="p-4" data-label="Status">
                        <span 
                          className="text-xs px-2 py-1 rounded-full font-semibold border"
                          style={{
                            backgroundColor: statusColor.bg,
                            color: statusColor.text,
                            borderColor: statusColor.border
                          }}
                        >
                          {vendor.status}
                        </span>
                      </td>
                      
                      <td className="p-4" data-label="Health Score">
                        <div className="flex items-center gap-2">
                          {vendor.healthScore > 0 && vendor.healthScore < 70 && (
                            <AlertTriangle size={14} style={{ color: ADMIN_COLORS.critical }} />
                          )}
                          <span 
                            className="text-sm font-bold px-2 py-1 rounded-lg"
                            style={{ 
                              color: vendor.healthScore > 0 ? healthColor.color : '#9ca3af', 
                              backgroundColor: vendor.healthScore > 0 ? healthColor.bg : '#f3f4f6' 
                            }}
                          >
                            {vendor.healthScore > 0 ? `${vendor.healthScore}%` : '0%'}
                          </span>
                        </div>
                      </td>
                      
                      <td className="p-4" data-label="Performance">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs">
                            <Star size={10} style={{ color: ADMIN_COLORS.warning }} />
                            <span className="font-semibold">
                              {vendor.performance?.customerRating > 0 
                                ? vendor.performance.customerRating 
                                : '0'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Package size={10} />
                            <span>{vendor.performance?.ordersCompleted || 0} orders</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock size={10} />
                            <span>
                              {vendor.performance?.avgDeliveryTime > 0 
                                ? `${vendor.performance.avgDeliveryTime}m avg` 
                                : 'No data'}
                            </span>
                          </div>
                        </div>
                      </td>
                      
                      <td className="p-4" data-label="Stores">
                        <div className="text-center">
                          {vendor.stores?.total > 0 ? (
                            <>
                              <p className="text-sm font-bold text-gray-900">
                                {vendor.stores?.active || 0}/{vendor.stores?.total || 0}
                              </p>
                              <p className="text-xs text-gray-500">
                                {vendor.stores?.capacity || 0}% capacity
                              </p>
                            </>
                          ) : (
                            <p className="text-xs text-gray-400">No stores</p>
                          )}
                        </div>
                      </td>
                      
                      <td className="p-4" data-label="Tier">
                        <span 
                          className="text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1 w-fit"
                          style={{ 
                            color: tierColor.color, 
                            backgroundColor: tierColor.bg 
                          }}
                        >
                          <Award size={10} />
                          {vendor.tier}
                        </span>
                      </td>
                      
                      <td className="p-4" data-label="Priority">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-bold text-gray-900">{vendor.priority || 1}</span>
                          <button
                            onClick={() => handleAction('priority', vendor.id)}
                            className="p-1 rounded hover:bg-gray-100 transition"
                            title="Adjust Priority"
                          >
                            <TrendingUp size={12} style={{ color: ADMIN_COLORS.info }} />
                          </button>
                        </div>
                      </td>
                      
                      <td className="p-4" data-label="Actions">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAction('view', vendor.id)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 transition"
                            title="View Details"
                          >
                            <Eye size={14} style={{ color: ADMIN_COLORS.info }} />
                          </button>
                          
                          {/* Approve/Reject - show for all vendors */}
                          {!vendor.isApproved && (
                            <button
                              onClick={() => handleAction('approve', vendor.id)}
                              className="p-1.5 rounded-lg hover:bg-green-50 transition"
                              title="Approve Vendor"
                            >
                              <CheckCircle size={14} style={{ color: ADMIN_COLORS.success }} />
                            </button>
                          )}
                          {vendor.isApproved && (
                            <button
                              onClick={() => handleAction('reject', vendor.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 transition"
                              title="Reject / Revoke Approval"
                            >
                              <XCircle size={14} style={{ color: ADMIN_COLORS.error }} />
                            </button>
                          )}
                          
                          {/* Suspend/Unsuspend for active/suspended vendors */}
                          {vendor.status !== 'pending' && vendor.canSuspend && (
                            <button
                              onClick={() => handleAction(
                                vendor.status === 'suspended' ? 'unsuspend' : 'suspend', 
                                vendor.id
                              )}
                              className="p-1.5 rounded-lg hover:bg-red-50 transition"
                              title={vendor.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
                            >
                              <XCircle size={14} style={{ color: ADMIN_COLORS.error }} />
                            </button>
                          )}
                          
                          {vendor.canAdjustPriority && (
                            <button
                              onClick={() => handleAction('priority', vendor.id)}
                              className="p-1.5 rounded-lg hover:bg-green-50 transition"
                              title="Set Priority"
                            >
                              <TrendingUp size={14} style={{ color: ADMIN_COLORS.success }} />
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
            
            {/* View Vendor Details Modal */}
            {actionModal.type === 'view' && vendorDetails && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Vendor Details</h3>
                  <button 
                    onClick={() => { setActionModal({ type: null, vendorId: null }); setVendorDetails(null); }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <XCircle size={20} className="text-gray-400" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  {/* Vendor Header */}
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Vendor Name</p>
                        <p className="font-bold text-gray-900">{vendorDetails.name || vendorDetails.businessName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Status</p>
                        <span className="text-xs px-2 py-1 rounded-full font-semibold bg-blue-50 text-blue-700">
                          {vendorDetails.isSuspended ? 'Suspended' : vendorDetails.isApproved ? 'Active' : 'Pending'}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Email</p>
                        <p className="text-sm text-gray-700">{vendorDetails.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Phone</p>
                        <p className="text-sm text-gray-700">{vendorDetails.phone}</p>
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
                          <p className="text-sm text-gray-700">{vendorDetails.city || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">State</p>
                          <p className="text-sm text-gray-700">{vendorDetails.state || '—'}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500 mb-1">Full Location</p>
                          <p className="text-sm text-gray-700">{vendorDetails.location || '—'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Performance Metrics */}
                  <div>
                    <h4 className="font-bold text-gray-900 mb-3">Performance Metrics</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Health Score</p>
                        <p className="text-lg font-bold text-gray-900">{vendorDetails.healthScore || '0'}%</p>
                      </div>
                      <div className="p-3 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Priority Level</p>
                        <p className="text-lg font-bold text-gray-900">{vendorDetails.priority || 1}</p>
                      </div>
                      <div className="p-3 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Tier</p>
                        <p className="text-lg font-bold text-gray-900 capitalize">{vendorDetails.tier || 'Bronze'}</p>
                      </div>
                      <div className="p-3 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Joined Date</p>
                        <p className="text-sm text-gray-700">{new Date(vendorDetails.createdAt || Date.now()).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions in View Modal */}
                  <div className="flex gap-3 pt-2 border-t border-gray-100">
                    {!vendorDetails.isApproved && (
                      <button
                        onClick={() => {
                          setVendorDetails(null);
                          setActionModal({ type: 'approve', vendorId: actionModal.vendorId });
                        }}
                        className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition"
                        style={{ backgroundColor: ADMIN_COLORS.success }}
                      >
                        ✓ Approve Vendor
                      </button>
                    )}
                    {vendorDetails.isApproved && (
                      <button
                        onClick={() => {
                          setVendorDetails(null);
                          setActionModal({ type: 'reject', vendorId: actionModal.vendorId });
                        }}
                        className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition"
                        style={{ backgroundColor: ADMIN_COLORS.error }}
                      >
                        ✕ Revoke Approval
                      </button>
                    )}
                    {!vendorDetails.isSuspended && (
                      <button
                        onClick={() => {
                          setVendorDetails(null);
                          setActionModal({ type: 'suspend', vendorId: actionModal.vendorId });
                        }}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                      >
                        Suspend
                      </button>
                    )}
                    {vendorDetails.isSuspended && (
                      <button
                        onClick={() => {
                          setVendorDetails(null);
                          setActionModal({ type: 'unsuspend', vendorId: actionModal.vendorId });
                        }}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                      >
                        Unsuspend
                      </button>
                    )}
                    <button
                      onClick={() => { setActionModal({ type: null, vendorId: null }); setVendorDetails(null); }}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </>
            )}
            
            {/* Approve Vendor Modal */}
            {actionModal.type === 'approve' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Approve Vendor</h3>
                  <button onClick={() => setActionModal({ type: null, vendorId: null })} className="p-2 hover:bg-gray-100 rounded-lg">
                    <XCircle size={20} className="text-gray-400" />
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  Are you sure you want to approve this vendor? They will be able to receive orders.
                </p>
              </>
            )}

            {/* Reject Vendor Modal */}
            {actionModal.type === 'reject' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Reject Vendor</h3>
                  <button onClick={() => setActionModal({ type: null, vendorId: null })} className="p-2 hover:bg-gray-100 rounded-lg">
                    <XCircle size={20} className="text-gray-400" />
                  </button>
                </div>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Provide a reason for rejecting this vendor.</p>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2">Reason (optional)</label>
                    <textarea
                      value={suspensionReason}
                      onChange={(e) => setSuspensionReason(e.target.value)}
                      placeholder="Enter reason for rejection..."
                      className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 resize-none"
                      rows={3}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Suspend Vendor Modal */}
            {actionModal.type === 'suspend' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Suspend Vendor</h3>
                  <button 
                    onClick={() => setActionModal({ type: null, vendorId: null })}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <XCircle size={20} className="text-gray-400" />
                  </button>
                </div>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Are you sure you want to suspend this vendor? This will prevent them from receiving new orders.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2">Reason for suspension *</label>
                    <textarea
                      value={suspensionReason}
                      onChange={(e) => setSuspensionReason(e.target.value)}
                      placeholder="Enter reason for suspension..."
                      className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 resize-none"
                      rows={3}
                    />
                  </div>
                </div>
              </>
            )}
            
            {/* Unsuspend Vendor Modal */}
            {actionModal.type === 'unsuspend' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Unsuspend Vendor</h3>
                  <button 
                    onClick={() => setActionModal({ type: null, vendorId: null })}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <XCircle size={20} className="text-gray-400" />
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  Are you sure you want to unsuspend this vendor? They will be able to receive new orders again.
                </p>
              </>
            )}
            
            {/* Set Priority Modal */}
            {actionModal.type === 'priority' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Set Vendor Priority</h3>
                  <button 
                    onClick={() => setActionModal({ type: null, vendorId: null })}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <XCircle size={20} className="text-gray-400" />
                  </button>
                </div>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Set vendor priority level (1-10). Higher priority vendors get orders first.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2">Priority Level (1-10)</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={priorityLevel}
                      onChange={(e) => setPriorityLevel(parseInt(e.target.value) || 1)}
                      className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Current: {priorityLevel} • 1 = Lowest, 10 = Highest
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Create Vendor Modal */}
            {actionModal.type === 'create' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Add New Vendor</h3>
                  <button 
                    onClick={() => setActionModal({ type: null, vendorId: null })}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <XCircle size={20} className="text-gray-400" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-2">Vendor Name *</label>
                      <input
                        type="text"
                        value={newVendorForm.name}
                        onChange={(e) => setNewVendorForm({ ...newVendorForm, name: e.target.value })}
                        placeholder="Enter vendor name"
                        className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-2">Email *</label>
                      <input
                        type="email"
                        value={newVendorForm.email}
                        onChange={(e) => setNewVendorForm({ ...newVendorForm, email: e.target.value })}
                        placeholder="Enter email"
                        className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-2">Phone *</label>
                      <input
                        type="tel"
                        value={newVendorForm.phone}
                        onChange={(e) => setNewVendorForm({ ...newVendorForm, phone: e.target.value })}
                        placeholder="Enter phone number"
                        className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-2">Password *</label>
                      <input
                        type="password"
                        value={newVendorForm.password}
                        onChange={(e) => setNewVendorForm({ ...newVendorForm, password: e.target.value })}
                        placeholder="Min 8 characters"
                        className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-2">Location</label>
                      <input
                        type="text"
                        value={newVendorForm.location}
                        onChange={(e) => setNewVendorForm({ ...newVendorForm, location: e.target.value })}
                        placeholder="Enter location"
                        className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-2">Tier</label>
                      <select
                        value={newVendorForm.tier}
                        onChange={(e) => setNewVendorForm({ ...newVendorForm, tier: e.target.value as any })}
                        className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900"
                      >
                        <option value="bronze">Bronze</option>
                        <option value="silver">Silver</option>
                        <option value="gold">Gold</option>
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {/* Modal Actions */}
            {actionModal.type !== 'view' && (
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setActionModal({ type: null, vendorId: null }); setActionError(""); }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (actionModal.type === 'priority') {
                      handlePriorityChange(actionModal.vendorId!);
                    } else if (actionModal.type === 'create') {
                      handleCreateVendor();
                    } else if (actionModal.type === 'approve') {
                      handleApprove(actionModal.vendorId!);
                    } else if (actionModal.type === 'reject') {
                      handleReject(actionModal.vendorId!);
                    } else {
                      handleSuspend(actionModal.vendorId!, actionModal.type === 'suspend');
                    }
                  }}
                  disabled={loading || 
                    (actionModal.type === 'suspend' && !suspensionReason.trim()) ||
                    (actionModal.type === 'create' && (!newVendorForm.name || !newVendorForm.email || !newVendorForm.phone || !newVendorForm.password))
                  }
                  className="flex-1 px-4 py-2 text-white font-bold rounded-xl transition disabled:opacity-60"
                  style={{ 
                    backgroundColor: (actionModal.type === 'suspend' || actionModal.type === 'reject') ? ADMIN_COLORS.error : ADMIN_COLORS.primary 
                  }}
                >
                  {loading ? "Processing..." : 
                   actionModal.type === 'suspend' ? "Suspend Vendor" :
                   actionModal.type === 'unsuspend' ? "Unsuspend Vendor" :
                   actionModal.type === 'approve' ? "Approve Vendor" :
                   actionModal.type === 'reject' ? "Reject Vendor" :
                   actionModal.type === 'priority' ? "Update Priority" : "Create Vendor"}
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
}
