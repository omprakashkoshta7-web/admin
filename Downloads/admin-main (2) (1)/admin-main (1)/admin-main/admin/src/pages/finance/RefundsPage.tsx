import { CheckCircle, DollarSign, Download, RefreshCw, RotateCcw, Search } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useAsync } from "../../hooks/useAsync";
import { getAdminReports, getAdminOrders, processAdminRefund } from "../../api/admin";
import { ADMIN_COLORS } from "../../utils/colors";
import LoadingState from "../../components/ui/LoadingState";
import AdminMetricCard from "../../components/ui/AdminMetricCard";

const emptyForm = { orderId: "", customerId: "", amount: "", reason: "" };

export default function RefundsPage() {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data, loading, refetch } = useAsync(() => getAdminReports(), {}, []);
  const { data: refundedOrders, loading: loadingRefunds, refetch: refetchRefunds } = useAsync(
    () => getAdminOrders({ status: "refunded", limit: 50 }), {}, []
  );
  const { data: recentOrders, loading: loadingRecent } = useAsync(
    () => getAdminOrders({ limit: 100 }), {}, []
  );

  // Build customer name map from all orders (use shippingAddress.fullName keyed by userId)
  const customerNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    const allRaw: any[] = [
      ...((recentOrders as any)?.orders || []),
      ...((refundedOrders as any)?.orders || []),
    ];
    allRaw.forEach((o: any) => {
      const uid = o?.userId || o?.customer?.id || "";
      if (!uid) return;
      const name =
        o?.customerName ||
        o?.userName ||
        o?.user?.name ||
        o?.shippingAddress?.fullName ||
        o?.customer?.name ||
        o?.buyerName ||
        "";
      if (name && !map[uid]) map[uid] = name;
    });
    return map;
  }, [recentOrders, refundedOrders]);

  useEffect(() => {
    const interval = setInterval(() => { refetch(); refetchRefunds(); }, 30000);
    return () => clearInterval(interval);
  }, []);

  const exportRefunds = () => {
    const orders = (refundedOrders as any)?.orders || [];
    const csvContent = [
      ['Order ID', 'Customer', 'Amount', 'Status', 'Date'].join(','),
      ...orders.map((o: any) => [
        o._id || '',
        getCustomerName(o),
        o.total || 0,
        o.status || '',
        o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : '',
      ].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `refunds-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleSubmit = async () => {
    if (!form.orderId || !form.customerId || !form.amount) {
      setErrorMessage("Order ID, customer ID, and amount are required.");
      return;
    }
    if (!/^[0-9a-f]{24}$/i.test(form.orderId)) {
      setErrorMessage("Order ID must be a valid 24-character hex string.");
      return;
    }
    const amount = Number(form.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      setErrorMessage("Enter a valid refund amount.");
      return;
    }
    try {
      setSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");
      await processAdminRefund(form.orderId, { customerId: form.customerId, amount, reason: form.reason || undefined });
      setSuccessMessage("Refund processed successfully.");
      setForm(emptyForm);
      setSelectedOrderId(null);
      refetch();
      refetchRefunds();
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to process refund.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectOrder = (order: any) => {
    const autoReason =
      order.cancellationReason ||
      order.refundReason ||
      order.reason ||
      (order.status === "cancelled" ? "Cancellation" : "") ||
      (order.status === "refunded" ? "Refund" : "") ||
      "";
    setForm({
      orderId: order._id,
      customerId: order.userId || "",
      amount: String(order.total || 0),
      reason: autoReason,
    });
    setSelectedOrderId(order._id);
  };

  const allOrders: any[] = (recentOrders as any)?.orders || [];

  const filteredOrders = allOrders.filter((order: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (order.customerName || order.userName || order.user?.name || "").toLowerCase();
    return (
      order._id?.toLowerCase().includes(q) ||
      order.userId?.toLowerCase().includes(q) ||
      order.status?.toLowerCase().includes(q) ||
      name.includes(q)
    );
  });

  const getCustomerName = (order: any) =>
    order.customerName ||
    order.userName ||
    order.user?.name ||
    order.shippingAddress?.fullName ||
    order.customer?.name ||
    order.shippingAddress?.name ||
    order.buyerName ||
    (order.userId ? customerNameMap[order.userId] : undefined) ||
    "Unknown Customer";

  if (loading || loadingRefunds || loadingRecent) {
    return <div className="admin-content-wrapper"><LoadingState message="Loading refund data" /></div>;
  }

  return (
    <div className="admin-content-wrapper space-y-6">

      {/* Export + Refresh */}
      <div className="flex items-center justify-end gap-2">
        <button onClick={exportRefunds} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold">
          <Download size={14} /> Export
        </button>
        <button onClick={() => { refetch(); refetchRefunds(); }} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold">
          <RefreshCw size={14} className={loadingRefunds ? "animate-spin" : ""} />
          {loadingRefunds ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Stats */}
      <div className="admin-stats-grid">
        <AdminMetricCard index={0} label="Total Revenue" value={`₹${((data as any)?.revenueByDay || []).reduce((s: number, d: any) => s + Number(d.revenue || 0), 0).toLocaleString()}`} accent={ADMIN_COLORS.primary} icon={DollarSign} note="All orders" />
        <AdminMetricCard label="Paid Orders" value={`${((data as any)?.revenueByDay || []).reduce((s: number, d: any) => s + Number(d.count || 0), 0).toLocaleString()}`} accent={ADMIN_COLORS.success} accentBg={ADMIN_COLORS.successBg} icon={CheckCircle} note="Payment received" />
        <AdminMetricCard label="Refunded Orders" value={`${((data as any)?.ordersByStatus || []).find((s: any) => s._id === 'refunded')?.count || 0}`} accent={ADMIN_COLORS.warning} accentBg={ADMIN_COLORS.warningBg} icon={RotateCcw} note="Refund processed" />
      </div>

      {/* Process Refund */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900">Process Refund</h3>
        <p className="text-sm text-gray-500 mt-1 mb-5">Sends refund amount to the customer's wallet.</p>

        {/* Inline Order Table — always visible */}
        <div className="mb-6 rounded-2xl border border-indigo-100 overflow-hidden">
            {/* Search bar */}
            <div className="p-3 bg-indigo-50 border-b border-indigo-100">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Order ID, Customer name, or Status..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              {filteredOrders.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 z-10">
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide">Order ID</th>
                      <th className="text-left py-2.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide">Customer</th>
                      <th className="text-left py-2.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="text-right py-2.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide">Amount</th>
                      <th className="text-left py-2.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide">Date</th>
                      <th className="py-2.5 px-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order: any) => {
                      const isSelected = selectedOrderId === order._id;
                      return (
                        <tr
                          key={order._id}
                          onClick={() => handleSelectOrder(order)}
                          className={`border-b border-gray-50 cursor-pointer transition-all ${
                            isSelected
                              ? "bg-indigo-50 hover:bg-indigo-100"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs text-gray-900 font-bold">{order._id?.slice(-12)}</span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-700">{getCustomerName(order)}</td>
                          <td className="py-3 px-4">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold capitalize">
                              {order.status || "unknown"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-gray-900">
                            ₹{Number(order.total || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-xs text-gray-500">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isSelected ? (
                              <span className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center mx-auto">
                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </span>
                            ) : (
                              <span className="w-6 h-6 rounded-full border-2 border-gray-200 flex items-center justify-center mx-auto" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-10 text-gray-400 text-sm">
                  {searchQuery ? "No orders match your search" : "No recent orders available"}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">{filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}</span>
              {selectedOrderId && (
                <span className="text-xs font-semibold text-indigo-600">
                  ✓ Selected — form auto-filled below
                </span>
              )}
            </div>
          </div>

        {/* Form Fields */}
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Order ID</span>
            <input
              value={form.orderId}
              onChange={(e) => setForm(c => ({ ...c, orderId: e.target.value }))}
              className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition ${
                selectedOrderId && form.orderId ? "border-indigo-300 bg-indigo-50" : "border-gray-200"
              }`}
              placeholder="65bd50c6699d5bb41c50dd"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Customer ID</span>
            <input
              value={form.customerId}
              onChange={(e) => setForm(c => ({ ...c, customerId: e.target.value }))}
              className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition ${
                selectedOrderId && form.customerId ? "border-indigo-300 bg-indigo-50" : "border-gray-200"
              }`}
              placeholder="USER-1001"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Amount</span>
            <input
              type="number" min="0"
              value={form.amount}
              onChange={(e) => setForm(c => ({ ...c, amount: e.target.value }))}
              className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition ${
                selectedOrderId && form.amount ? "border-indigo-300 bg-indigo-50" : "border-gray-200"
              }`}
              placeholder="499"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Reason</span>
            <input
              value={form.reason}
              onChange={(e) => setForm(c => ({ ...c, reason: e.target.value }))}
              className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition ${
                selectedOrderId && form.reason ? "border-indigo-300 bg-indigo-50" : "border-gray-200"
              }`}
              placeholder="Auto-filled from order or type manually"
            />
          </label>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
        )}
        {successMessage && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div>
        )}

        <div className="mt-5 flex items-center justify-end">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60 hover:bg-slate-800 transition"
          >
            <RotateCcw size={14} />
            {submitting ? "Processing..." : "Process Refund"}
          </button>
        </div>
      </div>

      {/* Refunded Orders Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900">Refunded Orders</h3>
        <p className="text-sm text-gray-500 mt-1">Recent orders with refund status</p>

        {(refundedOrders as any)?.orders?.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-bold text-gray-700">Order ID</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-700">Customer</th>
                  <th className="text-right py-3 px-4 font-bold text-gray-700">Amount</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-700">Refund ID</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-700">Date</th>
                </tr>
              </thead>
              <tbody>
                {(refundedOrders as any).orders.map((order: any) => (
                  <tr key={order._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900 font-mono text-xs">{order._id}</td>
                    <td className="py-3 px-4 text-gray-700 font-medium">{getCustomerName(order)}</td>
                    <td className="py-3 px-4 text-right text-gray-900 font-bold">₹{Number(order.total || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-gray-600 font-mono text-xs">{order.refundId || "—"}</td>
                    <td className="py-3 px-4 text-gray-600 text-xs">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 text-center py-8 text-gray-500">No refunded orders found</div>
        )}
      </div>
    </div>
  );
}
