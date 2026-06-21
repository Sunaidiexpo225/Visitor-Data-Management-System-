-- ============================================================================
-- Seed data (data tables only — auth users are seeded separately by
-- supabase/seed-users.mjs via the admin API, which is version-robust).
-- Mirrors the in-memory seed used by the frontend prototype.
-- Safe to run repeatedly: clears and repopulates the data tables.
-- ============================================================================

truncate invites, visitors, campaigns, call_log, activity, audit_log,
         wati_connections, call_apis, sub_events, events restart identity cascade;

-- ---- events ---------------------------------------------------------------
insert into events (name) values
  ('Spring Expo 2026'),
  ('Tech Forum'),
  ('Trade Days'),
  ('Design Week'),
  ('Startup Meet');

-- ---- sub-events (one default 'General' per event) -------------------------
insert into sub_events (event_id, name)
select id, 'General' from events;

-- ---- visitors -------------------------------------------------------------
-- Derive phone/email exactly like the prototype's seedVisitors():
--   phone = '+9665' || digits || '00' || digits
--   email = regexp_replace(lower(name),'[^a-z]','.','g')
--           || '@' || regexp_replace(lower(company),'[^a-z]','','g') || '.com'
--   cleaned = (idx % 3 <> 0)
with rows (idx, name, company, digits, event_name, status, consent) as (
  values
    (0,  'Faisal Khan',  'Reed Technologies', '142', 'Spring Expo 2026', 'Category',       'Opted-in'),
    (1,  'Lina Mansour', 'Orbit Media',       '087', 'Spring Expo 2026', 'Category',       'Opted-in'),
    (2,  'Rami Al-Said', 'Vertex Group',      '309', 'Spring Expo 2026', 'Engaged',        'Opted-in'),
    (3,  'Sara Habib',   'Nexa Labs',         '561', 'Spring Expo 2026', 'Category',       'Opted-in'),
    (4,  'Omar Tariq',   'Helix Industries',  '778', 'Spring Expo 2026', 'Pending',        'Pending'),
    (5,  'Huda Nasser',  'Bright Co',         '234', 'Tech Forum',       'Category',       'Opted-in'),
    (6,  'Yousef Amin',  'Cedar Systems',     '415', 'Tech Forum',       'Pre-registered', 'Opted-in'),
    (7,  'Maha Salem',   'Lumina',            '690', 'Tech Forum',       'Engaged',        'Opted-out'),
    (8,  'Khalid Aziz',  'Pioneer Tech',      '052', 'Trade Days',       'Category',       'Opted-in'),
    (9,  'Nora Fadel',   'Atlas Media',       '331', 'Trade Days',       'Pre-registered', 'Pending'),
    (10, 'Tariq Hassan', 'Summit Group',      '847', 'Trade Days',       'Category',       'Opted-in'),
    (11, 'Dana Khoury',  'Vela Studio',       '218', 'Design Week',      'Engaged',        'Opted-in'),
    (12, 'Sami Rahman',  'Nimbus Co',         '903', 'Design Week',      'Category',       'Opted-in'),
    (13, 'Leen Othman',  'Forma Design',      '176', 'Design Week',      'Pre-registered', 'Opted-in'),
    (14, 'Adel Mansoor', 'Quanta Labs',       '524', 'Startup Meet',     'Category',       'Opted-in'),
    (15, 'Reem Saleh',   'Spark Ventures',    '660', 'Startup Meet',     'Engaged',        'Pending'),
    (16, 'Bilal Noor',   'Onyx Partners',     '288', 'Startup Meet',     'Category',       'Opted-in'),
    (17, 'Jana Aziz',    'Meridian',          '741', 'Tech Forum',       'Pre-registered', 'Opted-in')
)
insert into visitors (id, name, company, phone, email, sub_event_id, status, consent, cleaned)
select
  -- deterministic ids v00000000-...-<idx> so invites can reference them
  ('00000000-0000-0000-0000-' || lpad(r.idx::text, 12, '0'))::uuid,
  r.name,
  r.company,
  '+9665' || r.digits || '00' || r.digits,
  regexp_replace(lower(r.name), '[^a-z]', '.', 'g') || '@'
    || regexp_replace(lower(r.company), '[^a-z]', '', 'g') || '.com',
  se.id,
  r.status,
  r.consent::consent_status,
  (r.idx % 3 <> 0)
from rows r
join events e on e.name = r.event_name
join sub_events se on se.event_id = e.id and se.name = 'General';

-- ---- invites (seeded for visitors 0, 2, 5 like the prototype) -------------
insert into invites (visitor_id, event, status, invited_on) values
  ('00000000-0000-0000-0000-000000000000'::uuid, 'Autumn Expo 2026',     'Invited',        '12 Jun'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'Winter Showcase 2027', 'Pending',        '14 Jun'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'Autumn Expo 2026',     'Not interested', '10 Jun'),
  ('00000000-0000-0000-0000-000000000005'::uuid, 'Autumn Expo 2026',     'Invited',        '13 Jun');

-- ---- wati_connections -----------------------------------------------------
insert into wati_connections (event, sender, api, active) values
  ('Spring Expo 2026', '+966 50 111 2026', 'wati_spring_••42',     true),
  ('Tech Forum',       '+966 50 222 7788', 'wati_techforum_••19',  true),
  ('Trade Days',       '+966 50 333 4455', 'wati_tradedays_••07',  true),
  ('Design Week',      '+966 50 444 9090', 'wati_designweek_••63', false),
  ('Startup Meet',     '+966 50 555 1212', 'wati_startup_••88',    true);

-- ---- call_apis ------------------------------------------------------------
insert into call_apis (provider, caller_id, api_key, connected) values
  ('Twilio Voice', '+966 11 200 4040', 'sk_live_••••8842', true),
  ('Knowlarity',   '+966 11 200 5050', 'kl_live_••••3317', false);

-- ---- call_log -------------------------------------------------------------
insert into call_log (name, company, event, call_time, duration, outcome) values
  ('Lina Mansour', 'Orbit Media',      'Spring Expo 2026', '09:12', 142, 'Invited'),
  ('Omar Tariq',   'Helix Industries', 'Spring Expo 2026', '09:31',  64, 'Not interested'),
  ('Yousef Amin',  'Cedar Systems',    'Tech Forum',       '10:04', 208, 'Invited'),
  ('Nora Fadel',   'Atlas Media',      'Trade Days',       '10:22',  47, 'Pending'),
  ('Dana Khoury',  'Vela Studio',      'Design Week',      '11:08', 175, 'Invited');

-- ---- campaigns ------------------------------------------------------------
insert into campaigns (name, event, recipients, sent_label, status, wati_sender) values
  ('Thank You for Visiting', 'Tech Forum',       412,  '2 days ago', 'Delivered', '+966 50 222 7788'),
  ('Catalogue Request',      'Spring Expo 2026', 1180, '5 days ago', 'Delivered', '+966 50 111 2026');

-- ---- activity -------------------------------------------------------------
insert into activity (initials, name, detail, tag, kind) values
  ('LM', 'Lina Mansour',      'Duplicate merged',                  'Merged',  'merge'),
  ('RA', 'Rami Al-Said',      'Consent set to opted-in',           'Updated', 'update'),
  ('FK', 'Faisal Khan',       'Phone number updated',              'Edited',  'edit'),
  ('WA', 'Catalogue Request', 'Campaign sent to 1,180 contacts',   'Sent',    'sent');

-- ---- audit_log ------------------------------------------------------------
insert into audit_log (ts_label, actor, role, action, target, category, ip, result) values
  ('20 Jun 08:02:14', 'admin@sunaidiexpo.com',     'Admin',      'User signed in',          'Session',                  'Authentication',  '10.0.21.4',   'Success'),
  ('20 Jun 08:05:41', 'admin@sunaidiexpo.com',     'Admin',      'Password reset issued',   'calls@sunaidiexpo.com',    'User Management', '10.0.21.4',   'Success'),
  ('20 Jun 08:11:09', 'cleanup@sunaidiexpo.com',   'Data Entry', 'Visitor record updated',  'Faisal Khan',              'Data',            '10.0.18.7',   'Success'),
  ('20 Jun 08:19:55', 'marketing@sunaidiexpo.com', 'Marketing',  'Campaign sent via WATI',  'Spring Expo 2026 — 1,180', 'Campaign',        '10.0.12.2',   'Success'),
  ('20 Jun 08:24:30', 'unknown',                   '—',          'Failed sign-in attempt',  'ops@sunaidiexpo.com',      'Authentication',  '41.92.6.183', 'Denied'),
  ('20 Jun 08:40:12', 'admin@sunaidiexpo.com',     'Admin',      'CSV export generated',    'visitors-all.csv',         'Export',          '10.0.21.4',   'Success');
