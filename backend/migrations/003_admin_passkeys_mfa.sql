alter table admins add column if not exists passkey_enrolled_at timestamptz;
alter table admins add column if not exists totp_secret_ciphertext text;
alter table admins add column if not exists totp_enabled_at timestamptz;
alter table admins add column if not exists totp_last_counter bigint not null default -1;
alter table auth_sessions add column if not exists admin_enrollment_only boolean not null default false;
update auth_sessions set revoked_at = now() where env_admin_email is not null and revoked_at is null;

create table if not exists admin_passkeys (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references admins(id) on delete cascade,
  credential_id text not null unique,
  public_key bytea not null,
  counter bigint not null default 0,
  transports jsonb not null default '[]'::jsonb,
  device_type text not null,
  backed_up boolean not null default false,
  name text not null default 'Passkey',
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists admin_passkeys_admin_idx on admin_passkeys(admin_id);

create table if not exists admin_webauthn_challenges (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references admins(id) on delete cascade,
  purpose text not null check (purpose in ('registration', 'authentication')),
  challenge text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists admin_webauthn_challenges_expiry_idx on admin_webauthn_challenges(expires_at);

create table if not exists admin_totp_challenges (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references admins(id) on delete cascade,
  token_hash char(64) not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists admin_totp_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references admins(id) on delete cascade,
  code_hash char(64) not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  unique(admin_id, code_hash)
);

create table if not exists admin_enrollment_tokens (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references admins(id) on delete cascade,
  token_hash char(64) not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

delete from admin_webauthn_challenges where expires_at <= now() or consumed_at is not null;
delete from admin_totp_challenges where expires_at <= now() or consumed_at is not null;
delete from admin_enrollment_tokens where expires_at <= now() or consumed_at is not null;
