export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface DashboardData {
  computers: DashboardComputer[];
  groups: DashboardGroup[];
  user_roles: { [computerId: string]: string };
  enable_groups: boolean;
  enable_search: boolean;
  is_admin: boolean;
  user: {
    id: number;
    username: string;
    is_admin: boolean;
    can_view_groups: boolean;
  };
}

export interface DashboardComputer {
  id: number;
  name: string;
  mac_address: string;
  ip_address: string;
  description: string;
  status: string;
  os_type: string;
  has_ssh: boolean;
  ssh_auto_login: boolean;
  last_wol: string | null;
  last_shutdown: string | null;
  last_checked: string | null;
  group_ids: number[];
  role: string;
}

export interface DashboardGroup {
  id: number;
  name: string;
  description: string;
  color: string;
  icon: string;
  allow_wake: boolean;
  allow_shutdown: boolean;
  computer_ids: number[];
}

export interface HistoryData {
  wol_logs: WolLogEntry[];
  shutdown_logs: ShutdownLogEntry[];
  audit_logs: AuditLogEntry[];
}

export interface WolLogEntry {
  id: number;
  computer_name: string;
  username: string;
  timestamp: string;
  status: string;
}

export interface ShutdownLogEntry {
  id: number;
  computer_name: string;
  username: string;
  timestamp: string;
  status: string;
  error_message: string | null;
}

export interface AuditLogEntry {
  id: number;
  action: string;
  username: string;
  resource_type: string;
  resource_id: number;
  status: string;
  details: string;
  timestamp: string;
  ip_address: string;
}

export interface StatisticsResponse {
  success: boolean;
  stats: StatEntry[];
  days: number;
}

export interface StatEntry {
  id: number;
  name: string;
  os_type: string;
  current_status: string;
  uptime_pct: number;
  online_hours: number;
  wol_count: number;
  shutdown_count: number;
  timeline: { time: string; status: string }[];
}
