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

-- ==========================================================
-- BẢO MẬT ROW LEVEL SECURITY (RLS) - BẢO VỆ CHỐNG HACK TIỀN & LỘ UPSTREAM KEYS
-- ==========================================================
ALTER TABLE public.slk_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slk_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slk_gate_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slk_transactions ENABLE ROW LEVEL SECURITY;

-- 1. Bảng slk_gate_pool: Chứa Upstream API Keys bí mật.
-- Chặn quyền truy cập từ anon / client-side. Chỉ cho phép service_role (Backend Server) truy cập.
DROP POLICY IF EXISTS "slk_gate_pool_all" ON public.slk_gate_pool;
DROP POLICY IF EXISTS "slk_gate_pool_service_role" ON public.slk_gate_pool;
REVOKE ALL ON public.slk_gate_pool FROM anon, authenticated;
GRANT ALL ON public.slk_gate_pool TO service_role;
CREATE POLICY "slk_gate_pool_service_role" ON public.slk_gate_pool
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Bảng slk_users:
-- Client/anon chỉ được quyền ĐỌC (SELECT) thông tin tài khoản.
-- Chặn tuyệt đối anon INSERT/UPDATE/DELETE để ngăn sửa balance_vnd qua REST API.
DROP POLICY IF EXISTS "slk_users_all" ON public.slk_users;
DROP POLICY IF EXISTS "slk_users_select" ON public.slk_users;
DROP POLICY IF EXISTS "slk_users_service_role" ON public.slk_users;
CREATE POLICY "slk_users_select" ON public.slk_users
  FOR SELECT TO anon, authenticated, service_role USING (true);
CREATE POLICY "slk_users_service_role" ON public.slk_users
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Bảng slk_api_keys:
DROP POLICY IF EXISTS "slk_api_keys_all" ON public.slk_api_keys;
DROP POLICY IF EXISTS "slk_api_keys_select" ON public.slk_api_keys;
DROP POLICY IF EXISTS "slk_api_keys_service_role" ON public.slk_api_keys;
CREATE POLICY "slk_api_keys_select" ON public.slk_api_keys
  FOR SELECT TO anon, authenticated, service_role USING (true);
CREATE POLICY "slk_api_keys_service_role" ON public.slk_api_keys
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. Bảng slk_transactions:
DROP POLICY IF EXISTS "slk_transactions_all" ON public.slk_transactions;
DROP POLICY IF EXISTS "slk_transactions_select" ON public.slk_transactions;
DROP POLICY IF EXISTS "slk_transactions_service_role" ON public.slk_transactions;
CREATE POLICY "slk_transactions_select" ON public.slk_transactions
  FOR SELECT TO anon, authenticated, service_role USING (true);
CREATE POLICY "slk_transactions_service_role" ON public.slk_transactions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ==========================================================
-- 5. RPC TRỪ TIỀN ATOMIC (CHỐNG RACE CONDITION)
-- SECURITY DEFINER: Cho phép hàm thực hiện trừ tiền nguyên tử nội bộ trong database
-- ngay cả khi bảng slk_users chặn quyền UPDATE từ client anon.
-- ==========================================================
CREATE OR REPLACE FUNCTION public.slk_debit_balance(p_discord_id TEXT, p_amount BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
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

-- 6. RPC NẠP TIỀN VÍ (CHỈ DÀNH CHO SERVICE_ROLE / BACKEND SERVER)
-- Thu hồi quyền gọi từ anon để ngăn chặn người dùng tự tạo request nạp tiền miễn phí.
CREATE OR REPLACE FUNCTION public.slk_topup_balance(p_discord_id TEXT, p_amount BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Cấp quyền thực thi:
GRANT EXECUTE ON FUNCTION public.slk_debit_balance(TEXT, BIGINT) TO anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.slk_topup_balance(TEXT, BIGINT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.slk_topup_balance(TEXT, BIGINT) TO service_role;
