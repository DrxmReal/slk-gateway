import {
  OWNER_ADMIN_DISCORD_ID,
  generateDiscordUserApiKey,
  maskApiKey,
} from './_utils.js';

// Runtime Supabase config (có thể cấu hình qua biến môi trường hoặc trực tiếp từ Admin Pool)
let runtimeSupabaseUrl = '';
let runtimeSupabaseKey = '';

// Bộ nhớ đệm tách biệt 100% theo từng Discord User ID (Fallback khi chưa điền Supabase hoặc chưa chạy SQL)
const memoryUserKeysMap = new Map();

export function setRuntimeSupabaseConfig(url = '', key = '') {
  if (url) runtimeSupabaseUrl = String(url).trim().replace(/\/+$/, '');
  if (key) runtimeSupabaseKey = String(key).trim();
}

export function getSupabaseConfig() {
  const url = (
    runtimeSupabaseUrl ||
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  )
    .trim()
    .replace(/\/+$/, '');

  const key = (
    runtimeSupabaseKey ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
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
  const url = (customUrl || cfg.url).trim().replace(/\/+$/, '');
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

    return rows.map((r, idx) => ({
      id: r.id || `gate_${idx + 1}`,
      name: r.name || `Gate #${idx + 1}`,
      baseUrl: r.base_url || 'https://api.hcnsec.cn/v1',
      apiKey: r.api_key,
      maskedKey: r.masked_key || maskApiKey(r.api_key),
      enabled: r.enabled !== false,
      isPrimary: idx === 0 || Boolean(r.is_primary),
      status: r.status || 'online',
      requests: Number(r.requests || 0),
      errors: Number(r.errors || 0),
      lastLatencyMs: r.last_latency_ms || null,
      lastUsedAt: r.last_used_at || null,
      addedAt: r.added_at || new Date().toISOString(),
    }));
  } catch {
    return null;
  }
}

export async function dbSyncGatePoolToSupabase(rawPoolList = []) {
  const cfg = getSupabaseConfig();
  if (!cfg.configured || !Array.isArray(rawPoolList) || rawPoolList.length === 0) return false;

  try {
    const payload = rawPoolList.map((g, idx) => ({
      id: g.id,
      name: g.name,
      base_url: g.baseUrl,
      api_key: g.apiKey,
      masked_key: g.maskedKey || maskApiKey(g.apiKey),
      enabled: g.enabled !== false,
      is_primary: idx === 0,
      status: g.status || 'online',
      requests: Number(g.requests || 0),
      errors: Number(g.errors || 0),
      last_latency_ms: g.lastLatencyMs || null,
      last_used_at: g.lastUsedAt || null,
      added_at: g.addedAt || new Date().toISOString(),
    }));

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
