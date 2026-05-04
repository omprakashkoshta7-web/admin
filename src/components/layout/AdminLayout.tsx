import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import {
  LayoutDashboard, ClipboardList, Clock, Store, Users, DollarSign,
  RotateCcw, BookOpen, TrendingUp, HeadphonesIcon, BarChart2, Settings,
  Truck, LogOut, Bell, ChevronDown, Shield, Wallet,
  Search, Package, Layers, Tag, X
} from "lucide-react";
import { logoutFirebase } from "../../services/firebase-auth";
import { notificationService, type PortalNotification } from "../../services/notification.service";

const navGroups = [
  {
    label: "Overview",
    items: [{ to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" }]
  },
  {
    label: "Operations",
    items: [
      { to: "/orders", icon: ClipboardList, label: "Orders" },
      { to: "/sla", icon: Clock, label: "SLA & Escalation" },
      { to: "/delivery", icon: Truck, label: "Delivery" },
    ]
  },
  {
    label: "Governance",
    items: [
      { to: "/vendors", icon: Store, label: "Vendors" },
      { to: "/customers", icon: Users, label: "Customers" },
      { to: "/staff", icon: Shield, label: "Staff" },
    ]
  },
  {
    label: "Finance",
    items: [
      { to: "/finance", icon: DollarSign, label: "Revenue" },
      { to: "/refunds", icon: RotateCcw, label: "Refunds" },
      { to: "/wallet", icon: Wallet, label: "Wallets" },
      { to: "/ledger", icon: BookOpen, label: "Ledger" },
    ]
  },
  {
    label: "Catalog",
    items: [
      { to: "/products", icon: Package, label: "Products" },
      { to: "/categories", icon: Layers, label: "Categories" },
      { to: "/pricing", icon: Tag, label: "Pricing" },
    ]
  },
  {
    label: "Growth",
    items: [{ to: "/growth", icon: TrendingUp, label: "Growth & Coupons" }]
  },
  {
    label: "System",
    items: [
      { to: "/support", icon: HeadphonesIcon, label: "Support" },
      { to: "/risk", icon: Shield, label: "Risk Cases" },
      { to: "/reports", icon: BarChart2, label: "Reports" },
      { to: "/platform", icon: Settings, label: "Platform" },
    ]
  },
];

const pageTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/orders": "Orders",
  "/sla": "SLA & Escalation",
  "/vendors": "Vendors",
  "/customers": "Customers",
  "/staff": "Staff",
  "/finance": "Revenue",
  "/refunds": "Refunds",
  "/ledger": "Ledger",
  "/wallet": "Wallet Oversight",
  "/sessions": "Session Control",
  "/profile": "My Profile",
  "/growth": "Growth & Coupons",
  "/support": "Support",
  "/reports": "Reports",
  "/platform": "Platform",
  "/delivery": "Delivery",
  "/failures": "Failure Handling",
  "/risk": "Risk Cases",
  "/products": "Products",
  "/categories": "Categories",
  "/pricing": "Pricing",
  "/business-printing": "Business Printing",
  "/images": "Image Management",
};

export default function AdminLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const mainRef = useRef<HTMLElement>(null);

  // Scroll main content to top on every route change
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
    // Also close any open dropdowns on navigation
    setShowNotifications(false);
    setShowUserMenu(false);
  }, [pathname]);

  const baseRoute = "/" + pathname.split("/")[1];
  const title = pageTitles[pathname] || pageTitles[baseRoute] || "Admin";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to orders page with search query
      navigate(`/orders?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    void logoutFirebase().finally(() => {
      localStorage.removeItem('admin_session');
      window.location.reload();
    });
  };

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      try {
        const [summary, recent] = await Promise.all([
          notificationService.getSummary(),
          notificationService.getRecent(),
        ]);

        if (!active) return;
        setUnreadCount(summary.unread_count || 0);
        setNotifications(recent.notifications || []);
      } catch {
        if (!active) return;
        setUnreadCount(0);
        setNotifications([]);
      }
    };

    void loadNotifications();
    const interval = window.setInterval(() => void loadNotifications(), 15000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const formatTimestamp = (value?: string) =>
    value
      ? new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
      : "";

  return (
    <div className="admin-app-shell min-h-screen p-2 sm:p-3 md:p-4">
      <div className="admin-frame flex min-h-[calc(100vh-1rem)] sm:min-h-[calc(100vh-1.5rem)] overflow-hidden rounded-[24px] sm:rounded-[34px]">
        <aside className="admin-sidebar hidden w-[236px] flex-shrink-0 lg:flex lg:flex-col">
          <div className="px-5 pb-6 pt-8">
            <div className="flex flex-col">
              <h1 className="text-[2.2rem] font-black lowercase leading-none tracking-tight text-white">
                speedcopy
              </h1>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.34em] text-[#a99f93]">
                Admin Portal
              </p>
            </div>
          </div>

          <div className="mx-5 h-px bg-violet-200/30" />

          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <div className="space-y-1">
              {navGroups.flatMap((group) => group.items).map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                      isActive ? "admin-nav-active" : "admin-nav-idle hover:bg-white/5 hover:text-white"
                    }`
                  }
                >
                  <Icon size={15} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </nav>

          <div className="px-4 pb-6">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-white bg-red-500 hover:bg-red-600 active:bg-red-700 transition-all shadow-lg"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </aside>

        <div className="admin-content-shell flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="admin-topbar flex flex-col gap-3 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between">
            <h1 className="text-xl sm:text-2xl lg:text-[2.15rem] font-black tracking-tight text-slate-900">{title}</h1>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <form onSubmit={handleSearch} className="relative min-w-0 flex-1 sm:min-w-[220px] sm:w-[320px]">
                <Search size={15} className="pointer-events-none absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-slate-600" />
                <input 
                  className="admin-search-input w-full rounded-full border-0 px-4 sm:px-5 py-2.5 sm:py-3 pr-10 sm:pr-11 text-xs sm:text-sm" 
                  placeholder="Search orders, customers..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </form>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <div className="relative">
                  <button 
                    className="relative hidden md:flex h-9 w-9 items-center justify-center rounded-xl shadow-lg hover:shadow-xl transition-all overflow-visible"
                    style={{ 
                      background: 'radial-gradient(circle at top, rgba(255, 255, 255, 0.04), transparent 24%), linear-gradient(180deg, #1a2332 0%, #141c28 100%)'
                    }}
                    onClick={() => setShowNotifications(!showNotifications)}
                  >
                    <Bell size={16} className="text-white" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-[18px] text-white border-2 border-white text-center flex items-center justify-center">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-white shadow-xl border border-slate-200 z-50">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-slate-900">Notifications</h3>
                          {unreadCount > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600">
                              {unreadCount} unread
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {unreadCount > 0 && (
                            <button
                              onClick={async () => {
                                try {
                                  await notificationService.markAllRead();
                                  setUnreadCount(0);
                                  setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                                } catch { /* silent */ }
                              }}
                              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-lg hover:bg-indigo-50 transition"
                            >
                              Mark all read
                            </button>
                          )}
                          <button 
                            onClick={() => setShowNotifications(false)}
                            className="p-1 hover:bg-slate-100 rounded-lg transition"
                          >
                            <X size={16} className="text-slate-500" />
                          </button>
                        </div>
                      </div>
                      {notifications.length ? (
                        <div className="max-h-96 overflow-y-auto p-2">
                          {notifications.map((notification) => (
                            <div key={notification._id} className="relative rounded-xl hover:bg-slate-50 transition group">
                              <button
                                onClick={() => {
                                  setShowNotifications(false);
                                  // Mark as read
                                  if (!notification.isRead) {
                                    void notificationService.markAsRead(notification._id).catch(() => {});
                                    setNotifications(prev => prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n));
                                    setUnreadCount(prev => Math.max(0, prev - 1));
                                  }
                                  const categoryRoutes: Record<string, string> = {
                                    order: '/orders', orders: '/orders',
                                    payment: '/finance', finance: '/finance',
                                    refund: '/refunds', vendor: '/vendors',
                                    customer: '/customers', support: '/support',
                                    delivery: '/delivery', sla: '/sla',
                                  };
                                  const route = categoryRoutes[notification.category?.toLowerCase()] || '/dashboard';
                                  navigate(route);
                                }}
                                className="w-full text-left px-3 py-3 cursor-pointer"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <p className={`text-sm font-semibold transition ${notification.isRead ? 'text-slate-500' : 'text-slate-900 group-hover:text-indigo-700'}`}>
                                      {notification.title}
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-slate-500">{notification.message}</p>
                                    <p className="mt-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                                      {notification.category} • {formatTimestamp(notification.createdAt)}
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-center gap-1 mt-0.5 flex-shrink-0">
                                    {!notification.isRead && <span className="h-2 w-2 rounded-full bg-rose-500" />}
                                    <span className="text-slate-300 group-hover:text-indigo-400 transition text-xs">→</span>
                                  </div>
                                </div>
                              </button>
                              {/* Per-notification mark as read */}
                              {!notification.isRead && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void notificationService.markAsRead(notification._id).catch(() => {});
                                    setNotifications(prev => prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n));
                                    setUnreadCount(prev => Math.max(0, prev - 1));
                                  }}
                                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-[10px] font-semibold text-slate-400 hover:text-indigo-600 px-1.5 py-0.5 rounded hover:bg-indigo-50 transition"
                                  title="Mark as read"
                                >
                                  ✓ read
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-3">
                            <Bell size={24} className="text-indigo-600" />
                          </div>
                          <p className="text-sm font-medium text-gray-700">No notifications yet</p>
                          <p className="text-xs text-gray-500 mt-1">New order and workflow updates will show here.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button 
                    className="admin-user-chip hidden md:flex"
                    onClick={() => navigate('/profile')}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-black text-white overflow-hidden" style={{ background: 'radial-gradient(circle at top, rgba(255, 255, 255, 0.04), transparent 24%), linear-gradient(180deg, #1a2332 0%, #141c28 100%)' }}>
                      A
                    </div>
                    <span className="hidden text-sm font-medium text-slate-500 sm:block">Super Admin</span>
                    <ChevronDown size={13} className="text-slate-600" />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white shadow-xl border border-slate-200 z-50">
                      <div className="p-4 border-b border-slate-100">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-bold text-sm text-slate-900">Super Admin</p>
                            <p className="text-xs text-slate-500 mt-1">admin@speedcopy.com</p>
                          </div>
                          <button 
                            onClick={() => setShowUserMenu(false)}
                            className="p-1 hover:bg-slate-100 rounded-lg transition"
                          >
                            <X size={16} className="text-slate-500" />
                          </button>
                        </div>
                      </div>
                      <div className="p-2 border-t border-slate-100">
                        <button 
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <LogOut size={14} />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Navigation */}
            <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden -mx-4 px-4">
              {navGroups.flatMap((group) => group.items).map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `whitespace-nowrap rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition ${
                      isActive
                        ? "bg-slate-900 text-white shadow-[0_10px_20px_rgba(15,23,42,0.14)]"
                        : "bg-white/85 text-slate-600 shadow-[0_8px_18px_rgba(15,23,42,0.06)]"
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
              <button
                onClick={handleLogout}
                className="whitespace-nowrap rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition bg-red-50 text-red-600 shadow-[0_8px_18px_rgba(15,23,42,0.06)] hover:bg-red-100 flex items-center gap-2"
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          </header>

          <main ref={mainRef} className="admin-main flex-1 overflow-y-auto px-3 pb-4 pt-6 sm:px-4 sm:pb-5 sm:pt-7 md:px-6 md:pb-6 md:pt-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
