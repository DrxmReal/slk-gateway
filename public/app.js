// ==========================================
// SLK Gateway Dashboard - Client Logic (Discord Auth + Multi API Key Manager + 15 Models & Status)
// ==========================================

let currentTab = 'docs';
let availableModels = [];
let chatHistory = [];
let activeAbortController = null;

// Model Status Filters
let activeProviderFilter = 'all';
let activePriceFilter = 'all';

// Settings & Discord Session
let systemPrompt = localStorage.getItem('nexus_system_prompt') || 'Bạn là trợ lý AI hữu ích, thông minh và phản hồi nhanh chóng bằng tiếng Việt.';
let chatTemperature = parseFloat(localStorage.getItem('nexus_temperature') || '0.7');
let discordUser = null;
let clientAccessToken = localStorage.getItem('nexus_discord_api_key') || '';
let userApiKeys = [];
let adminSecret = localStorage.getItem('slk_admin_secret') || '';
let adminGatesList = [];
const OWNER_ADMIN_DISCORD_ID = '1207080545159487498';
let adminWalletTransactions = [];

// ---- Ví tiền (VND): mỗi user có 100.000 ₫, trừ phí cố định theo mỗi request ----
const GATEWAY_MODELS = [
  'auto',
  'nemotron-3-super-120b-a12b',
  'step-5-preview',
  'k2-horizon',
  'agnes-3.0-flash',
  'space-bunny',
  'glm-5.3',
  'longcat-2.5',
  'sensenova-6.8-flash-lite'
];
const MODEL_FEE_VND = {
  'auto': 1000,
  'nemotron-3-super-120b-a12b': 1000,
  'step-5-preview': 1000,
  'glm-5.3': 1000,
  'k2-horizon': 500,
  'agnes-3.0-flash': 500,
  'space-bunny': 500,
  'longcat-2.5': 500,
  'sensenova-6.8-flash-lite': 500,
};
const DEFAULT_MODEL_ID = 'auto';
let walletBalanceVnd = null;
let walletTransactions = [];
let walletPricing = {};

function formatVnd(amount) {
  const num = Math.round(Number(amount) || 0);
  return `${num.toLocaleString('vi-VN')} ₫`;
}

function getModelFeeVnd(modelId) {
  const fee = walletPricing[modelId] ?? MODEL_FEE_VND[modelId];
  const parsed = Number(fee);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1000;
}

async function loadWallet() {
  if (!clientAccessToken || !discordUser?.id) return;
  try {
    const res = await fetch('/api/wallet', {
      headers: { Authorization: `Bearer ${clientAccessToken}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    if (!data.success) return;
    walletBalanceVnd = Number(data.balanceVnd || 0);
    walletTransactions = Array.isArray(data.transactions) ? data.transactions : [];
    walletPricing = data.pricing || {};
    renderWalletUI();
  } catch {}
}

function renderWalletUI() {
  const badge = document.getElementById('user-balance-badge');
  if (badge && walletBalanceVnd !== null) {
    badge.textContent = formatVnd(walletBalanceVnd);
    badge.classList.toggle('text-rose-400', walletBalanceVnd < 1000);
    badge.classList.toggle('text-emerald-400', walletBalanceVnd >= 1000);
  }

  const balanceValue = document.getElementById('wallet-balance-value');
  if (balanceValue && walletBalanceVnd !== null) {
    balanceValue.textContent = formatVnd(walletBalanceVnd);
  }

  const requestsLeft = document.getElementById('wallet-requests-left');
  if (requestsLeft && walletBalanceVnd !== null) {
    requestsLeft.textContent = `≈ ${Math.floor(walletBalanceVnd / 1000)} lượt với model 1.000 ₫/lượt`;
  }

  const tbody = document.getElementById('wallet-transactions-body');
  if (tbody) {
    if (!walletTransactions.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="px-3 py-6 text-center text-slate-500 text-xs">Chưa có giao dịch nào.</td></tr>`;
    } else {
      tbody.innerHTML = walletTransactions.slice(0, 20).map(tx => {
        const isTopup = tx.type === 'topup';
        const sign = isTopup ? '+' : '-';
        const color = isTopup ? 'text-emerald-400' : 'text-rose-400';
        const time = tx.createdAt ? new Date(tx.createdAt).toLocaleString('vi-VN') : '';
        return `<tr class="border-t border-slate-800/60">
          <td class="px-3 py-2 text-slate-300 text-xs whitespace-nowrap">${escapeHtml(time)}</td>
          <td class="px-3 py-2 text-xs ${color} font-mono font-semibold whitespace-nowrap">${sign}${formatVnd(tx.amountVnd)}</td>
          <td class="px-3 py-2 text-slate-400 text-xs font-mono truncate max-w-[140px]">${escapeHtml(tx.model || (isTopup ? 'Nạp tiền' : 'API'))}</td>
          <td class="px-3 py-2 text-slate-300 text-xs font-mono whitespace-nowrap">${tx.balanceAfterVnd !== null && tx.balanceAfterVnd !== undefined ? formatVnd(tx.balanceAfterVnd) : '—'}</td>
        </tr>`;
      }).join('');
    }
  }
}

// ---- Nạp tiền vào ví (Admin) ----
async function handleTopUpBalance(e) {
  if (e && e.preventDefault) e.preventDefault();
  const uidInput = document.getElementById('admin-topup-discord-id');
  const amountInput = document.getElementById('admin-topup-amount');
  const resultEl = document.getElementById('admin-topup-result');

  const targetUid = (uidInput?.value || '').trim();
  const amountVnd = Math.floor(Number(amountInput?.value || 0));

  if (!targetUid || amountVnd <= 0) {
    if (resultEl) {
      resultEl.textContent = 'Vui lòng nhập Discord User ID và số tiền hợp lệ.';
      resultEl.className = 'text-xs text-rose-400';
    }
    return;
  }

  try {
    const res = await fetch('/api/admin/pool', {
      method: 'POST',
      headers: getAdminRequestHeaders(),
      body: JSON.stringify({
        action: 'topup_balance',
        discordUserId: targetUid,
        amountVnd,
        adminSecret: adminSecret || 'slk-admin',
      }),
    });
    const data = await res.json();
    if (data.success) {
      if (resultEl) {
        resultEl.innerHTML = `✅ Đã nạp <strong>${formatVnd(amountVnd)}</strong> cho <code class="font-mono">${escapeHtml(targetUid)}</code>. Số dư mới: <strong>${formatVnd(data.topup?.balanceVnd || 0)}</strong>`;
        resultEl.className = 'text-xs text-emerald-400';
      }
      if (data.wallet) renderAdminWalletResult(data.wallet);
      if (isCurrentUserOwnerAdmin()) loadWallet();
    } else {
      if (resultEl) {
        resultEl.textContent = `❌ ${data.error || 'Nạp tiền thất bại.'}`;
        resultEl.className = 'text-xs text-rose-400';
      }
    }
  } catch (err) {
    if (resultEl) {
      resultEl.textContent = `❌ Lỗi: ${err.message}`;
      resultEl.className = 'text-xs text-rose-400';
    }
  }
}

function renderAdminWalletResult(wallet) {
  const box = document.getElementById('admin-topup-wallet-result');
  if (!box || !wallet) return;
  box.classList.remove('hidden');
  const txs = (wallet.transactions || []).slice(0, 5);
  box.innerHTML = `
    <div class="text-xs text-slate-300 mb-2">
      Số dư hiện tại của <code class="font-mono text-indigo-300">${escapeHtml(wallet.discordUserId || '')}</code>:
      <strong class="text-emerald-400 font-mono">${formatVnd(wallet.balanceVnd || 0)}</strong>
    </div>
    ${txs.length ? `<div class="space-y-1">${txs.map(tx => `
      <div class="flex items-center justify-between text-[11px] font-mono">
        <span class="text-slate-500">${escapeHtml(tx.createdAt ? new Date(tx.createdAt).toLocaleString('vi-VN') : '')}</span>
        <span class="${tx.type === 'topup' ? 'text-emerald-400' : 'text-rose-400'}">${tx.type === 'topup' ? '+' : '-'}${formatVnd(tx.amountVnd)}</span>
        <span class="text-slate-400 truncate max-w-[120px]">${escapeHtml(tx.model || tx.note || '')}</span>
      </div>`).join('')}</div>` : ''}
  `;
  if (window.lucide) lucide.createIcons();
}

function isCurrentUserOwnerAdmin() {
  return Boolean(discordUser && String(discordUser.id).trim() === OWNER_ADMIN_DISCORD_ID);
}

let oauthConfig = {
  clientId: '1558375997416677426',
  hasSecret: true,
};

try {
  // Xóa bộ nhớ dùng chung cũ từng gây trùng Master Key giữa 2 tài khoản
  localStorage.removeItem('nexus_user_api_keys');
  const savedUser = localStorage.getItem('nexus_discord_user');
  if (savedUser) discordUser = JSON.parse(savedUser);
} catch {
  discordUser = null;
}

function getUserKeysStorageName(uid) {
  const cleanUid = String(uid || discordUser?.id || '').trim();
  return cleanUid ? `slk_user_keys_${cleanUid}` : '';
}

function filterKeysBelongingToUser(keysList = [], uid = '') {
  const cleanUid = String(uid || discordUser?.id || '').trim();
  if (!cleanUid || !Array.isArray(keysList)) return [];
  const dcPrefix = `sk-dc-${cleanUid}-`;
  const nxPrefix = `sk-nx-${cleanUid}-`;
  return keysList.filter(k => {
    const token = String(k?.token || '');
    return token.startsWith(dcPrefix) || token.startsWith(nxPrefix);
  });
}

function loadCachedKeysForCurrentUser() {
  if (!discordUser?.id) {
    userApiKeys = [];
    return;
  }
  try {
    const storageKey = getUserKeysStorageName(discordUser.id);
    const saved = storageKey ? localStorage.getItem(storageKey) : null;
    const parsed = saved ? JSON.parse(saved) : [];
    userApiKeys = filterKeysBelongingToUser(parsed, discordUser.id);
  } catch {
    userApiKeys = [];
  }
}

function saveCachedKeysForCurrentUser(list = userApiKeys) {
  if (!discordUser?.id) return;
  userApiKeys = filterKeysBelongingToUser(list, discordUser.id);
  const storageKey = getUserKeysStorageName(discordUser.id);
  if (storageKey) {
    localStorage.setItem(storageKey, JSON.stringify(userApiKeys));
  }
}

loadCachedKeysForCurrentUser();

// Initialize Markdown parser
if (window.marked) {
  marked.setOptions({
    breaks: true,
    gfm: true,
    highlight: function(code, lang) {
      if (window.hljs && lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(code, { language: lang }).value;
        } catch {}
      }
      return code;
    }
  });
}

// ------------------------------------------
// Initialization on DOM Ready
// ------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  if (window.lucide) lucide.createIcons();

  const redirectPreview = document.getElementById('oauth-redirect-preview');
  if (redirectPreview) {
    redirectPreview.textContent = `${window.location.origin}/`;
  }

  const spEl = document.getElementById('modal-system-prompt');
  if (spEl) spEl.value = systemPrompt;
  const tempEl = document.getElementById('modal-temperature');
  if (tempEl) tempEl.value = chatTemperature;
  const tempVal = document.getElementById('temp-val');
  if (tempVal) tempVal.textContent = chatTemperature;

  await loadDiscordOAuthConfig();
  await handleDiscordRedirectCallback();
  updateAuthUI();

  if (window.hljs) hljs.highlightAll();
});

// ------------------------------------------
// Discord OAuth2 Authentication Flow
// ------------------------------------------
async function loadDiscordOAuthConfig() {
  try {
    const res = await fetch('/api/auth/config');
    if (res.ok) {
      const data = await res.json();
      if (data.clientId) oauthConfig.clientId = data.clientId;
      oauthConfig.hasSecret = Boolean(data.hasSecret);
    }
  } catch (err) {
    console.warn('Could not load auth config:', err);
  }
}

async function handleDiscordRedirectCallback() {
  const hash = window.location.hash.substring(1);
  const hashParams = new URLSearchParams(hash);
  const queryParams = new URLSearchParams(window.location.search);

  const accessToken = hashParams.get('access_token');
  const code = queryParams.get('code');
  const errorDesc = hashParams.get('error_description') || queryParams.get('error_description');

  if (errorDesc) {
    showDiscordError(`Discord từ chối đăng nhập: ${errorDesc}`);
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }

  if (!accessToken && !code) return;

  const btn = document.getElementById('btn-discord-login');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span>Đang xác thực tài khoản Discord...</span>`;
  }

  try {
    const redirectUri = `${window.location.origin}/`;
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: accessToken || '',
        code: code || '',
        client_id: oauthConfig.clientId,
        redirect_uri: redirectUri,
      }),
    });

    const data = await res.json();
    window.history.replaceState({}, document.title, window.location.pathname);

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Xác thực Discord thất bại.');
    }

    discordUser = data.user;
    clientAccessToken = data.apiKey;
    localStorage.setItem('nexus_discord_user', JSON.stringify(discordUser));
    localStorage.setItem('nexus_discord_api_key', clientAccessToken);

    if (Array.isArray(data.keys) && data.keys.length > 0) {
      saveCachedKeysForCurrentUser(data.keys);
    } else {
      loadCachedKeysForCurrentUser();
      ensureDefaultKeyInList(data.apiKey);
    }
  } catch (err) {
    showDiscordError(err.message);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<span>Đăng nhập với Discord</span>`;
    }
  }
}

function ensureDefaultKeyInList(masterKey) {
  if (!masterKey || !discordUser?.id) return;
  userApiKeys = filterKeysBelongingToUser(userApiKeys, discordUser.id);
  const exists = userApiKeys.some(k => k.token === masterKey);
  if (!exists) {
    userApiKeys.unshift({
      id: `default_master_${discordUser.id}`,
      discordId: discordUser.id,
      name: 'Mặc định (Discord Master Key)',
      token: masterKey,
      createdAt: new Date().toISOString(),
      isDefault: true,
    });
  }
  saveCachedKeysForCurrentUser(userApiKeys);
}

async function fetchUserApiKeysFromDatabase() {
  if (!discordUser?.id || !clientAccessToken) return;
  try {
    const res = await fetch(`/api/keys?discordUserId=${encodeURIComponent(discordUser.id)}`, {
      headers: {
        'Authorization': `Bearer ${clientAccessToken}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.keys) && data.keys.length > 0) {
        saveCachedKeysForCurrentUser(data.keys);
        renderApiKeysTable();
        updateGatewayUrls();
      }
    }
  } catch (err) {
    console.warn('Could not sync user keys from database:', err);
  }
}

function updateAuthUI() {
  const gate = document.getElementById('discord-login-gate');
  const userPill = document.getElementById('discord-user-pill');
  const userAvatar = document.getElementById('discord-user-avatar');
  const userName = document.getElementById('discord-user-name');
  const navAdmin = document.getElementById('nav-admin');
  const mobileNavAdmin = document.getElementById('mobile-nav-admin');
  const tabAdmin = document.getElementById('tab-admin');

  if (discordUser && clientAccessToken) {
    loadCachedKeysForCurrentUser();
    ensureDefaultKeyInList(clientAccessToken);

    if (gate) gate.classList.add('hidden');
    if (userPill) {
      userPill.classList.remove('hidden');
      userPill.classList.add('flex');
    }
    if (userAvatar) userAvatar.src = discordUser.avatar_url;
    if (userName) userName.textContent = discordUser.global_name || discordUser.username;

    // Chỉ hiển thị nút Admin Pool cho đúng Discord User ID 1207080545159487498
    if (isCurrentUserOwnerAdmin()) {
      if (navAdmin) {
        navAdmin.classList.remove('hidden');
        navAdmin.classList.add('flex');
      }
      if (mobileNavAdmin) {
        mobileNavAdmin.classList.remove('hidden');
      }
      loadAdminPool(true);
    } else {
      if (navAdmin) {
        navAdmin.classList.add('hidden');
        navAdmin.classList.remove('flex');
      }
      if (mobileNavAdmin) {
        mobileNavAdmin.classList.add('hidden');
      }
      if (tabAdmin) {
        tabAdmin.classList.add('hidden');
      }
      if (currentTab === 'admin') {
        switchTab('docs');
      }
    }

    updateGatewayUrls();
    renderApiKeysTable();
    fetchUserApiKeysFromDatabase();
    checkGatewayHealth();
    loadWallet();
    fetchAvailableModels();
  } else {
    userApiKeys = [];
    if (gate) gate.classList.remove('hidden');
    if (userPill) {
      userPill.classList.add('hidden');
      userPill.classList.remove('flex');
    }
    if (navAdmin) {
      navAdmin.classList.add('hidden');
      navAdmin.classList.remove('flex');
    }
    if (mobileNavAdmin) {
      mobileNavAdmin.classList.add('hidden');
    }
    if (tabAdmin) {
      tabAdmin.classList.add('hidden');
    }
  }
}

function startDiscordOAuth() {
  const clientId = (oauthConfig.clientId || '1558375997416677426').trim();
  const redirectUri = encodeURIComponent(`${window.location.origin}/`);
  const scope = encodeURIComponent('identify');
  const responseType = oauthConfig.hasSecret ? 'code' : 'token';

  const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${redirectUri}&response_type=${responseType}&scope=${scope}`;
  window.location.href = discordAuthUrl;
}

function showDiscordError(msg) {
  const errEl = document.getElementById('discord-auth-error');
  if (errEl) {
    errEl.textContent = msg;
    errEl.classList.remove('hidden');
  }
}

function logoutDiscord() {
  localStorage.removeItem('nexus_discord_user');
  localStorage.removeItem('nexus_discord_api_key');
  discordUser = null;
  clientAccessToken = '';
  userApiKeys = [];
  walletBalanceVnd = null;
  walletTransactions = [];
  updateAuthUI();
}

// ------------------------------------------
// Multi API Key Generator & Dashboard Table (Supabase + Discord ID Isolated)
// ------------------------------------------
async function handleCreateApiKey(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!discordUser || !clientAccessToken) return;

  const nameInput = document.getElementById('new-key-name-input');
  const btn = document.getElementById('btn-create-key');
  const customName = (nameInput?.value || '').trim() || `API Key #${userApiKeys.length + 1}`;

  if (btn) btn.disabled = true;

  try {
    const res = await fetch('/api/keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientAccessToken}`,
      },
      body: JSON.stringify({
        discordUserId: discordUser.id,
        name: customName,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Không thể tạo API Key.');
    }

    if (Array.isArray(data.keys) && data.keys.length > 0) {
      saveCachedKeysForCurrentUser(data.keys);
    } else if (data.key) {
      userApiKeys.unshift(data.key);
      saveCachedKeysForCurrentUser(userApiKeys);
    }

    if (nameInput) nameInput.value = '';
    renderApiKeysTable();
    updateGatewayUrls();
  } catch (err) {
    alert(`Lỗi tạo API Key: ${err.message}`);
  } finally {
    if (btn) btn.disabled = false;
  }
}

function renderApiKeysTable() {
  const tbody = document.getElementById('api-keys-table-body');
  if (!tbody) return;

  const baseUrl = getBaseUrl();
  const visibleKeys = filterKeysBelongingToUser(userApiKeys, discordUser?.id);

  if (visibleKeys.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-6 text-center text-slate-500">Chưa có API Key nào. Hãy nhấn "+ Tạo API Key" ở góc trên.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = visibleKeys.map((item) => {
    const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : 'Hôm nay';
    return `
      <tr class="hover:bg-slate-800/30 transition-colors">
        <td class="py-3.5 px-3 font-medium text-white">
          <div class="flex items-center space-x-2">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>${escapeHtml(item.name)}</span>
          </div>
        </td>
        <td class="py-3.5 px-3 font-mono text-emerald-300">
          <div class="flex items-center space-x-2">
            <span class="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg select-all">${item.token}</span>
          </div>
        </td>
        <td class="py-3.5 px-3 font-mono text-indigo-300">
          <span class="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg select-all">${baseUrl}</span>
        </td>
        <td class="py-3.5 px-3 text-slate-400">${dateStr}</td>
        <td class="py-3.5 px-3 text-right">
          <div class="flex items-center justify-end space-x-1.5">
            <button onclick="copyRawText('${item.token}', 'Đã sao chép API Key!')" class="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-[11px] font-medium transition-all">
              Copy Key
            </button>
            <button onclick="copyKeyBundle('${item.token}')" class="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-[11px] font-medium transition-all" title="Copy cả Base URL /v1 và API Key">
              Copy Kèm Link /v1
            </button>
            ${!item.isDefault ? `
              <button onclick="deleteApiKey('${item.id}')" class="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all" title="Xóa Key">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function copyRawText(text, msg) {
  navigator.clipboard.writeText(text).then(() => {
    alert(msg || `Đã sao chép: ${text}`);
  });
}

function copyKeyBundle(token) {
  const baseUrl = getBaseUrl();
  const bundle = `OpenAI Base URL: ${baseUrl}\nAPI Key: ${token}\nModels: ${GATEWAY_MODELS.join(', ')}`;
  navigator.clipboard.writeText(bundle).then(() => {
    alert(`Đã sao chép trọn bộ cấu hình OpenAI /v1:\n\n${bundle}`);
  });
}

async function deleteApiKey(id) {
  userApiKeys = userApiKeys.filter(k => k.id !== id);
  saveCachedKeysForCurrentUser(userApiKeys);
  renderApiKeysTable();

  if (discordUser?.id && clientAccessToken) {
    try {
      const res = await fetch(`/api/keys?id=${encodeURIComponent(id)}&discordUserId=${encodeURIComponent(discordUser.id)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${clientAccessToken}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.keys)) {
        saveCachedKeysForCurrentUser(data.keys);
        renderApiKeysTable();
      }
    } catch {}
  }
}

// ------------------------------------------
// Dynamic Base URL & Code Snippets
// ------------------------------------------
function getBaseUrl() {
  return `${window.location.origin}/v1`;
}

function updateGatewayUrls() {
  const baseUrl = getBaseUrl();
  const origin = window.location.origin;
  const activeKey = (userApiKeys[0]?.token) || clientAccessToken || 'sk-nx-your-key';

  const modelsEl = document.getElementById('free-models-string');
  if (modelsEl) modelsEl.textContent = GATEWAY_MODELS.join(',');
  const modelsBadge = document.getElementById('free-models-count-badge');
  if (modelsBadge) modelsBadge.textContent = `${GATEWAY_MODELS.length} models`;

  const urlDisplay = document.getElementById('gateway-base-url');
  if (urlDisplay) urlDisplay.textContent = baseUrl;

  const chatUrlDisplay = document.getElementById('gateway-chat-url');
  if (chatUrlDisplay) chatUrlDisplay.textContent = `${baseUrl}/chat/completions`;

  const cursorElem = document.getElementById('cursor-endpoint');
  if (cursorElem) cursorElem.textContent = baseUrl;

  const nextchatElem = document.getElementById('nextchat-endpoint');
  if (nextchatElem) nextchatElem.textContent = origin;

  const chatboxElem = document.getElementById('chatbox-endpoint');
  if (chatboxElem) chatboxElem.textContent = baseUrl;

  const curlElem = document.getElementById('curl-code-block');
  if (curlElem) {
    curlElem.textContent = `curl -X POST "${baseUrl}/chat/completions" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${activeKey}" \\
  -d '{
    "model": "auto",
    "messages": [
      { "role": "user", "content": "Hello!" }
    ]
  }'`;
  }

  const pythonElem = document.getElementById('python-code-block');
  if (pythonElem) {
    pythonElem.textContent = `from openai import OpenAI

client = OpenAI(
    base_url="${baseUrl}",
    api_key="${activeKey}"
)

response = client.chat.completions.create(
    model="auto",  # Models: auto, nemotron-3-super-120b-a12b, step-5-preview, k2-horizon, agnes-3.0-flash, space-bunny, glm-5.3... (trừ phí cố định theo lượt, đơn vị ₫)
    messages=[
        {"role": "user", "content": "Xin chào!"}
    ],
    stream=True
)

for chunk in response:
    print(chunk.choices[0].delta.content or "", end="", flush=True)`;
  }

  const nodejsElem = document.getElementById('nodejs-code-block');
  if (nodejsElem) {
    nodejsElem.textContent = `import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: '${baseUrl}',
  apiKey: '${activeKey}',
});

const stream = await openai.chat.completions.create({
  model: 'auto',
  messages: [{ role: 'user', content: 'Xin chào!' }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}`;
  }
}

// ------------------------------------------
// Tab Switching
// ------------------------------------------
function switchTab(tabId) {
  if (tabId === 'admin' && !isCurrentUserOwnerAdmin()) {
    return;
  }

  currentTab = tabId;

  document.querySelectorAll('.tab-pane').forEach(el => el.classList.add('hidden'));
  const activePane = document.getElementById(`tab-${tabId}`);
  if (activePane) activePane.classList.remove('hidden');

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.classList.add('text-slate-400');
  });
  const activeBtn = document.getElementById(`nav-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.add('active');
    activeBtn.classList.remove('text-slate-400');
  }

  document.querySelectorAll('.mobile-tab-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.classList.add('text-slate-400');
  });
  const activeMobileBtn = document.getElementById(`mobile-nav-${tabId}`);
  if (activeMobileBtn) {
    activeMobileBtn.classList.add('active');
    activeMobileBtn.classList.remove('text-slate-400');
  }

  if (tabId === 'admin' && isCurrentUserOwnerAdmin()) {
    loadAdminPool(true);
  }

  if (window.lucide) lucide.createIcons();
}

function switchCodeLang(lang) {
  document.querySelectorAll('.code-lang-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.snippet-content').forEach(s => s.classList.add('hidden'));

  const activeBtn = document.getElementById(`code-tab-${lang}`);
  const activeSnippet = document.getElementById(`snippet-${lang}`);

  if (activeBtn) activeBtn.classList.add('active');
  if (activeSnippet) activeSnippet.classList.remove('hidden');

  if (window.lucide) lucide.createIcons();
}

// ------------------------------------------
// Gateway Health Check
// ------------------------------------------
async function checkGatewayHealth() {
  const statusPill = document.getElementById('status-pill');
  const statusText = document.getElementById('status-text');
  const gatesBadge = document.getElementById('gates-count-badge');

  try {
    const res = await fetch('/health');
    if (res.ok) {
      const data = await res.json();
      const count = data.total_models || 7;
      const activeGates = data.active_gates || 1;
      if (statusText) statusText.textContent = `${count} Models • ${activeGates} Gate${activeGates > 1 ? 's' : ''}`;
      if (gatesBadge) gatesBadge.textContent = activeGates;
      if (statusPill) statusPill.className = 'hidden lg:flex items-center space-x-2 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-400 whitespace-nowrap transition-all';
    } else {
      throw new Error(`Status ${res.status}`);
    }
  } catch {
    if (statusText) statusText.textContent = 'Chưa kết nối';
    if (statusPill) statusPill.className = 'hidden lg:flex items-center space-x-2 text-xs px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 whitespace-nowrap';
  }
}

// ------------------------------------------
// Fetch Available Models & Render Model Status Cards
// ------------------------------------------
async function fetchAvailableModels() {
  if (!clientAccessToken) return;

  const badge = document.getElementById('models-count-badge');
  const select = document.getElementById('chat-model-select');

  try {
    const headers = { Authorization: `Bearer ${clientAccessToken}` };
    const res = await fetch('/v1/models', { headers });
    if (!res.ok) throw new Error('Không thể tải models');

    const json = await res.json();
    availableModels = json.data || [];

    if (badge) badge.textContent = availableModels.length;

    if (select && availableModels.length > 0) {
      const currentSelected = select.value;
      select.innerHTML = '';

      availableModels.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        const uptime = m.status?.uptime ? `${m.status.uptime}%` : 'Online';
        opt.textContent = `${m.id} (${uptime} • ${formatVnd(getModelFeeVnd(m.id))}/lượt)`;
        select.appendChild(opt);
      });

      if (currentSelected && availableModels.some(m => m.id === currentSelected)) {
        select.value = currentSelected;
      } else {
        select.value = DEFAULT_MODEL_ID;
      }
    }

    updateModelStatusSummary();
    renderModelsStatusGrid();
  } catch (err) {
    console.error('Error fetching models:', err);
  }
}

function updateModelStatusSummary() {
  if (!availableModels.length) return;

  const totalEl = document.getElementById('stat-total-models');
  const healthyEl = document.getElementById('stat-healthy-models');
  const avgUptimeEl = document.getElementById('stat-avg-uptime');
  const avgTpsEl = document.getElementById('stat-avg-tps');

  const total = availableModels.length;
  const healthyCount = availableModels.filter(m => (m.status?.uptime || 90) >= 85).length;
  const avgUptime = (
    availableModels.reduce((sum, m) => sum + (m.status?.uptime || 95), 0) / total
  ).toFixed(2);

  const avgTps = (
    availableModels.reduce((sum, m) => {
      const num = parseFloat(String(m.status?.tps || '45').replace(/[^\d.]/g, '')) || 45;
      return sum + num;
    }, 0) / total
  ).toFixed(1);

  if (totalEl) totalEl.textContent = `${total} Models`;
  if (healthyEl) healthyEl.textContent = `${healthyCount} / ${total} Online`;
  if (avgUptimeEl) avgUptimeEl.textContent = `${avgUptime}%`;
  if (avgTpsEl) avgTpsEl.textContent = `${avgTps} t/s`;
}

function setModelProviderFilter(providerCode) {
  activeProviderFilter = providerCode;
  document.querySelectorAll('.provider-chip').forEach(btn => {
    if (btn.getAttribute('data-provider') === providerCode) {
      btn.className = 'provider-chip active px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white transition-all';
    } else {
      btn.className = 'provider-chip px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/90 text-slate-300 hover:text-white border border-slate-700/80 transition-all';
    }
  });
  renderModelsStatusGrid();
}

function setModelPriceFilter(priceType) {
  activePriceFilter = priceType;
  document.querySelectorAll('.price-chip').forEach(btn => {
    if (btn.getAttribute('data-price') === priceType) {
      btn.className = 'price-chip active px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-white border border-indigo-500/50';
    } else {
      btn.className = 'price-chip px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-900 text-slate-400 hover:text-white border border-slate-800';
    }
  });
  renderModelsStatusGrid();
}

function getProviderBadgeHtml(providerCode, providerName) {
  const styles = {
    router: { bg: 'bg-slate-800 text-white border-slate-700', letter: 'A' },
    nvidia: { bg: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30', letter: 'NV' },
    stepfun: { bg: 'bg-blue-600/20 text-blue-400 border-blue-500/30', letter: 'SF' },
    k2: { bg: 'bg-violet-600/20 text-violet-400 border-violet-500/30', letter: 'K2' },
    agnes: { bg: 'bg-amber-600/20 text-amber-400 border-amber-500/30', letter: 'AG' },
    space: { bg: 'bg-fuchsia-600/20 text-fuchsia-400 border-fuchsia-500/30', letter: 'SB' },
    zhipu: { bg: 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30', letter: 'GLM' },
    longcat: { bg: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30', letter: 'LC' },
    sensenova: { bg: 'bg-cyan-600/20 text-cyan-400 border-cyan-500/30', letter: 'SN' },
  };
  const st = styles[providerCode] || { bg: 'bg-slate-800 text-slate-300 border-slate-700', letter: (providerName || 'AI').slice(0, 2).toUpperCase() };
  return `<div class="w-9 h-9 rounded-lg ${st.bg} border flex items-center justify-center font-mono font-bold text-xs shrink-0">${st.letter}</div>`;
}

function renderStatusBarsHtml(bars = []) {
  const list = Array.isArray(bars) && bars.length > 0
    ? bars
    : [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1];

  return list.map(val => {
    if (val === 1) {
      return '<span class="w-[3px] h-3.5 rounded-[1px] bg-emerald-400 inline-block"></span>';
    }
    if (val === 2) {
      return '<span class="w-[3px] h-3.5 rounded-[1px] bg-amber-400 inline-block"></span>';
    }
    return '<span class="w-[3px] h-3.5 rounded-[1px] bg-rose-500 inline-block"></span>';
  }).join('');
}

function renderModelsStatusGrid() {
  const grid = document.getElementById('models-grid');
  if (!grid) return;

  const searchQuery = (document.getElementById('model-search-input')?.value || '').trim().toLowerCase();

  const filtered = availableModels.filter(m => {
    if (activeProviderFilter !== 'all' && m.provider_code !== activeProviderFilter) {
      return false;
    }
    if (activePriceFilter !== 'all' && m.price_type !== activePriceFilter) {
      return false;
    }
    if (searchQuery) {
      const haystack = `${m.id} ${m.provider || ''} ${m.description || ''} ${(m.tags || []).join(' ')} ${(m.supported_endpoint_types || []).join(' ')}`.toLowerCase();
      if (!haystack.includes(searchQuery)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full p-10 rounded-xl bg-slate-900/50 border border-slate-800 text-center text-slate-400 text-xs">
        Không tìm thấy mô hình nào khớp với bộ lọc hiện tại.
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(m => {
    const status = m.status || { uptime: 95.0, latency: '15.0s', tps: '45.0t/s', bars: [] };
    const uptimeVal = Number(status.uptime || 95);

    let uptimeColor = 'text-emerald-400';
    if (uptimeVal < 65) uptimeColor = 'text-rose-400';
    else if (uptimeVal < 85) uptimeColor = 'text-amber-400';

    let priceTypeBadge = '';
    if (m.price_type === 'request') {
      priceTypeBadge = `<span class="text-[11px] font-semibold text-amber-400">Theo yêu cầu (trừ từ ví ₫)</span>`;
    } else if (m.price_type === 'token') {
      priceTypeBadge = `<span class="text-[11px] font-semibold text-indigo-400">Dựa trên token</span>`;
    } else {
      priceTypeBadge = `<span class="text-[11px] font-semibold text-rose-400">Theo yêu cầu</span>`;
    }

    const priceDisplay = m.price_output
      ? `<div class="grid grid-cols-2 gap-2 text-xs mt-1">
           <div><span class="text-[10px] text-slate-500 block">Đầu vào</span><strong class="text-white font-mono">${m.price_input}</strong></div>
           <div><span class="text-[10px] text-slate-500 block">Đầu ra</span><strong class="text-white font-mono">${m.price_output}</strong></div>
         </div>`
      : `<div class="mt-1"><strong class="text-sm text-white font-mono">${m.price_input || '1.000 ₫ / yêu cầu'}</strong></div>`;

    const tagsStr = (m.tags || ['Tools']).join(', ');
    const endpointsStr = (m.supported_endpoint_types || ['openai']).join(', ');

    return `
      <div id="model-card-${m.id}" class="p-5 rounded-xl bg-[#111622]/90 border border-slate-800/90 hover:border-slate-700 transition-all flex flex-col justify-between shadow-lg">
        <div>
          <!-- Top Header: Icon + Model Name + Copy Button -->
          <div class="flex items-start justify-between gap-2 mb-3">
            <div class="flex items-center space-x-3 min-w-0">
              ${getProviderBadgeHtml(m.provider_code, m.provider)}
              <div class="min-w-0">
                <h4 class="font-bold text-white text-sm font-mono truncate">${escapeHtml(m.id)}</h4>
                <p class="text-[11px] text-slate-400 truncate">${escapeHtml(m.provider || m.owned_by || 'OpenAI')}</p>
              </div>
            </div>
            <button onclick="copyRawText('${m.id}', 'Đã sao chép tên Model: ${m.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all shrink-0" title="Copy Model ID">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i>
            </button>
          </div>

          <!-- Description -->
          <p class="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-2.5 min-h-[2.25rem]">
            ${escapeHtml(m.description || '')}
          </p>

          <!-- Tags -->
          <div class="text-[11px] text-slate-400 mb-3 pb-3 border-b border-slate-800/80 truncate">
            Thẻ: <span class="text-slate-300 font-medium">${escapeHtml(tagsStr)}</span>
          </div>

          <!-- Pricing & Endpoints -->
          <div class="mb-3 pb-3 border-b border-slate-800/80">
            ${priceTypeBadge}
            ${priceDisplay}
            <div class="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-800/50">
              <span>Nhóm <strong class="text-slate-200">default</strong></span>
              <span class="truncate max-w-[190px]" title="${escapeHtml(endpointsStr)}">Điểm cuối <strong class="text-slate-200">${escapeHtml(endpointsStr)}</strong></span>
            </div>
          </div>

          <!-- Model Status Bar (Uptime % + 24 Bars + Latency + TPS) -->
          <div class="flex items-center justify-between gap-2 mb-4 bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
            <div>
              <div class="text-[10px] text-slate-400 mb-1">
                Trạng thái <span id="status-uptime-${m.id}" class="${uptimeColor} font-mono font-bold">${uptimeVal.toFixed(2)}%</span>
              </div>
              <div id="status-bars-${m.id}" class="flex items-center space-x-[2px]">
                ${renderStatusBarsHtml(status.bars)}
              </div>
            </div>

            <div class="text-left">
              <div class="text-[10px] text-slate-400">Trễ</div>
              <div id="status-latency-${m.id}" class="text-xs font-mono font-semibold text-slate-200 mt-0.5">${status.latency || '12.0s'}</div>
            </div>

            <div class="text-left">
              <div class="text-[10px] text-slate-400">TPS</div>
              <div id="status-tps-${m.id}" class="text-xs font-mono font-semibold text-slate-200 mt-0.5">${status.tps || '45.0t/s'}</div>
            </div>
          </div>
        </div>

        <!-- Bottom Action Buttons -->
        <div class="grid grid-cols-2 gap-2">
          <button
            id="btn-probe-${m.id}"
            onclick="probeModelLive('${m.id}')"
            class="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/80 flex items-center justify-center space-x-1.5 transition-all"
          >
            <i data-lucide="activity" class="w-3.5 h-3.5 text-emerald-400"></i>
            <span>Ping thử</span>
          </button>
          <button
            onclick="selectModelAndChat('${m.id}')"
            class="py-2 px-3 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-medium flex items-center justify-center space-x-1.5 transition-all"
          >
            <span>Chat ngay</span>
            <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

// ------------------------------------------
// Live Model Status Probe (/api/model-status)
// ------------------------------------------
async function probeModelLive(modelId) {
  if (!clientAccessToken) return;

  const btn = document.getElementById(`btn-probe-${modelId}`);
  const latencyEl = document.getElementById(`status-latency-${modelId}`);
  const tpsEl = document.getElementById(`status-tps-${modelId}`);
  const uptimeEl = document.getElementById(`status-uptime-${modelId}`);
  const barsEl = document.getElementById(`status-bars-${modelId}`);

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="text-amber-300 font-mono">Đang ping...</span>`;
  }

  try {
    const res = await fetch(`/api/model-status?model=${encodeURIComponent(modelId)}`, {
      headers: { Authorization: `Bearer ${clientAccessToken}` }
    });
    const data = await res.json();
    if (res.ok && data.probe) {
      const p = data.probe;
      if (latencyEl) {
        latencyEl.textContent = p.latency;
        latencyEl.className = p.online ? 'text-xs font-mono font-bold text-emerald-400 mt-0.5' : 'text-xs font-mono font-bold text-rose-400 mt-0.5';
      }
      if (tpsEl) {
        tpsEl.textContent = p.tps;
      }

      const targetModel = availableModels.find(m => m.id === modelId);
      if (targetModel && targetModel.status) {
        const nextBar = p.state === 'online' ? 1 : (p.state === 'degraded' ? 2 : 0);
        targetModel.status.bars = [...(targetModel.status.bars || []).slice(1), nextBar];
        targetModel.status.latency = p.latency;
        targetModel.status.tps = p.tps;
        if (barsEl) barsEl.innerHTML = renderStatusBarsHtml(targetModel.status.bars);
      }

      if (btn) {
        btn.innerHTML = p.online
          ? `<span class="text-emerald-400 font-semibold">✓ ${p.latency}</span>`
          : `<span class="text-rose-400 font-semibold">✕ ${p.message}</span>`;
      }
    }
  } catch (err) {
    if (btn) btn.innerHTML = `<span class="text-rose-400">Lỗi kết nối</span>`;
  } finally {
    setTimeout(() => {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="activity" class="w-3.5 h-3.5 text-emerald-400"></i><span>Ping thử</span>`;
        if (window.lucide) lucide.createIcons();
      }
    }, 3500);
  }
}

async function probeAllModelsLive() {
  const btnAll = document.getElementById('btn-probe-all');
  if (btnAll) {
    btnAll.disabled = true;
    btnAll.innerHTML = `<span>Đang kiểm tra ${modelsToProbe.length} Models...</span>`;
  }

  // Probe top fast models first so user sees immediate feedback
  const modelsToProbe = availableModels.map(m => m.id);
  await Promise.allSettled(modelsToProbe.map(id => probeModelLive(id)));

  if (btnAll) {
    btnAll.disabled = false;
    btnAll.innerHTML = `<i data-lucide="radar" class="w-3.5 h-3.5"></i><span>Ping Kiểm Tra Thực Tế</span>`;
    if (window.lucide) lucide.createIcons();
  }
}

function selectModel(modelId) {
  const select = document.getElementById('chat-model-select');
  if (select) select.value = modelId;
}

function selectModelAndChat(modelId) {
  selectModel(modelId);
  switchTab('chat');
  const input = document.getElementById('chat-input');
  if (input) input.focus();
}

// ------------------------------------------
// AI Chat Execution
// ------------------------------------------
function handleKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleChatSubmit(e);
  }
}

function autoResizeTextarea(textarea) {
  textarea.style.height = '44px';
  const nextHeight = Math.min(Math.max(textarea.scrollHeight, 44), 140);
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = textarea.scrollHeight > 140 ? 'auto' : 'hidden';
  document.getElementById('token-counter').textContent = `${textarea.value.length} ký tự`;
}

function clearChat() {
  chatHistory = [];
  const container = document.getElementById('chat-messages');
  container.innerHTML = `
    <div id="welcome-message" class="text-center py-10 max-w-xl mx-auto">
      <img src="/logo.png" alt="SLK Gateway" class="w-16 h-16 mx-auto mb-4 rounded-xl object-cover border border-indigo-500/40 shadow-lg shadow-indigo-500/20">
      <h2 class="text-xl font-bold text-slate-100 mb-2">Cuộc trò chuyện mới</h2>
      <p class="text-slate-400 text-sm">Hãy nhập câu hỏi bên dưới để bắt đầu giao tiếp với mô hình AI (trả phí theo lượt từ ví ₫).</p>
    </div>
  `;
  if (window.lucide) lucide.createIcons();
}

function toggleGenerationButtons(isGenerating) {
  const submitBtn = document.getElementById('chat-submit-btn');
  const stopBtn = document.getElementById('chat-stop-btn');
  const input = document.getElementById('chat-input');

  if (isGenerating) {
    submitBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
    input.disabled = true;
  } else {
    submitBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
    input.disabled = false;
    input.focus();
  }
}

function stopGeneration() {
  if (activeAbortController) {
    activeAbortController.abort();
    activeAbortController = null;
  }
  toggleGenerationButtons(false);
}

async function handleChatSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!clientAccessToken) {
    updateAuthUI();
    return;
  }

  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message) return;

  input.value = '';
  autoResizeTextarea(input);

  const welcome = document.getElementById('welcome-message');
  if (welcome) welcome.remove();

  const modelSelect = document.getElementById('chat-model-select');
  const selectedModel = modelSelect ? modelSelect.value : DEFAULT_MODEL_ID;

  chatHistory.push({ role: 'user', content: message });
  appendMessageToUI('user', message);

  const messagesPayload = [];
  if (systemPrompt.trim()) {
    messagesPayload.push({ role: 'system', content: systemPrompt.trim() });
  }
  messagesPayload.push(...chatHistory);

  const assistantBubbleId = `msg-assistant-${Date.now()}`;
  appendAssistantPlaceholder(assistantBubbleId, selectedModel);

  toggleGenerationButtons(true);
  activeAbortController = new AbortController();

  let assistantReplyText = '';
  let lastResponseStatus = null;
  const messageContentEl = document.getElementById(`${assistantBubbleId}-content`);

  try {
    const response = await fetch('/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientAccessToken}`,
      },
      signal: activeAbortController.signal,
      body: JSON.stringify({
        model: selectedModel,
        messages: messagesPayload,
        temperature: chatTemperature,
        stream: true
      })
    });

    if (!response.ok) {
      lastResponseStatus = response.status;
      let errDetail = `Lỗi HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson.error && errJson.error.message) {
          errDetail = errJson.error.message;
        }
      } catch {}
      throw new Error(errDetail);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;
        if (trimmed === 'data: [DONE]') break;

        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6);
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            assistantReplyText += delta;

            if (messageContentEl) {
              messageContentEl.innerHTML = marked.parse(assistantReplyText);
              enhanceCodeBlocks(messageContentEl);
            }
            scrollToBottom();
          } catch {}
        }
      }
    }

    if (messageContentEl) {
      messageContentEl.classList.remove('streaming-cursor');
    }
    chatHistory.push({ role: 'assistant', content: assistantReplyText });
    loadWallet(); // Cập nhật số dư ví sau mỗi lượt trả phí

  } catch (err) {
    if (err.name === 'AbortError') {
      if (messageContentEl) {
        messageContentEl.classList.remove('streaming-cursor');
        messageContentEl.innerHTML += '<p class="text-xs text-amber-400 italic mt-2">[Đã dừng phản hồi]</p>';
      }
    } else {
      if (messageContentEl) {
        messageContentEl.classList.remove('streaming-cursor');
        messageContentEl.innerHTML = `
          <div class="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs">
            <strong>Lỗi phản hồi:</strong> ${escapeHtml(err.message)}
          </div>
        `;
      }
      if (lastResponseStatus === 402) loadWallet(); // Hết tiền -> cập nhật số dư ví
    }
  } finally {
    toggleGenerationButtons(false);
    activeAbortController = null;
    scrollToBottom();
  }
}

function appendMessageToUI(role, content) {
  const container = document.getElementById('chat-messages');
  const msgWrapper = document.createElement('div');
  msgWrapper.className = 'flex justify-end';

  msgWrapper.innerHTML = `
    <div class="max-w-[85%] sm:max-w-[75%] user-bubble px-4 py-3 text-sm font-normal text-white">
      <div class="whitespace-pre-wrap break-words">${escapeHtml(content)}</div>
    </div>
  `;
  container.appendChild(msgWrapper);
  scrollToBottom();
}

function appendAssistantPlaceholder(id, modelName) {
  const container = document.getElementById('chat-messages');
  const msgWrapper = document.createElement('div');
  msgWrapper.id = id;
  msgWrapper.className = 'flex justify-start';

  msgWrapper.innerHTML = `
    <div class="max-w-[90%] sm:max-w-[85%] assistant-bubble p-4 sm:p-5 text-sm">
      <div class="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-3">
        <div class="flex items-center space-x-2">
          <img src="/logo.png" alt="SLK" class="w-5 h-5 rounded-md object-cover border border-indigo-500/40 shrink-0">
          <span class="text-xs font-mono font-semibold text-indigo-300">${escapeHtml(modelName)}</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">FREE</span>
        </div>
        <button onclick="copyAssistantMessage('${id}-content')" class="text-[11px] text-slate-500 hover:text-slate-300 flex items-center space-x-1">
          <i data-lucide="copy" class="w-3 h-3"></i>
          <span>Copy</span>
        </button>
      </div>
      <div id="${id}-content" class="prose-ai streaming-cursor">
        <span class="text-slate-400 text-xs italic">Đang suy nghĩ và tạo phản hồi...</span>
      </div>
    </div>
  `;
  container.appendChild(msgWrapper);
  if (window.lucide) lucide.createIcons();
  scrollToBottom();
}

function scrollToBottom() {
  const container = document.getElementById('chat-messages');
  if (container) container.scrollTop = container.scrollHeight;
}

function enhanceCodeBlocks(container) {
  const preElements = container.querySelectorAll('pre');
  preElements.forEach(pre => {
    if (!pre.querySelector('.code-copy-btn')) {
      const copyBtn = document.createElement('button');
      copyBtn.className = 'code-copy-btn absolute top-2 right-2 px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300 border border-slate-700 hover:bg-slate-700 transition-all';
      copyBtn.textContent = 'Copy';
      copyBtn.onclick = () => {
        const code = pre.querySelector('code')?.innerText || '';
        navigator.clipboard.writeText(code).then(() => {
          copyBtn.textContent = 'Đã chép!';
          setTimeout(() => (copyBtn.textContent = 'Copy'), 2000);
        });
      };
      pre.style.position = 'relative';
      pre.appendChild(copyBtn);
    }
  });
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

function copyAssistantMessage(contentId) {
  const el = document.getElementById(contentId);
  if (el) {
    navigator.clipboard.writeText(el.innerText).then(() => {
      alert('Đã sao chép phản hồi vào clipboard!');
    });
  }
}

// ------------------------------------------
// System Prompt Modal
// ------------------------------------------
function toggleSystemPromptModal() {
  const modal = document.getElementById('system-prompt-modal');
  modal.classList.toggle('hidden');
}

function saveSystemPrompt() {
  const p = document.getElementById('modal-system-prompt').value;
  const t = document.getElementById('modal-temperature').value;
  systemPrompt = p;
  chatTemperature = parseFloat(t);
  localStorage.setItem('nexus_system_prompt', systemPrompt);
  localStorage.setItem('nexus_temperature', chatTemperature.toString());
  toggleSystemPromptModal();
}

// ------------------------------------------
// API Tester / Playground
// ------------------------------------------
function handleTesterEndpointChange() {
  const endpoint = document.getElementById('tester-endpoint').value;
  const bodyWrapper = document.getElementById('tester-body-wrapper');
  const payloadEl = document.getElementById('tester-payload');

  if (endpoint === '/v1/chat/completions') {
    bodyWrapper.classList.remove('hidden');
    payloadEl.value = JSON.stringify({
      model: "sensenova-6.8-flash-lite",
      messages: [
        { role: "user", content: "Kiểm tra kết nối SLK Gateway thành công hay chưa?" }
      ],
      temperature: 0.7,
      stream: false
    }, null, 2);
  } else {
    bodyWrapper.classList.add('hidden');
  }
}

function formatTesterJson() {
  const payloadEl = document.getElementById('tester-payload');
  try {
    const obj = JSON.parse(payloadEl.value);
    payloadEl.value = JSON.stringify(obj, null, 2);
  } catch (e) {
    alert('JSON không hợp lệ: ' + e.message);
  }
}

async function executeApiTest() {
  const endpoint = document.getElementById('tester-endpoint').value;
  const payloadEl = document.getElementById('tester-payload');
  const statusBadge = document.getElementById('tester-status-badge');
  const timeBadge = document.getElementById('tester-time-badge');
  const outputEl = document.getElementById('tester-response-output');
  const sendBtn = document.getElementById('tester-send-btn');

  sendBtn.disabled = true;
  statusBadge.textContent = 'Đang gửi...';
  statusBadge.className = 'px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono';
  outputEl.textContent = 'Đang đợi phản hồi từ upstream API...';

  const startTime = performance.now();
  const activeKey = (userApiKeys[0]?.token) || clientAccessToken;

  try {
    const isPost = endpoint.includes('chat/completions');
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${activeKey}`,
    };

    const fetchOptions = {
      method: isPost ? 'POST' : 'GET',
      headers
    };

    if (isPost) {
      fetchOptions.body = payloadEl.value;
    }

    const res = await fetch(endpoint, fetchOptions);
    const duration = Math.round(performance.now() - startTime);
    timeBadge.textContent = `${duration} ms`;

    statusBadge.textContent = `${res.status} ${res.statusText}`;
    if (res.ok) {
      statusBadge.className = 'px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono';
    } else {
      statusBadge.className = 'px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-mono';
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      outputEl.textContent = JSON.stringify(data, null, 2);
    } else {
      const text = await res.text();
      outputEl.textContent = text;
    }

    // Các request chat/completions có trừ phí -> cập nhật số dư ví
    if (isPost && res.status !== 402) loadWallet();

    if (window.hljs) hljs.highlightElement(outputEl);

  } catch (err) {
    const duration = Math.round(performance.now() - startTime);
    timeBadge.textContent = `${duration} ms`;
    statusBadge.textContent = 'Lỗi kết nối';
    statusBadge.className = 'px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-mono';
    outputEl.textContent = `Fetch Error: ${err.message}`;
  } finally {
    sendBtn.disabled = false;
  }
}

// ------------------------------------------
// Copy Utilities
// ------------------------------------------
function copyToClipboard(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const text = el.innerText || el.textContent;
  navigator.clipboard.writeText(text).then(() => {
    alert(`Đã sao chép: ${text}`);
  });
}

function copySnippet(codeBlockId) {
  const el = document.getElementById(codeBlockId);
  if (!el) return;
  const text = el.innerText || el.textContent;
  navigator.clipboard.writeText(text).then(() => {
    alert('Đã sao chép đoạn code vào bộ nhớ tạm!');
  });
}

// ==========================================
// Admin Pool Management (Multi-Gate Load Balancer)
// ==========================================
function getAdminRequestHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${clientAccessToken}`,
    'X-Admin-Secret': adminSecret || 'slk-admin',
  };
}

async function handleAdminUnlock(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isCurrentUserOwnerAdmin()) return;

  const input = document.getElementById('admin-secret-input');
  const errEl = document.getElementById('admin-auth-error');
  const btn = document.getElementById('btn-admin-unlock');

  const secretCandidate = (input?.value || '').trim() || 'slk-admin';

  if (errEl) errEl.classList.add('hidden');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span>Đang kiểm tra quyền Admin...</span>`;
  }

  try {
    const res = await fetch('/api/admin/pool', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientAccessToken}`,
        'X-Admin-Secret': secretCandidate,
      },
      body: JSON.stringify({
        action: 'verify',
        discordUserId: discordUser?.id || '',
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Chỉ Discord ID 1207080545159487498 mới có quyền Admin.');
    }

    adminSecret = secretCandidate;
    localStorage.setItem('slk_admin_secret', adminSecret);
    adminGatesList = data.pool || [];

    showAdminDashboardUI(true);
    updateAdminPoolStats(data);
    renderAdminPoolTable();
    checkGatewayHealth();
  } catch (err) {
    if (errEl) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="unlock" class="w-4 h-4"></i><span>Mở Khóa Quản Trị Admin Pool</span>`;
      if (window.lucide) lucide.createIcons();
    }
  }
}

function lockAdminSession() {
  adminSecret = '';
  localStorage.removeItem('slk_admin_secret');
  showAdminDashboardUI(false);
}

function showAdminDashboardUI(unlocked) {
  const lockScreen = document.getElementById('admin-lock-screen');
  const dashboard = document.getElementById('admin-pool-dashboard');
  if (unlocked) {
    if (lockScreen) lockScreen.classList.add('hidden');
    if (dashboard) dashboard.classList.remove('hidden');
  } else {
    if (lockScreen) lockScreen.classList.remove('hidden');
    if (dashboard) dashboard.classList.add('hidden');
  }
  if (window.lucide) lucide.createIcons();
}

async function loadAdminPool(silent = false) {
  if (!isCurrentUserOwnerAdmin()) {
    showAdminDashboardUI(false);
    return;
  }

  try {
    const res = await fetch(`/api/admin/pool?discordUserId=${encodeURIComponent(discordUser?.id || '')}`, {
      headers: getAdminRequestHeaders(),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      if (!silent) alert(data.error || 'Không có quyền truy cập Admin Pool.');
      showAdminDashboardUI(false);
      return;
    }

    adminGatesList = data.pool || [];
    showAdminDashboardUI(true);
    updateAdminPoolStats(data);
    renderAdminPoolTable();
  } catch (err) {
    console.warn('Error loading admin pool:', err);
  }
}

function updateAdminPoolStats(data) {
  const totalEl = document.getElementById('admin-total-gates') || document.getElementById('pool-total-gates');
  const activeEl = document.getElementById('admin-active-gates') || document.getElementById('pool-active-gates');
  const reqsEl = document.getElementById('admin-total-requests');
  const errsEl = document.getElementById('admin-total-errors');
  const envEl = document.getElementById('admin-env-export-code');
  const navBadge = document.getElementById('gates-count-badge');
  const sbBadge = document.getElementById('supabase-status-badge');
  const sbUrlInput = document.getElementById('admin-supabase-url');

  const total = data.total ?? adminGatesList.length;
  const active = data.active ?? adminGatesList.filter(g => g.enabled !== false).length;
  const totalRequests = adminGatesList.reduce((sum, g) => sum + (Number(g.requests) || 0), 0);
  const totalErrors = adminGatesList.reduce((sum, g) => sum + (Number(g.errors || g.failures) || 0), 0);

  if (totalEl) totalEl.textContent = `${total} Gate${total > 1 ? 's' : ''}`;
  if (activeEl) activeEl.textContent = `${active} / ${total} Gate đang bật`;
  if (reqsEl) reqsEl.textContent = `${totalRequests} Requests`;
  if (errsEl) errsEl.textContent = `${totalErrors} lỗi phát sinh`;
  if (envEl && data.envExport) envEl.textContent = data.envExport;
  if (navBadge) navBadge.textContent = active;

  if (data.supabase && sbBadge) {
    if (data.supabase.configured) {
      sbBadge.className = 'px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono';
      sbBadge.textContent = '✓ Đã kết nối Supabase';
      if (sbUrlInput && !sbUrlInput.value && data.supabase.url) {
        sbUrlInput.value = data.supabase.url;
      }
    } else {
      sbBadge.className = 'px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono';
      sbBadge.textContent = 'Đang chạy bộ nhớ tách biệt theo Discord ID (Chưa nhập Supabase)';
    }
  }
}

function renderAdminPoolTable() {
  const tbody = document.getElementById('admin-gates-table-body') || document.getElementById('admin-pool-table-body');
  if (!tbody) return;

  if (!adminGatesList.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-8 text-center text-slate-500">
          Chưa có Gate nào trong Pool. Hãy thêm API Key vào ô bên trên.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = adminGatesList.map((gate) => {
    const isEnabled = gate.enabled !== false;
    const statusDot = !isEnabled
      ? '<span class="w-2 h-2 rounded-full bg-slate-500"></span>'
      : gate.status === 'error'
      ? '<span class="w-2 h-2 rounded-full bg-rose-400"></span>'
      : '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>';

    const statusBadge = !isEnabled
      ? '<span class="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 text-[11px] font-medium">Đã Tạm Tắt</span>'
      : gate.status === 'error'
      ? `<span class="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[11px] font-medium" title="${escapeHtml(gate.lastError || '')}">Lỗi Gate</span>`
      : '<span class="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium">Đang Chạy (Active)</span>';

    const latencyText = gate.lastLatencyMs ? `${gate.lastLatencyMs} ms` : 'Sẵn sàng';

    return `
      <tr class="hover:bg-slate-800/35 transition-colors">
        <td class="py-3.5 px-3 font-medium text-white">
          <div class="flex items-center space-x-2">
            ${statusDot}
            <span>${escapeHtml(gate.name)}</span>
            ${gate.isPrimary ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">PRIMARY</span>' : ''}
          </div>
        </td>
        <td class="py-3.5 px-3 font-mono text-amber-300">
          <span class="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg">${escapeHtml(gate.maskedKey)}</span>
        </td>
        <td class="py-3.5 px-3 font-mono text-indigo-300">
          <span class="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg">${escapeHtml(gate.baseUrl)}</span>
        </td>
        <td class="py-3.5 px-3" id="gate-status-cell-${gate.id}">
          ${statusBadge}
        </td>
        <td class="py-3.5 px-3 font-mono text-slate-300">
          ${latencyText}
        </td>
        <td class="py-3.5 px-3 font-mono text-slate-300">
          <span class="text-emerald-400 font-bold">${gate.requests || 0}</span> reqs
          ${gate.failures ? `<span class="text-rose-400 ml-1">(${gate.failures} lỗi)</span>` : ''}
        </td>
        <td class="py-3.5 px-3 text-right">
          <div class="flex items-center justify-end space-x-1.5">
            <button
              id="btn-test-gate-${gate.id}"
              onclick="testSingleAdminGate('${gate.id}')"
              class="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-[11px] font-medium transition-all"
              title="Kiểm tra tốc độ và kết nối của Gate này"
            >
              Test Gate
            </button>
            <button
              onclick="toggleAdminGate('${gate.id}')"
              class="px-2.5 py-1.5 rounded-lg ${isEnabled ? 'bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border-slate-700' : 'bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border-emerald-500/30'} border text-[11px] font-medium transition-all"
            >
              ${isEnabled ? 'Tạm tắt' : 'Bật lại'}
            </button>
            ${!gate.isPrimary ? `
              <button
                onclick="deleteAdminGate('${gate.id}')"
                class="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all"
                title="Xóa Gate khỏi Pool"
              >
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

async function handleAddGatesToPool(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isCurrentUserOwnerAdmin()) return;

  const nameInput = document.getElementById('pool-gate-name') || document.getElementById('admin-new-gate-name');
  const urlInput = document.getElementById('pool-gate-url') || document.getElementById('admin-new-gate-url');
  const keysInput = document.getElementById('pool-gate-keys') || document.getElementById('admin-new-gate-keys');
  const btn = document.getElementById('btn-add-pool-keys') || document.getElementById('btn-add-gate');
  const feedback = document.getElementById('admin-add-feedback');

  const rawKeys = (keysInput?.value || '').trim();
  if (!rawKeys) {
    alert('Vui lòng dán ít nhất 1 Upstream API Key (sk-...) vào ô!');
    return;
  }

  if (btn) btn.disabled = true;
  if (feedback) feedback.classList.add('hidden');

  try {
    const res = await fetch('/api/admin/pool', {
      method: 'POST',
      headers: getAdminRequestHeaders(),
      body: JSON.stringify({
        action: 'add',
        name: (nameInput?.value || '').trim(),
        baseUrl: (urlInput?.value || 'https://api.hcnsec.cn/v1').trim(),
        keys: rawKeys,
        discordUserId: discordUser?.id || '',
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Không thể thêm API Key vào Pool.');
    }

    adminGatesList = data.pool || [];
    updateAdminPoolStats(data);
    renderAdminPoolTable();
    checkGatewayHealth();

    if (keysInput) keysInput.value = '';
    if (nameInput) nameInput.value = '';

    if (feedback) {
      feedback.className = 'mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs';
      feedback.innerHTML = data.addedCount > 0
        ? `✓ Đã nạp thành công <strong>${data.addedCount} Gate mới</strong> vào Pool! Hiện có <strong>${data.active} Gates</strong> đang chạy song song.`
        : `Thông báo: API Key này đã tồn tại sẵn trong Pool (${data.total} Gates).`;
      feedback.classList.remove('hidden');
    }
  } catch (err) {
    if (feedback) {
      feedback.className = 'mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs';
      feedback.textContent = `Lỗi: ${err.message}`;
      feedback.classList.remove('hidden');
    }
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function handleSaveSupabaseConfig(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isCurrentUserOwnerAdmin()) return;

  const urlInput = document.getElementById('admin-supabase-url');
  const keyInput = document.getElementById('admin-supabase-key');
  const btn = document.getElementById('btn-save-supabase');
  const feedback = document.getElementById('admin-supabase-feedback');

  const supabaseUrl = (urlInput?.value || '').trim();
  const supabaseKey = (keyInput?.value || '').trim();
  if (!supabaseUrl || !supabaseKey) return;

  if (btn) btn.disabled = true;
  if (feedback) feedback.classList.add('hidden');

  try {
    const res = await fetch('/api/admin/pool', {
      method: 'POST',
      headers: getAdminRequestHeaders(),
      body: JSON.stringify({
        action: 'save_supabase',
        supabaseUrl,
        supabaseKey,
        discordUserId: discordUser?.id || '',
      }),
    });

    const data = await res.json();
    updateAdminPoolStats(data);

    const t = data.supabaseTest || {};
    if (feedback) {
      if (t.connected && t.tablesReady) {
        feedback.className = 'mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs';
        feedback.innerHTML = `✓ Đã kết nối thành công tới Supabase Database (<code>${escapeHtml(supabaseUrl)}</code>) và đồng bộ bảng <code>slk_users</code>, <code>slk_api_keys</code>, <code>slk_gate_pool</code>!`;
        fetchUserApiKeysFromDatabase();
      } else if (t.connected && !t.tablesReady) {
        feedback.className = 'mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs';
        feedback.innerHTML = `⚠ Đã kết nối Supabase nhưng chưa tạo bảng! Hãy nhấn nút <strong>"Copy SQL Tạo Bảng"</strong> ở góc trên và chạy trong mục <strong>SQL Editor</strong> của Supabase.`;
      } else {
        feedback.className = 'mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs';
        feedback.textContent = `Lỗi kết nối Supabase: ${t.error || 'Vui lòng kiểm tra lại URL và API Key.'}`;
      }
      feedback.classList.remove('hidden');
    }
  } catch (err) {
    if (feedback) {
      feedback.className = 'mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs';
      feedback.textContent = `Lỗi: ${err.message}`;
      feedback.classList.remove('hidden');
    }
  } finally {
    if (btn) btn.disabled = false;
  }
}

function copySupabaseSqlSchema() {
  const sql = `-- Chạy đoạn SQL này trong mục "SQL Editor" trên Supabase Dashboard:
CREATE TABLE IF NOT EXISTS public.slk_users (
  discord_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  global_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.slk_api_keys (
  id TEXT PRIMARY KEY,
  discord_id TEXT NOT NULL REFERENCES public.slk_users(discord_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

ALTER TABLE public.slk_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slk_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slk_gate_pool ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "slk_users_all" ON public.slk_users;
CREATE POLICY "slk_users_all" ON public.slk_users FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "slk_api_keys_all" ON public.slk_api_keys;
CREATE POLICY "slk_api_keys_all" ON public.slk_api_keys FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "slk_gate_pool_all" ON public.slk_gate_pool;
CREATE POLICY "slk_gate_pool_all" ON public.slk_gate_pool FOR ALL USING (true) WITH CHECK (true);

-- 4. VÍ TIỀN (VND)
ALTER TABLE public.slk_users ADD COLUMN IF NOT EXISTS balance_vnd BIGINT NOT NULL DEFAULT 100000;

-- 5. Lịch sử giao dịch ví
CREATE TABLE IF NOT EXISTS public.slk_transactions (
  id TEXT PRIMARY KEY,
  discord_id TEXT NOT NULL REFERENCES public.slk_users(discord_id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'debit',
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

-- 6. RPC trừ/cộng tiền ATOMIC
CREATE OR REPLACE FUNCTION public.slk_debit_balance(p_discord_id TEXT, p_amount BIGINT)
RETURNS JSON LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE v_balance BIGINT;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN json_build_object('ok', false, 'error', 'invalid_amount'); END IF;
  UPDATE public.slk_users SET balance_vnd = balance_vnd - p_amount, updated_at = NOW()
   WHERE discord_id = p_discord_id AND balance_vnd >= p_amount
  RETURNING balance_vnd INTO v_balance;
  IF NOT FOUND THEN
    SELECT balance_vnd INTO v_balance FROM public.slk_users WHERE discord_id = p_discord_id;
    RETURN json_build_object('ok', false, 'balance_vnd', COALESCE(v_balance, -1), 'error', CASE WHEN v_balance IS NULL THEN 'user_not_found' ELSE 'insufficient_balance' END);
  END IF;
  RETURN json_build_object('ok', true, 'balance_vnd', v_balance);
END;
$$;

CREATE OR REPLACE FUNCTION public.slk_topup_balance(p_discord_id TEXT, p_amount BIGINT)
RETURNS JSON LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE v_balance BIGINT;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN json_build_object('ok', false, 'error', 'invalid_amount'); END IF;
  INSERT INTO public.slk_users (discord_id, username, global_name, balance_vnd)
  VALUES (p_discord_id, p_discord_id, p_discord_id, p_amount)
  ON CONFLICT (discord_id)
  DO UPDATE SET balance_vnd = public.slk_users.balance_vnd + p_amount, updated_at = NOW()
  RETURNING balance_vnd INTO v_balance;
  RETURN json_build_object('ok', true, 'balance_vnd', v_balance);
END;
$$;

GRANT EXECUTE ON FUNCTION public.slk_debit_balance(TEXT, BIGINT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.slk_topup_balance(TEXT, BIGINT) TO anon, authenticated, service_role;`;

  navigator.clipboard.writeText(sql).then(() => {
    alert('Đã sao chép đoạn SQL tạo bảng Supabase (bao gồm bảng Ví tiền & Giao dịch)! Hãy dán vào mục "SQL Editor" trên Supabase và nhấn Run.');
  });
}

async function toggleAdminGate(id) {
  if (!isCurrentUserOwnerAdmin()) return;
  try {
    const res = await fetch('/api/admin/pool', {
      method: 'POST',
      headers: getAdminRequestHeaders(),
      body: JSON.stringify({
        action: 'toggle',
        id,
        discordUserId: discordUser?.id || '',
      }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      adminGatesList = data.pool || [];
      updateAdminPoolStats(data);
      renderAdminPoolTable();
      checkGatewayHealth();
    }
  } catch (err) {
    alert(`Lỗi cập nhật Gate: ${err.message}`);
  }
}

async function deleteAdminGate(id) {
  if (!isCurrentUserOwnerAdmin()) return;
  try {
    const res = await fetch('/api/admin/pool', {
      method: 'POST',
      headers: getAdminRequestHeaders(),
      body: JSON.stringify({
        action: 'delete',
        id,
        discordUserId: discordUser?.id || '',
      }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      adminGatesList = data.pool || [];
      updateAdminPoolStats(data);
      renderAdminPoolTable();
      checkGatewayHealth();
    } else {
      alert(data.error || 'Không thể xóa Gate này.');
    }
  } catch (err) {
    alert(`Lỗi xóa Gate: ${err.message}`);
  }
}

async function testSingleAdminGate(id) {
  if (!isCurrentUserOwnerAdmin()) return;
  const btn = document.getElementById(`btn-test-gate-${id}`);
  const statusCell = document.getElementById(`gate-status-cell-${id}`);

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Đang ping...';
  }

  try {
    const res = await fetch('/api/admin/pool', {
      method: 'POST',
      headers: getAdminRequestHeaders(),
      body: JSON.stringify({
        action: 'test',
        id,
        discordUserId: discordUser?.id || '',
      }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      adminGatesList = data.pool || [];
      updateAdminPoolStats(data);
      renderAdminPoolTable();

      const updatedCell = document.getElementById(`gate-status-cell-${id}`);
      if (updatedCell && data.testResult) {
        updatedCell.innerHTML = data.testResult.online
          ? `<span class="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium">Online (${data.testResult.latencyMs}ms)</span>`
          : `<span class="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[11px] font-medium">Lỗi (${escapeHtml(data.testResult.status)})</span>`;
      }
    }
  } catch {
    if (statusCell) {
      statusCell.innerHTML = `<span class="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[11px] font-medium">Lỗi kết nối</span>`;
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Test Gate';
    }
  }
}

async function testAllAdminGates() {
  if (!isCurrentUserOwnerAdmin()) return;
  const btnAll = document.getElementById('btn-test-all-gates');
  if (btnAll) {
    btnAll.disabled = true;
    btnAll.innerHTML = `<span>Đang kiểm tra tất cả Gates...</span>`;
  }

  await Promise.allSettled(adminGatesList.map(g => testSingleAdminGate(g.id)));

  if (btnAll) {
    btnAll.disabled = false;
    btnAll.innerHTML = `<i data-lucide="activity" class="w-3.5 h-3.5 text-emerald-400"></i><span>Ping Kiểm Tra Tất Cả Gates</span>`;
    if (window.lucide) lucide.createIcons();
  }
}

