import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search, Eye, AlertTriangle,
  XCircle, Download,
  RotateCcw, DollarSign, MapPin,
  Zap, ChevronDown, Package,
  Clock
} from "lucide-react";
import { ADMIN_COLORS, getStatusColor, getSLARiskColor } from "../../utils/colors";
import { useAsync } from "../../hooks/useAsync";
import { 
  cancelAdminOrder, 
  getAdminOrders, 
  refundAdminOrder, 
  getAdminVendors, 
  reassignOrderVendor,
  getAdminOrderById 
} from "../../api/admin";
import AdminMetricCard from "../../components/ui/AdminMetricCard";
import AnimatedCount from "../../components/ui/AnimatedCount";

interface Order {
  id: string;
  rawStatus?: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    id: string;
  };
  type: string;
  vendor: {
    name: string;
    id: string;
    location: string;
  };
  status: string;
  sla: string;
  risk: 'critical' | 'warning' | 'normal';
  amount: number;
  created: string;
  items: number;
  assignedAt?: string;
  estimatedCompletion?: string;
  deliveryPartner?: string;
  priority: 'high' | 'normal' | 'low';
  canReassign: boolean;
  canCancel: boolean;
  canRefund: boolean;
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pending Assignment",
  confirmed: "Confirmed",
  assigned_vendor: "Assigned to Vendor",
  vendor_accepted: "Vendor Accepted",
  in_production: "In Production",
  qc_pending: "QC Review",
  ready_for_pickup: "Ready for Pickup",
  delivery_assigned: "Delivery Assigned",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const TERMINAL_ORDER_STATUSES = new Set(["delivered", "cancelled", "refunded"]);

const formatFlowType = (value?: string) => {
  if (!value) return "General";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const getOrderRisk = (createdAt?: string | Date, rawStatus?: string): Order["risk"] => {
  if (!createdAt || (rawStatus && TERMINAL_ORDER_STATUSES.has(rawStatus))) {
    return "normal";
  }

  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  if (ageHours >= 24) return "critical";
  if (ageHours >= 6) return "warning";
  return "normal";
};

const getSlaLabel = (risk: Order["risk"], rawStatus?: string) => {
  if (rawStatus && TERMINAL_ORDER_STATUSES.has(rawStatus)) return "Done";
  if (risk === "critical") return "Breach Risk";
  if (risk === "warning") return "Monitor";
  return "On Track";
};

const normalizeOrder = (raw: any): Order => {
  const rawStatus = String(raw?.status || "pending");
  const risk = getOrderRisk(raw?.createdAt, rawStatus);
  const itemCount = Array.isArray(raw?.items) ? raw.items.length : 0;
  const firstItem = itemCount > 0 ? raw.items[0] : null;
  const customerName =
    raw?.shippingAddress?.fullName ||
    raw?.customer?.name ||
    "Customer";
  const customerPhone =
    raw?.shippingAddress?.phone ||
    raw?.customer?.phone ||
    "";
  const vendorLabel =
    raw?.vendor?.name ||
    raw?.vendorName ||
    (raw?.storeId ? "Assigned Store" : "Unassigned");
  const vendorLocation =
    raw?.vendor?.location ||
    raw?.shippingAddress?.city ||
    raw?.shippingAddress?.state ||
    "Pending";

  return {
    id: String(raw?._id || raw?.id || raw?.orderNumber || ""),
    rawStatus,
    customer: {
      name: customerName,
      email: raw?.customer?.email || "",
      phone: customerPhone,
      id: String(raw?.userId || raw?.customer?.id || ""),
    },
    type: formatFlowType(firstItem?.flowType),
    vendor: {
      name: vendorLabel,
      id: String(raw?.vendorId || raw?.vendor?.id || raw?.storeId || ""),
      location: vendorLocation,
    },
    status: ORDER_STATUS_LABELS[rawStatus] || formatFlowType(rawStatus.replace(/_/g, " ")),
    sla: getSlaLabel(risk, rawStatus),
    risk,
    amount: Number(raw?.total || raw?.totalAmount || 0),
    created: raw?.createdAt || raw?.created || "",
    items: itemCount,
    assignedAt: raw?.assignedAt,
    estimatedCompletion: raw?.readyAt || raw?.deliveredAt,
    deliveryPartner: raw?.riderId || "",
    priority: risk === "critical" ? "high" : risk === "warning" ? "normal" : "low",
    canReassign: !TERMINAL_ORDER_STATUSES.has(rawStatus),
    canCancel: !TERMINAL_ORDER_STATUSES.has(rawStatus),
    canRefund: rawStatus !== "refunded" && String(raw?.paymentStatus || "") === "paid",
  };
};

const normalizeVendor = (raw: any) => ({
  id: String(raw?.userId || raw?._id || raw?.id || ""),
  name: raw?.name || raw?.businessName || "Vendor",
  location: raw?.location || raw?.city || raw?.state || "Unknown",
  capacity: raw?.capacity ?? raw?.healthScore ?? 0,
  score: raw?.healthScore ?? raw?.priority ?? 0,
});

const ROWS_PER_PAGE = 10;

const OrderListPage = () => {
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [actionModal, setActionModal] = useState<{
    type: 'reassign' | 'cancel' | 'refund' | 'view' | null;
    orderId: string | null;
  }>({ type: null, orderId: null });
  const [reassignVendor, setReassignVendor] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [bulkAction, setBulkAction] = useState("");

  // Update search term when URL changes
  useEffect(() => {
    const urlSearch = searchParams.get("search");
    if (urlSearch) {
      setSearchTerm(urlSearch);
    }
  }, [searchParams]);

  // Fetch orders from backend
  const { data: ordersData, refetch: refetchOrders } = useAsync(
    () => getAdminOrders({ page: 1, limit: 50 }), 
    { orders: [] }, 
    []
  );

  // Fetch available vendors for reassignment
  const { data: vendorsData } = useAsync(
    () => getAdminVendors({ page: 1, limit: 20 }), 
    { vendors: [] }, 
    []
  );

  const ordersFromAPI = (ordersData as any)?.orders || [];
  const vendorsFromAPI = (vendorsData as any)?.vendors || [];

  // Build a quick lookup map: vendorId -> vendor name
  const vendorNameMap: Record<string, string> = {};
  if (Array.isArray(vendorsFromAPI)) {
    vendorsFromAPI.forEach((v: any) => {
      const vid = String(v?.userId || v?._id || v?.id || "");
      const vname = v?.name || v?.businessName || "";
      if (vid && vname) vendorNameMap[vid] = vname;
    });
  }

  const ordersToShow = Array.isArray(ordersFromAPI)
    ? ordersFromAPI.map((raw: any) => {
        const order = normalizeOrder(raw);
        // If vendor name is still an ID (no name resolved), look up from vendors list
        const vid = order.vendor.id;
        if (vid && vendorNameMap[vid] && order.vendor.name === vid) {
          order.vendor.name = vendorNameMap[vid];
        }
        return order;
      })
    : [];
  const vendorsToShow = Array.isArray(vendorsFromAPI) ? vendorsFromAPI.map(normalizeVendor) : [];

  // Filter orders based on search and filters
  const filteredOrders = ordersToShow.filter((order: Order) => {
    const customerName = order.customer?.name || "";
    const vendorName = order.vendor?.name || "";
    const orderId = order.id || "";
    const orderType = order.type || "";
    const matchesSearch = 
      orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orderType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendorName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesRisk = riskFilter === "all" || order.risk === riskFilter;
    
    return matchesSearch && matchesStatus && matchesRisk;
  });

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ROWS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, riskFilter]);

  // Auto-refresh orders every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchOrders();
    }, 30000);

    return () => clearInterval(interval);
  }, [refetchOrders]);

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    setSelectedOrders(
      selectedOrders.length === filteredOrders.length 
        ? [] 
        : filteredOrders.map((o: any) => o.id)
    );
  };

  const handleAction = async (type: 'reassign' | 'cancel' | 'refund' | 'view', orderId: string) => {
    const order = ordersToShow.find((o: Order) => o.id === orderId);
    if (!order) return;

    setActionModal({ type, orderId });
    
    // Pre-fill refund amount
    if (type === 'refund') {
      setRefundAmount(order.amount.toString());
    }
    
    // Load order details for view
    if (type === 'view') {
      try {
        const details = await getAdminOrderById(orderId);
        setOrderDetails(details);
      } catch (error) {
        console.error('Failed to load order details:', error);
        setActionError('Failed to load order details');
      }
    }
  };

  const confirmAction = async () => {
    setLoading(true);
    setActionError("");
    try {
      if (actionModal.type === 'reassign' && reassignVendor) {
        await reassignOrderVendor(actionModal.orderId!, { vendorId: reassignVendor });
      } else if (actionModal.type === 'cancel' && cancelReason.trim()) {
        await cancelAdminOrder(actionModal.orderId!, cancelReason);
      } else if (actionModal.type === 'refund' && refundAmount) {
        await refundAdminOrder(actionModal.orderId!, refundAmount);
      }
      refetchOrders();
      setActionModal({ type: null, orderId: null });
      setReassignVendor("");
      setCancelReason("");
      setRefundAmount("");
      setActionError("");
    } catch (error: any) {
      setActionError(error?.message || 'Action failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const exportOrders = () => {
    const csvContent = [
      ['Order ID', 'Customer', 'Type', 'Vendor', 'Status', 'Amount', 'Created', 'SLA Risk'].join(','),
      ...filteredOrders.map((order: any) => [
        order.id,
        order.customer.name,
        order.type,
        order.vendor.name,
        order.status,
        order.amount,
        order.created,
        order.risk
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  
  const handleBulkAction = async () => {
    if (!bulkAction || selectedOrders.length === 0) return;
    
    if (!confirm(`Are you sure you want to ${bulkAction} ${selectedOrders.length} orders?`)) return;
    
    try {
      setLoading(true);
      for (const orderId of selectedOrders) {
        if (bulkAction === 'cancel') {
          await cancelAdminOrder(orderId, 'Bulk cancellation');
        }
        // Add other bulk actions as needed
      }
      refetchOrders();
      setSelectedOrders([]);
      setBulkAction("");
    } catch (error) {
      console.error('Bulk action failed:', error);
      alert('Some operations failed. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const criticalOrders = filteredOrders.filter((o: any) => o.risk === 'critical');
  const warningOrders = filteredOrders.filter((o: any) => o.risk === 'warning');

  return (
    <div className="space-y-6">
      
      {/* Page Header with Title and Actions */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={exportOrders}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold"
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {/* Stats Summary - Full Width */}
      <div className="grid grid-cols-3 gap-4">
        <AdminMetricCard 
          index={0}
          label="Total Orders" 
          value={filteredOrders.length.toString()} 
          accent={ADMIN_COLORS.primary} 
          icon={Package} 
        />
        <AdminMetricCard 
          label="Critical SLA" 
          value={criticalOrders.length.toString()} 
          accent={ADMIN_COLORS.critical} 
          accentBg={ADMIN_COLORS.criticalBg}
          icon={AlertTriangle} 
        />
        <AdminMetricCard 
          label="Warning SLA" 
          value={warningOrders.length.toString()} 
          accent={ADMIN_COLORS.warning} 
          accentBg={ADMIN_COLORS.warningBg}
          icon={Clock} 
        />
      </div>

      {/* Critical Orders Alert */}
      {criticalOrders.length > 0 && (
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
                <AnimatedCount value={criticalOrders.length} /> Critical SLA Risk{criticalOrders.length > 1 ? 's' : ''}
              </p>
              <p className="text-sm mt-1" style={{ color: ADMIN_COLORS.critical }}>
                Orders requiring immediate intervention to prevent SLA breach
              </p>
            </div>
            <button
              onClick={() => { setRiskFilter("critical"); setTimeout(() => window.scrollTo({ top: 500, behavior: 'smooth' }), 50); }}
              className="px-4 py-2 rounded-xl font-bold text-white transition"
              style={{ backgroundColor: ADMIN_COLORS.critical }}
            >
              View Critical Orders
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedOrders.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
          <p className="text-sm font-semibold text-blue-900">
            {selectedOrders.length} order{selectedOrders.length > 1 ? 's' : ''} selected
          </p>
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="px-3 py-2 rounded-lg border border-blue-200 text-sm bg-white"
          >
            <option value="">Choose Action</option>
            <option value="cancel">Cancel Selected</option>
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
            onClick={() => setSelectedOrders([])}
            className="ml-auto text-sm text-blue-600 hover:text-blue-800 font-semibold"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders, customers, vendors..."
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
              <option value="Pending Assignment">Pending Assignment</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Assigned to Vendor">Assigned to Vendor</option>
              <option value="Vendor Accepted">Vendor Accepted</option>
              <option value="In Production">In Production</option>
              <option value="QC Review">QC Review</option>
              <option value="Ready for Pickup">Ready for Pickup</option>
              <option value="Out for Delivery">Out for Delivery</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Refunded">Refunded</option>
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
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="normal">Normal</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ background: 'var(--admin-surface)' }}>
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '520px' }}>
          <table style={{ width: '100%', minWidth: '860px', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(248,249,255,0.98)' }}>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>
                  <input
                    type="checkbox"
                    checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: '#a1a9bd', textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>Order</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: '#a1a9bd', textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>Customer</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: '#a1a9bd', textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>Vendor</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: '#a1a9bd', textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: '#a1a9bd', textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>SLA</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: '#a1a9bd', textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>Amount</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: '#a1a9bd', textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order: any) => {
                const statusColors = getStatusColor(order.status);
                const riskColors = getSLARiskColor(order.risk);
                
                return (
                  <tr 
                    key={order.id}
                    style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,247,255,0.95)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order.id)}
                        onChange={() => handleSelectOrder(order.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div>
                          <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: 0 }}>{order.id}</p>
                          <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>{order.type}</p>
                        </div>
                        {order.priority === 'high' && <Zap size={12} style={{ color: ADMIN_COLORS.warning, flexShrink: 0 }} />}
                      </div>
                    </td>
                    
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827', margin: 0 }}>{order.customer.name}</p>
                      <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>{order.customer.id}</p>
                    </td>
                    
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827', margin: 0 }}>{order.vendor.name}</p>
                      <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0, display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <MapPin size={10} />{order.vendor.location}
                      </p>
                    </td>
                    
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <span style={{
                        fontSize: '11px', fontWeight: 600, padding: '3px 10px',
                        borderRadius: '999px', border: `1px solid ${statusColors.border}`,
                        backgroundColor: statusColors.bg, color: statusColors.text,
                        whiteSpace: 'nowrap'
                      }}>
                        {order.status}
                      </span>
                    </td>
                    
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {order.risk === 'critical' && <AlertTriangle size={13} style={{ color: ADMIN_COLORS.critical }} />}
                        <span style={{ fontSize: '12px', fontWeight: 700, color: order.sla === "Done" ? ADMIN_COLORS.success : riskColors.text }}>
                          {order.sla}
                        </span>
                      </div>
                    </td>
                    
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: 0 }}>₹{order.amount}</p>
                    </td>
                    
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button onClick={() => handleAction('view', order.id)} className="p-1.5 rounded-lg hover:bg-blue-50 transition" title="View Details">
                          <Eye size={14} style={{ color: ADMIN_COLORS.info }} />
                        </button>
                        {order.canReassign && (
                          <button onClick={() => handleAction('reassign', order.id)} className="p-1.5 rounded-lg hover:bg-blue-50 transition" title="Reassign Vendor">
                            <RotateCcw size={14} style={{ color: ADMIN_COLORS.info }} />
                          </button>
                        )}
                        {order.canCancel && (
                          <button onClick={() => handleAction('cancel', order.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition" title="Cancel Order">
                            <XCircle size={14} style={{ color: ADMIN_COLORS.error }} />
                          </button>
                        )}
                        {order.canRefund && (
                          <button onClick={() => handleAction('refund', order.id)} className="p-1.5 rounded-lg hover:bg-green-50 transition" title="Process Refund">
                            <DollarSign size={14} style={{ color: ADMIN_COLORS.success }} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #f1f5f9', background: 'rgba(248,249,255,0.6)' }}>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
            Showing <strong>{(currentPage - 1) * ROWS_PER_PAGE + 1}</strong>–<strong>{Math.min(currentPage * ROWS_PER_PAGE, filteredOrders.length)}</strong> of <strong>{filteredOrders.length}</strong> orders
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{ padding: '5px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px', fontWeight: 600, background: 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.4 : 1 }}
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce<(number | string)[]>((acc, p, idx, arr) => {
                if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === '...' ? (
                  <span key={`e-${idx}`} style={{ padding: '0 4px', fontSize: '12px', color: '#9ca3af' }}>…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p as number)}
                    style={{
                      padding: '5px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                      border: currentPage === p ? '1px solid #111827' : '1px solid #e5e7eb',
                      background: currentPage === p ? '#111827' : 'white',
                      color: currentPage === p ? 'white' : '#374151',
                    }}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{ padding: '5px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px', fontWeight: 600, background: 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.4 : 1 }}
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Action Modals */}
      {actionModal.type && (
        <div className="admin-modal-overlay">
          <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            
            {/* View Order Details Modal */}
            {actionModal.type === 'view' && orderDetails && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Order Details</h3>
                  <button 
                    onClick={() => { setActionModal({ type: null, orderId: null }); setOrderDetails(null); }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <XCircle size={20} className="text-gray-400" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  {/* Order Header */}
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Order ID</p>
                        <p className="font-bold text-gray-900">{orderDetails.id || orderDetails._id}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Status</p>
                        <span className="text-xs px-2 py-1 rounded-full font-semibold bg-blue-50 text-blue-700">
                          {orderDetails.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Total Amount</p>
                        <p className="font-bold text-gray-900">₹{orderDetails.total || orderDetails.totalAmount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Created</p>
                        <p className="text-sm text-gray-700">{new Date(orderDetails.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Customer Info */}
                  <div>
                    <h4 className="font-bold text-gray-900 mb-3">Customer Information</h4>
                    <div className="p-4 rounded-xl border border-gray-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Name</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {orderDetails.shippingAddress?.fullName || orderDetails.customer?.name || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Phone</p>
                          <p className="text-sm text-gray-700">
                            {orderDetails.shippingAddress?.phone || orderDetails.customer?.phone || 'N/A'}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500 mb-1">Address</p>
                          <p className="text-sm text-gray-700">
                            {orderDetails.shippingAddress ? 
                              `${orderDetails.shippingAddress.line1}, ${orderDetails.shippingAddress.city}, ${orderDetails.shippingAddress.state} - ${orderDetails.shippingAddress.pincode}` 
                              : 'N/A'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Order Items */}
                  {orderDetails.items && orderDetails.items.length > 0 && (
                    <div>
                      <h4 className="font-bold text-gray-900 mb-3">Order Items</h4>
                      <div className="space-y-2">
                        {orderDetails.items.map((item: any, idx: number) => (
                          <div key={idx} className="p-3 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-gray-900">{item.name || item.productName}</p>
                                <p className="text-xs text-gray-500">
                                  Qty: {item.quantity} • Type: {item.flowType}
                                </p>
                              </div>
                              <p className="font-bold text-gray-900">₹{item.price || item.amount}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Timeline */}
                  {orderDetails.timeline && orderDetails.timeline.length > 0 && (
                    <div>
                      <h4 className="font-bold text-gray-900 mb-3">Order Timeline</h4>
                      <div className="space-y-3">
                        {orderDetails.timeline.map((event: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-900">{event.status}</p>
                              <p className="text-xs text-gray-500">{event.note}</p>
                              <p className="text-xs text-gray-400">{new Date(event.timestamp).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            
            {/* Reassign Vendor Modal */}
            {actionModal.type === 'reassign' && (
              <>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Reassign Order</h3>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Select a new vendor for order {actionModal.orderId}:
                  </p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {vendorsToShow.map((vendor: any) => (
                      <label key={vendor.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-gray-300 cursor-pointer">
                        <input
                          type="radio"
                          name="vendor"
                          value={vendor.id}
                          checked={reassignVendor === vendor.id}
                          onChange={(e) => setReassignVendor(e.target.value)}
                          className="text-blue-600"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{vendor.name}</p>
                          <p className="text-xs text-gray-500">
                            {vendor.location} • {vendor.capacity}% capacity • Score: {vendor.score}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
            
            {/* Cancel Order Modal */}
            {actionModal.type === 'cancel' && (
              <>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Cancel Order</h3>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Provide a reason for cancelling order {actionModal.orderId}:
                  </p>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Enter cancellation reason..."
                    className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 resize-none"
                    rows={3}
                  />
                </div>
              </>
            )}
            
            {/* Refund Order Modal */}
            {actionModal.type === 'refund' && (
              <>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Process Refund</h3>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Process refund for order {actionModal.orderId}:
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2">Refund Amount</label>
                    <input
                      type="number"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900"
                      placeholder="Enter refund amount"
                    />
                  </div>
                </div>
              </>
            )}
            
            {/* Modal Actions */}
            {actionModal.type !== 'view' && (
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setActionModal({ type: null, orderId: null }); setActionError(""); }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction}
                  disabled={loading || 
                    (actionModal.type === 'reassign' && !reassignVendor) ||
                    (actionModal.type === 'cancel' && !cancelReason.trim()) ||
                    (actionModal.type === 'refund' && !refundAmount)
                  }
                  className="flex-1 px-4 py-2 text-white font-bold rounded-xl transition disabled:opacity-60"
                  style={{ 
                    backgroundColor: actionModal.type === 'cancel' ? ADMIN_COLORS.error : ADMIN_COLORS.primary 
                  }}
                >
                  {loading ? "Processing..." : 
                   actionModal.type === 'reassign' ? "Reassign Order" :
                   actionModal.type === 'cancel' ? "Cancel Order" : "Process Refund"}
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

export default OrderListPage;
