create table if not exists auth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  admin_id uuid references admins(id) on delete cascade,
  env_admin_email text,
  token_hash char(64) not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  idle_expires_at timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  ip_address inet,
  user_agent text,
  constraint auth_sessions_one_principal check (
    num_nonnulls(user_id, admin_id, env_admin_email) = 1
  )
);

create index if not exists auth_sessions_user_active_idx
  on auth_sessions (user_id, expires_at) where revoked_at is null;
create index if not exists auth_sessions_admin_active_idx
  on auth_sessions (admin_id, expires_at) where revoked_at is null;
create index if not exists auth_sessions_env_admin_active_idx
  on auth_sessions (env_admin_email, expires_at) where revoked_at is null;
