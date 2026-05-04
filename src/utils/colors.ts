// SpeedCopy Admin Portal - Consistent Color Scheme
export const ADMIN_COLORS = {
  // Primary Brand Colors
  primary: "#1e293b",
  primaryHover: "#334155",
  primaryLight: "#475569",
  
  // Accent Colors
  accent: "#6366f1",
  accentLight: "#818cf8",
  
  // Status Colors
  success: "#10b981",
  successLight: "#34d399",
  successBg: "#ecfdf5",
  successBorder: "#a7f3d0",
  
  warning: "#f59e0b",
  warningLight: "#fbbf24",
  warningBg: "#fffbeb",
  warningBorder: "#fde68a",
  
  error: "#ef4444",
  errorLight: "#f87171",
  errorBg: "#fef2f2",
  errorBorder: "#fecaca",
  
  info: "#3b82f6",
  infoLight: "#60a5fa",
  infoBg: "#eff6ff",
  infoBorder: "#bfdbfe",
  
  // Critical Alert Colors
  critical: "#dc2626",
  criticalBg: "#fef2f2",
  criticalBorder: "#fecaca",
  
  // Neutral Colors
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#4b5563",
  gray700: "#374151",
  gray800: "#1f2937",
  gray900: "#111827",
  
  // Background Colors
  background: "#f8fafc",
  surface: "rgba(255, 255, 255, 0.98)",
  surfaceBorder: "rgba(203, 213, 225, 0.6)",
  
  // Role-based Colors
  superAdmin: {
    bg: "#fef3c7",
    text: "#d97706",
    border: "#fcd34d"
  },
  admin: {
    bg: "#dbeafe",
    text: "#2563eb",
    border: "#93c5fd"
  },
  moderator: {
    bg: "#f3e8ff",
    text: "#7c3aed",
    border: "#c4b5fd"
  },
  support: {
    bg: "#ecfdf5",
    text: "#059669",
    border: "#a7f3d0"
  }
} as const;

// Utility functions for consistent styling
export const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
    case 'completed':
    case 'delivered':
    case 'verified':
    case 'approved':
    case 'online':
      return {
        bg: ADMIN_COLORS.successBg,
        text: ADMIN_COLORS.success,
        border: ADMIN_COLORS.successBorder
      };
    case 'pending':
    case 'in_progress':
    case 'processing':
    case 'assigned':
    case 'production':
      return {
        bg: ADMIN_COLORS.warningBg,
        text: ADMIN_COLORS.warning,
        border: ADMIN_COLORS.warningBorder
      };
    case 'failed':
    case 'rejected':
    case 'error':
    case 'cancelled':
    case 'suspended':
    case 'offline':
      return {
        bg: ADMIN_COLORS.errorBg,
        text: ADMIN_COLORS.error,
        border: ADMIN_COLORS.errorBorder
      };
    case 'critical':
    case 'sla_breach':
    case 'emergency':
      return {
        bg: ADMIN_COLORS.criticalBg,
        text: ADMIN_COLORS.critical,
        border: ADMIN_COLORS.criticalBorder
      };
    default:
      return {
        bg: ADMIN_COLORS.infoBg,
        text: ADMIN_COLORS.info,
        border: ADMIN_COLORS.infoBorder
      };
  }
};

export const getRoleColor = (role: 'SuperAdmin' | 'Admin' | 'Moderator' | 'Support' | 'Finance' | 'Operations' | 'Marketing'): { bg: string; text: string; border: string } => {
  switch (role) {
    case 'SuperAdmin':
      return ADMIN_COLORS.superAdmin;
    case 'Admin':
      return ADMIN_COLORS.admin;
    case 'Moderator':
      return ADMIN_COLORS.moderator;
    case 'Support':
    case 'Finance':
    case 'Operations':
    case 'Marketing':
    default:
      return ADMIN_COLORS.support;
  }
};

export const getSLARiskColor = (risk: 'critical' | 'warning' | 'normal') => {
  switch (risk) {
    case 'critical':
      return {
        bg: ADMIN_COLORS.criticalBg,
        text: ADMIN_COLORS.critical,
        border: ADMIN_COLORS.criticalBorder
      };
    case 'warning':
      return {
        bg: ADMIN_COLORS.warningBg,
        text: ADMIN_COLORS.warning,
        border: ADMIN_COLORS.warningBorder
      };
    default:
      return {
        bg: ADMIN_COLORS.successBg,
        text: ADMIN_COLORS.success,
        border: ADMIN_COLORS.successBorder
      };
  }
};