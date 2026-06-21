import type {
  ActivityEntry,
  AppUser,
  AuditEntry,
  Campaign,
  CallApi,
  CallLogEntry,
  MessageTemplate,
  Visitor,
  WatiConnection,
} from '../types';

export const templates: MessageTemplate[] = [
  { value: 'spring_expo_followup', label: 'Spring Expo — Follow-up' },
  { value: 'thank_you_visit', label: 'Thank You for Visiting' },
  { value: 'event_invite', label: 'Event Invitation' },
  { value: 'catalogue_request', label: 'Catalogue Request' },
];

const templateMessages: Record<string, string> = {
  spring_expo_followup:
    "Hi {name}, thank you for visiting Sunaidi Expo Spring 2026! Here's the catalogue you requested — reply YES to book a follow-up meeting.",
  thank_you_visit:
    "Hi {name}, thank you for visiting the Sunaidi Expo stand. It was great to meet you — we'll be in touch soon!",
  event_invite:
    "Hi {name}, you're invited to our next Sunaidi Expo event. Reply JOIN to reserve your place.",
  catalogue_request:
    "Hi {name}, as requested here is our latest product catalogue. Reply if you'd like a personalised quote.",
};

export function tplMessage(t: string): string {
  return templateMessages[t] || templateMessages.spring_expo_followup;
}

export const seedEvents = ['Spring Expo 2026', 'Tech Forum', 'Trade Days', 'Design Week', 'Startup Meet'];

export function seedVisitors(): Visitor[] {
  const ev = seedEvents;
  const rows: [string, string, string, string, Visitor['status'], Visitor['consent']][] = [
    ['Faisal Khan', 'Reed Technologies', '142', ev[0], 'Category', 'Opted-in'],
    ['Lina Mansour', 'Orbit Media', '087', ev[0], 'Category', 'Opted-in'],
    ['Rami Al-Said', 'Vertex Group', '309', ev[0], 'Engaged', 'Opted-in'],
    ['Sara Habib', 'Nexa Labs', '561', ev[0], 'Category', 'Opted-in'],
    ['Omar Tariq', 'Helix Industries', '778', ev[0], 'Pending', 'Pending'],
    ['Huda Nasser', 'Bright Co', '234', ev[1], 'Category', 'Opted-in'],
    ['Yousef Amin', 'Cedar Systems', '415', ev[1], 'Pre-registered', 'Opted-in'],
    ['Maha Salem', 'Lumina', '690', ev[1], 'Engaged', 'Opted-out'],
    ['Khalid Aziz', 'Pioneer Tech', '052', ev[2], 'Category', 'Opted-in'],
    ['Nora Fadel', 'Atlas Media', '331', ev[2], 'Pre-registered', 'Pending'],
    ['Tariq Hassan', 'Summit Group', '847', ev[2], 'Category', 'Opted-in'],
    ['Dana Khoury', 'Vela Studio', '218', ev[3], 'Engaged', 'Opted-in'],
    ['Sami Rahman', 'Nimbus Co', '903', ev[3], 'Category', 'Opted-in'],
    ['Leen Othman', 'Forma Design', '176', ev[3], 'Pre-registered', 'Opted-in'],
    ['Adel Mansoor', 'Quanta Labs', '524', ev[4], 'Category', 'Opted-in'],
    ['Reem Saleh', 'Spark Ventures', '660', ev[4], 'Engaged', 'Pending'],
    ['Bilal Noor', 'Onyx Partners', '288', ev[4], 'Category', 'Opted-in'],
    ['Jana Aziz', 'Meridian', '741', ev[1], 'Pre-registered', 'Opted-in'],
  ];
  return rows.map((r, i) => ({
    id: 'v' + (i + 1),
    name: r[0],
    company: r[1],
    phone: '+9665' + r[2] + '00' + r[2],
    email: r[0].toLowerCase().replace(/[^a-z]/g, '.') + '@' + r[1].toLowerCase().replace(/[^a-z]/g, '') + '.com',
    event: r[3],
    status: r[4],
    consent: r[5],
    cleaned: i % 3 !== 0,
    invites:
      i === 0
        ? [{ id: 'i1', event: 'Autumn Expo 2026', status: 'Invited' as const, date: '12 Jun' }]
        : i === 2
        ? [
            { id: 'i2', event: 'Winter Showcase 2027', status: 'Pending' as const, date: '14 Jun' },
            { id: 'i3', event: 'Autumn Expo 2026', status: 'Not interested' as const, date: '10 Jun' },
          ]
        : i === 5
        ? [{ id: 'i4', event: 'Autumn Expo 2026', status: 'Invited' as const, date: '13 Jun' }]
        : [],
  }));
}

export const seedWatiConns: WatiConnection[] = [
  { event: 'Spring Expo 2026', sender: '+966 50 111 2026', api: 'wati_spring_••42', active: true },
  { event: 'Tech Forum', sender: '+966 50 222 7788', api: 'wati_techforum_••19', active: true },
  { event: 'Trade Days', sender: '+966 50 333 4455', api: 'wati_tradedays_••07', active: true },
  { event: 'Design Week', sender: '+966 50 444 9090', api: 'wati_designweek_••63', active: false },
  { event: 'Startup Meet', sender: '+966 50 555 1212', api: 'wati_startup_••88', active: true },
];

export const seedUsers: AppUser[] = [
  { id: 'u1', name: 'Marketing User', email: 'marketing@sunaidiexpo.com', role: 'Marketing', status: 'Active', perms: { edit: true, delete: false, call: false } },
  { id: 'u2', name: 'Data Cleanup', email: 'cleanup@sunaidiexpo.com', role: 'Data Entry', status: 'Active', perms: { edit: true, delete: true, call: true } },
  { id: 'u3', name: 'Call Agent', email: 'calls@sunaidiexpo.com', role: 'Tele-caller', status: 'Active', perms: { edit: false, delete: false, call: true } },
  { id: 'u4', name: 'Administrator', email: 'admin@sunaidiexpo.com', role: 'Admin', status: 'Active', perms: { edit: true, delete: true, call: true } },
];

export const seedCallApis: CallApi[] = [
  { id: 'ca1', provider: 'Twilio Voice', callerId: '+966 11 200 4040', key: 'sk_live_••••8842', connected: true },
  { id: 'ca2', provider: 'Knowlarity', callerId: '+966 11 200 5050', key: 'kl_live_••••3317', connected: false },
];

export const seedCallLog: CallLogEntry[] = [
  { id: 'cl1', name: 'Lina Mansour', company: 'Orbit Media', event: 'Spring Expo 2026', time: '09:12', duration: 142, outcome: 'Invited' },
  { id: 'cl2', name: 'Omar Tariq', company: 'Helix Industries', event: 'Spring Expo 2026', time: '09:31', duration: 64, outcome: 'Not interested' },
  { id: 'cl3', name: 'Yousef Amin', company: 'Cedar Systems', event: 'Tech Forum', time: '10:04', duration: 208, outcome: 'Invited' },
  { id: 'cl4', name: 'Nora Fadel', company: 'Atlas Media', event: 'Trade Days', time: '10:22', duration: 47, outcome: 'Pending' },
  { id: 'cl5', name: 'Dana Khoury', company: 'Vela Studio', event: 'Design Week', time: '11:08', duration: 175, outcome: 'Invited' },
];

export const seedCampaigns: Campaign[] = [
  { id: 'c1', name: 'Thank You for Visiting', event: 'Tech Forum', recipients: 412, sentAt: '2 days ago', status: 'Delivered', wati: '+966 50 222 7788' },
  { id: 'c2', name: 'Catalogue Request', event: 'Spring Expo 2026', recipients: 1180, sentAt: '5 days ago', status: 'Delivered', wati: '+966 50 111 2026' },
];

export const seedActivity: ActivityEntry[] = [
  { id: 'a1', initials: 'LM', name: 'Lina Mansour', detail: 'Duplicate merged', tag: 'Merged', kind: 'merge' },
  { id: 'a2', initials: 'RA', name: 'Rami Al-Said', detail: 'Consent set to opted-in', tag: 'Updated', kind: 'update' },
  { id: 'a3', initials: 'FK', name: 'Faisal Khan', detail: 'Phone number updated', tag: 'Edited', kind: 'edit' },
  { id: 'a4', initials: 'WA', name: 'Catalogue Request', detail: 'Campaign sent to 1,180 contacts', tag: 'Sent', kind: 'sent' },
];

export const seedAuditLog: AuditEntry[] = [
  { id: 'au1', time: '20 Jun 08:02:14', actor: 'admin@sunaidiexpo.com', role: 'Admin', action: 'User signed in', target: 'Session', category: 'Authentication', ip: '10.0.21.4', result: 'Success' },
  { id: 'au2', time: '20 Jun 08:05:41', actor: 'admin@sunaidiexpo.com', role: 'Admin', action: 'Password reset issued', target: 'calls@sunaidiexpo.com', category: 'User Management', ip: '10.0.21.4', result: 'Success' },
  { id: 'au3', time: '20 Jun 08:11:09', actor: 'cleanup@sunaidiexpo.com', role: 'Data Entry', action: 'Visitor record updated', target: 'Faisal Khan', category: 'Data', ip: '10.0.18.7', result: 'Success' },
  { id: 'au4', time: '20 Jun 08:19:55', actor: 'marketing@sunaidiexpo.com', role: 'Marketing', action: 'Campaign sent via WATI', target: 'Spring Expo 2026 — 1,180', category: 'Campaign', ip: '10.0.12.2', result: 'Success' },
  { id: 'au5', time: '20 Jun 08:24:30', actor: 'unknown', role: '—', action: 'Failed sign-in attempt', target: 'ops@sunaidiexpo.com', category: 'Authentication', ip: '41.92.6.183', result: 'Denied' },
  { id: 'au6', time: '20 Jun 08:40:12', actor: 'admin@sunaidiexpo.com', role: 'Admin', action: 'CSV export generated', target: 'visitors-all.csv', category: 'Export', ip: '10.0.21.4', result: 'Success' },
];
