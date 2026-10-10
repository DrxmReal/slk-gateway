-- ==========================================================
-- SLK GATEWAY - SUPABASE DATABASE SCHEMA
-- Chạy đoạn SQL này trong mục "SQL Editor" trên Supabase Dashboard
-- ==========================================================

-- 1. Bảng lưu tài khoản người dùng đăng nhập qua Discord OAuth2
CREATE TABLE IF NOT EXISTS public.slk_users (
  discord_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  global_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bảng lưu danh sách API Keys của từng tài khoản Discord (tách biệt theo discord_id)
CREATE TABLE IF NOT EXISTS public.slk_api_keys (
  id TEXT PRIMARY KEY,
  discord_id TEXT NOT NULL REFERENCES public.slk_users(discord_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slk_api_keys_discord_id ON public.slk_api_keys(discord_id);
CREATE INDEX IF NOT EXISTS idx_slk_api_keys_token ON public.slk_api_keys(token);

-- 3. Bảng lưu danh sách Upstream Gate Pool của Admin (1207080545159487498)
CREATE TABLE IF NOT EXISTS public.slk_gate_pool (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL DEFAULT 'https://api.hcnsec.cn/v1',
  api_key TEXT NOT NULL,
  masked_key TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  is_primary BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'online',
  requests BIGINT DEFAULT 0,
  errors BIGINT DEFAULT 0,
  last_latency_ms INTEGER,
  last_used_at TIMESTAMPTZ,
  added_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cho phép truy cập qua Supabase API Key (Anon / Service Role)
ALTER TABLE public.slk_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slk_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slk_gate_pool ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "slk_users_all" ON public.slk_users;
CREATE POLICY "slk_users_all" ON public.slk_users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "slk_api_keys_all" ON public.slk_api_keys;
CREATE POLICY "slk_api_keys_all" ON public.slk_api_keys FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "slk_gate_pool_all" ON public.slk_gate_pool;
CREATE POLICY "slk_gate_pool_all" ON public.slk_gate_pool FOR ALL USING (true) WITH CHECK (true);
