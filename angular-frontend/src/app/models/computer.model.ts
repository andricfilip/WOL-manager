export interface Computer {
  id: number;
  name: string;
  mac_address: string;
  ip_address: string;
  description: string;
  status: 'online' | 'offline' | 'unknown';
  os_type: 'windows' | 'linux' | 'unknown';
  has_ssh: boolean;
  ssh_host: string;
  ssh_port: number;
  ssh_username: string;
  ssh_auto_login: boolean;
  last_wol: string | null;
  last_shutdown: string | null;
  last_checked: string | null;
  created_at: string;
  created_by_id: number | null;
  assigned_users?: AssignedUser[];
  groups?: ComputerGroup[];
}

export interface AssignedUser {
  id: number;
  username: string;
  role: string;
}

export interface ComputerGroup {
  id: number;
  name: string;
  description: string;
  color: string;
  icon: string;
  allow_wake: boolean;
  allow_shutdown: boolean;
  computers: Computer[];
  created_at: string;
}

export interface ComputerStatus {
  id: number;
  name: string;
  status: string;
  is_online: boolean;
  has_ssh: boolean;
  last_checked: string;
}

export interface WolLog {
  id: number;
  computer_name: string;
  username: string;
  timestamp: string;
  status: string;
}

export interface ShutdownLog {
  id: number;
  computer_name: string;
  username: string;
  timestamp: string;
  status: string;
  error_message: string | null;
}

export interface AuditLog {
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

export interface StatisticsData {
  id: number;
  name: string;
  os_type: string;
  current_status: string;
  uptime_pct: number;
  online_hours: number;
  wol_count: number;
  shutdown_count: number;
  timeline: TimelineEntry[];
}

export interface TimelineEntry {
  time: string;
  status: string;
}

export interface AppSettings {
  enable_groups: boolean;
  enable_search: boolean;
  app_language?: 'sr' | 'en';
  language?: string;
  app_title?: string;
  max_computers_per_page?: number;
}

export interface ComputerFormData {
  name: string;
  mac_address: string;
  ip_address: string;
  description: string;
  os_type: string;
  ssh_host: string;
  ssh_port: number;
  ssh_username: string;
  ssh_password: string;
  ssh_auto_login: boolean;
  assigned_users: { user_id: number; role: string }[];
}

export interface GroupFormData {
  name: string;
  description: string;
  color: string;
  icon: string;
  allow_wake: boolean;
  allow_shutdown: boolean;
  computer_ids: number[];
}
