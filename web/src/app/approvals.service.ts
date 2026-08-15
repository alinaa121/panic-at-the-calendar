import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PendingApproval {
  approval_id: string;
  status: string;
  action: string;
  summary: string;
  payload: {
    event_id?: string;
    start?: string;
    end?: string;
    summary?: string;
    location?: string;
    description?: string;
  };
  review_context?: {
    current_event?: any;
    resolved_event_after_update?: any;
  };
  created_at: string;
}

export interface ApprovalsResponse {
  success: boolean;
  approvals: PendingApproval[];
}

export interface ApprovalActionResponse {
  success: boolean;
  message?: string;
  event?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ApprovalsService {
  private apiUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  getPendingApprovals(): Observable<ApprovalsResponse> {
    return this.http.get<ApprovalsResponse>(`${this.apiUrl}/pending_approvals`);
  }

  approveAction(approval: PendingApproval): Observable<ApprovalActionResponse> {
    const payload = approval.payload;
    
    switch (approval.action) {
      case 'create_event':
        return this.http.post<ApprovalActionResponse>(
          `${this.apiUrl}/approve_create`,
          {
            approval_id: approval.approval_id,
            start: payload.start,
            end: payload.end,
            summary: payload.summary,
            location: payload.location,
            description: payload.description
          }
        );
      
      case 'update_event':
        return this.http.post<ApprovalActionResponse>(
          `${this.apiUrl}/approve_update`,
          {
            approval_id: approval.approval_id,
            event_id: payload.event_id,
            start: payload.start,
            end: payload.end,
            summary: payload.summary,
            location: payload.location,
            description: payload.description
          }
        );
      
      case 'delete_event':
        return this.http.post<ApprovalActionResponse>(
          `${this.apiUrl}/approve_delete`,
          {
            approval_id: approval.approval_id,
            event_id: payload.event_id
          }
        );
      
      default:
        throw new Error(`Unknown action: ${approval.action}`);
    }
  }

  rejectAction(approvalId: string): Observable<ApprovalActionResponse> {
    return this.http.post<ApprovalActionResponse>(
      `${this.apiUrl}/reject_approval`,
      { approval_id: approvalId }
    );
  }
}
