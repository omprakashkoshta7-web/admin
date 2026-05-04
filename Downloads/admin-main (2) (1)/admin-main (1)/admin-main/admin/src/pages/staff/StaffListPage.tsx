import { useState, useEffect } from "react";
import { 
  X, CheckCircle, Search, Eye, Lock, Unlock, 
  AlertTriangle, Users, Activity, Trash2, Edit, RefreshCw,
  ChevronDown, Download
} from "lucide-react";
import { ADMIN_COLORS, getRoleColor } from "../../utils/colors";
import { useAsync } from "../../hooks/useAsync";
import AdminMetricCard from "../../components/ui/AdminMetricCard";
import AnimatedCount from "../../components/ui/AnimatedCount";
import { 
  getAdminStaff, 
  createAdminStaff,
  deleteAdminStaff, 
  updateAdminStaffStatus,
  updateAdminStaffRole,
} from "../../api/admin";
import type { AdminStaffResponse } from "../../api/admin";

type Role = 'SuperAdmin' | 'Admin' | 'Moderator' | 'Support' | 'Finance' | 'Operations' | 'Marketing';

interface Permission {
  module: string;
  read: boolean;
  write: boolean;
  delete: boolean;
  approve: boolean;
}

const rolePermissions: Record<Role, Permission[]> = {
  SuperAdmin: [
    { module: 'All Modules', read: true, write: true, delete: true, approve: true }
  ],
  Admin: [
    { module: 'Orders', read: true, write: true, delete: false, approve: true },
    { module: 'Vendors', read: true, write: true, delete: false, approve: true },
    { module: 'Customers', read: true, write: true, delete: false, approve: false },
    { module: 'Finance', read: true, write: false, delete: false, approve: false },
    { module: 'Reports', read: true, write: false, delete: false, approve: false }
  ],
  Moderator: [
    { module: 'Orders', read: true, write: true, delete: false, approve: false },
    { module: 'Vendors', read: true, write: false, delete: false, approve: false },
    { module: 'Customers', read: true, write: false, delete: false, approve: false },
    { module: 'Support', read: true, write: true, delete: false, approve: false }
  ],
  Support: [
    { module: 'Support', read: true, write: true, delete: false, approve: false },
    { module: 'Orders', read: true, write: false, delete: false, approve: false },
    { module: 'Customers', read: true, write: false, delete: false, approve: false }
  ],
  Finance: [
    { module: 'Finance', read: true, write: true, delete: false, approve: true },
    { module: 'Refunds', read: true, write: true, delete: false, approve: true },
    { module: 'Ledger', read: true, write: false, delete: false, approve: false },
    { module: 'Reports', read: true, write: false, delete: false, approve: false }
  ],
  Operations: [
    { module: 'Orders', read: true, write: true, delete: false, approve: false },
    { module: 'Vendors', read: true, write: true, delete: false, approve: false },
    { module: 'Delivery', read: true, write: true, delete: false, approve: false },
    { module: 'SLA', read: true, write: true, delete: false, approve: false }
  ],
  Marketing: [
    { module: 'Growth', read: true, write: true, delete: false, approve: false },
    { module: 'Coupons', read: true, write: true, delete: false, approve: false },
    { module: 'Reports', read: true, write: false, delete: false, approve: false },
    { module: 'Customers', read: true, write: false, delete: false, approve: false }
  ]
};

export default function StaffListPage() {
  const { data: staffData, refetch, loading: staffLoading } = useAsync<AdminStaffResponse>(() => getAdminStaff(), null, []);
  const rawStaff = staffData?.staff || [];

  const staff = rawStaff.map(s => {
    const anyS = s as any;
    return {
      ...anyS,
      id: anyS.id || anyS._id || anyS.partnerId || '',
      active: anyS.active ?? anyS.isActive ?? false,
      requiresApproval: anyS.requiresApproval ?? false,
      permissions: anyS.permissions ?? anyS.staffProfile?.permissions ?? [],
      lastLogin: anyS.lastLogin || anyS.lastActive || anyS.last_login || null,
      phone: anyS.phone || anyS.staffProfile?.phone || '',
    };
  });

  const [addedStaffList, setAddedStaffList] = useState<Array<any>>([]);

  // when backend refetch returns created staff, remove them from local added list
  useEffect(() => {
    const fetched = (staffData as any)?.staff || [];
    if (!fetched || fetched.length === 0) return;
    const fetchedIds = fetched.map((f: any) => f._id || f.id).filter(Boolean);
    if (fetchedIds.length === 0) return;
    setAddedStaffList(prev => prev.filter(a => !fetchedIds.includes(a.id)));
  }, [staffData]);

  const [showAdd, setShowAdd] = useState(false);
  const [showPermissions, setShowPermissions] = useState<string | null>(null);
  const [showEditRole, setShowEditRole] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [form, setForm] = useState({ 
    name: "", 
    email: "", 
    phone: "", 
    password: "",
    role: "" as Role | "",
    team: "ops",
    permissions: [] as string[],
    scopes: [] as string[]
  });

  // Toggle a single permission value
  const togglePermission = (value: string) => {
    setForm(p => ({
      ...p,
      permissions: p.permissions.includes(value)
        ? p.permissions.filter(v => v !== value)
        : [...p.permissions, value]
    }));
  };

  // Toggle a single scope value
  const toggleScope = (value: string) => {
    setForm(p => ({
      ...p,
      scopes: p.scopes.includes(value)
        ? p.scopes.filter(v => v !== value)
        : [...p.scopes, value]
    }));
  };

  const permissionModules = [
    { label: "Orders",    read: "orders:read",    write: "orders:write" },
    { label: "Vendors",   read: "vendors:read",   write: "vendors:write" },
    { label: "Customers", read: "customers:read", write: "customers:write" },
    { label: "Finance",   read: "finance:read",   write: "finance:write" },
    { label: "Reports",   read: "reports:read",   write: null },
    { label: "Support",   read: "support:read",   write: "support:write" },
  ];

  const scopeOptions = [
    { label: "Global Access",       value: "global" },
    { label: "Regional Access",     value: "regional" },
    { label: "Store Specific",      value: "store-specific" },
    { label: "Department Specific", value: "department-specific" },
  ];
  const [editRoleForm, setEditRoleForm] = useState<Role | "">("");
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-refresh staff every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  const add = async () => {
    if (!form.name || !form.email || !form.phone || !form.role) return;
    
    setError(null);
    
    try {
      // Deployed backend accepts: 'admin' or 'super_admin' only
      // Map all roles to 'admin' (staff role is stored in staffProfile.team)
      const normalizedRole = form.role === 'SuperAdmin' ? 'super_admin' : 'admin';
      // Use /admin/staff endpoint which accepts name/email fields
      const res = await createAdminStaff({ 
        name: form.name, 
        email: form.email, 
        phone: form.phone,
        password: form.password, 
        role: normalizedRole,
        team: form.team,
        permissions: form.permissions,
        scopes: form.scopes
      });
      const createdId = (res as any)._id || (res as any).id || '';

      const newStaff = {
        id: createdId,
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        active: true,
        requiresApproval: false,
        permissions: [],
        createdAt: new Date().toISOString(),
      };

      setAddedStaffList(prev => [newStaff, ...prev]);
      setAdded(true);

      setTimeout(() => {
        setShowAdd(false);
        setAdded(false);
        setError(null);
        setForm({ name: "", email: "", phone: "", password: "", role: "", team: "ops", permissions: [], scopes: [] });
        try { refetch(); } catch (e) { console.warn('Refetch staff failed', e); }
      }, 900);
    } catch (err: any) {
      console.error('Failed to create staff:', err);
      if (err.message?.includes('email already exists') || err.message?.includes('409')) {
        setError('This email is already registered. Please use a different email address.');
      } else {
        setError(err?.message || 'Failed to create staff member. Please try again.');
      }
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    const nextActive = !currentActive;
    const actionLabel = nextActive ? 'activate' : 'deactivate';
    if (!confirm(`Are you sure you want to ${actionLabel} this staff member?`)) return;

    try {
      setStatusLoadingId(id);
      await updateAdminStaffStatus(id, nextActive, nextActive ? undefined : 'deactivated via admin UI');
      setAddedStaffList(prev => prev.map(s => s.id === id ? { ...s, active: nextActive } : s));
      refetch();
      alert(`Staff member ${nextActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Failed to update staff status:', error);
      alert('Failed to update staff status');
    } finally {
      setStatusLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    try {
      setLoading(true);
      await deleteAdminStaff(id);
      setAddedStaffList(prev => prev.filter(s => s.id !== id));
      refetch();
      alert('Staff member deleted successfully');
    } catch (error) {
      console.error('Failed to delete staff:', error);
      alert('Failed to delete staff member');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (id: string) => {
    if (!editRoleForm) {
      alert('Please select a role');
      return;
    }
    
    if (!confirm(`Are you sure you want to change this staff member's role to ${editRoleForm}?`)) return;
    
    try {
      setLoading(true);
      const normalizedRole = String(editRoleForm).toLowerCase().includes('admin') ? 'admin' : 'staff';
      await updateAdminStaffRole(id, normalizedRole);
      setAddedStaffList(prev => prev.map(s => s.id === id ? { ...s, role: normalizedRole } : s));
      setShowEditRole(null);
      setEditRoleForm("");
      refetch();
      alert('Staff role updated successfully');
    } catch (error) {
      console.error('Failed to update staff role:', error);
      alert('Failed to update staff role');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStaff = (id: string) => {
    setSelectedStaff(prev => 
      prev.includes(id) 
        ? prev.filter(staffId => staffId !== id)
        : [...prev, id]
    );
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedStaff.length === 0) return;
    
    if (!confirm(`Are you sure you want to ${bulkAction} ${selectedStaff.length} staff members?`)) return;
    
    try {
      setLoading(true);
      for (const staffId of selectedStaff) {
        if (bulkAction === 'deactivate') {
          await updateAdminStaffStatus(staffId, false, 'Bulk deactivation');
        } else if (bulkAction === 'activate') {
          await updateAdminStaffStatus(staffId, true);
        } else if (bulkAction === 'delete') {
          await deleteAdminStaff(staffId);
        }
      }
      refetch();
      setSelectedStaff([]);
      setBulkAction("");
      alert(`Bulk ${bulkAction} completed successfully`);
    } catch (error) {
      console.error('Bulk action failed:', error);
      alert('Some operations failed. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const exportStaff = () => {
    const csvContent = [
      ['Staff ID', 'Name', 'Email', 'Phone', 'Role', 'Status', 'Team', 'Created'].join(','),
      ...filteredMerged.map((staff: any) => [
        staff.id,
        staff.name,
        staff.email,
        staff.phone || '—',
        staff.role,
        staff.active ? 'Active' : 'Inactive',
        staff.team || '—',
        staff.createdAt || '—'
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // merge locally-added staff with fetched staff (avoid duplicates)
  const mergedStaff = [
    ...addedStaffList,
    ...staff.filter(s => !addedStaffList.some(a => a.id === s.id)),
  ];

  const filteredMerged = mergedStaff.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                          s.email.toLowerCase().includes(search.toLowerCase()) ||
                          s.id.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || s.role === roleFilter;
    const matchesStatus = statusFilter === "all" || 
                          (statusFilter === "active" && s.active) ||
                          (statusFilter === "inactive" && !s.active);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const activeStaff = mergedStaff.filter(s => s.active).length;
  const inactiveStaff = mergedStaff.filter(s => !s.active).length;
  const pendingApproval = mergedStaff.filter(s => s.requiresApproval).length;

  return (
    <div className="space-y-6">
      
      {/* Page Header with Title and Actions */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={exportStaff}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold"
          >
            <Download size={14} />
            Export
          </button>
          <button
            onClick={() => refetch()}
            disabled={staffLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold disabled:opacity-60"
          >
            <RefreshCw size={14} className={staffLoading ? "animate-spin" : ""} />
            {staffLoading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-bold rounded-xl transition"
            style={{ backgroundColor: ADMIN_COLORS.primary }}
          >
            <Users size={15} /> Add Staff
          </button>
        </div>
      </div>

      {/* Stats Summary - Full Width */}
      <div className="grid grid-cols-4 gap-4">
        <AdminMetricCard 
          index={0}
          label="Total Staff" 
          value={mergedStaff.length.toString()} 
          accent={ADMIN_COLORS.primary} 
          icon={Users} 
        />
        <AdminMetricCard 
          label="Active" 
          value={activeStaff.toString()} 
          accent={ADMIN_COLORS.success} 
          accentBg={ADMIN_COLORS.successBg}
          icon={Activity} 
        />
        <AdminMetricCard 
          label="Inactive" 
          value={inactiveStaff.toString()} 
          accent={ADMIN_COLORS.error} 
          accentBg={ADMIN_COLORS.errorBg}
          icon={Lock} 
        />
        <AdminMetricCard 
          label="Pending Approval" 
          value={pendingApproval.toString()} 
          accent={ADMIN_COLORS.warning} 
          accentBg={ADMIN_COLORS.warningBg}
          icon={AlertTriangle} 
        />
      </div>

      {/* Pending Approval Alert */}
      {/* Pending Approval Alert */}
      {pendingApproval > 0 && (
        <div 
          className="p-4 rounded-2xl border-2"
          style={{ 
            backgroundColor: ADMIN_COLORS.warningBg,
            borderColor: ADMIN_COLORS.warning
          }}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} style={{ color: ADMIN_COLORS.warning }} />
            <div className="flex-1">
              <p className="font-bold" style={{ color: ADMIN_COLORS.warning }}>
                <AnimatedCount value={pendingApproval} /> Staff Member{pendingApproval > 1 ? 's' : ''} Pending Approval
              </p>
              <p className="text-sm mt-1" style={{ color: ADMIN_COLORS.warning }}>
                Admin/SuperAdmin roles require approval before activation
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedStaff.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
          <p className="text-sm font-semibold text-blue-900">
            {selectedStaff.length} staff member{selectedStaff.length > 1 ? 's' : ''} selected
          </p>
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="px-3 py-2 rounded-lg border border-blue-200 text-sm bg-white"
          >
            <option value="">Choose Action</option>
            <option value="activate">Activate Selected</option>
            <option value="deactivate">Deactivate Selected</option>
            <option value="delete">Delete Selected</option>
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
            onClick={() => setSelectedStaff([])}
            className="ml-auto text-sm text-blue-600 hover:text-blue-800 font-semibold"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} 
              placeholder="Search staff by name, email, or ID..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
          </div>
          
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition text-sm font-semibold bg-white"
            >
              <option value="all">All Roles</option>
              {Object.keys(rolePermissions).map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900 transition text-sm font-semibold bg-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-2 gap-4">
        {filteredMerged.length === 0 ? (
          <div className="col-span-2 flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-gray-100">
            <Users size={48} className="text-gray-300 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No staff members found</h3>
            <p className="text-gray-500 text-sm">
              {mergedStaff.length === 0 
                ? "No staff members in database yet. Real backend data - no mock data."
                : "No staff members match your current filters."
              }
            </p>
          </div>
        ) : (
          filteredMerged.map(s => {
            const roleColors = getRoleColor(s.role as any);
            return (
              <div key={s.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col min-h-[200px]">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedStaff.includes(s.id)}
                      onChange={() => handleSelectStaff(s.id)}
                      className="rounded border-gray-300"
                    />
                    <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full"
                      style={{ backgroundColor: roleColors.bg, color: roleColors.text }}>
                      {s.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.requiresApproval && (
                      <span className="text-xs px-2 py-1 rounded-full bg-yellow-50 text-yellow-600 font-semibold">
                        Pending Approval
                      </span>
                    )}
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: s.active ? ADMIN_COLORS.successBg : "#f1f5f9", color: s.active ? ADMIN_COLORS.success : "#94a3b8" }}>
                      {s.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                
                <p className="text-base font-extrabold text-gray-900 mb-1">{s.name}</p>
                <p className="text-xs text-gray-500 mb-1">{s.id}</p>
                <p className="text-xs text-gray-400 mb-1">{s.email}</p>
                <p className="text-xs text-gray-400 mb-3">{(s as any).phone || 'Not provided'}</p>
                
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
                  <div className="text-xs text-gray-500">
                    <p>Created: {s.createdAt}</p>
                    <p>Last active: {(s as any).lastActive || s.lastLogin || 'Never'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowPermissions(s.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition"
                      title="View Permissions"
                    >
                      <Eye size={14} className="text-gray-500" />
                    </button>
                    <button
                      onClick={() => {
                        setShowEditRole(s.id);
                        setEditRoleForm(s.role as Role);
                      }}
                      className="p-1.5 rounded-lg hover:bg-blue-50 transition"
                      title="Edit Role"
                    >
                      <Edit size={14} className="text-blue-500" />
                    </button>
                    <button
                      onClick={() => toggleActive(s.id, s.active)}
                      disabled={statusLoadingId === s.id}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition"
                      title={s.active ? "Deactivate" : "Activate"}
                    >
                      {s.active ? (
                        <Lock size={14} className="text-red-500" />
                      ) : (
                        <Unlock size={14} className="text-green-500" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition"
                      title="Delete"
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Staff Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Add Staff Member</h2>
              <button onClick={() => {
                setShowAdd(false);
                setError(null);
              }}><X size={18} className="text-gray-400" /></button>
            </div>
            
            {added ? (
              <div className="flex items-center gap-2 p-4 rounded-xl border"
                style={{ backgroundColor: ADMIN_COLORS.successBg, borderColor: ADMIN_COLORS.successBorder }}>
                <CheckCircle size={16} style={{ color: ADMIN_COLORS.success }} />
                <p className="text-sm font-bold" style={{ color: ADMIN_COLORS.success }}>
                  Staff member added successfully.
                </p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="flex items-center gap-2 p-4 rounded-xl border mb-4"
                    style={{ backgroundColor: ADMIN_COLORS.errorBg, borderColor: ADMIN_COLORS.errorBorder }}>
                    <AlertTriangle size={16} style={{ color: ADMIN_COLORS.error }} />
                    <p className="text-sm font-bold" style={{ color: ADMIN_COLORS.error }}>
                      {error}
                    </p>
                  </div>
                )}
                
                <div 
                  className="p-3 rounded-xl border mb-4"
                  style={{ backgroundColor: ADMIN_COLORS.infoBg, borderColor: ADMIN_COLORS.infoBorder }}
                >
                  <p className="text-xs font-bold" style={{ color: ADMIN_COLORS.info }}>
                    🔒 No Default Admin Privileges
                  </p>
                  <p className="text-xs mt-1" style={{ color: ADMIN_COLORS.info }}>
                    Staff members receive only the permissions assigned to their role. Admin/SuperAdmin roles require approval.
                  </p>
                </div>

                <div className="space-y-4 mb-5">
                  {[
                    { label: "Full Name", key: "name", type: "text", placeholder: "Enter full name" }, 
                    { label: "Email", key: "email", type: "email", placeholder: "staff@speedcopy.com" },
                    { label: "Phone", key: "phone", type: "tel", placeholder: "+91 9876543210" },
                    { label: "Password", key: "password", type: "password", placeholder: "Minimum 8 characters" }
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{f.label}</label>
                      <input 
                        type={f.type} 
                        value={form[f.key as keyof typeof form]}
                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" 
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Team</label>
                    <select value={form.team} onChange={e => setForm(p => ({ ...p, team: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900">
                      <option value="ops">Operations</option>
                      <option value="support">Support</option>
                      <option value="finance">Finance</option>
                      <option value="marketing">Marketing</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Role</label>
                    <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value as Role }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900">
                      <option value="">Select role</option>
                      {Object.keys(rolePermissions).map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    {form.role && ['Admin', 'SuperAdmin'].includes(form.role) && (
                      <p className="text-xs text-orange-600 mt-1 font-semibold">
                        ⚠️ This role requires approval workflow
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Permissions</label>
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <div className="grid grid-cols-3 bg-gray-50 border-b border-gray-200 px-3 py-2">
                        <span className="text-xs font-bold text-gray-500 uppercase">Module</span>
                        <span className="text-xs font-bold text-gray-500 uppercase text-center">Read</span>
                        <span className="text-xs font-bold text-gray-500 uppercase text-center">Write</span>
                      </div>
                      {permissionModules.map((mod, i) => (
                        <div key={mod.label}
                          className={`grid grid-cols-3 items-center px-3 py-2.5 ${i < permissionModules.length - 1 ? "border-b border-gray-100" : ""}`}>
                          <span className="text-sm font-semibold text-gray-700">{mod.label}</span>
                          <div className="flex justify-center">
                            <input
                              type="checkbox"
                              checked={form.permissions.includes(mod.read)}
                              onChange={() => togglePermission(mod.read)}
                              className="w-4 h-4 rounded cursor-pointer accent-gray-900"
                            />
                          </div>
                          <div className="flex justify-center">
                            {mod.write ? (
                              <input
                                type="checkbox"
                                checked={form.permissions.includes(mod.write)}
                                onChange={() => togglePermission(mod.write!)}
                                className="w-4 h-4 rounded cursor-pointer accent-gray-900"
                              />
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Scopes</label>
                    <div className="grid grid-cols-2 gap-2">
                      {scopeOptions.map(scope => (
                        <label key={scope.value}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition select-none ${
                            form.scopes.includes(scope.value)
                              ? "border-gray-900 bg-gray-900 text-white"
                              : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                          }`}>
                          <input
                            type="checkbox"
                            checked={form.scopes.includes(scope.value)}
                            onChange={() => toggleScope(scope.value)}
                            className="hidden"
                          />
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            form.scopes.includes(scope.value) ? "border-white" : "border-gray-300"
                          }`}>
                            {form.scopes.includes(scope.value) && (
                              <svg className="w-2.5 h-2.5 text-gray-900" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          <span className="text-xs font-semibold">{scope.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => {
                    setShowAdd(false);
                    setError(null);
                  }} 
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                    Cancel
                  </button>
                  <button onClick={add} disabled={!form.name || !form.email || !form.phone || !form.password || !form.role}
                    className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl disabled:opacity-40 transition"
                    style={{ backgroundColor: ADMIN_COLORS.primary }}>
                    Add Staff
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermissions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            {(() => {
              const member = mergedStaff.find(s => s.id === showPermissions);
              if (!member) return null;
              
              return (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{member.name} - Permissions</h2>
                      <p className="text-sm text-gray-500">Role: {member.role}</p>
                    </div>
                    <button onClick={() => setShowPermissions(null)}>
                      <X size={18} className="text-gray-400" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {member.permissions.map((perm: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-xl border border-gray-200">
                        <p className="text-sm font-bold text-gray-900 mb-3">{perm.module}</p>
                        <div className="grid grid-cols-4 gap-3">
                          {[
                            { label: 'Read', value: perm.read },
                            { label: 'Write', value: perm.write },
                            { label: 'Delete', value: perm.delete },
                            { label: 'Approve', value: perm.approve }
                          ].map(p => (
                            <div key={p.label} className="flex items-center gap-2">
                              {p.value ? (
                                <CheckCircle size={14} style={{ color: ADMIN_COLORS.success }} />
                              ) : (
                                <X size={14} style={{ color: ADMIN_COLORS.error }} />
                              )}
                              <span className="text-xs text-gray-600">{p.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowPermissions(null)}
                    className="w-full mt-6 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                  >
                    Close
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            {(() => {
              const member = mergedStaff.find(s => s.id === showEditRole);
              if (!member) return null;
              
              return (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Edit Role</h2>
                      <p className="text-sm text-gray-500">{member.name}</p>
                    </div>
                    <button onClick={() => {
                      setShowEditRole(null);
                      setEditRoleForm("");
                    }}>
                      <X size={18} className="text-gray-400" />
                    </button>
                  </div>

                  <div className="space-y-4 mb-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
                        Current Role: {member.role}
                      </label>
                      <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
                        New Role
                      </label>
                      <select 
                        value={editRoleForm} 
                        onChange={e => setEditRoleForm(e.target.value as Role)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900"
                      >
                        <option value="">Select new role</option>
                        {Object.keys(rolePermissions).map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      {editRoleForm && ['Admin', 'SuperAdmin'].includes(editRoleForm) && (
                        <p className="text-xs text-orange-600 mt-2 font-semibold">
                          ⚠️ This role requires approval workflow
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        setShowEditRole(null);
                        setEditRoleForm("");
                      }}
                      className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => handleUpdateRole(showEditRole)}
                      disabled={!editRoleForm || loading}
                      className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl disabled:opacity-40 transition"
                      style={{ backgroundColor: ADMIN_COLORS.primary }}
                    >
                      {loading ? "Updating..." : "Update Role"}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
}
