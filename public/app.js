// ==========================================
// Nexus AI Dashboard - Client Logic (Discord Auth + Multi API Key Manager + Free Models)
// ==========================================

let currentTab = 'docs';
let availableModels = [];
let chatHistory = [];
let activeAbortController = null;

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

    // Ensure default key is in userApiKeys list
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
  const bundle = `OpenAI Base URL: ${baseUrl}\nAPI Key: ${token}\nModel: DeepSeek-V4-Flash`;
  navigator.clipboard.writeText(bundle).then(() => {
    alert(`Đã sao chép trọn bộ cấu hình OpenAI /v1:\n\n${bundle}`);
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
    model="DeepSeek-V4-Flash",  # Free: DeepSeek-V4-Flash, auto, glm-5.3-flash, kimi-k3, longcat-2.5
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
      if (statusText) statusText.textContent = 'API Sẵn sàng';
      if (statusPill) statusPill.className = 'hidden lg:flex items-center space-x-2 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 whitespace-nowrap';
    } else {
      throw new Error(`Status ${res.status}`);
    }
  } catch {
    if (statusText) statusText.textContent = 'Chưa kết nối';
    if (statusPill) statusPill.className = 'hidden lg:flex items-center space-x-2 text-xs px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 whitespace-nowrap';
  }
}

// ------------------------------------------
// Fetch Available Models from /v1/models
// ------------------------------------------
async function fetchAvailableModels() {
  if (!clientAccessToken) return;

  const badge = document.getElementById('models-count-badge');
  const grid = document.getElementById('models-grid');
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
        opt.textContent = `${m.id} (Free)`;
        select.appendChild(opt);
      });

      if (currentSelected && availableModels.some(m => m.id === currentSelected)) {
        select.value = currentSelected;
      } else {
        select.value = 'DeepSeek-V4-Flash';
      }
    }

    if (grid) {
      if (availableModels.length === 0) {
        grid.innerHTML = '<div class="col-span-3 text-center text-slate-500 text-xs py-10">Không tìm thấy model nào.</div>';
      } else {
        grid.innerHTML = availableModels.map(m => `
          <div class="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 transition-all flex flex-col justify-between group">
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                  🆓 100% FREE
                </span>
                <span class="text-[10px] text-slate-500 font-mono">${m.owned_by || 'free-tier'}</span>
              </div>
              <h4 class="font-bold text-slate-200 text-sm group-hover:text-emerald-300 transition-colors font-mono mb-2">
                ${m.id}
              </h4>
              <p class="text-[11px] text-slate-400 mb-3 leading-relaxed">
                ${m.description || 'Mô hình miễn phí tốc độ cao tương thích OpenAI.'}
              </p>
            </div>
            <button onclick="selectModelAndChat('${m.id}')" class="w-full py-2 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white text-xs font-medium transition-all flex items-center justify-center space-x-1.5">
              <span>Chat ngay với Model này</span>
              <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        `).join('');
        if (window.lucide) lucide.createIcons();
      }
    }
  } catch (err) {
    console.error('Error fetching models:', err);
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

function sendQuickPrompt(promptText) {
  const input = document.getElementById('chat-input');
  if (input) {
    input.value = promptText;
    autoResizeTextarea(input);
    handleChatSubmit(new Event('submit'));
  }
}

function clearChat() {
  chatHistory = [];
  const container = document.getElementById('chat-messages');
  container.innerHTML = `
    <div id="welcome-message" class="text-center py-10 max-w-xl mx-auto">
      <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 flex items-center justify-center">
        <i data-lucide="sparkles" class="w-8 h-8 text-indigo-400"></i>
      </div>
      <h2 class="text-xl font-bold text-slate-100 mb-2">Cuộc trò chuyện mới</h2>
      <p class="text-slate-400 text-sm">Hãy nhập câu hỏi bên dưới để bắt đầu giao tiếp với mô hình AI miễn phí.</p>
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
          <div class="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs">
            <strong>Lỗi phản hồi:</strong> ${err.message}
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
          <div class="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">
            <i data-lucide="bot" class="w-3.5 h-3.5"></i>
          </div>
          <span class="text-xs font-mono font-semibold text-emerald-300">${modelName}</span>
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
  return str.replace(/[&<>'"]/g, tag => ({
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
      model: "DeepSeek-V4-Flash",
      messages: [
        { role: "user", content: "Kiểm tra kết nối API Gateway thành công hay chưa?" }
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
