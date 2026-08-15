import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApprovalsService, PendingApproval } from './approvals.service';

@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './approvals.component.html',
  styleUrls: ['./approvals.component.css']
})
export class ApprovalsComponent implements OnInit {
  @Output() approvalCountChanged = new EventEmitter<number>();
  
  approvals: PendingApproval[] = [];
  loading: boolean = false;
  error: string = '';
  processingApproval: boolean = false;

  constructor(private approvalsService: ApprovalsService) {}

  ngOnInit() {
    this.loadApprovals();
  }

  loadApprovals() {
    this.loading = true;
    this.error = '';
    
    this.approvalsService.getPendingApprovals().subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.approvals = response.approvals;
          this.approvalCountChanged.emit(this.approvals.length);
        } else {
          this.error = 'Failed to load approvals';
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = 'Failed to connect to server';
        console.error('Approvals error:', err);
      }
    });
  }

  approveAction(approval: PendingApproval) {
    this.processingApproval = true;
    this.error = '';

    this.approvalsService.approveAction(approval).subscribe({
      next: (response) => {
        this.processingApproval = false;
        if (response.success) {
          // Remove the approved item from the list
          this.approvals = this.approvals.filter(a => a.approval_id !== approval.approval_id);
          this.approvalCountChanged.emit(this.approvals.length);
          alert('Action approved and executed successfully!');
        } else {
          this.error = response.message || 'Failed to approve action';
        }
      },
      error: (err) => {
        this.processingApproval = false;
        this.error = 'Failed to execute approval';
        console.error('Approval error:', err);
      }
    });
  }

  rejectAction(approval: PendingApproval) {
    if (!confirm('Are you sure you want to reject this action?')) {
      return;
    }

    this.processingApproval = true;
    this.error = '';

    this.approvalsService.rejectAction(approval.approval_id).subscribe({
      next: (response) => {
        this.processingApproval = false;
        if (response.success) {
          // Remove the rejected item from the list
          this.approvals = this.approvals.filter(a => a.approval_id !== approval.approval_id);
          this.approvalCountChanged.emit(this.approvals.length);
        } else {
          this.error = response.message || 'Failed to reject action';
        }
      },
      error: (err) => {
        this.processingApproval = false;
        this.error = 'Failed to reject approval';
        console.error('Rejection error:', err);
      }
    });
  }

  getActionLabel(action: string): string {
    switch (action) {
      case 'create_event': return 'Create Event';
      case 'update_event': return 'Update Event';
      case 'delete_event': return 'Delete Event';
      default: return action;
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCreatedAt(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
}
