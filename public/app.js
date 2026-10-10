// ==========================================
// Nexus AI Gateway - Client Logic
// ==========================================

let currentTab = 'chat';
let availableModels = [];
let chatHistory = [];
let activeAbortController = null;

// Settings
let systemPrompt = localStorage.getItem('nexus_system_prompt') || 'Bạn là trợ lý AI hữu ích, thông minh và phản hồi nhanh chóng bằng tiếng Việt.';
let chatTemperature = parseFloat(localStorage.getItem('nexus_temperature') || '0.7');
let clientAccessToken = localStorage.getItem('nexus_client_token') || '';

// Initialize Markdown parser
if (window.marked) {
  marked.setOptions({
    breaks: true,
    gfm: true,
    highlight: function(code, lang) {
      if (window.hljs && lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(code, { language: lang }).value;
        } catch {
          // fallback
        }
      }
      return code;
    }
  });
}

// ------------------------------------------
// Initialization on DOM Ready
// ------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
  
  // Setup dynamic URLs for docs
  updateGatewayUrls();

  // Load modal inputs
  document.getElementById('modal-system-prompt').value = systemPrompt;
  document.getElementById('modal-temperature').value = chatTemperature;
  document.getElementById('temp-val').textContent = chatTemperature;
  document.getElementById('client-token-input').value = clientAccessToken;

  // Run initial health check & fetch models
  checkGatewayHealth();
  fetchAvailableModels();

  // Highlight initial code blocks
  if (window.hljs) hljs.highlightAll();
});

// ------------------------------------------
// Dynamic Base URL calculation
// ------------------------------------------
function getBaseUrl() {
  const origin = window.location.origin;
  return `${origin}/v1`;
}

function updateGatewayUrls() {
  const baseUrl = getBaseUrl();
  const origin = window.location.origin;

  const urlDisplay = document.getElementById('gateway-base-url');
  if (urlDisplay) urlDisplay.textContent = baseUrl;

  const nextchatElem = document.getElementById('nextchat-endpoint');
  if (nextchatElem) nextchatElem.textContent = origin;

  const chatboxElem = document.getElementById('chatbox-endpoint');
  if (chatboxElem) chatboxElem.textContent = baseUrl;

  // Update code snippets
  const curlElem = document.getElementById('curl-code-block');
  if (curlElem) {
    curlElem.textContent = curlElem.textContent.replace(/\$GATEWAY_URL/g, baseUrl);
  }
  const pythonElem = document.getElementById('python-code-block');
  if (pythonElem) {
    pythonElem.textContent = pythonElem.textContent.replace(/\$GATEWAY_URL/g, baseUrl);
  }
  const nodejsElem = document.getElementById('nodejs-code-block');
  if (nodejsElem) {
    nodejsElem.textContent = nodejsElem.textContent.replace(/\$GATEWAY_URL/g, baseUrl);
  }
}

// ------------------------------------------
// Tab Switching
// ------------------------------------------
function switchTab(tabId) {
  currentTab = tabId;

  // Panes
  document.querySelectorAll('.tab-pane').forEach(el => el.classList.add('hidden'));
  const activePane = document.getElementById(`tab-${tabId}`);
  if (activePane) activePane.classList.remove('hidden');

  // Desktop Tab Buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.classList.add('text-slate-400');
  });
  const activeBtn = document.getElementById(`nav-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.add('active');
    activeBtn.classList.remove('text-slate-400');
  }

  // Mobile Tab Buttons
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
      statusText.textContent = 'API Sẵn sàng';
      statusPill.className = 'flex items-center space-x-2 text-xs px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400';
    } else {
      throw new Error(`Status ${res.status}`);
    }
  } catch (err) {
    statusText.textContent = 'Chưa kết nối';
    statusPill.className = 'flex items-center space-x-2 text-xs px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400';
  }
}

// ------------------------------------------
// Fetch Available Models from /v1/models
// ------------------------------------------
async function fetchAvailableModels(force = false) {
  const badge = document.getElementById('models-count-badge');
  const grid = document.getElementById('models-grid');
  const select = document.getElementById('chat-model-select');

  try {
    const headers = {};
    if (clientAccessToken) headers['Authorization'] = `Bearer ${clientAccessToken}`;

    const res = await fetch('/v1/models', { headers });
    if (!res.ok) throw new Error('Không thể tải models');

    const json = await res.json();
    availableModels = json.data || [];

    if (badge) badge.textContent = availableModels.length;

    // Update Select Dropdown
    if (select && availableModels.length > 0) {
      const currentSelected = select.value;
      select.innerHTML = '';
      
      // Auto first
      const autoOption = document.createElement('option');
      autoOption.value = 'auto';
      autoOption.textContent = 'auto (Mặc định)';
      select.appendChild(autoOption);

      availableModels.forEach(m => {
        if (m.id !== 'auto') {
          const opt = document.createElement('option');
          opt.value = m.id;
          opt.textContent = m.id;
          select.appendChild(opt);
        }
      });

      if (currentSelected) select.value = currentSelected;
    }

    // Render Models Grid (Tab 4)
    if (grid) {
      if (availableModels.length === 0) {
        grid.innerHTML = '<div class="col-span-3 text-center text-slate-500 text-xs py-10">Không tìm thấy model nào.</div>';
      } else {
        grid.innerHTML = availableModels.map(m => `
          <div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col justify-between group">
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                  ${m.owned_by || 'openai'}
                </span>
                <span class="text-[10px] text-slate-500 font-mono">id: ${m.object || 'model'}</span>
              </div>
              <h4 class="font-bold text-slate-200 text-sm group-hover:text-indigo-300 transition-colors font-mono mb-2">
                ${m.id}
              </h4>
              <div class="text-[11px] text-slate-400 space-y-1 mb-4">
                <div class="flex items-center space-x-1">
                  <span class="text-slate-500">Endpoints:</span>
                  <span class="text-slate-300">${(m.supported_endpoint_types || ['openai']).join(', ')}</span>
                </div>
              </div>
            </div>
            <button onclick="selectModelAndChat('${m.id}')" class="w-full py-2 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-medium transition-all flex items-center justify-center space-x-1.5">
              <span>Trò chuyện với Model này</span>
              <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        `).join('');
        if (window.lucide) lucide.createIcons();
      }
    }
  } catch (err) {
    console.error('Error fetching models:', err);
    if (badge) badge.textContent = '!';
    if (grid) {
      grid.innerHTML = `
        <div class="col-span-3 p-6 rounded-2xl bg-red-950/20 border border-red-900/40 text-center text-red-400 text-xs">
          Lỗi tải danh sách models (${err.message}). Vui lòng kiểm tra API Gateway.
        </div>
      `;
    }
  }
}

function selectModel(modelId) {
  const select = document.getElementById('chat-model-select');
  if (select) {
    select.value = modelId;
  }
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
      <p class="text-slate-400 text-sm">Hãy nhập câu hỏi bên dưới để bắt đầu giao tiếp với mô hình AI.</p>
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
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message) return;

  // Clear input
  input.value = '';
  autoResizeTextarea(input);

  // Hide welcome message if present
  const welcome = document.getElementById('welcome-message');
  if (welcome) welcome.remove();

  // Selected Model
  const modelSelect = document.getElementById('chat-model-select');
  const selectedModel = modelSelect ? modelSelect.value : 'auto';

  // Append user message to state & UI
  chatHistory.push({ role: 'user', content: message });
  appendMessageToUI('user', message);

  // Build full payload with system prompt
  const messagesPayload = [];
  if (systemPrompt.trim()) {
    messagesPayload.push({ role: 'system', content: systemPrompt.trim() });
  }
  messagesPayload.push(...chatHistory);

  // Create UI Assistant bubble placeholder
  const assistantBubbleId = `msg-assistant-${Date.now()}`;
  appendAssistantPlaceholder(assistantBubbleId, selectedModel);

  // Prepare streaming request
  toggleGenerationButtons(true);
  activeAbortController = new AbortController();

  let assistantReplyText = '';
  const messageContentEl = document.getElementById(`${assistantBubbleId}-content`);

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (clientAccessToken) headers['Authorization'] = `Bearer ${clientAccessToken}`;

    const response = await fetch('/v1/chat/completions', {
      method: 'POST',
      headers,
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

        if (trimmed === 'data: [DONE]') {
          break;
        }

        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6);
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            assistantReplyText += delta;

            // Render Markdown incrementally
            if (messageContentEl) {
              messageContentEl.innerHTML = marked.parse(assistantReplyText);
              enhanceCodeBlocks(messageContentEl);
            }
            scrollToBottom();
          } catch {
            // Incomplete JSON chunk, skip
          }
        }
      }
    }

    // Finished streaming
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
          <div class="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">
            <i data-lucide="bot" class="w-3.5 h-3.5"></i>
          </div>
          <span class="text-xs font-mono font-semibold text-indigo-300">${modelName}</span>
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
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
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
// Settings Modal (Client Token)
// ------------------------------------------
function openSettingsModal() {
  const modal = document.getElementById('settings-modal');
  modal.classList.toggle('hidden');
}

function saveClientToken() {
  const token = document.getElementById('client-token-input').value.trim();
  clientAccessToken = token;
  localStorage.setItem('nexus_client_token', clientAccessToken);
  openSettingsModal();
  checkGatewayHealth();
  fetchAvailableModels();
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
      model: "auto",
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

  try {
    const isPost = endpoint.includes('chat/completions');
    const headers = { 'Content-Type': 'application/json' };
    if (clientAccessToken) headers['Authorization'] = `Bearer ${clientAccessToken}`;

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
