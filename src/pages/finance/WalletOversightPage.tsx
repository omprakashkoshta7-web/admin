import { useEffect } from "react";
import { Download, RotateCcw, Store, Wallet, RefreshCw } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getAdminReports, getAdminOrders } from "../../api/admin";
import { ADMIN_COLORS } from "../../utils/colors";
import LoadingState from "../../components/ui/LoadingState";
import AdminMetricCard from "../../components/ui/AdminMetricCard";

export default function WalletOversightPage() {
  const { data, loading, refetch: refetchWallet } = useAsync(() => getAdminReports(), {}, []);
  const { data: allOrdersData, loading: loadingOrders, refetch: refetchOrders } = useAsync(
    () => getAdminOrders({ limit: 100 }),
    {},
    []
  );

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => { refetchWallet(); refetchOrders(); }, 30000);
    return () => clearInterval(interval);
  }, [refetchWallet, refetchOrders]);

  // Derive stats from what the API actually returns
  // revenueByDay: [{ _id: "2024-01-01", revenue: 1000, count: 5 }]
  // ordersByStatus: [{ _id: "delivered", count: 10 }]
  const revenueByDay: any[] = (data as any)?.revenueByDay || [];
  const ordersByStatus: any[] = (data as any)?.ordersByStatus || [];

  // Total revenue = sum of all paid-order revenue from revenueByDay
  const totalRevenue = revenueByDay.reduce((sum: number, d: any) => sum + Number(d.revenue || 0), 0);

  // Total orders = sum of all status counts
  const totalOrders = ordersByStatus.reduce((sum: number, s: any) => sum + Number(s.count || 0), 0);

  // Paid orders = count from revenueByDay (those are already filtered to paymentStatus: 'paid')
  const paidOrders = revenueByDay.reduce((sum: number, d: any) => sum + Number(d.count || 0), 0);

  // Filter orders by paymentStatus: 'paid' for the table
  const allOrders = (allOrdersData as any)?.orders || [];
  const paidOrdersList = allOrders.filter((order: any) => order.paymentStatus === 'paid');

  const exportWallet = () => {
    const csvContent = [
      ['Order ID', 'Customer', 'Vendor', 'Amount', 'Status', 'Date'].join(','),
      ...paidOrdersList.map((order: any) => [
        order._id || '',
        order.customerName || order.userName || order.user?.name || order.shippingAddress?.fullName || order.customer?.name || 'Unknown',
        order.vendorName || order.vendor?.name || order.vendor?.businessName || 'No Vendor',
        order.total || 0,
        order.paymentStatus || 'paid',
        order.createdAt ? new Date(order.createdAt).toISOString().split('T')[0] : '',
      ].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallet-oversight-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading || loadingOrders) {
    return (
      <div className="admin-content-wrapper">
        <LoadingState message="Loading finance summary" />
      </div>
    );
  }

  return (
    <div className="admin-content-wrapper">
      {/* Export + Refresh */}
      <div className="flex items-center justify-end gap-2" style={{ marginBottom: "1.5rem" }}>
        <button
          onClick={exportWallet}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold"
        >
          <Download size={14} />
          Export
        </button>
        <button
          onClick={() => { refetchWallet(); refetchOrders(); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4" style={{ marginBottom: "1.5rem" }}>
        <AdminMetricCard
          index={0}
          label="Total Revenue"
          value={`₹${totalRevenue.toLocaleString()}`}
          accent="#334155"
          icon={Wallet}
          note="All orders"
        />
        <AdminMetricCard
          label="Total Orders"
          value={`${totalOrders.toLocaleString()}`}
          accent={ADMIN_COLORS.primary}
          accentBg="#f0f4ff"
          icon={Store}
          note="All orders"
        />
        <AdminMetricCard
          label="Paid Orders"
          value={`${paidOrders.toLocaleString()}`}
          accent={ADMIN_COLORS.success}
          accentBg={ADMIN_COLORS.successBg}
          icon={RotateCcw}
          note="Payment received"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900">Paid Orders</h3>
        <p className="text-sm text-gray-500 mt-1">
          Recent orders with payment received
        </p>

        {paidOrdersList.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-bold text-gray-700">Order ID</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-700">Customer</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-700">Vendor</th>
                  <th className="text-right py-3 px-4 font-bold text-gray-700">Amount</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-700">Date</th>
                </tr>
              </thead>
              <tbody>
                {paidOrdersList.map((order: any) => (
                  <tr key={order._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900 font-mono text-xs">{order._id}</td>
                    <td className="py-3 px-4 text-gray-700">
                      {order.customerName || order.userName || order.user?.name || order.shippingAddress?.fullName || order.customer?.name || <span className="text-gray-400 italic text-xs">Unknown</span>}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {order.vendorName || order.vendor?.name || order.vendor?.businessName || <span className="text-gray-400 italic text-xs">No Vendor</span>}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900 font-bold">₹{Number(order.total || 0).toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: ADMIN_COLORS.successBg, color: ADMIN_COLORS.success }}>
                        {order.paymentStatus || "paid"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 text-center py-8 text-gray-500">
            No paid orders found
          </div>
        )}
      </div>
    </div>
  );
}
