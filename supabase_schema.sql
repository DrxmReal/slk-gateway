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

-- ==========================================================
-- 4. VÍ TIỀN (VND) - số dư cho mỗi user, mặc định 100.000 ₫
-- ==========================================================
ALTER TABLE public.slk_users
  ADD COLUMN IF NOT EXISTS balance_vnd BIGINT NOT NULL DEFAULT 100000;

-- 5. Lịch sử giao dịch ví (trừ phí / nạp tiền)
CREATE TABLE IF NOT EXISTS public.slk_transactions (
  id TEXT PRIMARY KEY,
  discord_id TEXT NOT NULL REFERENCES public.slk_users(discord_id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'debit',          -- 'debit' | 'topup'
  amount_vnd BIGINT NOT NULL DEFAULT 0,
  balance_after_vnd BIGINT,
  model TEXT DEFAULT '',
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slk_transactions_discord_id ON public.slk_transactions(discord_id);
CREATE INDEX IF NOT EXISTS idx_slk_transactions_created_at ON public.slk_transactions(created_at DESC);

ALTER TABLE public.slk_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "slk_transactions_all" ON public.slk_transactions;
CREATE POLICY "slk_transactions_all" ON public.slk_transactions FOR ALL USING (true) WITH CHECK (true);

-- ==========================================================
-- 6. RPC trừ/cộng tiền ATOMIC (tránh race condition khi gọi song song)
-- ==========================================================
CREATE OR REPLACE FUNCTION public.slk_debit_balance(p_discord_id TEXT, p_amount BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_balance BIGINT;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_amount');
  END IF;

  UPDATE public.slk_users
     SET balance_vnd = balance_vnd - p_amount,
         updated_at = NOW()
   WHERE discord_id = p_discord_id
     AND balance_vnd >= p_amount
  RETURNING balance_vnd INTO v_balance;

  IF NOT FOUND THEN
    SELECT balance_vnd INTO v_balance FROM public.slk_users WHERE discord_id = p_discord_id;
    RETURN json_build_object(
      'ok', false,
      'balance_vnd', COALESCE(v_balance, -1),
      'error', CASE WHEN v_balance IS NULL THEN 'user_not_found' ELSE 'insufficient_balance' END
    );
  END IF;

  RETURN json_build_object('ok', true, 'balance_vnd', v_balance);
END;
$$;

CREATE OR REPLACE FUNCTION public.slk_topup_balance(p_discord_id TEXT, p_amount BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_balance BIGINT;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_amount');
  END IF;

  INSERT INTO public.slk_users (discord_id, username, global_name, balance_vnd)
  VALUES (p_discord_id, p_discord_id, p_discord_id, p_amount)
  ON CONFLICT (discord_id)
  DO UPDATE SET balance_vnd = public.slk_users.balance_vnd + p_amount, updated_at = NOW()
  RETURNING balance_vnd INTO v_balance;

  RETURN json_build_object('ok', true, 'balance_vnd', v_balance);
END;
$$;

GRANT EXECUTE ON FUNCTION public.slk_debit_balance(TEXT, BIGINT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.slk_topup_balance(TEXT, BIGINT) TO anon, authenticated, service_role;
