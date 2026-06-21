export type ConsentStatus = 'Opted-in' | 'Pending' | 'Opted-out';
export type VisitorStatus = 'Category' | 'Engaged' | 'Pre-registered' | 'Pending';
export type InviteStatus = 'Invited' | 'Pending' | 'Not interested';
export type Role = 'Admin' | 'Staff' | string;

export interface Invite {
  id: string;
  event: string;
  status: InviteStatus;
  date: string;
}

export interface Visitor {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  event: string;
  status: VisitorStatus;
  consent: ConsentStatus;
  cleaned: boolean;
  invites: Invite[];
}

export interface CallLogEntry {
  id: string;
  name: string;
  company: string;
  event: string;
  time: string;
  duration: number;
  outcome: InviteStatus;
}

export interface Campaign {
  id: string;
  name: string;
  event: string;
  recipients: number;
  sentAt: string;
  status: 'Delivered' | string;
  wati?: string;
}

export type ActivityKind = 'merge' | 'sent' | 'edit' | 'update' | 'cleaned' | 'invited';

export interface ActivityEntry {
  id: string;
  initials: string;
  name: string;
  detail: string;
  tag: string;
  kind: ActivityKind;
}

export interface UserPerms {
  edit: boolean;
  delete: boolean;
  call: boolean;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Suspended';
  perms: UserPerms;
}

export interface WatiConnection {
  id?: string;
  event: string;
  sender: string;
  api: string;
  active: boolean;
}

export interface CallApi {
  id: string;
  provider: string;
  callerId: string;
  key: string;
  connected: boolean;
}

export type AuditResult = 'Success' | 'Denied' | 'Pending';
export type AuditCategory =
  | 'Authentication'
  | 'User Management'
  | 'Data'
  | 'Campaign'
  | 'Call'
  | 'Integration'
  | 'Export'
  | 'General';

export interface AuditEntry {
  id: string;
  time: string;
  actor: string;
  role: string;
  action: string;
  target: string;
  category: AuditCategory;
  ip: string;
  result: AuditResult;
}

export interface ActiveCall {
  id: string;
  name: string;
  company: string;
  phone: string;
  event: string;
}

export interface MessageTemplate {
  value: string;
  label: string;
}

export type TabKey =
  | 'dashboard'
  | 'visitors'
  | 'cleanup'
  | 'calls'
  | 'campaigns'
  | 'reports'
  | 'admin';
