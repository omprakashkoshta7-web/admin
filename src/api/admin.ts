import { request } from './apiClient';

export type AdminDashboardResponse = {
  totalOrders?: number;
  totalRevenue?: number;
  activeVendors?: number;
  activeCustomers?: number;
  pendingOrders?: number;
  completedOrders?: number;
  cancelledOrders?: number;
  refundCount?: number;
  walletBalance?: number;
  [key: string]: unknown;
};

export const getAdminDashboard = async (): Promise<AdminDashboardResponse> => {
  return await request('/admin/dashboard');
};

export const getAdminOrders = async (params?: {
  status?: string;
  vendorId?: string;
  userId?: string;
  page?: number;
  limit?: number;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/orders${query}`);
};

export const getAdminOrderById = async (id: string) => {
  return await request(`/admin/orders/${id}`);
};

export const reassignOrderVendor = async (id: string, data: { vendorId: string; storeId?: string }) => {
  return await request(`/admin/orders/${id}/reassign-vendor`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const cancelAdminOrder = async (id: string, reason?: string) => {
  return await request(`/admin/orders/${id}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
};

export const refundAdminOrder = async (id: string, refundId?: string) => {
  return await request(`/admin/orders/${id}/refund`, {
    method: 'PATCH',
    body: JSON.stringify({ refundId }),
  });
};

export const getAdminVendors = async (params?: {
  isApproved?: boolean;
  isSuspended?: boolean;
  page?: number;
  limit?: number;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/vendors${query}`);
};

export const getAdminVendorById = async (id: string) => {
  return await request(`/admin/vendors/${id}`);
};

export const suspendAdminVendor = async (id: string, reason?: string) => {
  return await request(`/admin/vendors/${id}/suspend`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
};

export const resumeAdminVendor = async (id: string, reason?: string) => {
  return await request(`/admin/vendors/${id}/suspend`, {
    method: 'PATCH',
    body: JSON.stringify({ isSuspended: false, reason }),
  });
};

export const approveAdminVendor = async (id: string, reason?: string) => {
  return await request(`/admin/vendors/${id}/approve`, {
    method: 'PATCH',
    body: JSON.stringify({ approved: true, reason }),
  });
};

export const rejectAdminVendor = async (id: string, reason?: string) => {
  return await request(`/admin/vendors/${id}/approve`, {
    method: 'PATCH',
    body: JSON.stringify({ approved: false, reason }),
  });
};

export const setAdminVendorPriority = async (id: string, priority: number) => {
  return await request(`/admin/vendors/${id}/priority`, {
    method: 'PATCH',
    body: JSON.stringify({ priority }),
  });
};

export const createAdminVendor = async (data: {
  name: string;
  email: string;
  phone: string;
  password: string;
  location?: string;
  tier?: 'gold' | 'silver' | 'bronze';
}) => {
  return await request('/admin/vendors', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getAdminCustomers = async (params?: {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/customers${query}`);
};

export type AdminCustomerDetailResponse = {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinedDate: string;
  riskScore: number;
  status: string;
  orders: {
    total: number;
    completed: number;
    avgOrderValue: number;
    recentOrders: Array<{
      id: string;
      date: string;
      amount: number;
      status: string;
      type?: string;
    }>;
  };
  wallet: {
    balance: number;
    totalSpent: number;
    refundsReceived: number;
    transactions: Array<{
      id: string;
      date: string;
      amount: number;
      type: string;
      description: string;
      balance?: number;
    }>;
  };
  support: {
    ticketsRaised: number;
    openTickets: number;
    avgResolutionTime: number;
    tickets: Array<{
      id: string;
      date: string;
      subject: string;
      status: string;
      priority: string;
    }>;
  };
  activityLog: Array<{
    timestamp: string;
    action: string;
    type: string;
  }>;
  [key: string]: unknown;
};

export const getAdminCustomerById = async (id: string): Promise<AdminCustomerDetailResponse> => {
  return await request(`/admin/customers/${id}`);
};

export const restrictAdminCustomer = async (id: string, isActive: boolean, reason?: string) => {
  return await request(`/admin/customers/${id}/restrict`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive, reason }),
  });
};

export type AdminStaffResponse = {
  staff?: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    active: boolean;
    requiresApproval: boolean;
    permissions: string[];
    lastLogin?: string;
    createdAt: string;
  }>;
  [key: string]: unknown;
};

export const getAdminStaff = async (params?: {
  page?: number;
  limit?: number;
}): Promise<AdminStaffResponse> => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/staff${query}`);
};

export const createAdminStaff = async (data: { 
  name: string; 
  email: string; 
  phone?: string;
  password: string;
  role?: string;
  team?: string;
  permissions?: string[];
  scopes?: string[];
}) => {
  return await request('/admin/staff', {
    method: 'POST',
    body: JSON.stringify({
      name: data.name,
      email: data.email,
      phone: data.phone || '',
      password: data.password,
      role: data.role || 'staff',
      team: data.team || 'ops',
      permissions: data.permissions || [],
      scopes: data.scopes || [],
    }),
  });
};

export const updateAdminStaffRole = async (id: string, role: string) => {
  return await request(`/admin/staff/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
};

export const updateAdminStaffStatus = async (id: string, isActive: boolean, reason?: string) => {
  return await request(`/admin/staff/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive, reason }),
  });
};

export const deleteAdminStaff = async (id: string) => {
  return await request(`/admin/staff/${id}`, {
    method: 'DELETE',
  });
};

export type AdminControlStateResponse = {
  vendor_kill_switch?: boolean;
  system_kill_switch?: boolean;
  feature_flags?: Array<{
    id: string;
    name: string;
    desc: string;
    enabled: boolean;
  }>;
  [key: string]: unknown;
};

export const getAdminControlState = async (): Promise<AdminControlStateResponse> => {
  return await request('/admin/control');
};

export const setOrderIntake = async (enabled: boolean) => {
  return await request('/admin/control/order-intake', {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
};

export const setCityPause = async (city: string, paused: boolean, reason?: string) => {
  return await request('/admin/control/city-pause', {
    method: 'PATCH',
    body: JSON.stringify({ city, paused, ...(reason ? { reason } : {}) }),
  });
};

export const setFeatureFlags = async (flags: Record<string, boolean>) => {
  return await request('/admin/control/feature-flags', {
    method: 'PATCH',
    body: JSON.stringify(flags),
  });
};

export type AdminReportsResponse = {
  revenue_by_day?: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  orders_by_flow?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  sla_compliance?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  orders_by_status?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  [key: string]: unknown;
};

export const getAdminReports = async (params?: {
  from?: string;
  to?: string;
  sla_metrics?: boolean;
}): Promise<AdminReportsResponse> => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/reports${query}`);
};

export const getAdminAuditLogs = async () => {
  return await request('/admin/audit-logs');
};

// Delivery partner management
export const getAdminDeliveryPartners = async (params?: {
  status?: string;
  city?: string;
  page?: number;
  limit?: number;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/delivery/partners${query}`);
};

export const getAdminDeliveryPartnerById = async (id: string) => {
  return await request(`/admin/delivery/partners/${id}`);
};

export const createAdminDeliveryPartner = async (data: { name: string; email?: string; phone?: string; vehicleType?: string; zoneAssignments?: string[] }) => {
  const payload: any = {
    name: data.name || '',
    email: data.email || `${(data.name || 'partner').replace(/\s+/g, '').toLowerCase()}@speedcopy.delivery`,
    phone: data.phone || '0000000000',
    vehicleType: data.vehicleType || 'bike',
    zoneAssignments: Array.isArray(data.zoneAssignments) ? data.zoneAssignments : [],
  };

  return await request('/admin/delivery/partners', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const updateAdminDeliveryPartner = async (id: string, data: Record<string, unknown>) => {
  const payload: any = {};
  
  if ((data as any).name) payload.name = (data as any).name;
  if ((data as any).phone) payload.phone = (data as any).phone;
  if ((data as any).vehicleType) payload.vehicleType = (data as any).vehicleType;

  return await request(`/admin/delivery/partners/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

export const deleteAdminDeliveryPartner = async (id: string) => {
  return await request(`/admin/delivery/partners/${id}`, {
    method: 'DELETE',
  });
};

export const suspendAdminDeliveryPartner = async (id: string, suspend = true) => {
  const path = `/admin/delivery/partners/${id}/${suspend ? 'suspend' : 'resume'}`;
  const options: any = { method: 'PATCH' };
  if (suspend) {
    options.body = JSON.stringify({ reason: 'suspended via admin UI' });
  }
  return await request(path, options);
};

export const setAdminDeliveryPayoutRate = async (id: string, rate: string) => {
  return await request(`/admin/delivery/partners/${id}/payout-rate`, {
    method: 'PATCH',
    body: JSON.stringify({ rate }),
  });
};

// Additional functions for compatibility
export type AdminCategoriesResponse = {
  categories?: Array<{
    id: string;
    name: string;
    description: string;
    active: boolean;
    products: number;
    subcategories: Array<{
      id: string;
      name: string;
      products: number;
    }>;
  }>;
  [key: string]: unknown;
};

export const getProductCategories = async (params?: {
  page?: number;
  limit?: number;
  flowType?: string;
}): Promise<AdminCategoriesResponse> => {
  const allParams = { showAll: 'true', ...params };
  const query = '?' + new URLSearchParams(
    Object.entries(allParams).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString();
  return await request(`/products/categories${query}`);
};

export const createProductCategory = async (data: {
  name: string;
  slug: string;
  description: string;
  icon: string;
  image?: string;
  flowType: string;
}) => {
  return await request('/products/categories', {
    method: 'POST',
    body: JSON.stringify({
      name: data.name,
      slug: data.slug,
      description: data.description,
      image: data.image || '',
      flowType: data.flowType,
    }),
  });
};

export const updateProductCategory = async (id: string, data: {
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  image?: string;
  flowType?: string;
  active?: boolean;
  isActive?: boolean;
}) => {
  return await request(`/products/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: data.name,
      slug: data.slug,
      description: data.description,
      image: data.image ?? data.icon,
      flowType: data.flowType,
      isActive: data.isActive ?? data.active,
    }),
  });
};

export const deleteProductCategory = async (id: string) => {
  return await request(`/products/categories/${id}`, {
    method: 'DELETE',
  });
};

export const createProduct = async (data: {
  name: string;
  category: string;
  basePrice: number;
  unit?: string;
  description?: string;
  flowType?: string;
  slug?: string;
}) => {
  // Auto-generate slug if not provided
  const payload = {
    ...data,
    slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
  };
  
  return await request('/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const updateProduct = async (id: string, data: {
  name?: string;
  category?: string;
  basePrice?: number;
  unit?: string;
  description?: string;
  active?: boolean;
  flowType?: string;
}) => {
  return await request(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteProduct = async (id: string) => {
  return await request(`/products/${id}`, {
    method: 'DELETE',
  });
};

export const getProducts = async (params?: {
  flowType?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/products${query}`);
};

// ─── Business Printing ────────────────────────────────────────────────────────

export const getBusinessPrintingProducts = async (params?: {
  type?: string;
  page?: number;
  limit?: number;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/business-printing/products${query}`);
};

export const createBusinessPrintingProduct = async (data: {
  name: string;
  businessPrintType: string;
  basePrice: number;
  description?: string;
  images?: string[];
  thumbnail?: string;
  designMode?: string;
  isFeatured?: boolean;
}) => {
  return await request('/products', {
    method: 'POST',
    body: JSON.stringify({ ...data, flowType: 'printing' }),
  });
};

export const updateBusinessPrintingProduct = async (id: string, data: Record<string, unknown>) => {
  return await request(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteBusinessPrintingProduct = async (id: string) => {
  return await request(`/products/${id}`, {
    method: 'DELETE',
  });
};

export const getWalletOverview = async () => {
  return await request('/admin/finance/summary');
};

export const getWalletLedger = async (params?: {
  page?: number;
  limit?: number;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/wallet/ledger${query}`);
};

export const getAdminFinanceSummary = async () => {
  return await request('/admin/finance/summary');
};

export const processAdminRefund = async (orderId: string, data: {
  amount: number;
  customerId: string;
  reason?: string;
}) => {
  return await request(`/admin/orders/${orderId}/refund`, {
    method: 'PATCH',
    body: JSON.stringify({ refundId: `refund_${Date.now()}`, reason: data.reason }),
  });
};

export const updateAdminOrderStatus = async (id: string, data: Record<string, unknown>) => {
  return await request(`/admin/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const updateAdminControl = async (path: string, payload: Record<string, unknown>) => {
  return await request(`/admin/control/${path}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
};

export const getTickets = async (params?: {
  page?: number;
  limit?: number;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/tickets${query}`);
};

export const getTicketSummary = async () => {
  return await request('/admin/tickets/stats');
};

export const getAuthMe = async () => {
  return await request('/auth/me');
};

// ─── TICKET MANAGEMENT ─────────────────────────────────────

export const resolveTicket = async (ticketId: string, resolution: string, resolutionNotes?: string) => {
  return await request(`/admin/tickets/${ticketId}/resolve`, {
    method: 'PATCH',
    body: JSON.stringify({ resolution, resolutionNotes }),
  });
};

export const assignTicket = async (ticketId: string, staffId: string) => {
  return await request(`/admin/tickets/${ticketId}/assign`, {
    method: 'PATCH',
    body: JSON.stringify({ assignedTo: staffId }),
  });
};

export const addTicketMessage = async (ticketId: string, content: string) => {
  return await request(`/admin/tickets/${ticketId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message: content }),
  });
};

export const getTicketStats = async (params?: { from?: string; to?: string }) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/tickets/stats${query}`);
};

export const getAgentPerformance = async (params?: { from?: string; to?: string }) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/tickets/agents/performance${query}`);
};

export const getTicketDetail = async (ticketId: string) => {
  return await request(`/admin/tickets/${ticketId}`);
};

export const escalateTicket = async (ticketId: string, reason: string) => {
  return await request(`/admin/tickets/${ticketId}/escalate`, {
    method: 'PATCH',
    body: JSON.stringify({ message: reason }),
  });
};

// ─── SLA MANAGEMENT ────────────────────────────────────────

export const getSLARisks = async (params?: {
  status?: string;
  severity?: string;
  page?: number;
  limit?: number;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/sla/risks${query}`);
};

export const escalateOrder = async (orderId: string, note: string, priority?: string, assignTo?: string) => {
  return await request(`/admin/sla/${orderId}/escalate`, {
    method: 'POST',
    body: JSON.stringify({ note, priority, assignTo }),
  });
};

export const compensateOrder = async (orderId: string, compensationType: string, compensationValue: number, reason?: string) => {
  return await request(`/admin/sla/${orderId}/compensate`, {
    method: 'POST',
    body: JSON.stringify({ compensationType, compensationValue, reason }),
  });
};

export const getSLAPolicies = async () => {
  return await request('/admin/sla/policies');
};

export const createSLAPolicy = async (data: {
  name: string;
  description?: string;
  flowType: string;
  fromStatus: string;
  toStatus: string;
  maxMinutes: number;
  warningMinutes: number;
  escalationLevel?: string;
  compensationType: string;
  compensationValue: number;
}) => {
  return await request('/admin/sla/policies', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getSLAMetrics = async (params?: { from?: string; to?: string }) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/sla/metrics${query}`);
};

export const getSLABreaches = async (params?: {
  vendorId?: string;
  page?: number;
  limit?: number;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/sla/breaches${query}`);
};

// ─── DELIVERY PARTNER ENHANCEMENTS ─────────────────────────

export const assignDeliveryZones = async (partnerId: string, zones: any[]) => {
  return await request(`/admin/delivery/partners/${partnerId}/zones`, {
    method: 'POST',
    body: JSON.stringify({ zones }),
  });
};

export const setDeliveryPayoutRate = async (partnerId: string, payoutRate: number, effectiveFrom?: string) => {
  return await request(`/admin/delivery/partners/${partnerId}/payout-rate`, {
    method: 'PATCH',
    body: JSON.stringify({ payoutRate, effectiveFrom }),
  });
};

export const getDeliverySLAMetrics = async (params?: {
  partnerId?: string;
  from?: string;
  to?: string;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/delivery/sla-metrics${query}`);
};

export const getDeliveryPartnerAnalytics = async (partnerId: string, params?: {
  from?: string;
  to?: string;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/delivery/partners/${partnerId}/analytics${query}`);
};

export const resumeDeliveryPartner = async (partnerId: string) => {
  return await request(`/admin/delivery/partners/${partnerId}/resume`, {
    method: 'PATCH',
  });
};

// ─── COUPON MANAGEMENT ─────────────────────────────────────

export const getCoupons = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/coupons${query}`);
};

export const createCoupon = async (data: {
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscount?: number;
  minOrderValue?: number;
  applicableFlows?: string[];
  usageLimit?: number;
  perUserLimit?: number;
  isActive?: boolean;
  expiresAt?: string;
}) => {
  return await request('/admin/coupons', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateCoupon = async (id: string, data: Record<string, unknown>) => {
  return await request(`/admin/coupons/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteCoupon = async (id: string) => {
  return await request(`/admin/coupons/${id}`, {
    method: 'DELETE',
  });
};

export const getCouponUsage = async (id: string) => {
  return await request(`/admin/coupons/${id}/usage`);
};

// ─── Profiles API ──────────────────────────────────────────

export const getAdminProfiles = async (params?: {
  status?: string;
  team?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/profiles${query}`);
};

export const createAdminProfile = async (data: {
  fullName: string;
  emailAddress: string;
  password: string;
  role?: string;
  team?: string;
  permissions?: string[];
  scopes?: string[];
  phone?: string;
}) => {
  return await request('/admin/profiles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getAdminProfileById = async (id: string) => {
  return await request(`/admin/profiles/${id}`);
};

export const updateAdminProfile = async (id: string, data: {
  fullName?: string;
  emailAddress?: string;
  phone?: string;
  role?: string;
  team?: string;
  permissions?: string[];
  scopes?: string[];
  isActive?: boolean;
}) => {
  return await request(`/admin/profiles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const deleteAdminProfile = async (id: string) => {
  return await request(`/admin/profiles/${id}`, {
    method: 'DELETE',
  });
};

export const getMyAdminProfile = async () => {
  return await request('/admin/profile');
};

export const updateMyAdminProfile = async (data: {
  fullName?: string;
  emailAddress?: string;
  phone?: string;
  role?: string;
  team?: string;
}) => {
  return await request('/admin/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};
