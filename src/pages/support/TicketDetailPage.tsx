import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Send, MessageSquare, X, CheckCircle,
  Users, Zap, Clock, Tag, User, AlertTriangle
} from "lucide-react";
import { ADMIN_COLORS, getStatusColor } from "../../utils/colors";
import { useAsync } from "../../hooks/useAsync";
import {
  getTicketDetail, addTicketMessage, resolveTicket,
  assignTicket, escalateTicket, getAdminStaff
} from "../../api/admin";
import LoadingState from "../../components/ui/LoadingState";

export default function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();

  const [messageText, setMessageText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolution, setResolution] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTo, setAssignTo] = useState("");
  const [assigning, setAssigning] = useState(false);

  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateMsg, setEscalateMsg] = useState("");
  const [escalating, setEscalating] = useState(false);

  // API 2: GET /admin/tickets/:ticketId
  const { data: ticketData, loading, refetch } = useAsync(
    () => (ticketId ? getTicketDetail(ticketId) : Promise.resolve(null)),
    null,
    [ticketId]
  );

  const { data: staffData } = useAsync(() => getAdminStaff(), {}, []);

  const ticket = (ticketData as any)?.ticket || ticketData;
  const staff: any[] = (staffData as any)?.staff || [];
  const replies: any[] = ticket?.replies || [];

  // API 6: POST /admin/tickets/:id/messages
  const handleSendMessage = async () => {
    if (!messageText.trim() || !ticketId) return;
    setSendingMsg(true);
    try {
      await addTicketMessage(ticketId, messageText);
      setMessageText("");
      refetch();
    } catch {
      alert("Failed to send message");
    } finally {
      setSendingMsg(false);
    }
  };

  // API 5: PATCH /admin/tickets/:id/resolve
  const handleResolve = async () => {
    if (!ticketId || !resolution) return;
    setResolving(true);
    try {
      await resolveTicket(ticketId, resolution, resolutionNotes);
      setShowResolveModal(false);
      refetch();
    } catch {
      alert("Failed to resolve ticket");
    } finally {
      setResolving(false);
    }
  };

  // API 3: PATCH /admin/tickets/:id/assign
  const handleAssign = async () => {
    if (!ticketId || !assignTo) return;
    setAssigning(true);
    try {
      await assignTicket(ticketId, assignTo);
      setShowAssignModal(false);
      refetch();
    } catch {
      alert("Failed to assign ticket");
    } finally {
      setAssigning(false);
    }
  };

  // API 4: PATCH /admin/tickets/:id/escalate
  const handleEscalate = async () => {
    if (!ticketId) return;
    setEscalating(true);
    try {
      await escalateTicket(ticketId, escalateMsg || "Escalated by admin");
      setShowEscalateModal(false);
      refetch();
    } catch {
      alert("Failed to escalate ticket");
    } finally {
      setEscalating(false);
    }
  };

  if (loading || !ticket) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingState message="Loading ticket details" />
      </div>
    );
  }

  const sc = getStatusColor(ticket.status);
  const pc =
    ticket.priority === "critical" ? { color: ADMIN_COLORS.critical, bg: ADMIN_COLORS.criticalBg }
    : ticket.priority === "urgent" ? { color: ADMIN_COLORS.critical, bg: ADMIN_COLORS.criticalBg }
    : ticket.priority === "high" ? { color: ADMIN_COLORS.error, bg: ADMIN_COLORS.errorBg }
    : ticket.priority === "medium" ? { color: ADMIN_COLORS.warning, bg: ADMIN_COLORS.warningBg }
    : { color: ADMIN_COLORS.info, bg: ADMIN_COLORS.infoBg };

  const isResolved = ticket.status === "resolved" || ticket.status === "closed";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/support")} className="p-2 hover:bg-gray-100 rounded-xl transition">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black text-gray-900 truncate">{ticket.subject}</h1>
          <p className="text-xs text-gray-400 mt-0.5 font-mono">ID: {ticket._id}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs px-2.5 py-1 rounded-full font-bold capitalize" style={{ backgroundColor: pc.bg, color: pc.color }}>
            {ticket.priority}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full font-bold border capitalize" style={{ backgroundColor: sc.bg, color: sc.text, borderColor: sc.border }}>
            {ticket.status?.replace("_", " ")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">

        {/* Left: info + messages */}
        <div className="col-span-2 space-y-5">

          {/* Ticket Info */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Ticket Information</h2>
            <div className="grid grid-cols-2 gap-5">
              <div className="flex items-start gap-3">
                <User size={16} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Customer</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, #6d5dfc 0%, #5b4df7 100%)',
                      }}
                    >
                      {(ticket as any)?.customerImage || (ticket as any)?.profileImage || (ticket as any)?.avatar ? (
                        <img
                          src={(ticket as any)?.customerImage || (ticket as any)?.profileImage || (ticket as any)?.avatar}
                          alt="Customer"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        (ticket.userId || 'C').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{ticket.userId || "—"}</p>
                      <p className="text-xs text-gray-500">{ticket.email || ""}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Tag size={16} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Category</p>
                  <p className="text-sm font-bold text-gray-900 capitalize">{ticket.category || "General"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock size={16} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Created</p>
                  <p className="text-sm font-bold text-gray-900">
                    {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users size={16} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Assigned To</p>
                  <p className="text-sm font-bold text-gray-900">{ticket.assignedTo || "Unassigned"}</p>
                </div>
              </div>
            </div>

            {ticket.description && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Description</p>
                <p className="text-sm text-gray-700 leading-relaxed">{ticket.description}</p>
              </div>
            )}
          </div>

          {/* Messages — API 6 */}
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <MessageSquare size={16} className="text-gray-500" />
              <span className="text-sm font-bold text-gray-700">Messages ({replies.length})</span>
            </div>

            <div className="p-5 space-y-3 max-h-[420px] overflow-y-auto">
              {replies.length > 0 ? (
                replies.map((msg: any, idx: number) => {
                  const isAdmin = msg.authorRole === "admin" || msg.authorRole === "staff";
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border ${isAdmin ? "border-blue-100" : "border-gray-100"}`}
                      style={{ backgroundColor: isAdmin ? ADMIN_COLORS.infoBg : "#F9FAFB" }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: isAdmin ? ADMIN_COLORS.info : ADMIN_COLORS.primary }}
                          >
                            {isAdmin ? "A" : "C"}
                          </div>
                          <p className="text-xs font-bold text-gray-700">{msg.authorId || (isAdmin ? "Admin" : "Customer")}</p>
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold capitalize" style={{ backgroundColor: isAdmin ? ADMIN_COLORS.infoBg : "#E5E7EB", color: isAdmin ? ADMIN_COLORS.info : "#6B7280" }}>
                            {msg.authorRole || "user"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">{msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ""}</p>
                      </div>
                      <p className="text-sm text-gray-700">{msg.message}</p>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10">
                  <MessageSquare size={32} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No messages yet</p>
                </div>
              )}
            </div>

            {/* Message input */}
            {!isResolved && (
              <div className="p-5 border-t border-gray-100 bg-gray-50">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your reply..."
                  className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition text-sm resize-none"
                  rows={3}
                />
                <div className="flex justify-end mt-3">
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || sendingMsg}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-white font-bold transition disabled:opacity-50 text-sm"
                    style={{ backgroundColor: ADMIN_COLORS.primary }}
                  >
                    <Send size={14} />
                    {sendingMsg ? "Sending..." : "Send Reply"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: actions + timeline */}
        <div className="space-y-4">

          {/* Actions */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Actions</h3>
            <div className="space-y-2.5">
              <button
                onClick={() => setShowAssignModal(true)}
                className="w-full flex items-center gap-2 justify-center px-4 py-2.5 rounded-xl text-white font-bold transition text-sm"
                style={{ backgroundColor: ADMIN_COLORS.info }}
              >
                <Users size={14} /> Assign Ticket
              </button>

              {!isResolved && (
                <>
                  <button
                    onClick={() => setShowEscalateModal(true)}
                    className="w-full flex items-center gap-2 justify-center px-4 py-2.5 rounded-xl text-white font-bold transition text-sm"
                    style={{ backgroundColor: ADMIN_COLORS.error }}
                  >
                    <Zap size={14} /> Escalate
                  </button>

                  <button
                    onClick={() => setShowResolveModal(true)}
                    className="w-full flex items-center gap-2 justify-center px-4 py-2.5 rounded-xl text-white font-bold transition text-sm"
                    style={{ backgroundColor: ADMIN_COLORS.success }}
                  >
                    <CheckCircle size={14} /> Resolve Ticket
                  </button>
                </>
              )}

              {isResolved && (
                <div className="p-3 rounded-xl text-center" style={{ backgroundColor: ADMIN_COLORS.successBg }}>
                  <CheckCircle size={16} className="mx-auto mb-1" style={{ color: ADMIN_COLORS.success }} />
                  <p className="text-xs font-bold" style={{ color: ADMIN_COLORS.success }}>Ticket Resolved</p>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Timeline</h3>
            <div className="space-y-4">
              <TimelineItem color={ADMIN_COLORS.primary} label="Created" value={ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : "—"} />
              {ticket.assignedTo && (
                <TimelineItem color={ADMIN_COLORS.info} label="Assigned" value={`To: ${ticket.assignedTo}`} />
              )}
              {ticket.priority === "urgent" && (
                <TimelineItem color={ADMIN_COLORS.error} label="Escalated" value="Marked as Urgent" />
              )}
              {ticket.resolvedAt && (
                <TimelineItem color={ADMIN_COLORS.success} label="Resolved" value={new Date(ticket.resolvedAt).toLocaleString()} />
              )}
            </div>
          </div>

          {/* Order reference */}
          {ticket.orderId && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Related Order</h3>
              <button
                onClick={() => navigate(`/orders/${ticket.orderId}`)}
                className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-gray-900 transition"
              >
                <p className="text-xs text-gray-500">Order ID</p>
                <p className="text-sm font-bold text-gray-900 font-mono">{ticket.orderId}</p>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Resolve Modal — API 5 */}
      {showResolveModal && (
        <Modal title="Resolve Ticket" onClose={() => setShowResolveModal(false)}>
          <div className="p-3 rounded-xl border mb-4" style={{ backgroundColor: ADMIN_COLORS.successBg, borderColor: ADMIN_COLORS.successBorder }}>
            <p className="text-xs font-bold" style={{ color: ADMIN_COLORS.success }}>Ticket will be marked as resolved</p>
          </div>
          <div className="space-y-4 mb-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Resolution Type</label>
              <select value={resolution} onChange={(e) => setResolution(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition text-sm">
                <option value="">Select resolution...</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
                <option value="duplicate">Duplicate</option>
                <option value="invalid">Invalid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Resolution Notes</label>
              <textarea value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} placeholder="Describe how this was resolved..." className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition text-sm" rows={3} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowResolveModal(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition">Cancel</button>
            <button onClick={handleResolve} disabled={!resolution || resolving} className="flex-1 px-4 py-2 text-white font-bold rounded-xl transition disabled:opacity-50" style={{ backgroundColor: ADMIN_COLORS.success }}>
              {resolving ? "Resolving..." : "Resolve"}
            </button>
          </div>
        </Modal>
      )}

      {/* Assign Modal — API 3 */}
      {showAssignModal && (
        <Modal title="Assign Ticket" onClose={() => setShowAssignModal(false)}>
          <div className="mb-5">
            <label className="block text-sm font-bold text-gray-700 mb-2">Assign To</label>
            <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition text-sm">
              <option value="">Select staff member...</option>
              {staff.map((s: any) => (
                <option key={s._id || s.id} value={s._id || s.id}>{s.name || s.email}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAssignModal(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition">Cancel</button>
            <button onClick={handleAssign} disabled={!assignTo || assigning} className="flex-1 px-4 py-2 text-white font-bold rounded-xl transition disabled:opacity-50" style={{ backgroundColor: ADMIN_COLORS.info }}>
              {assigning ? "Assigning..." : "Assign"}
            </button>
          </div>
        </Modal>
      )}

      {/* Escalate Modal — API 4 */}
      {showEscalateModal && (
        <Modal title="Escalate Ticket" onClose={() => setShowEscalateModal(false)}>
          <div className="p-3 rounded-xl border mb-4" style={{ backgroundColor: ADMIN_COLORS.warningBg, borderColor: ADMIN_COLORS.warningBorder }}>
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} style={{ color: ADMIN_COLORS.warning }} />
              <p className="text-xs font-bold" style={{ color: ADMIN_COLORS.warning }}>Priority will be set to Urgent</p>
            </div>
          </div>
          <div className="mb-5">
            <label className="block text-sm font-bold text-gray-700 mb-2">Escalation Reason</label>
            <textarea value={escalateMsg} onChange={(e) => setEscalateMsg(e.target.value)} placeholder="Why is this being escalated?" className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition text-sm" rows={3} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowEscalateModal(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition">Cancel</button>
            <button onClick={handleEscalate} disabled={escalating} className="flex-1 px-4 py-2 text-white font-bold rounded-xl transition disabled:opacity-50" style={{ backgroundColor: ADMIN_COLORS.error }}>
              {escalating ? "Escalating..." : "Escalate"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function TimelineItem({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: color }} />
        <div className="w-px flex-1 bg-gray-100 mt-1" />
      </div>
      <div className="pb-3">
        <p className="text-xs font-bold text-gray-500">{label}</p>
        <p className="text-sm text-gray-700">{value}</p>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition">
            <X size={18} className="text-gray-400" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
