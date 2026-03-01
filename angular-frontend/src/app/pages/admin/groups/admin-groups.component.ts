import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { NotificationService } from '../../../services/notification.service';
import { ComputerGroup, GroupFormData, Computer } from '../../../models/computer.model';

@Component({
  selector: 'app-admin-groups',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="section">
      <div class="section-header">
        <h2>📁 Groups</h2>
        <button class="btn btn-primary btn-sm" (click)="showForm = true; resetForm()">+ Add Group</button>
      </div>

      <div *ngIf="loading" class="loading"><div class="loader"></div></div>

      <div *ngIf="!loading && groups.length === 0" class="empty">No groups found</div>

      <!-- Groups list -->
      <div *ngIf="!loading" class="groups-grid">
        <div *ngFor="let g of groups" class="group-card">
          <div class="group-color" [style.background]="g.color"></div>
          <div class="group-body">
            <div class="group-top">
              <h3>{{ g.name }}</h3>
              <div class="group-actions">
                <button class="btn btn-outline btn-xs" (click)="editGroup(g)">✏️</button>
                <button class="btn btn-danger btn-xs" (click)="deleteGroup(g)">🗑️</button>
              </div>
            </div>
            <p *ngIf="g.description" class="group-desc">{{ g.description }}</p>
            <div class="group-meta">
              <span class="meta-item">💻 {{ g.computers?.length || 0 }} computers</span>
              <span class="meta-item" *ngIf="g.allow_wake">⚡ Wake</span>
              <span class="meta-item" *ngIf="g.allow_shutdown">🔌 Shutdown</span>
            </div>
            <div class="group-computers" *ngIf="g.computers?.length">
              <span *ngFor="let c of g.computers.slice(0, 5)" class="computer-chip">{{ c.name }}</span>
              <span *ngIf="g.computers.length > 5" class="more-chip">+{{ g.computers.length - 5 }} more</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Add/Edit Group Form Modal -->
      <div *ngIf="showForm" class="modal-overlay" (click)="showForm = false">
        <div class="modal-card large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ isEditing ? '✏️ Edit Group' : '➕ Add Group' }}</h2>
            <button class="modal-close" (click)="showForm = false">×</button>
          </div>
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group">
                <label>Name</label>
                <input type="text" [(ngModel)]="form.name" placeholder="Group name">
              </div>
              <div class="form-group">
                <label>Color</label>
                <input type="color" [(ngModel)]="form.color" class="color-input">
              </div>
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea [(ngModel)]="form.description" placeholder="Optional description" rows="2"></textarea>
            </div>
            <div class="form-group">
              <label>Icon (FontAwesome class)</label>
              <input type="text" [(ngModel)]="form.icon" placeholder="fas fa-folder">
            </div>
            <div class="form-grid">
              <label class="check-label">
                <input type="checkbox" [(ngModel)]="form.allow_wake">
                <span class="checkmark"></span>
                <span class="check-text">Allow Wake</span>
              </label>
              <label class="check-label">
                <input type="checkbox" [(ngModel)]="form.allow_shutdown">
                <span class="checkmark"></span>
                <span class="check-text">Allow Shutdown</span>
              </label>
            </div>

            <div class="form-group" style="margin-top: 16px">
              <label>Assign Computers</label>
              <div class="computers-list">
                <div *ngFor="let c of allComputers" class="computer-row">
                  <label class="check-label">
                    <input type="checkbox" [checked]="form.computer_ids.includes(c.id)"
                           (change)="toggleComputer(c.id, $event)">
                    <span class="checkmark"></span>
                    <span class="check-text">{{ c.name }} <small>({{ c.ip_address || c.mac_address }})</small></span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showForm = false">Cancel</button>
            <button class="btn btn-primary" (click)="submitForm()" [disabled]="saving">
              {{ saving ? 'Saving...' : (isEditing ? 'Update' : 'Create') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .section-header h2 { margin: 0; font-size: 1.3rem; font-weight: 700; color: var(--text-heading); }
    .btn { padding: 10px 20px; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; display: inline-flex; align-items: center; gap: 4px; }
    .btn-sm { padding: 8px 16px; font-size: 0.8rem; }
    .btn-xs { padding: 6px 10px; font-size: 0.75rem; }
    .btn-primary { background: var(--accent); color: white; }
    .btn-outline { background: var(--bg-card); border: 1px solid var(--border); color: var(--text-secondary); }
    .btn-danger { background: #ef4444; color: white; }
    .btn-secondary { background: var(--bg-badge); color: var(--text-secondary); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .loading { text-align: center; padding: 60px; }
    .loader { width: 40px; height: 40px; border: 4px solid var(--loader-track); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty { text-align: center; padding: 60px; color: var(--text-muted); }

    .groups-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
    .group-card { background: var(--bg-card); border-radius: 14px; overflow: hidden; box-shadow: var(--shadow); border: 1px solid var(--border); display: flex; }
    .group-color { width: 6px; flex-shrink: 0; }
    .group-body { padding: 18px; flex: 1; }
    .group-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
    .group-top h3 { margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text-heading); }
    .group-actions { display: flex; gap: 6px; }
    .group-desc { font-size: 0.85rem; color: var(--text-muted); margin: 0 0 10px; }
    .group-meta { display: flex; gap: 12px; margin-bottom: 10px; }
    .meta-item { font-size: 0.75rem; color: var(--text-muted); }
    .group-computers { display: flex; flex-wrap: wrap; gap: 4px; }
    .computer-chip { background: var(--chip-bg); color: var(--chip-text); padding: 3px 8px; border-radius: 6px; font-size: 0.7rem; }
    .more-chip { font-size: 0.7rem; color: var(--text-muted); padding: 3px 0; }

    .modal-overlay { position: fixed; inset: 0; background: var(--bg-overlay); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 16px; }
    .modal-card { background: var(--bg-card); border-radius: 16px; width: 100%; max-width: 440px; overflow: hidden; max-height: calc(100vh - 32px); display: flex; flex-direction: column; border: 1px solid var(--border); }
    .modal-card.large { max-width: 560px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
    .modal-header h2 { margin: 0; font-size: 1.1rem; color: var(--text-heading); }
    .modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted); padding: 4px; line-height: 1; }
    .modal-close:hover { color: var(--text-primary); }
    .modal-body { padding: 24px; overflow-y: auto; flex: 1; }
    .modal-footer { display: flex; gap: 10px; justify-content: flex-end; padding: 16px 24px; background: var(--bg-page); border-top: 1px solid var(--border); flex-shrink: 0; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .form-group { margin-bottom: 14px; }
    .form-group label { display: block; font-weight: 600; margin-bottom: 6px; color: var(--text-label); font-size: 0.8rem; }
    .form-group input, .form-group textarea {
      width: 100%; padding: 10px 14px; border: 2px solid var(--border); border-radius: 10px;
      font-size: 0.9rem; outline: none; box-sizing: border-box;
      background: var(--bg-input); color: var(--text-primary); transition: border-color 0.2s;
    }
    .form-group input:focus, .form-group textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
    .form-group textarea { resize: vertical; font-family: inherit; }
    .color-input { height: 44px; padding: 4px !important; cursor: pointer; }

    /* Custom checkbox */
    .check-label {
      display: flex; align-items: center; gap: 10px;
      cursor: pointer; font-size: 0.9rem; color: var(--text-secondary); user-select: none;
    }
    .check-label input { position: absolute; opacity: 0; width: 0; height: 0; }
    .checkmark {
      width: 20px; height: 20px; border: 2px solid var(--border); border-radius: 6px;
      background: var(--bg-input); flex-shrink: 0; transition: all 0.2s; position: relative;
    }
    .check-label input:checked ~ .checkmark { background: var(--accent); border-color: var(--accent); }
    .checkmark::after {
      content: ''; position: absolute; display: none;
      left: 6px; top: 2px; width: 5px; height: 10px;
      border: solid white; border-width: 0 2px 2px 0; transform: rotate(45deg);
    }
    .check-label input:checked ~ .checkmark::after { display: block; }
    .check-text { font-weight: 500; color: var(--text-primary); }
    .check-text small { color: var(--text-muted); }

    .computers-list {
      max-height: 200px; overflow-y: auto;
      border: 1px solid var(--border); border-radius: 10px; padding: 8px;
      background: var(--bg-page);
    }
    .computer-row { padding: 6px 8px; border-radius: 6px; }
    .computer-row:hover { background: var(--bg-row-hover); }

    @media (max-width: 768px) {
      .groups-grid { grid-template-columns: 1fr; }
      .form-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class AdminGroupsComponent implements OnInit {
  groups: ComputerGroup[] = [];
  allComputers: Computer[] = [];
  loading = true;
  saving = false;
  showForm = false;
  isEditing = false;
  editId: number | null = null;

  form: GroupFormData = {
    name: '', description: '', color: '#0066cc', icon: 'fas fa-folder',
    allow_wake: true, allow_shutdown: true, computer_ids: []
  };

  constructor(private api: ApiService, private notify: NotificationService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.api.getAdminGroups().subscribe({
      next: (res) => { this.groups = res.data?.groups || []; this.loading = false; },
      error: () => { this.notify.error('Failed to load groups'); this.loading = false; }
    });
    this.api.getAdminComputers().subscribe({
      next: (res) => { this.allComputers = res.data?.computers || []; }
    });
  }

  resetForm(): void {
    this.isEditing = false;
    this.editId = null;
    this.form = { name: '', description: '', color: '#0066cc', icon: 'fas fa-folder', allow_wake: true, allow_shutdown: true, computer_ids: [] };
  }

  editGroup(g: ComputerGroup): void {
    this.isEditing = true;
    this.editId = g.id;
    this.form = {
      name: g.name, description: g.description || '', color: g.color || '#0066cc',
      icon: g.icon || 'fas fa-folder', allow_wake: g.allow_wake, allow_shutdown: g.allow_shutdown,
      computer_ids: (g.computers || []).map(c => c.id)
    };
    this.showForm = true;
  }

  deleteGroup(g: ComputerGroup): void {
    if (!confirm(`Delete group "${g.name}"?`)) return;
    this.api.deleteGroup(g.id).subscribe({
      next: (res) => { if (res.success) { this.notify.success('Group deleted'); this.load(); } else this.notify.error(res.message || 'Failed'); },
      error: () => this.notify.error('Failed')
    });
  }

  toggleComputer(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) this.form.computer_ids.push(id);
    else this.form.computer_ids = this.form.computer_ids.filter(cId => cId !== id);
  }

  submitForm(): void {
    if (!this.form.name) { this.notify.warning('Name is required'); return; }
    this.saving = true;

    const obs = this.isEditing
      ? this.api.updateGroup(this.editId!, this.form)
      : this.api.createGroup(this.form);

    obs.subscribe({
      next: (res) => {
        if (res.success) { this.notify.success(this.isEditing ? 'Group updated!' : 'Group created!'); this.showForm = false; this.load(); }
        else this.notify.error(res.message || 'Failed');
        this.saving = false;
      },
      error: () => { this.notify.error('Failed'); this.saving = false; }
    });
  }
}
