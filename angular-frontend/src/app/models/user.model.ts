export interface User {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  can_view_groups: boolean;
  created_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  remember: boolean;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

export interface UpdateProfileRequest {
  username: string;
  email: string;
}
