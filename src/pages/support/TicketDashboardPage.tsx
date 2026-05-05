import { useState, useEffect, useMemo } from "react"; 
import { 
  Search, Eye, Clock, AlertTriangle, 
  Users, Activity, MessageSquare, 
  ChevronDown, Zap, CheckCircle, X, Send, 
  BarChart2, TrendingUp, Award, RefreshCw 
} from "lucide-react"; 
import { ADMIN_COLORS, getStatusColor } from "../../utils/colors"; 
import { useAsync } from "../../hooks/useAsync"; 
import { 
  getTickets, getTicketStats, assignTicket, escalateTicket, 
  getAgentPerformance, getAdminStaff, resolveTicket, addTicketMessage, getTicketDetail, 
  getAdminCustomers 
} from "../../api/admin"; 
import LoadingState from "../../components/ui/LoadingState"; 
import AdminMetricCard from "../../components/ui/AdminMetricCard"; 
import AnimatedCount from "../../components/ui/AnimatedCount"; 
 
type Tab = "tickets" | "agents"; 
const API_ROOT = String(import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api").replace(/\/api\/?$/i, ""); 
 
function getAttachmentUrl(attachment: any) { 
  if (!attachment) return ""; 
 
  const raw = 
    typeof attachment === "string" 
      ? attachment 
      : attachment.url || 
        attachment.fileUrl || 
        attachment.secureUrl || 
        attachment.location || 
        attachment.path || 
        attachment.src || 
        attachment.href || 
        ""; 
 
  const value = String(raw || "").trim(); 
  if (!value) return ""; 
  if (/^(https?:|data:|blob:)/i.test(value)) return value; 
  if (value.startsWith("/api/")) return `${API_ROOT}${value.replace(/^\/api/i, "")}`; 
  if (value.startsWith("/")) return `${API_ROOT}${value}`; 
  return `${API_ROOT}/${value}`; 
} 
 
const TicketDashboardPage = () => { 
  const [activeTab, setActiveTab] = useState<Tab>("tickets"); 
  const [searchTerm, setSearchTerm] = useState(""); 
  const [statusFilter, setStatusFilter] = useState<string>("all"); 
  const [priorityFilter, setPriorityFilter] = useState<string>("all"); 
  const [takeoverModal, setTakeoverModal] = useState<string | null>(null); 
  const [escalateModal, setEscalateModal] = useState<string | null>(null); 
  const [escalateMessage, setEscalateMessage] = useState(""); 
  const [selectedStaffId, setSelectedStaffId] = useState<string>(""); 
  const [actionLoading, setActionLoading] = useState(false); 
  const [resolveModal, setResolveModal] = useState<string | null>(null); 
  const [resolveText, setResolveText] = useState(""); 
  const [messageModal, setMessageModal] = useState<string | null>(null); 
  const [messageText, setMessageText] = useState(""); 
  const [detailModal, setDetailModal] = useState<any>(null); 
 
  // API 1: GET /tickets — list all tickets 
  const { data: ticketsData, loading: ticketsLoading, refetch: refetchTickets } = useAsync( 
    () => getTickets({ page: 1, limit: 100 }), 
    {}, 
    [] 
  ); 
 
  // API 7: GET /admin/tickets/stats — summary stats 
  const { data: statsData, loading: statsLoading, refetch: refetchStats } = useAsync( 
    () => getTicketStats(), 
    {}, 
    [] 
  ); 
 
  // API 8: GET /admin/tickets/agents/performance — agent performance 
  const { data: agentData, loading: agentLoading, refetch: refetchAgents } = useAsync( 
    () => getAgentPerformance(), 
    {}, 
    [] 
  ); 
 
  // Staff list for assign dropdown 
  const { data: staffData } = useAsync(() => getAdminStaff(), {}, []); 
 
  // Customers list for name lookup 
  const { data: customersData } = useAsync(() => getAdminCustomers({ limit: 500 }), {}, []); 
 
  const tickets: any[] = (ticketsData as any)?.tickets || []; 
  const staff: any[] = (staffData as any)?.staff || []; 
  const agents: any[] = (agentData as any)?.agents || []; 
 
  // Build userId → name map from customers list 
  const customerNameMap = useMemo(() => { 
    const map: Record<string, string> = {}; 
    const list: any[] = (customersData as any)?.customers || (customersData as any)?.users || []; 
    list.forEach((c: any) => { 
      const id = c._id || c.id || c.userId; 
      const name = c.name || c.fullName || c.displayName || c.email?.split("@")[0]; 
      if (id && name) map[String(id)] = name; 
    }); 
    return map; 
  }, [customersData]); 
 
  // Helper: get display name for a ticket's customer 
  const getCustomerDisplay = (ticket: any) => { 
    const name = 
      ticket.userName || 
      ticket.customerName || 
      ticket.user?.name || 
      ticket.name || 
      (ticket.userId ? customerNameMap[String(ticket.userId)] : null) || 
      ticket.email?.split("@")[0]; 
    return name || null; 
  }; 
 
  // Auto-refresh every 30 seconds 
  useEffect(() => { 
    const interval = setInterval(() => { 
      refetchTickets(); 
      refetchStats(); 
      refetchAgents(); 
    }, 30000); 
    return () => clearInterval(interval); 
  }, []); 
 
  const stats = (statsData as any) || {}; 
  const byStatus = stats.byStatus || {}; 
  const resolution = stats.resolution || {}; 
 
  const openCount = byStatus.open || 0; 
  const inProgressCount = byStatus.in_progress || 0; 
  const resolvedCount = (byStatus.resolved || 0) + (byStatus.closed || 0); 
  const avgHours = resolution.avgHours || 0; 
 
  // Real-time urgent count: only tickets that are urgent AND not resolved/closed 
  const urgentCount = tickets.filter( 
    (t: any) => t.priority === "urgent" && t.status !== "resolved" && t.status !== "closed" 
  ).length; 
 
  const filteredTickets = tickets.filter((t: any) => { 
    const matchSearch = 
      t._id?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.subject?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.userId?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (getCustomerDisplay(t) || "").toLowerCase().includes(searchTerm.toLowerCase()); 
    const matchStatus = statusFilter === "all" || t.status === statusFilter; 
    const matchPriority = priorityFilter === "all" || t.priority === priorityFilter; 
    return matchSearch && matchStatus && matchPriority; 
  }); 
 
  const getPriorityStyle = (priority: string) => { 
    switch (priority) { 
      case "critical": return { color: ADMIN_COLORS.critical, bg: ADMIN_COLORS.criticalBg }; 
      case "high": return { color: ADMIN_COLORS.error, bg: ADMIN_COLORS.errorBg }; 
      case "medium": return { color: ADMIN_COLORS.warning, bg: ADMIN_COLORS.warningBg }; 
      default: return { color: ADMIN_COLORS.info, bg: ADMIN_COLORS.infoBg }; 
    } 
  }; 
 
  // API 3: PATCH /admin/tickets/:id/assign 
  const handleAssign = async (ticketId: string) => { 
    if (!selectedStaffId) { alert("Please select a staff member"); return; } 
    setActionLoading(true); 
    try { 
      await assignTicket(ticketId, selectedStaffId); 
      refetchTickets(); 
      setTakeoverModal(null); 
      setSelectedStaffId(""); 
    } catch { 
      alert("Failed to assign ticket"); 
    } finally { 
      setActionLoading(false); 
    } 
  }; 
 
  // API 4: PATCH /admin/tickets/:id/escalate 
  const handleEscalate = async (ticketId: string) => { 
    setActionLoading(true); 
    try { 
      await escalateTicket(ticketId, escalateMessage || "Escalated by admin"); 
      refetchTickets(); 
      setEscalateModal(null); 
      setEscalateMessage(""); 
    } catch { 
      alert("Failed to escalate ticket"); 
    } finally { 
      setActionLoading(false); 
    } 
  }; 
 
  // API 5: PATCH /admin/tickets/:id/resolve 
  const handleResolve = async (ticketId: string) => { 
    setActionLoading(true); 
    try { 
      await resolveTicket(ticketId, resolveText || "Resolved by admin"); 
      refetchTickets(); refetchStats(); 
      setResolveModal(null); 
      setResolveText(""); 
    } catch { alert("Failed to resolve ticket"); } 
    finally { setActionLoading(false); } 
  }; 
 
  // API 6: POST /admin/tickets/:id/messages 
  const handleSendMessage = async (ticketId: string) => { 
    if (!messageText.trim()) return; 
    setActionLoading(true); 
    try { 
      await addTicketMessage(ticketId, messageText); 
      refetchTickets(); 
      setMessageModal(null); 
      setMessageText(""); 
    } catch { alert("Failed to send message"); } 
    finally { setActionLoading(false); } 
  }; 
 
  // API 2: GET /admin/tickets/:id 
  const handleViewDetail = async (ticketId: string) => { 
    try { 
      const data = await getTicketDetail(ticketId); 
      setDetailModal(data); 
    } catch { alert("Failed to load ticket details"); } 
  }; 
 
  const handleRefreshAll = () => { 
    refetchTickets(); 
    refetchStats(); 
    refetchAgents(); 
  }; 
 
  const isLoading = ticketsLoading || statsLoading; 
 
  if (isLoading) { 
    return ( 
      <div className="flex items-center justify-center h-64"> 
        <LoadingState message="Loading support tickets" /> 
      </div> 
    ); 
  } 
 
  return ( 
    <div className="space-y-6"> 
 
      {/* Urgent alert banner */} 
      {urgentCount > 0 && ( 
        <div 
          className="p-4 rounded-2xl border-2 flex items-center gap-3" 
          style={{ backgroundColor: ADMIN_COLORS.criticalBg, borderColor: ADMIN_COLORS.critical }} 
        > 
          <AlertTriangle size={20} style={{ color: ADMIN_COLORS.critical }} /> 
          <div className="flex-1"> 
            <p className="font-bold" style={{ color: ADMIN_COLORS.critical }}> 
              <AnimatedCount value={urgentCount} /> Urgent Ticket{urgentCount > 1 ? "s" : ""} Need Immediate Attention 
            </p> 
            <p className="text-xs mt-0.5" style={{ color: ADMIN_COLORS.critical }}> 
              These tickets are marked urgent and require admin intervention 
            </p> 
          </div> 
          <button 
            onClick={() => { setActiveTab("tickets"); setPriorityFilter("urgent"); }} 
            className="px-4 py-2 rounded-xl font-bold text-white text-sm" 
            style={{ backgroundColor: ADMIN_COLORS.critical }} 
          > 
            View Urgent 
          </button> 
        </div> 
      )} 
 
      {/* Header */} 
      <div className="flex items-center justify-between"> 
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1"> 
          <button 
            onClick={() => setActiveTab("tickets")} 
            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === "tickets" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`} 
          > 
            <span className="flex items-center gap-2"><MessageSquare size={14} /> Tickets</span> 
          </button> 
          <button 
            onClick={() => setActiveTab("agents")} 
            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === "agents" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`} 
          > 
            <span className="flex items-center gap-2"><BarChart2 size={14} /> Agent Performance</span> 
          </button> 
        </div> 
 
        <button 
          onClick={handleRefreshAll} 
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold" 
        > 
          <RefreshCw size={14} className={ticketsLoading ? "animate-spin" : ""} /> 
          Refresh 
        </button> 
      </div> 
 
      {/* Stats — API 7 data */} 
      <div className="grid grid-cols-5 gap-4"> 
        <AdminMetricCard index={0} label="Open" value={String(openCount)} accent={ADMIN_COLORS.warning} icon={MessageSquare} /> 
        <AdminMetricCard label="In Progress" value={String(inProgressCount)} accent={ADMIN_COLORS.info} accentBg={ADMIN_COLORS.infoBg} icon={Activity} /> 
        <AdminMetricCard label="Resolved" value={String(resolvedCount)} accent={ADMIN_COLORS.success} accentBg={ADMIN_COLORS.successBg} icon={CheckCircle} /> 
        <AdminMetricCard label="Urgent" value={String(urgentCount)} accent={ADMIN_COLORS.critical} accentBg={ADMIN_COLORS.criticalBg} icon={Zap} /> 
        <AdminMetricCard label="Avg Resolution" value={`${avgHours}h`} accent={ADMIN_COLORS.success} accentBg={ADMIN_COLORS.successBg} icon={Clock} /> 
      </div> 
 
      {/* ── TICKETS TAB ── */} 
      {activeTab === "tickets" && ( 
        <> 
          {/* Filters */} 
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"> 
            <div className="flex items-center gap-4 flex-wrap"> 
              <div className="relative flex-1 min-w-[260px]"> 
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /> 
                <input 
                  type="text" 
                  placeholder="Search by ID, subject, customer..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition text-sm" 
                /> 
              </div> 
 
              <div className="relative"> 
                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)} 
                  className="appearance-none px-4 py-2.5 pr-8 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition text-sm font-semibold" 
                > 
                  <option value="all">All Status</option> 
                  <option value="open">Open</option> 
                  <option value="in_progress">In Progress</option> 
                  <option value="resolved">Resolved</option> 
                  <option value="closed">Closed</option> 
                </select> 
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" /> 
              </div> 
 
              <div className="relative"> 
                <select 
                  value={priorityFilter} 
                  onChange={(e) => setPriorityFilter(e.target.value)} 
                  className="appearance-none px-4 py-2.5 pr-8 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition text-sm font-semibold" 
                > 
                  <option value="all">All Priorities</option> 
                  <option value="urgent">Urgent</option> 
                  <option value="critical">Critical</option> 
                  <option value="high">High</option> 
                  <option value="medium">Medium</option> 
                  <option value="low">Low</option> 
                </select> 
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" /> 
              </div> 
 
              <span className="text-sm text-gray-500 font-semibold ml-auto"> 
                {filteredTickets.length} ticket{filteredTickets.length !== 1 ? "s" : ""} 
              </span> 
            </div> 
          </div> 
 
          {/* Tickets Table — APIs 1, 3, 4 */} 
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm"> 
            {filteredTickets.length > 0 ? ( 
              <div className="overflow-x-auto"> 
                <table className="w-full min-w-[900px]"> 
                  <thead> 
                    <tr className="border-b border-gray-100 bg-gray-50"> 
                      {["Ticket", "Customer", "Category", "Priority", "Status", "Assigned To", "Created", "Actions"].map((h) => ( 
                        <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide p-4">{h}</th> 
                      ))} 
                    </tr> 
                  </thead> 
                  <tbody> 
                    {filteredTickets.map((ticket: any) => { 
                      const sc = getStatusColor(ticket.status); 
                      const pc = getPriorityStyle(ticket.priority); 
                      return ( 
                        <tr key={ticket._id} className="border-b border-gray-50 hover:bg-gray-50 transition"> 
                          <td className="p-4"> 
                            <p className="text-xs font-mono text-gray-400">{String(ticket._id).slice(-8)}</p> 
                            <p className="text-sm font-bold text-gray-900 mt-0.5 max-w-[180px] truncate">{ticket.subject}</p> 
                            <p className="text-xs text-gray-400 mt-0.5">{ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : "—"}</p> 
                          </td> 
 
                          <td className="p-4"> 
                            <p className="text-sm font-semibold text-gray-900 truncate max-w-[120px]"> 
                              {getCustomerDisplay(ticket) || ( 
                                <span className="text-gray-400 font-mono text-xs"> 
                                  {String(ticket.userId || "—").slice(-8)} 
                                </span> 
                              )} 
                            </p> 
                            <p className="text-xs text-gray-500 truncate max-w-[120px]">{ticket.email || ""}</p> 
                          </td> 
 
                          <td className="p-4"> 
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-semibold capitalize"> 
                              {ticket.category || "General"} 
                            </span> 
                          </td> 
 
                          <td className="p-4"> 
                            <span className="text-xs px-2 py-1 rounded-full font-semibold capitalize" style={{ backgroundColor: pc.bg, color: pc.color }}> 
                              {ticket.priority || "low"} 
                            </span> 
                          </td> 
 
                          <td className="p-4"> 
                            <span className="text-xs px-2 py-1 rounded-full font-semibold border capitalize" style={{ backgroundColor: sc.bg, color: sc.text, borderColor: sc.border }}> 
                              {ticket.status?.replace("_", " ") || "open"} 
                            </span> 
                          </td> 
 
                          <td className="p-4"> 
                            {ticket.assignedTo ? ( 
                              <p className="text-xs text-gray-600"> 
                                {staff.find((s: any) => (s._id || s.id) === ticket.assignedTo)?.name || 
                                 staff.find((s: any) => (s._id || s.id) === ticket.assignedTo)?.email || 
                                 ticket.assignedToName || ticket.agentName || 
                                 String(ticket.assignedTo).slice(-8)} 
                              </p> 
                            ) : ( 
                              <p className="text-xs text-gray-400 italic">Unassigned</p> 
                            )} 
                          </td> 
 
                          <td className="p-4"> 
                            <p className="text-xs text-gray-500">{ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : "—"}</p> 
                          </td> 
 
                          <td className="p-4"> 
                            <div className="flex items-center gap-1"> 
                              {/* API 2: view detail */} 
                              <button 
                                onClick={() => handleViewDetail(ticket._id)} 
                                className="p-1.5 rounded-lg hover:bg-gray-100 transition" 
                                title="View Details" 
                              > 
                                <Eye size={14} className="text-gray-500" /> 
                              </button> 
 
                              {/* API 3: assign */} 
                              <button 
                                onClick={() => setTakeoverModal(ticket._id)} 
                                className="p-1.5 rounded-lg hover:bg-blue-50 transition" 
                                title="Assign Ticket" 
                              > 
                                <Users size={14} style={{ color: ADMIN_COLORS.info }} /> 
                              </button> 
 
                              {/* API 6: message */} 
                              <button 
                                onClick={() => setMessageModal(ticket._id)} 
                                className="p-1.5 rounded-lg hover:bg-purple-50 transition" 
                                title="Send Message" 
                              > 
                                <MessageSquare size={14} style={{ color: "#8b5cf6" }} /> 
                              </button> 
 
                              {/* API 5: resolve */} 
                              {ticket.status !== "resolved" && ticket.status !== "closed" && ( 
                                <button 
                                  onClick={() => setResolveModal(ticket._id)} 
                                  className="p-1.5 rounded-lg hover:bg-green-50 transition" 
                                  title="Resolve Ticket" 
                                > 
                                  <CheckCircle size={14} style={{ color: ADMIN_COLORS.success }} /> 
                                </button> 
                              )} 
 
                              {/* API 4: escalate */} 
                              {ticket.priority !== "urgent" && ( 
                                <button 
                                  onClick={() => setEscalateModal(ticket._id)} 
                                  className="p-1.5 rounded-lg hover:bg-red-50 transition" 
                                  title="Escalate" 
                                > 
                                  <Zap size={14} style={{ color: ADMIN_COLORS.error }} /> 
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
            ) : ( 
              <div className="p-12 text-center"> 
                <MessageSquare size={48} className="text-gray-300 mx-auto mb-4" /> 
                <p className="text-lg font-semibold text-gray-600 mb-2">No tickets found</p> 
                <p className="text-sm text-gray-500"> 
                  {searchTerm || statusFilter !== "all" || priorityFilter !== "all" 
                    ? "Try adjusting your filters." 
                    : "Support tickets will appear here when created."} 
                </p> 
              </div> 
            )} 
          </div> 
        </> 
      )} 
 
      {/* ── AGENT PERFORMANCE TAB — API 8 ── */} 
      {activeTab === "agents" && ( 
        <div className="space-y-4"> 
          {agentLoading ? ( 
            <div className="flex items-center justify-center h-40"> 
              <LoadingState message="Loading agent performance" /> 
            </div> 
          ) : agents.length > 0 ? ( 
            <> 
              {/* Top 3 performers */} 
              <div className="grid grid-cols-3 gap-4"> 
                {agents.slice(0, 3).map((agent: any, i: number) => { 
                  const medalColor = i === 0 ? "#F59E0B" : i === 1 ? "#9CA3AF" : "#CD7F32"; 
                  const medalLabel = i === 0 ? "🥇 Top Agent" : i === 1 ? "🥈 2nd Place" : "🥉 3rd Place"; 
                  const agentName = agent.agentName || agent.name || agent.email || String(agent.agentId || "?"); 
                  const shortId = String(agent.agentId || "").slice(-6); 
                  return ( 
                    <div key={agent.agentId} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"> 
                      {/* Medal badge */} 
                      <div className="flex items-center justify-between mb-4"> 
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: medalColor + "20", color: medalColor }}> 
                          {medalLabel} 
                        </span> 
                        {i === 0 && <Award size={18} style={{ color: medalColor }} />} 
                      </div> 
 
                      {/* Agent info */} 
                      <div className="flex items-center gap-3 mb-4"> 
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0" 
                          style={{ backgroundColor: medalColor }}> 
                          {(agentName || "?").charAt(0).toUpperCase()} 
                        </div> 
                        <div className="min-w-0"> 
                          <p className="text-sm font-bold text-gray-900 truncate">{agentName}</p> 
                          <p className="text-xs text-gray-400 font-mono">#{shortId}</p> 
                        </div> 
                      </div> 
 
                      {/* Stats grid */} 
                      <div className="grid grid-cols-3 gap-2 mb-4"> 
                        {[ 
                          { label: "Assigned", value: agent.totalAssigned, color: "#6b7280" }, 
                          { label: "Resolved", value: agent.resolved, color: ADMIN_COLORS.success }, 
                          { label: "Open", value: agent.open, color: ADMIN_COLORS.warning }, 
                        ].map(s => ( 
                          <div key={s.label} className="text-center p-2 rounded-xl bg-gray-50"> 
                            <p className="text-base font-black" style={{ color: s.color }}>{s.value}</p> 
                            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p> 
                          </div> 
                        ))} 
                      </div> 
 
                      {/* Resolution rate bar */} 
                      <div> 
                        <div className="flex justify-between text-xs mb-1.5"> 
                          <span className="text-gray-500 font-semibold">Resolution Rate</span> 
                          <span className="font-black" style={{ color: agent.resolutionRate >= 70 ? ADMIN_COLORS.success : agent.resolutionRate >= 40 ? ADMIN_COLORS.warning : ADMIN_COLORS.error }}> 
                            {agent.resolutionRate}% 
                          </span> 
                        </div> 
                        <div className="w-full bg-gray-100 rounded-full h-2"> 
                          <div className="h-2 rounded-full transition-all" 
                            style={{ 
                              width: `${agent.resolutionRate}%`, 
                              backgroundColor: agent.resolutionRate >= 70 ? ADMIN_COLORS.success : agent.resolutionRate >= 40 ? ADMIN_COLORS.warning : ADMIN_COLORS.error 
                            }} 
                          /> 
                        </div> 
                      </div> 
                    </div> 
                  ); 
                })} 
              </div> 
 
              {/* All agents table */} 
              <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm"> 
                <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50 flex items-center gap-2"> 
                  <TrendingUp size={15} className="text-gray-500" /> 
                  <span className="text-sm font-bold text-gray-700">All Agents</span> 
                  <span className="ml-auto text-xs text-gray-400">{agents.length} agents</span> 
                </div> 
                <div className="overflow-x-auto"> 
                  <table className="w-full"> 
                    <thead> 
                      <tr className="border-b border-gray-100 bg-gray-50"> 
                        {["Name", "Total Assigned", "Resolved", "Closed", "Open", "In Progress", "Resolution Rate"].map((h) => ( 
                          <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th> 
                        ))} 
                      </tr> 
                    </thead> 
                    <tbody> 
                      {agents.map((agent: any, idx: number) => { 
                        const agentName = agent.agentName || agent.name || agent.email || String(agent.agentId || "?"); 
                        const shortId = String(agent.agentId || "").slice(-6); 
                        const rate = agent.resolutionRate; 
                        const rateColor = rate >= 70 ? ADMIN_COLORS.success : rate >= 40 ? ADMIN_COLORS.warning : ADMIN_COLORS.error; 
                        return ( 
                          <tr key={agent.agentId} className="border-b border-gray-50 hover:bg-gray-50 transition"> 
                            <td className="px-4 py-3"> 
                              <div className="flex items-center gap-2.5"> 
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" 
                                  style={{ backgroundColor: idx === 0 ? "#F59E0B" : idx === 1 ? "#9CA3AF" : idx === 2 ? "#CD7F32" : ADMIN_COLORS.primary }}> 
                                  {(agentName || "?").charAt(0).toUpperCase()} 
                                </div> 
                                <div> 
                                  <p className="text-sm font-semibold text-gray-900">{agentName}</p> 
                                  <p className="text-xs text-gray-400 font-mono">#{shortId}</p> 
                                </div> 
                              </div> 
                            </td> 
                            <td className="px-4 py-3"> 
                              <span className="text-sm font-bold text-gray-900">{agent.totalAssigned}</span> 
                            </td> 
                            <td className="px-4 py-3"> 
                              <span className="text-sm font-semibold" style={{ color: ADMIN_COLORS.success }}>{agent.resolved}</span> 
                            </td> 
                            <td className="px-4 py-3"> 
                              <span className="text-sm font-semibold text-gray-600">{agent.closed}</span> 
                            </td> 
                            <td className="px-4 py-3"> 
                              <span className="text-sm font-semibold" style={{ color: ADMIN_COLORS.warning }}>{agent.open}</span> 
                            </td> 
                            <td className="px-4 py-3"> 
                              <span className="text-sm font-semibold" style={{ color: ADMIN_COLORS.info }}>{agent.inProgress}</span> 
                            </td> 
                            <td className="px-4 py-3"> 
                              <div className="flex items-center gap-3"> 
                                <div className="flex-1 bg-gray-100 rounded-full h-2 min-w-[80px]"> 
                                  <div className="h-2 rounded-full" style={{ width: `${rate}%`, backgroundColor: rateColor }} /> 
                                </div> 
                                <span className="text-sm font-bold w-10 text-right" style={{ color: rateColor }}>{rate}%</span> 
                              </div> 
                            </td> 
                          </tr> 
                        ); 
                      })} 
                    </tbody> 
                  </table> 
                </div> 
              </div> 
            </> 
          ) : ( 
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm"> 
              <BarChart2 size={48} className="text-gray-300 mx-auto mb-4" /> 
              <p className="text-lg font-semibold text-gray-600">No agent data yet</p> 
              <p className="text-sm text-gray-500 mt-1">Agent performance will appear once tickets are assigned.</p> 
            </div> 
          )} 
        </div> 
      )} 
 
      {/* Assign Modal — API 3 */} 
      {takeoverModal && ( 
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"> 
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"> 
            <h3 className="text-lg font-bold text-gray-900 mb-4">Assign Ticket</h3> 
            <div className="p-3 rounded-xl border mb-4" style={{ backgroundColor: ADMIN_COLORS.infoBg, borderColor: ADMIN_COLORS.infoBorder }}> 
              <p className="text-xs font-bold" style={{ color: ADMIN_COLORS.info }}>Ticket will be assigned and status set to In Progress</p> 
            </div> 
            <div className="mb-5"> 
              <label className="block text-sm font-bold text-gray-700 mb-2">Assign To</label> 
              <select 
                value={selectedStaffId} 
                onChange={(e) => setSelectedStaffId(e.target.value)} 
                className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition text-sm" 
              > 
                <option value="">Select staff member...</option> 
                {staff 
                  .filter((s: any) => { 
                    const role = (s.role || s.staffProfile?.role || "").toLowerCase(); 
                    const team = (s.team || s.staffProfile?.team || "").toLowerCase(); 
                    return role.includes("support") || team.includes("support"); 
                  }) 
                  .map((s: any) => ( 
                  <option key={s._id || s.id} value={s._id || s.id}>{s.name || s.email}</option> 
                ))} 
              </select> 
            </div> 
            <div className="flex gap-3"> 
              <button onClick={() => { setTakeoverModal(null); setSelectedStaffId(""); }} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition">Cancel</button> 
              <button onClick={() => handleAssign(takeoverModal)} disabled={actionLoading || !selectedStaffId} className="flex-1 px-4 py-2 text-white font-bold rounded-xl transition disabled:opacity-50" style={{ backgroundColor: ADMIN_COLORS.primary }}> 
                {actionLoading ? "Assigning..." : "Assign"} 
              </button> 
            </div> 
          </div> 
        </div> 
      )} 
 
      {/* Escalate Modal — API 4 */} 
      {escalateModal && ( 
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"> 
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"> 
            <h3 className="text-lg font-bold text-gray-900 mb-4">Escalate Ticket</h3> 
            <div className="p-3 rounded-xl border mb-4" style={{ backgroundColor: ADMIN_COLORS.warningBg, borderColor: ADMIN_COLORS.warningBorder }}> 
              <p className="text-xs font-bold" style={{ color: ADMIN_COLORS.warning }}>⚠️ Priority will be set to Urgent</p> 
            </div> 
            <div className="mb-5"> 
              <label className="block text-sm font-bold text-gray-700 mb-2">Escalation Reason</label> 
              <textarea 
                value={escalateMessage} 
                onChange={(e) => setEscalateMessage(e.target.value)} 
                placeholder="Describe why this ticket needs escalation..." 
                className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition text-sm" 
                rows={3} 
              /> 
            </div> 
            <div className="flex gap-3"> 
              <button onClick={() => { setEscalateModal(null); setEscalateMessage(""); }} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition">Cancel</button> 
              <button onClick={() => handleEscalate(escalateModal)} disabled={actionLoading} className="flex-1 px-4 py-2 text-white font-bold rounded-xl transition disabled:opacity-50" style={{ backgroundColor: ADMIN_COLORS.error }}> 
                {actionLoading ? "Escalating..." : "Escalate"} 
              </button> 
            </div> 
          </div> 
        </div> 
      )} 
 
      {/* Resolve Modal — API 5 */} 
      {resolveModal && ( 
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"> 
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"> 
            <h3 className="text-lg font-bold text-gray-900 mb-4">Resolve Ticket</h3> 
            <div className="p-3 rounded-xl border mb-4" style={{ backgroundColor: ADMIN_COLORS.successBg, borderColor: ADMIN_COLORS.successBorder }}> 
              <p className="text-xs font-bold" style={{ color: ADMIN_COLORS.success }}>✓ Ticket will be marked as Resolved</p> 
            </div> 
            <div className="mb-5"> 
              <label className="block text-sm font-bold text-gray-700 mb-2">Resolution Note</label> 
              <textarea 
                value={resolveText} 
                onChange={(e) => setResolveText(e.target.value)} 
                placeholder="Describe how this ticket was resolved..." 
                className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition text-sm" 
                rows={3} 
              /> 
            </div> 
            <div className="flex gap-3"> 
              <button onClick={() => { setResolveModal(null); setResolveText(""); }} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition">Cancel</button> 
              <button onClick={() => handleResolve(resolveModal)} disabled={actionLoading} className="flex-1 px-4 py-2 text-white font-bold rounded-xl transition disabled:opacity-50" style={{ backgroundColor: ADMIN_COLORS.success }}> 
                {actionLoading ? "Resolving..." : "Mark Resolved"} 
              </button> 
            </div> 
          </div> 
        </div> 
      )} 
 
      {/* Message Modal — API 6 */} 
      {messageModal && ( 
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"> 
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"> 
            <div className="flex items-center justify-between mb-4"> 
              <h3 className="text-lg font-bold text-gray-900">Send Message</h3> 
              <button onClick={() => { setMessageModal(null); setMessageText(""); }}><X size={18} className="text-gray-400" /></button> 
            </div> 
            <div className="mb-5"> 
              <label className="block text-sm font-bold text-gray-700 mb-2">Message</label> 
              <textarea 
                value={messageText} 
                onChange={(e) => setMessageText(e.target.value)} 
                placeholder="Type your message to the customer..." 
                className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition text-sm" 
                rows={4} 
              /> 
            </div> 
            <div className="flex gap-3"> 
              <button onClick={() => { setMessageModal(null); setMessageText(""); }} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition">Cancel</button> 
              <button onClick={() => handleSendMessage(messageModal)} disabled={actionLoading || !messageText.trim()} className="flex-1 px-4 py-2 text-white font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2" style={{ backgroundColor: ADMIN_COLORS.primary }}> 
                <Send size={14} /> 
                {actionLoading ? "Sending..." : "Send Message"} 
              </button> 
            </div> 
          </div> 
        </div> 
      )} 
 
      {/* Detail Modal — API 2 */} 
      {detailModal && ( 
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"> 
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"> 
            <div className="flex items-center justify-between p-6 border-b border-gray-100"> 
              <h3 className="text-lg font-bold text-gray-900">Ticket Details</h3> 
              <button onClick={() => setDetailModal(null)}><X size={18} className="text-gray-400" /></button> 
            </div> 
            <div className="flex-1 overflow-y-auto p-6 space-y-5"> 
              <div className="grid grid-cols-2 gap-4"> 
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200"> 
                  <p className="text-xs text-gray-500 mb-1">Ticket ID</p> 
                  <p className="text-sm font-bold text-gray-900 font-mono">{String(detailModal._id).slice(-12)}</p> 
                </div> 
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200"> 
                  <p className="text-xs text-gray-500 mb-1">Status</p> 
                  <span className="text-xs px-2 py-1 rounded-full font-semibold capitalize" style={{ backgroundColor: getStatusColor(detailModal.status).bg, color: getStatusColor(detailModal.status).text }}> 
                    {detailModal.status?.replace("_", " ")} 
                  </span> 
                </div> 
                <div className="col-span-2 p-4 rounded-xl bg-gray-50 border border-gray-200"> 
                  <p className="text-xs text-gray-500 mb-1">Subject</p> 
                  <p className="text-sm font-bold text-gray-900">{detailModal.subject}</p> 
                </div> 
                <div className="col-span-2 p-4 rounded-xl bg-gray-50 border border-gray-200"> 
                  <p className="text-xs text-gray-500 mb-1">Description</p> 
                  <p className="text-sm text-gray-700">{detailModal.description || "No description"}</p> 
                </div> 
                {Array.isArray(detailModal.attachments) && detailModal.attachments.map(getAttachmentUrl).filter(Boolean).length > 0 && ( 
                  <div className="col-span-2 p-4 rounded-xl bg-gray-50 border border-gray-200"> 
                    <p className="text-xs text-gray-500 mb-3">Attachments</p> 
                    <div className="grid grid-cols-3 gap-3"> 
                      {detailModal.attachments.map(getAttachmentUrl).filter(Boolean).map((attachment: string, idx: number) => ( 
                        <a 
                          key={idx} 
                          href={attachment} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="relative group rounded-lg overflow-hidden border border-gray-200 hover:border-gray-400 transition" 
                        > 
                          <img 
                            src={attachment} 
                            alt={`Attachment ${idx + 1}`} 
                            className="w-full h-24 object-cover" 
                            onError={(e) => { 
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="12"%3EImage%3C/text%3E%3C/svg%3E'; 
                            }} 
                          /> 
                        </a> 
                      ))} 
                    </div> 
                  </div> 
                )} 
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200"> 
                  <p className="text-xs text-gray-500 mb-1">Priority</p> 
                  <p className="text-sm font-bold text-gray-900 capitalize">{detailModal.priority}</p> 
                </div> 
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200"> 
                  <p className="text-xs text-gray-500 mb-1">Category</p> 
                  <p className="text-sm font-bold text-gray-900 capitalize">{detailModal.category || "General"}</p> 
                </div> 
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200"> 
                  <p className="text-xs text-gray-500 mb-1">Assigned To</p> 
                  <p className="text-sm font-semibold text-gray-900">{detailModal.assignedTo || "Unassigned"}</p> 
                </div> 
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200"> 
                  <p className="text-xs text-gray-500 mb-1">Created</p> 
                  <p className="text-sm text-gray-700">{detailModal.createdAt ? new Date(detailModal.createdAt).toLocaleString() : "—"}</p> 
                </div> 
              </div> 
 
              {/* Replies */} 
              {detailModal.replies && detailModal.replies.length > 0 && ( 
                <div> 
                  <p className="text-sm font-bold text-gray-900 mb-3">Conversation ({detailModal.replies.length})</p> 
                  <div className="space-y-3 max-h-64 overflow-y-auto"> 
                    {detailModal.replies.map((reply: any, i: number) => ( 
                      <div key={i} className={`p-3 rounded-xl border ${reply.authorRole === "admin" ? "border-blue-200 bg-blue-50 ml-8" : "border-gray-200 bg-gray-50 mr-8"}`}> 
                        <div className="flex items-center justify-between mb-1"> 
                          <span className="text-xs font-bold capitalize" style={{ color: reply.authorRole === "admin" ? ADMIN_COLORS.info : ADMIN_COLORS.primary }}>{reply.authorRole}</span> 
                          <span className="text-xs text-gray-400">{reply.createdAt ? new Date(reply.createdAt).toLocaleString() : ""}</span> 
                        </div> 
                        <p className="text-sm text-gray-700">{reply.message}</p> 
                        {Array.isArray(reply.attachments) && reply.attachments.map(getAttachmentUrl).filter(Boolean).length > 0 && ( 
                          <div className="mt-3 grid grid-cols-2 gap-2"> 
                            {reply.attachments.map(getAttachmentUrl).filter(Boolean).map((attachment: string, idx: number) => ( 
                              <a 
                                key={idx} 
                                href={attachment} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="relative group rounded-lg overflow-hidden border border-gray-200 hover:border-gray-400 transition" 
                              > 
                                <img 
                                  src={attachment} 
                                  alt={`Reply attachment ${idx + 1}`} 
                                  className="w-full h-24 object-cover" 
                                  onError={(e) => { 
                                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="12"%3EImage%3C/text%3E%3C/svg%3E'; 
                                  }} 
                                /> 
                              </a> 
                            ))} 
                          </div> 
                        )} 
                      </div> 
                    ))} 
                  </div> 
                </div> 
              )} 
            </div> 
            <div className="p-6 border-t border-gray-100 flex gap-3"> 
              <button onClick={() => setDetailModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Close</button> 
              <button 
                onClick={() => { setMessageModal(detailModal._id); setDetailModal(null); }} 
                className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl transition flex items-center justify-center gap-2" 
                style={{ backgroundColor: ADMIN_COLORS.primary }} 
              > 
                <MessageSquare size={14} /> Reply 
              </button> 
            </div> 
          </div> 
        </div> 
      )} 
 
    </div> 
  ); 
}; 
 
export default TicketDashboardPage; 
