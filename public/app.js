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

let oauthConfig = {
  clientId: '1558375997416677426',
  hasSecret: true,
};

try {
  const savedUser = localStorage.getItem('nexus_discord_user');
  if (savedUser) discordUser = JSON.parse(savedUser);
} catch {
  discordUser = null;
}

try {
  const savedKeys = localStorage.getItem('nexus_user_api_keys');
  if (savedKeys) userApiKeys = JSON.parse(savedKeys);
} catch {
  userApiKeys = [];
}

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

    ensureDefaultKeyInList(data.apiKey);
  } catch (err) {
    showDiscordError(err.message);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<span>Đăng nhập với Discord</span>`;
    }
  }
}

function ensureDefaultKeyInList(masterKey) {
  if (!masterKey) return;
  const exists = userApiKeys.some(k => k.token === masterKey);
  if (!exists) {
    userApiKeys.unshift({
      id: 'default_master',
      name: 'Mặc định (Discord Master Key)',
      token: masterKey,
      createdAt: new Date().toISOString(),
      isDefault: true,
    });
    localStorage.setItem('nexus_user_api_keys', JSON.stringify(userApiKeys));
  }
}

function updateAuthUI() {
  const gate = document.getElementById('discord-login-gate');
  const userPill = document.getElementById('discord-user-pill');
  const userAvatar = document.getElementById('discord-user-avatar');
  const userName = document.getElementById('discord-user-name');

  if (discordUser && clientAccessToken) {
    ensureDefaultKeyInList(clientAccessToken);

    if (gate) gate.classList.add('hidden');
    if (userPill) {
      userPill.classList.remove('hidden');
      userPill.classList.add('flex');
    }
    if (userAvatar) userAvatar.src = discordUser.avatar_url;
    if (userName) userName.textContent = discordUser.global_name || discordUser.username;

    updateGatewayUrls();
    renderApiKeysTable();
    checkGatewayHealth();
    fetchAvailableModels();
  } else {
    if (gate) gate.classList.remove('hidden');
    if (userPill) {
      userPill.classList.add('hidden');
      userPill.classList.remove('flex');
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
  updateAuthUI();
}

// ------------------------------------------
// Multi API Key Generator & Dashboard Table
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

    userApiKeys.unshift(data.key);
    localStorage.setItem('nexus_user_api_keys', JSON.stringify(userApiKeys));

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

  if (userApiKeys.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-6 text-center text-slate-500">Chưa có API Key nào. Hãy nhấn "+ Tạo API Key" ở góc trên.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = userApiKeys.map((item) => {
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
  const bundle = `OpenAI Base URL: ${baseUrl}\nAPI Key: ${token}\nFree Models: DeepSeek-V4-Flash, auto, glm-5.3-flash, kimi-k3, longcat-2.5, MiMo-V2.6-Flash, sensenova-6.8-flash-lite`;
  navigator.clipboard.writeText(bundle).then(() => {
    alert(`Đã sao chép trọn bộ cấu hình OpenAI /v1 (Free Models):\n\n${bundle}`);
  });
}

function deleteApiKey(id) {
  userApiKeys = userApiKeys.filter(k => k.id !== id);
  localStorage.setItem('nexus_user_api_keys', JSON.stringify(userApiKeys));
  renderApiKeysTable();
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
    "model": "DeepSeek-V4-Flash",
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
    model="DeepSeek-V4-Flash",  # Free: DeepSeek-V4-Flash, auto, glm-5.3-flash, kimi-k3, longcat-2.5, sensenova-6.8-flash-lite
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
  model: 'DeepSeek-V4-Flash',
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

  try {
    const res = await fetch('/health');
    if (res.ok) {
      const data = await res.json();
      const count = data.total_models || 7;
      if (statusText) statusText.textContent = `${count} Free Models Online`;
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
        opt.textContent = `${m.id} (${uptime} • 0¥ Free)`;
        select.appendChild(opt);
      });

      if (currentSelected && availableModels.some(m => m.id === currentSelected)) {
        select.value = currentSelected;
      } else {
        select.value = 'DeepSeek-V4-Flash';
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

  if (totalEl) totalEl.textContent = `${total} Free Models`;
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
    deepseek: { bg: 'bg-blue-600/20 text-blue-400 border-blue-500/30', letter: 'DS' },
    zhipu: { bg: 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30', letter: 'GLM' },
    moonshot: { bg: 'bg-slate-800 text-slate-200 border-slate-700', letter: 'K3' },
    longcat: { bg: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30', letter: 'LC' },
    mimo: { bg: 'bg-amber-600/20 text-amber-300 border-amber-500/30', letter: 'MI' },
    minimax: { bg: 'bg-rose-600/20 text-rose-400 border-rose-500/30', letter: 'MM' },
    qwen: { bg: 'bg-violet-600/20 text-violet-400 border-violet-500/30', letter: 'QW' },
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
    if (m.price_type === 'free' || m.free) {
      priceTypeBadge = `<span class="text-[11px] font-semibold text-amber-400">Giá linh hoạt (Miễn phí)</span>`;
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
      : `<div class="mt-1"><strong class="text-sm text-white font-mono">${m.price_input || '0 ¥ / yêu cầu'}</strong></div>`;

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
    btnAll.innerHTML = `<span>Đang kiểm tra 7 Free Models...</span>`;
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
  textarea.style.height = 'auto';
  textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`;
  document.getElementById('token-counter').textContent = `${textarea.value.length} ký tự`;
}

function clearChat() {
  chatHistory = [];
  const container = document.getElementById('chat-messages');
  container.innerHTML = `
    <div id="welcome-message" class="text-center py-10 max-w-xl mx-auto">
      <div class="w-14 h-14 mx-auto mb-4 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
        <i data-lucide="sparkles" class="w-7 h-7 text-indigo-400"></i>
      </div>
      <h2 class="text-xl font-bold text-slate-100 mb-2">Cuộc trò chuyện mới</h2>
      <p class="text-slate-400 text-sm">Hãy nhập câu hỏi bên dưới để bắt đầu giao tiếp với bất kỳ mô hình nào trong 15 mô hình AI.</p>
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
  const selectedModel = modelSelect ? modelSelect.value : 'DeepSeek-V4-Flash';

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
          <div class="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">
            <i data-lucide="bot" class="w-3.5 h-3.5"></i>
          </div>
          <span class="text-xs font-mono font-semibold text-indigo-300">${escapeHtml(modelName)}</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">SLK /v1</span>
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
