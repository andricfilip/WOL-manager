import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, DashboardData, HistoryData, StatisticsResponse } from '../models/api.model';
import { Computer, ComputerStatus, ComputerFormData, ComputerGroup, GroupFormData, AppSettings } from '../models/computer.model';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(private http: HttpClient) {}

  // ==================== Dashboard ====================
  getDashboard(): Observable<ApiResponse<DashboardData>> {
    return this.http.get<ApiResponse<DashboardData>>('/api/angular/dashboard');
  }

  sendWol(computerId: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>('/dashboard', { computer_id: computerId });
  }

  shutdownComputer(computerId: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>('/api/shutdown', { computer_id: computerId });
  }

  wakeGroup(groupId: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`/api/groups/${groupId}/wake`, {});
  }

  // ==================== Computer Status ====================
  getComputerStatus(computerId: number): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`/api/computer/${computerId}/status`);
  }

  getAllComputerStatuses(): Observable<ApiResponse<{ results: ComputerStatus[] }>> {
    return this.http.get<ApiResponse<{ results: ComputerStatus[] }>>('/api/computers/status');
  }

  getComputer(computerId: number): Observable<ApiResponse<{ computer: Computer }>> {
    return this.http.get<ApiResponse<{ computer: Computer }>>(`/api/computers/${computerId}`);
  }

  // ==================== History ====================
  getHistory(params?: { search?: string; date_from?: string; date_to?: string; type?: string }): Observable<ApiResponse<HistoryData>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) httpParams = httpParams.set(key, value);
      });
    }
    return this.http.get<ApiResponse<HistoryData>>('/api/angular/history', { params: httpParams });
  }

  deleteHistory(option: string, fromDate?: string, toDate?: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>('/admin/delete-logs', {
      option,
      from_date: fromDate,
      to_date: toDate
    });
  }

  // ==================== Statistics ====================
  getStatistics(days: number = 7): Observable<StatisticsResponse> {
    return this.http.get<StatisticsResponse>(`/api/statistics/data?days=${days}`);
  }

  // ==================== Admin: Computers ====================
  getAdminComputers(): Observable<ApiResponse<{ computers: Computer[] }>> {
    return this.http.get<ApiResponse<{ computers: Computer[] }>>('/api/angular/admin/computers');
  }

  getAdminComputer(id: number): Observable<ApiResponse<{ computer: Computer; users: User[]; user_roles: any }>> {
    return this.http.get<ApiResponse<{ computer: Computer; users: User[]; user_roles: any }>>(`/api/angular/admin/computers/${id}`);
  }

  createComputer(data: ComputerFormData): Observable<ApiResponse> {
    return this.http.post<ApiResponse>('/api/angular/admin/computers', data);
  }

  updateComputer(id: number, data: ComputerFormData): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`/api/angular/admin/computers/${id}`, data);
  }

  deleteComputer(id: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`/admin/computers/${id}/delete`, {});
  }

  // ==================== Admin: Users ====================
  getAdminUsers(): Observable<ApiResponse<{ users: User[] }>> {
    return this.http.get<ApiResponse<{ users: User[] }>>('/api/angular/admin/users');
  }

  createUser(data: { username: string; email: string; password: string; is_admin: boolean }): Observable<ApiResponse> {
    return this.http.post<ApiResponse>('/api/angular/admin/users', data);
  }

  editUser(id: number, data: { username: string; email: string }): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`/admin/users/${id}/edit`, data);
  }

  toggleAdmin(userId: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`/admin/users/${userId}/toggle-admin`, {});
  }

  toggleGroups(userId: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`/admin/users/${userId}/toggle-groups`, {});
  }

  deleteUser(userId: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`/admin/users/${userId}/delete`, {});
  }

  // ==================== Admin: Groups ====================
  getAdminGroups(): Observable<ApiResponse<{ groups: ComputerGroup[] }>> {
    return this.http.get<ApiResponse<{ groups: ComputerGroup[] }>>('/api/angular/admin/groups');
  }

  getAdminGroup(id: number): Observable<ApiResponse<{ group: ComputerGroup; computers: Computer[] }>> {
    return this.http.get<ApiResponse<{ group: ComputerGroup; computers: Computer[] }>>(`/api/angular/admin/groups/${id}`);
  }

  createGroup(data: GroupFormData): Observable<ApiResponse> {
    return this.http.post<ApiResponse>('/api/angular/admin/groups', data);
  }

  updateGroup(id: number, data: GroupFormData): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`/api/angular/admin/groups/${id}`, data);
  }

  deleteGroup(id: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`/admin/groups/${id}/delete`, {});
  }

  // ==================== Admin: Settings ====================
  getSettings(): Observable<ApiResponse<AppSettings>> {
    return this.http.get<ApiResponse<AppSettings>>('/api/angular/admin/settings');
  }

  saveSettings(settings: AppSettings): Observable<ApiResponse> {
    return this.http.post<ApiResponse>('/api/angular/admin/settings', settings);
  }

  clearLogs(): Observable<ApiResponse> {
    return this.http.post<ApiResponse>('/api/angular/admin/clear-logs', {});
  }

  // ==================== SSH Preferences ====================
  setSshPreference(computerId: number, autoLogin: boolean): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`/api/computers/${computerId}/ssh-preference`, {
      ssh_auto_login: autoLogin
    });
  }
}
