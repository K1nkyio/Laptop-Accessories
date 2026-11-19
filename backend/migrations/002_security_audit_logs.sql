create table if not exists security_audit_logs (
  id bigserial primary key,
  user_id uuid references users(id) on delete set null,
  admin_id uuid references admins(id) on delete set null,
  event_type text not null,
  occurred_at timestamptz not null default now(),
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  constraint security_audit_logs_one_principal check (
    num_nonnulls(user_id, admin_id) <= 1
  )
);

create index if not exists security_audit_logs_user_recent_idx
  on security_audit_logs (user_id, occurred_at desc) where user_id is not null;
create index if not exists security_audit_logs_admin_recent_idx
  on security_audit_logs (admin_id, occurred_at desc) where admin_id is not null;
create index if not exists security_audit_logs_event_recent_idx
  on security_audit_logs (event_type, occurred_at desc);
