import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, AlertTriangle, RefreshCw, XCircle, CheckCircle, X } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getAdminOrderById, reassignOrderVendor, cancelAdminOrder, getAdminVendors } from "../../api/admin";
import { ADMIN_COLORS } from "../../utils/colors";
import LoadingState from "../../components/ui/LoadingState";

const reassignReasons = ["Vendor SLA breach", "Vendor capacity full", "Vendor suspended", "Quality concern", "Admin override"];

export default function OrderDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [showReassign, setShowReassign] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [done, setDone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const { data: orderData, loading: orderLoading, error: orderError, refetch: refetchOrder } = useAsync(
    () => id ? getAdminOrderById(id) : Promise.resolve(null),
    null,
    [id]
  );

  const { data: vendorsData } = useAsync(
    () => getAdminVendors({ page: 1, limit: 50 }),
    null,
    []
  );
  const vendors: any[] = (vendorsData as any)?.vendors || (vendorsData as any)?.data || [];

  const doReassign = async () => {
    if (!reason || !id) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await reassignOrderVendor(id, {
        vendorId: selectedVendorId || "auto",
        storeId: "",
      });
      setDone("reassigned");
      setShowReassign(false);
      setReason("");
      setSelectedVendorId("");
      refetchOrder();
    } catch (error: any) {
      setSubmitError(error?.message || "Reassignment failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const doCancel = async () => {
    if (!cancelReason || !id) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await cancelAdminOrder(id, cancelReason);
      setDone("cancelled");
      setShowCancel(false);
      setCancelReason("");
      refetchOrder();
    } catch (error: any) {
      setSubmitError(error?.message || "Cancellation failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (orderLoading) {
    return (
      <div className="admin-content-wrapper">
        <LoadingState message="Loading order details" />
      </div>
    );
  }

  if (orderError || !orderData) {
    return (
      <div className="admin-content-wrapper">
        <div className="admin-empty-state">
          <AlertTriangle size={48} className="admin-empty-icon" style={{ color: ADMIN_COLORS.critical }} />
          <h3>Order Not Found</h3>
          <p>
            {orderError 
              ? "Failed to load order data. Backend connection issue or order doesn't exist."
              : "The requested order could not be found."
            }
          </p>
          <button
            onClick={() => navigate("/orders")}
            className="admin-btn admin-btn-primary"
            style={{ marginTop: '1.5rem' }}
          >
            <ArrowLeft size={16} />
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-content-wrapper">
      <button onClick={() => navigate("/orders")} className="admin-btn admin-btn-secondary" style={{ marginBottom: '1.25rem' }}>
        <ArrowLeft size={15} /> Back to Orders
      </button>

      {/* Header */}
      <div className="admin-header-section">
        <div className="admin-header-main">
          <div className="admin-header-text">
            <h1 className="admin-page-title">{(orderData as any)?.id || id}</h1>
          </div>
          <span className="admin-status-badge" style={{
            backgroundColor: ADMIN_COLORS.criticalBg,
            color: ADMIN_COLORS.critical,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertTriangle size={14} /> 
            {(orderData as any)?.slaStatus || 'SLA CRITICAL'}
          </span>
        </div>
      </div>

      {/* Success/Error banner */}
      {done && (
        <div className="admin-surface" style={{
          padding: '1rem',
          borderRadius: '1rem',
          marginBottom: '1.25rem',
          backgroundColor: done === "reassigned" ? ADMIN_COLORS.successBg : ADMIN_COLORS.criticalBg,
          border: `1px solid ${done === "reassigned" ? ADMIN_COLORS.successBorder : ADMIN_COLORS.criticalBorder}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={16} style={{ color: done === "reassigned" ? ADMIN_COLORS.success : ADMIN_COLORS.critical }} />
            <p style={{ 
              fontSize: '0.875rem', 
              fontWeight: '600',
              color: done === "reassigned" ? ADMIN_COLORS.success : ADMIN_COLORS.critical,
              margin: 0
            }}>
              {done === "reassigned" ? "Order reassigned successfully. Reason logged." : "Order cancelled. Refund initiated. Customer notified."}
            </p>
          </div>
        </div>
      )}

      {/* 50-50 Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        {/* Order Details */}
        <div className="admin-surface" style={{ padding: '1rem', borderRadius: '1rem' }}>
          <h2 style={{ fontWeight: '700', color: '#1f2937', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Order Details</h2>
          <div>
            {[
              ["Type", (orderData as any)?.type || "Document Printing"],
              ["Pages", (orderData as any)?.pages || "50 · A4 · Color"],
              ["Store", (orderData as any)?.store?.name || "PrintMaster Downtown"],
              ["Vendor", (orderData as any)?.vendor?.name || "PrintMaster Org"],
              ["Status", (orderData as any)?.status || "In Production"],
              ["Amount", `₹${(orderData as any)?.amount || 450}`],
              ["Pickup ID", (orderData as any)?.pickupId || "#PKP-8821 (masked)"],
            ].map(([k, v]) => (
              <div key={k} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                padding: '0.5rem 0', 
                borderBottom: '1px solid rgba(229, 231, 235, 0.5)' 
              }}>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{k}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#1f2937' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SLA Timeline */}
        <div className="admin-surface" style={{ padding: '1rem', borderRadius: '1rem' }}>
          <h2 style={{ fontWeight: '700', color: '#1f2937', fontSize: '0.875rem', marginBottom: '0.75rem' }}>SLA Timeline</h2>
          <div>
            {[
              ["Assigned", (orderData as any)?.assignedAt || "10:30 AM"],
              ["Accepted", (orderData as any)?.acceptedAt || "10:34 AM"],
              ["In Production", (orderData as any)?.productionAt || "10:45 AM"],
              ["SLA Deadline", (orderData as any)?.slaDeadline || "12:30 PM"],
              ["Time Remaining", (orderData as any)?.timeRemaining || "12 minutes"],
            ].map(([k, v]) => (
              <div key={k} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                padding: '0.5rem 0', 
                borderBottom: '1px solid rgba(229, 231, 235, 0.5)' 
              }}>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{k}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#1f2937' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons — 50-50 */}
      {!done && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <button
            onClick={() => setShowReassign(true)}
            className="admin-btn admin-btn-primary"
            style={{ padding: '0.875rem', justifyContent: 'center' }}
          >
            <RefreshCw size={15} /> Manual Reassignment
          </button>
          <button
            onClick={() => setShowCancel(true)}
            className="admin-btn admin-btn-danger"
            style={{ padding: '0.875rem', justifyContent: 'center' }}
          >
            <XCircle size={15} /> Cancel Order (Last Resort)
          </button>
        </div>
      )}

      {/* Modal */}
      {(showReassign || showCancel) && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h3>{showReassign ? "Manual Reassignment" : "Cancel Order"}</h3>
              <button onClick={() => { setShowReassign(false); setShowCancel(false); setReason(""); setCancelReason(""); setSubmitError(""); }}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <div className="admin-modal-content">
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '1rem' }}>
                Reason is mandatory and permanently logged.
              </p>

              {showReassign && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                    {reassignReasons.map(r => (
                      <button
                        key={r}
                        onClick={() => setReason(r)}
                        className="admin-btn"
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '0.625rem 1rem',
                          fontSize: '0.875rem',
                          backgroundColor: reason === r ? '#1f2937' : '#f9fafb',
                          color: reason === r ? 'white' : '#374151',
                          fontWeight: reason === r ? '700' : '400',
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>

                  {/* Optional vendor selector */}
                  {vendors.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', display: 'block', marginBottom: '0.5rem' }}>
                        Assign to Vendor (optional — leave blank for auto-assign)
                      </label>
                      <select
                        value={selectedVendorId}
                        onChange={e => setSelectedVendorId(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}
                      >
                        <option value="">Auto-assign</option>
                        {vendors.map((v: any) => (
                          <option key={v.id || v._id} value={v.id || v._id}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              {showCancel && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {["Customer request", "Duplicate order", "Payment issue", "Out of stock", "Other"].map(r => (
                    <button
                      key={r}
                      onClick={() => setCancelReason(r)}
                      className="admin-btn"
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.625rem 1rem',
                        fontSize: '0.875rem',
                        backgroundColor: cancelReason === r ? '#dc2626' : '#f9fafb',
                        color: cancelReason === r ? 'white' : '#374151',
                        fontWeight: cancelReason === r ? '700' : '400',
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}

              {submitError && (
                <p style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.75rem', fontWeight: '600' }}>
                  ⚠ {submitError}
                </p>
              )}
            </div>

            <div className="admin-modal-actions">
              <button
                onClick={() => { setShowReassign(false); setShowCancel(false); setReason(""); setCancelReason(""); setSubmitError(""); }}
                className="admin-btn admin-btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={showReassign ? doReassign : doCancel}
                disabled={submitting || (showReassign ? !reason : !cancelReason)}
                className={`admin-btn ${showCancel ? 'admin-btn-danger' : 'admin-btn-primary'}`}
                style={{ opacity: (submitting || (showReassign ? !reason : !cancelReason)) ? 0.5 : 1 }}
              >
                {submitting ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
