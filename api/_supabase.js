import {
  OWNER_ADMIN_DISCORD_ID,
  generateDiscordUserApiKey,
  maskApiKey,
  parseGateNameAndModels,
  encodeGateNameWithModels,
} from './_utils.js';
import { DEFAULT_USER_BALANCE_VND } from './_wallet.js';

// Project URL & Publishable Key mặc định từ project Supabase của Admin (hoqqtkglwphdbyfeegjq)
export const DEFAULT_SUPABASE_URL = 'https://hoqqtkglwphdbyfeegjq.supabase.co';
export const DEFAULT_SUPABASE_KEY = 'sb_publishable_GU-PB1C61DM6CQ9sTWhYgw_H0gHGx5J';

// Tự động chuyển đổi nếu người dùng dán link Dashboard hoặc link /rest/v1/ thành https://xxxx.supabase.co
export function normalizeSupabaseUrl(raw = '') {
  const trimmed = String(raw || '')
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/+$/, '');
  if (!trimmed) return '';
  const dashMatch = trimmed.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  if (dashMatch && dashMatch[1]) {
    return `https://${dashMatch[1]}.supabase.co`;
  }
  if (/^[a-z0-9]{15,30}$/i.test(trimmed)) {
    return `https://${trimmed}.supabase.co`;
  }
  return trimmed;
}

// Runtime Supabase config (có thể cấu hình qua biến môi trường hoặc trực tiếp từ Admin Pool)
let runtimeSupabaseUrl = '';
let runtimeSupabaseKey = '';

// Bộ nhớ đệm tách biệt 100% theo từng Discord User ID (Fallback khi chưa điền Supabase hoặc chưa chạy SQL)
const memoryUserKeysMap = new Map();

export function setRuntimeSupabaseConfig(url = '', key = '') {
  if (url) runtimeSupabaseUrl = normalizeSupabaseUrl(url);
  if (key) runtimeSupabaseKey = String(key).trim();
}

export function getSupabaseConfig() {
  const url = normalizeSupabaseUrl(
    runtimeSupabaseUrl ||
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL
  );

  const key = (
    runtimeSupabaseKey ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    DEFAULT_SUPABASE_KEY
  ).trim();

  return {
    url,
    key,
    configured: Boolean(url && key),
  };
}

function getSupabaseHeaders(key, extra = {}) {
  return {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

// Kiểm tra kết nối tới bảng Supabase
export async function testSupabaseConnection(customUrl = '', customKey = '') {
  const cfg = getSupabaseConfig();
  const url = normalizeSupabaseUrl(customUrl || cfg.url);
  const key = (customKey || cfg.key).trim();

  if (!url || !key) {
    return { connected: false, error: 'Chưa cấu hình SUPABASE_URL hoặc SUPABASE_KEY.' };
  }

  try {
    const res = await fetch(`${url}/rest/v1/slk_users?select=discord_id&limit=1`, {
      method: 'GET',
      headers: getSupabaseHeaders(key),
    });

    if (res.ok) {
      return { connected: true, tablesReady: true, url };
    }

    const errText = await res.text();
    if (res.status === 404 || errText.includes('relation') || errText.includes('does not exist') || errText.includes('PGRST205')) {
      return {
        connected: true,
        tablesReady: false,
        url,
        error: 'Đã kết nối Supabase nhưng chưa tạo bảng! Hãy chạy file supabase_schema.sql trong Supabase SQL Editor.',
      };
    }

    return {
      connected: false,
      url,
      error: `Supabase trả về HTTP ${res.status}: ${errText.slice(0, 140)}`,
    };
  } catch (err) {
    return {
      connected: false,
      url,
      error: `Không thể kết nối tới Supabase: ${err.message}`,
    };
  }
}

// Đảm bảo mỗi Discord User ID luôn có 1 Master Key mặc định riêng biệt
async function ensureMemoryDefaultKey(discordUserId) {
  const cleanId = String(discordUserId || '').trim();
  if (!cleanId) return [];

  const masterToken = await generateDiscordUserApiKey(cleanId);
  let list = memoryUserKeysMap.get(cleanId) || [];

  const hasDefault = list.some(k => k.token === masterToken || k.isDefault);
  if (!hasDefault) {
    list.unshift({
      id: `default_master_${cleanId}`,
      discordId: cleanId,
      name: 'Mặc định (Discord Master Key)',
      token: masterToken,
      isDefault: true,
      createdAt: new Date().toISOString(),
    });
    memoryUserKeysMap.set(cleanId, list);
  }
  return list;
}

// 1. Lưu/Cập nhật thông tin User Discord & khởi tạo Master Key riêng cho đúng discord_id đó
export async function dbUpsertDiscordUser(user) {
  const cleanId = String(user?.id || '').trim();
  if (!cleanId) return null;

  await ensureMemoryDefaultKey(cleanId);
  const masterToken = await generateDiscordUserApiKey(cleanId);

  const cfg = getSupabaseConfig();
  if (!cfg.configured) {
    return { storedIn: 'memory', masterToken };
  }

  try {
    // Upsert vào bảng slk_users
    await fetch(`${cfg.url}/rest/v1/slk_users`, {
      method: 'POST',
      headers: getSupabaseHeaders(cfg.key, {
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      }),
      body: JSON.stringify({
        discord_id: cleanId,
        username: user.username || 'user',
        global_name: user.global_name || user.username || 'User',
        avatar_url: user.avatar_url || '',
        is_admin: cleanId === OWNER_ADMIN_DISCORD_ID,
        updated_at: new Date().toISOString(),
      }),
    });

    // Upsert Master Key mặc định của đúng discord_id này vào slk_api_keys
    await fetch(`${cfg.url}/rest/v1/slk_api_keys`, {
      method: 'POST',
      headers: getSupabaseHeaders(cfg.key, {
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      }),
      body: JSON.stringify({
        id: `default_master_${cleanId}`,
        discord_id: cleanId,
        name: 'Mặc định (Discord Master Key)',
        token: masterToken,
        is_default: true,
      }),
    });

    return { storedIn: 'supabase', masterToken };
  } catch (err) {
    console.warn('Supabase upsert user warning:', err.message);
    return { storedIn: 'memory', masterToken };
  }
}

// 2. Lấy danh sách API Keys của ĐÚNG tài khoản Discord đang đăng nhập (tách biệt 100% theo discord_id)
export async function dbGetUserApiKeys(discordUserId) {
  const cleanId = String(discordUserId || '').trim();
  if (!cleanId) return [];

  const fallbackList = await ensureMemoryDefaultKey(cleanId);
  const cfg = getSupabaseConfig();

  if (!cfg.configured) {
    return fallbackList;
  }

  try {
    const queryUrl = `${cfg.url}/rest/v1/slk_api_keys?discord_id=eq.${encodeURIComponent(cleanId)}&order=is_default.desc,created_at.desc`;
    const res = await fetch(queryUrl, {
      method: 'GET',
      headers: getSupabaseHeaders(cfg.key),
    });

    if (!res.ok) {
      return fallbackList;
    }

    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      // Nếu trong DB chưa có Master Key của user này thì tự tạo và trả về
      await dbUpsertDiscordUser({ id: cleanId, username: cleanId });
      return fallbackList;
    }

    const mapped = rows.map(r => ({
      id: r.id,
      discordId: r.discord_id,
      name: r.name,
      token: r.token,
      isDefault: Boolean(r.is_default),
      createdAt: r.created_at,
    }));

    memoryUserKeysMap.set(cleanId, mapped);
    return mapped;
  } catch {
    return fallbackList;
  }
}

// 3. Tạo thêm API Key mới cho đúng Discord User ID đó
export async function dbCreateUserApiKey(discordUserId, keyObj) {
  const cleanId = String(discordUserId || '').trim();
  const list = await ensureMemoryDefaultKey(cleanId);

  const newEntry = {
    id: keyObj.id || `key_${cleanId}_${Date.now()}`,
    discordId: cleanId,
    name: keyObj.name || 'API Key mới',
    token: keyObj.token,
    isDefault: false,
    createdAt: keyObj.createdAt || new Date().toISOString(),
  };

  // Lưu vào bộ nhớ đệm của riêng user này
  const updated = [
    ...list.filter(k => k.isDefault),
    newEntry,
    ...list.filter(k => !k.isDefault && k.id !== newEntry.id),
  ];
  memoryUserKeysMap.set(cleanId, updated);

  const cfg = getSupabaseConfig();
  if (cfg.configured) {
    try {
      // Đảm bảo user đã tồn tại trong slk_users trước khi insert khóa ngoại
      await fetch(`${cfg.url}/rest/v1/slk_users`, {
        method: 'POST',
        headers: getSupabaseHeaders(cfg.key, {
          'Prefer': 'resolution=merge-duplicates,return=minimal',
        }),
        body: JSON.stringify({
          discord_id: cleanId,
          username: cleanId,
          global_name: cleanId,
          is_admin: cleanId === OWNER_ADMIN_DISCORD_ID,
          updated_at: new Date().toISOString(),
        }),
      });

      await fetch(`${cfg.url}/rest/v1/slk_api_keys`, {
        method: 'POST',
        headers: getSupabaseHeaders(cfg.key, {
          'Prefer': 'resolution=merge-duplicates,return=minimal',
        }),
        body: JSON.stringify({
          id: newEntry.id,
          discord_id: cleanId,
          name: newEntry.name,
          token: newEntry.token,
          is_default: false,
          created_at: newEntry.createdAt,
        }),
      });
    } catch (err) {
      console.warn('Supabase insert key warning:', err.message);
    }
  }

  return newEntry;
}

// 4. Xóa 1 API Key của đúng Discord User ID đó (không cho xóa Master Key mặc định)
export async function dbDeleteUserApiKey(discordUserId, keyId) {
  const cleanId = String(discordUserId || '').trim();
  const cleanKeyId = String(keyId || '').trim();
  if (!cleanId || !cleanKeyId) return false;

  const list = await ensureMemoryDefaultKey(cleanId);
  const filtered = list.filter(k => k.isDefault || k.id !== cleanKeyId);
  memoryUserKeysMap.set(cleanId, filtered);

  const cfg = getSupabaseConfig();
  if (cfg.configured) {
    try {
      const delUrl = `${cfg.url}/rest/v1/slk_api_keys?id=eq.${encodeURIComponent(cleanKeyId)}&discord_id=eq.${encodeURIComponent(cleanId)}&is_default=eq.false`;
      await fetch(delUrl, {
        method: 'DELETE',
        headers: getSupabaseHeaders(cfg.key),
      });
    } catch (err) {
      console.warn('Supabase delete key warning:', err.message);
    }
  }

  return true;
}

// 5. Đồng bộ Admin Gate Pool từ Supabase (slk_gate_pool)
export async function dbLoadGatePoolFromSupabase() {
  const cfg = getSupabaseConfig();
  if (!cfg.configured) return null;

  try {
    const res = await fetch(`${cfg.url}/rest/v1/slk_gate_pool?order=added_at.asc`, {
      method: 'GET',
      headers: getSupabaseHeaders(cfg.key),
    });
    if (!res.ok) return null;

    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;

    return rows.map((r, idx) => {
      const parsed = parseGateNameAndModels(r.name || `Gate #${idx + 1}`);
      const rawKeys = String(r.api_key || '').split(/[\n,;]+/).map(k => k.trim()).filter(Boolean);
      const cleanKeys = Array.from(new Set(rawKeys));
      const primaryKey = cleanKeys[0] || String(r.api_key || '').trim();
      return {
        id: r.id || `gate_${idx + 1}`,
        name: parsed.displayName,
        models: parsed.models,
        baseUrl: r.base_url || 'https://api.hcnsec.cn/v1',
        apiKey: primaryKey,
        apiKeys: cleanKeys.length > 0 ? cleanKeys : [primaryKey],
        maskedKey: cleanKeys.length > 1
          ? `${cleanKeys.length} Keys (${maskApiKey(primaryKey)})`
          : (r.masked_key || maskApiKey(primaryKey)),
        enabled: r.enabled !== false,
        isPrimary: idx === 0 || Boolean(r.is_primary),
        status: r.status || 'online',
        requests: Number(r.requests || 0),
        errors: Number(r.errors || 0),
        lastLatencyMs: r.last_latency_ms || null,
        lastUsedAt: r.last_used_at || null,
        addedAt: r.added_at || new Date().toISOString(),
      };
    });
  } catch {
    return null;
  }
}

export async function dbSyncGatePoolToSupabase(rawPoolList = []) {
  const cfg = getSupabaseConfig();
  if (!cfg.configured || !Array.isArray(rawPoolList) || rawPoolList.length === 0) return false;

  try {
    const payload = rawPoolList.map((g, idx) => {
      const keys = Array.isArray(g.apiKeys) && g.apiKeys.length > 0 ? g.apiKeys : (g.apiKey ? [g.apiKey] : []);
      const primaryKey = keys[0] || g.apiKey;
      const joinedApiKey = keys.join(',');
      const maskedKey = keys.length > 1
        ? `${keys.length} Keys (${maskApiKey(primaryKey)})`
        : maskApiKey(primaryKey);

      return {
        id: g.id,
        name: encodeGateNameWithModels(g.name, g.models),
        base_url: g.baseUrl,
        api_key: joinedApiKey,
        masked_key: maskedKey,
        enabled: g.enabled !== false,
        is_primary: idx === 0,
        status: g.status || 'online',
        requests: Number(g.requests || 0),
        errors: Number(g.errors || 0),
        last_latency_ms: g.lastLatencyMs || null,
        last_used_at: g.lastUsedAt || null,
        added_at: g.addedAt || new Date().toISOString(),
      };
    });

    await fetch(`${cfg.url}/rest/v1/slk_gate_pool`, {
      method: 'POST',
      headers: getSupabaseHeaders(cfg.key, {
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      }),
      body: JSON.stringify(payload),
    });
    return true;
  } catch {
    return false;
  }
}

export async function dbDeleteGateFromSupabase(gateId) {
  const cfg = getSupabaseConfig();
  if (!cfg.configured || !gateId) return false;

  try {
    await fetch(`${cfg.url}/rest/v1/slk_gate_pool?id=eq.${encodeURIComponent(gateId)}`, {
      method: 'DELETE',
      headers: getSupabaseHeaders(cfg.key),
    });
    return true;
  } catch {
    return false;
  }
}

// ==========================================================
// VÍ TIỀN (VND) - Số dư & Giao dịch theo Discord User ID
// Persistence trên Supabase + fallback bộ nhớ khi chưa cấu hình
// ==========================================================
const memoryBalancesVnd = new Map(); // discord_id -> { value, fetchedAt }
const memoryTransactionsMap = new Map(); // discord_id -> [transaction]
const BALANCE_CACHE_TTL_MS = 5000; // Cache số dư tối đa 5s để tránh stale qua nhiều instance

function setCachedBalance(uid, value) {
  memoryBalancesVnd.set(uid, { value: Number(value), fetchedAt: Date.now() });
}

// Helper fetch chung tới Supabase REST (trả null nếu chưa cấu hình)
export async function supabaseRestFetch(path, init = {}) {
  const cfg = getSupabaseConfig();
  if (!cfg.configured) return null;

  return fetch(`${cfg.url}${path}`, {
    ...init,
    headers: getSupabaseHeaders(cfg.key, init.headers || {}),
  });
}

// Đọc số dư ví của 1 user (memory cache 5s -> Supabase -> mặc định 100.000 ₫)
export async function dbGetUserBalanceVnd(discordUserId) {
  const uid = String(discordUserId || '').trim();
  if (!uid) return 0;

  const cached = memoryBalancesVnd.get(uid);
  const cacheFresh = Boolean(cached) && (Date.now() - cached.fetchedAt < BALANCE_CACHE_TTL_MS);

  // Chỉ query Supabase khi cache hết hạn (hoặc chưa có) và Supabase đã cấu hình
  if (!cacheFresh) {
    try {
      const res = await supabaseRestFetch(
        `/rest/v1/slk_users?discord_id=eq.${encodeURIComponent(uid)}&select=balance_vnd`
      );
      if (res && res.ok) {
        const rows = await res.json();
        const row = Array.isArray(rows) ? rows[0] : null;
        if (row) {
          const rawBal = row.balance_vnd;
          const bal = rawBal === null || rawBal === undefined ? DEFAULT_USER_BALANCE_VND : Number(rawBal);
          const finalBal = Number.isFinite(bal) ? bal : DEFAULT_USER_BALANCE_VND;
          setCachedBalance(uid, finalBal);
          return finalBal;
        }
        // Chưa có row trong DB (user chưa login qua Discord):
        // - nếu đã có số dư memory (đang dùng tạm) -> GIỮ NGUYÊN, không reset
        // - nếu chưa có -> tặng mặc định
        if (!cached) {
          setCachedBalance(uid, DEFAULT_USER_BALANCE_VND);
          return DEFAULT_USER_BALANCE_VND;
        }
        return cached.value;
      }
      // Supabase trả lỗi (vd: chưa chạy schema mới) -> GIỮ NGUYÊN số dư memory, không ghi đè bằng mặc định
    } catch {
      // Lỗi mạng -> giữ nguyên memory
    }
  }

  // Cache còn hiệu lực HOẶC Supabase không đọc được -> dùng memory (nguồn duy nhất ở chế độ local)
  if (cached) return cached.value;

  setCachedBalance(uid, DEFAULT_USER_BALANCE_VND);
  return DEFAULT_USER_BALANCE_VND;
}

// Trừ tiền trong ví. Ưu tiên RPC atomic (slk_debit_balance), fallback SELECT+PATCH.
export async function dbDebitUserBalanceVnd(discordUserId, amountVnd) {
  const uid = String(discordUserId || '').trim();
  const fee = Math.floor(Number(amountVnd) || 0);
  if (!uid || fee <= 0) return { ok: false, error: 'invalid_input', balanceVnd: -1 };

  // 1) Thử RPC atomic nếu đã chạy schema mới
  try {
    const rpcRes = await supabaseRestFetch('/rest/v1/rpc/slk_debit_balance', {
      method: 'POST',
      body: JSON.stringify({ p_discord_id: uid, p_amount: fee }),
    });
    if (rpcRes && rpcRes.ok) {
      const data = await rpcRes.json();
      if (data && data.ok) {
        setCachedBalance(uid, data.balance_vnd);
        return { ok: true, balanceVnd: Number(data.balance_vnd), source: 'supabase' };
      }
      if (data?.error === 'user_not_found') {
        // User chưa có row trong DB -> rơi xuống fallback bên dưới (tặng mặc định rồi trừ)
      } else {
        return {
          ok: false,
          error: data?.error || 'insufficient_balance',
          balanceVnd: Number(data?.balance_vnd ?? -1),
          source: 'supabase',
        };
      }
    }
    // RPC không tồn tại (404/PGRST202) -> rơi xuống fallback bên dưới
  } catch {
    // fallback
  }

  // 2) Fallback: SELECT rồi PATCH có kiểm tra số dư
  try {
    const selRes = await supabaseRestFetch(
      `/rest/v1/slk_users?discord_id=eq.${encodeURIComponent(uid)}&select=balance_vnd`
    );
    if (selRes && selRes.ok) {
      const rows = await selRes.json();
      const row = Array.isArray(rows) ? rows[0] : null;
      if (row) {
        const current = Number(row.balance_vnd);
        if (!(current >= fee)) {
          return { ok: false, error: 'insufficient_balance', balanceVnd: current, source: 'supabase' };
        }
        const newBalance = current - fee;
        const patchRes = await supabaseRestFetch(
          `/rest/v1/slk_users?discord_id=eq.${encodeURIComponent(uid)}`,
          {
            method: 'PATCH',
            body: JSON.stringify({ balance_vnd: newBalance, updated_at: new Date().toISOString() }),
          }
        );
        if (patchRes && patchRes.ok) {
          setCachedBalance(uid, newBalance);
          return { ok: true, balanceVnd: newBalance, source: 'supabase-fallback' };
        }
      }
    }
  } catch {
    // fallback memory
  }

  // 3) Fallback cuối: trừ trong bộ nhớ (chế độ local / chưa cấu hình Supabase)
  const cachedEntry = memoryBalancesVnd.get(uid);
  const current = cachedEntry ? cachedEntry.value : DEFAULT_USER_BALANCE_VND;
  if (current < fee) {
    return { ok: false, error: 'insufficient_balance', balanceVnd: current, source: 'memory' };
  }
  const newBalance = current - fee;
  setCachedBalance(uid, newBalance);
  return { ok: true, balanceVnd: newBalance, source: 'memory' };
}

// Nạp tiền vào ví (Admin). Ưu tiên RPC atomic, fallback PATCH/INSERT.
export async function dbTopUpUserBalanceVnd(discordUserId, amountVnd) {
  const uid = String(discordUserId || '').trim();
  const amount = Math.floor(Number(amountVnd) || 0);
  if (!uid || amount <= 0) return { ok: false, error: 'invalid_input' };

  const current = await dbGetUserBalanceVnd(uid);
  const newBalance = current + amount;
  setCachedBalance(uid, newBalance);

  // 1) Thử RPC atomic
  try {
    const rpcRes = await supabaseRestFetch('/rest/v1/rpc/slk_topup_balance', {
      method: 'POST',
      body: JSON.stringify({ p_discord_id: uid, p_amount: amount }),
    });
    if (rpcRes && rpcRes.ok) {
      const data = await rpcRes.json();
      if (data && data.ok) {
        setCachedBalance(uid, data.balance_vnd);
        return { ok: true, balanceVnd: Number(data.balance_vnd), source: 'supabase' };
      }
    }
  } catch {
    // fallback
  }

  // 2) Fallback: PATCH số dư; nếu user chưa tồn tại thì INSERT mới
  try {
    const patchRes = await supabaseRestFetch(
      `/rest/v1/slk_users?discord_id=eq.${encodeURIComponent(uid)}`,
      {
        method: 'PATCH',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify({ balance_vnd: newBalance, updated_at: new Date().toISOString() }),
      }
    );
    if (patchRes && patchRes.ok) {
      const rows = await patchRes.json().catch(() => []);
      const row = Array.isArray(rows) ? rows[0] : null;
      if (row && Number.isFinite(Number(row.balance_vnd))) {
        setCachedBalance(uid, row.balance_vnd);
        return { ok: true, balanceVnd: Number(row.balance_vnd), source: 'supabase-fallback' };
      }

      // Không có row nào -> tạo mới user với số dư hiện tại
      const insertRes = await supabaseRestFetch('/rest/v1/slk_users', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({
          discord_id: uid,
          username: uid,
          global_name: uid,
          balance_vnd: newBalance,
          updated_at: new Date().toISOString(),
        }),
      });
      if (insertRes && insertRes.ok) {
        const inserted = await insertRes.json().catch(() => []);
        const newRow = Array.isArray(inserted) ? inserted[0] : null;
        const bal = Number(newRow?.balance_vnd);
        if (Number.isFinite(bal)) setCachedBalance(uid, bal);
        return { ok: true, balanceVnd: Number.isFinite(bal) ? bal : newBalance, source: 'supabase-insert' };
      }
    }
  } catch {
    // fallback memory
  }

  return { ok: true, balanceVnd: newBalance, source: 'memory' };
}

// Ghi 1 giao dịch ví (memory luôn + Supabase best-effort)
export async function dbInsertWalletTransaction(discordUserId, entry = {}) {
  const uid = String(discordUserId || '').trim();
  if (!uid) return null;

  const tx = {
    id: `tx_${uid}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    discordId: uid,
    type: entry.type === 'topup' ? 'topup' : 'debit',
    amountVnd: Math.floor(Number(entry.amountVnd) || 0),
    balanceAfterVnd: Number.isFinite(Number(entry.balanceAfterVnd)) ? Number(entry.balanceAfterVnd) : null,
    model: String(entry.model || ''),
    note: String(entry.note || ''),
    createdAt: new Date().toISOString(),
  };

  const list = memoryTransactionsMap.get(uid) || [];
  list.unshift(tx);
  memoryTransactionsMap.set(uid, list.slice(0, 100));

  try {
    await supabaseRestFetch('/rest/v1/slk_transactions', {
      method: 'POST',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        id: tx.id,
        discord_id: tx.discordId,
        type: tx.type,
        amount_vnd: tx.amountVnd,
        balance_after_vnd: tx.balanceAfterVnd,
        model: tx.model,
        note: tx.note,
        created_at: tx.createdAt,
      }),
    });
  } catch {
    // Bảng slk_transactions chưa tồn tại -> bỏ qua, vẫn lưu memory
  }

  return tx;
}

// Lấy lịch sử giao dịch ví của 1 user (mới nhất trước)
export async function dbGetUserTransactions(discordUserId, limit = 50) {
  const uid = String(discordUserId || '').trim();
  if (!uid) return [];

  try {
    const res = await supabaseRestFetch(
      `/rest/v1/slk_transactions?discord_id=eq.${encodeURIComponent(uid)}&order=created_at.desc&limit=${limit}`
    );
    if (res && res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows)) {
        const mapped = rows.map(r => ({
          id: r.id,
          discordId: r.discord_id,
          type: r.type,
          amountVnd: Number(r.amount_vnd || 0),
          balanceAfterVnd: r.balance_after_vnd === null || r.balance_after_vnd === undefined ? null : Number(r.balance_after_vnd),
          model: r.model || '',
          note: r.note || '',
          createdAt: r.created_at,
        }));
        memoryTransactionsMap.set(uid, mapped.slice(0, 100));
        return mapped;
      }
    }
  } catch {
    // fallback memory
  }

  return memoryTransactionsMap.get(uid) || [];
}
