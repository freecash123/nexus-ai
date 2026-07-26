// ===== STATE =====
const STATE_KEY = 'nexus_ai_state';
let state = loadState();

function defaultState() {
  return {
    chats: { 'default': { id:'default', title:'New Conversation', messages:[], createdAt:Date.now() } },
    activeChat: 'default',
    settings: { provider:'simulation', apiKey:'' }
  };
}

function loadState() {
  try {
    const saved = localStorage.getItem(STATE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.chats && parsed.activeChat) return parsed;
    }
  } catch(e) {}
  return defaultState();
}

function saveState() {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch(e) {}
}

// ===== UI RENDERING =====
function renderAll() {
  renderChatList();
  renderMessages();
  updateSendBtn();
}

function renderChatList() {
  const list = document.getElementById('chatList');
  list.innerHTML = '';
  const chats = Object.values(state.chats).sort((a,b) => b.createdAt - a.createdAt);
  chats.forEach(chat => {
    const div = document.createElement('div');
    div.className = 'chat-item' + (chat.id === state.activeChat ? ' active' : '');
    div.innerHTML = '<span class="dot"></span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(chat.title) + '</span><span class="delete-chat" onclick="event.stopPropagation();deleteChat(\'' + chat.id + '\')" title="Delete">\u00d7</span>';
    div.onclick = function() { switchChat(chat.id); };
    list.appendChild(div);
  });
}

function renderMessages() {
  const container = document.getElementById('messages');
  const welcome = document.getElementById('welcomeScreen');
  const chat = state.chats[state.activeChat];
  if (!chat || chat.messages.length === 0) {
    container.innerHTML = '';
    container.appendChild(welcome);
    welcome.style.display = 'flex';
  } else {
    if (welcome.parentNode) welcome.style.display = 'none';
    container.innerHTML = '';
    chat.messages.forEach(function(msg) {
      container.appendChild(createMessageEl(msg));
    });
  }
  container.scrollTop = container.scrollHeight;
}

function createMessageEl(msg) {
  var div = document.createElement('div');
  div.className = 'msg ' + msg.role;
  if (msg.role === 'user') {
    div.innerHTML = '<div class="msg-avatar">U</div><div class="msg-body"><div class="msg-header">You</div><div class="msg-content">' + formatContent(msg.content) + '</div></div>';
  } else {
    var thinkingHtml = '';
    if (msg.thinking && msg.thinking.length > 0) {
      thinkingHtml = '<div class="thinking-block"><div class="thinking-header">Reasoning</div><div class="thinking-steps">' + msg.thinking.map(function(s) { return '<div class="thinking-step done"><span class="step-dot"></span>' + escapeHtml(s) + '</div>'; }).join('') + '</div></div>';
    }
    div.innerHTML = '<div class="msg-avatar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.04Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.04Z"/></svg></div><div class="msg-body"><div class="msg-header">Nexus AI</div>' + thinkingHtml + '<div class="msg-content">' + formatContent(msg.content) + '</div></div>';
  }
  return div;
}

function formatContent(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
    .replace(/^### (.+)$/gm, '<h4 style="margin:12px 0 4px;font-size:15px">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="margin:14px 0 6px;font-size:17px">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 style="margin:16px 0 8px;font-size:19px">$1</h2>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
}

function escapeHtml(text) {
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== CHAT MANAGEMENT =====
function switchChat(id) {
  state.activeChat = id;
  saveState();
  renderAll();
}

function newChat() {
  var id = 'chat_' + Date.now();
  state.chats[id] = { id: id, title: 'New Conversation', messages: [], createdAt: Date.now() };
  state.activeChat = id;
  saveState();
  renderAll();
  if (window.innerWidth <= 768) toggleSidebar();
}

function deleteChat(id) {
  if (Object.keys(state.chats).length <= 1) { state = defaultState(); saveState(); renderAll(); return; }
  delete state.chats[id];
  if (state.activeChat === id) state.activeChat = Object.keys(state.chats)[0];
  saveState();
  renderAll();
}

function toggleSidebar() {
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('collapsed');
  if (window.innerWidth <= 768) overlay.classList.toggle('active');
}

// ===== SETTINGS =====
function openSettings() {
  document.getElementById('settingsModal').style.display = 'flex';
  document.getElementById('apiProvider').value = state.settings.provider;
  document.getElementById('apiKey').value = state.settings.apiKey || '';
  onProviderChange();
}

function closeSettings() {
  document.getElementById('settingsModal').style.display = 'none';
}

function onProviderChange() {
  var provider = document.getElementById('apiProvider').value;
  document.getElementById('geminiSettings').style.display = provider === 'gemini' ? 'block' : 'none';
}

function saveSettings() {
  state.settings.provider = document.getElementById('apiProvider').value;
  state.settings.apiKey = document.getElementById('apiKey').value.trim();
  saveState();
  closeSettings();
  updateStatusBadge();
}

function clearAllData() {
  if (confirm('Delete all conversations? This cannot be undone.')) {
    state = defaultState();
    saveState();
    renderAll();
    closeSettings();
  }
}

function updateStatusBadge() {
  var badge = document.getElementById('statusBadge');
  var hasApi = state.settings.provider === 'gemini' && state.settings.apiKey;
  if (state.settings.provider === 'simulation' || hasApi) {
    badge.className = 'status-badge online';
    badge.innerHTML = '<span class="status-dot"></span>Online';
  } else {
    badge.className = 'status-badge offline';
    badge.innerHTML = '<span class="status-dot"></span>Add API Key';
  }
}

// ===== MESSAGING =====
var isGenerating = false;

function updateSendBtn() {
  var input = document.getElementById('userInput');
  var btn = document.getElementById('sendBtn');
  if (input.value.trim() && !isGenerating) { btn.classList.add('active'); btn.disabled = false; }
  else if (isGenerating) { btn.disabled = true; btn.classList.remove('active'); }
  else { btn.disabled = true; btn.classList.remove('active'); }
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 150) + 'px';
  updateSendBtn();
}

function handleKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function sendQuick(text) {
  document.getElementById('userInput').value = text;
  sendMessage();
}

function ensureChat() {
  var chat = state.chats[state.activeChat];
  if (!chat) { state.activeChat = 'default'; chat = state.chats['default']; if (!chat) { state = defaultState(); chat = state.chats['default']; } }
  return chat;
}

function createThinkingEl() {
  var div = document.createElement('div');
  div.className = 'msg ai';
  div.id = 'thinkingMsg';
  div.innerHTML = '<div class="msg-avatar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.04Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.04Z"/></svg></div><div class="msg-body"><div class="msg-header">Nexus AI \u00b7 thinking</div><div class="thinking-block"><div class="thinking-header"><div class="thinking-spinner"></div>Reasoning through your request</div><div class="thinking-steps" id="thinkingSteps"><div class="thinking-step active"><span class="step-dot"></span>Analyzing your question...</div></div></div></div>';
  return div;
}

function updateThinkingStep(step) {
  var steps = document.getElementById('thinkingSteps');
  if (steps) {
    var current = steps.querySelector('.thinking-step.active');
    if (current) current.className = 'thinking-step done';
    var newStep = document.createElement('div');
    newStep.className = 'thinking-step active';
    newStep.innerHTML = '<span class="step-dot"></span>' + escapeHtml(step);
    steps.appendChild(newStep);
  }
}

function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

function sendMessage() {
  doSendMessage().catch(function(e) {
    console.error('Nexus AI Error:', e);
    isGenerating = false;
    updateSendBtn();
    try {
      var chat = ensureChat();
      var thinkingEl = document.getElementById('thinkingMsg');
      if (thinkingEl && thinkingEl.parentNode) thinkingEl.remove();
      chat.messages.push({ role: 'ai', content: 'Sorry, I encountered an error: ' + (e.message || 'Unknown error') + '. Try switching to Simulation Mode in Settings.' });
      renderAll();
    } catch(e2) { console.error('Nexus AI Fatal:', e2); }
  });
}

async function doSendMessage() {
  if (isGenerating) return;
  var input = document.getElementById('userInput');
  var text = input.value.trim();
  if (!text) return;
  
  var chat = ensureChat();
  chat.messages.push({ role: 'user', content: text });
  if (chat.messages.length === 1) { chat.title = text.length > 40 ? text.substring(0,40) + '...' : text; }
  
  input.value = '';
  input.style.height = 'auto';
  isGenerating = true;
  updateSendBtn();
  renderAll();

  var container = document.getElementById('messages');
  var thinkingEl = createThinkingEl();
  container.appendChild(thinkingEl);
  container.scrollTop = container.scrollHeight;

  // Thinking steps
  var thinkingSteps = ['Analyzing your question...', 'Retrieving relevant context...', 'Formulating response strategy...', 'Generating answer...'];
  for (var i = 1; i < thinkingSteps.length; i++) {
    await sleep(400 + Math.random() * 600);
    updateThinkingStep(thinkingSteps[i]);
  }
  await sleep(300);

  var response;
  if (state.settings.provider === 'gemini' && state.settings.apiKey) {
    response = await callGemini(chat.messages);
  } else {
    response = simulateResponse(text);
  }

  if (thinkingEl.parentNode) thinkingEl.remove();
  chat.messages.push({ role: 'ai', content: response.text, thinking: response.thinking });

  isGenerating = false;
  updateSendBtn();
  renderAll();
}

// ===== GEMINI API =====
async function callGemini(messages) {
  var apiKey = state.settings.apiKey;
  var systemPrompt = "You are Nexus AI, a highly capable personal AI assistant. You think, reason, remember context, and help users with anything. Be helpful, thoughtful, warm, and thorough. Use markdown for formatting. You have capabilities including: coding, analysis, creative writing, planning, research, and more. Keep responses clear and well-structured.";

  var conversationHistory = messages.slice(0, -1).map(function(m) {
    return { role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] };
  });
  var lastMsg = messages[messages.length - 1];
  var contents = conversationHistory.length > 0 ? conversationHistory : [];
  contents.push({ role: 'user', parts: [{ text: lastMsg.content }] });

  var resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: contents,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 4096 }
    })
  });

  if (!resp.ok) {
    var err = await resp.json();
    throw new Error(err.error ? err.error.message : 'API request failed (status ' + resp.status + ')');
  }

  var data = await resp.json();
  var text = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) ? data.candidates[0].content.parts[0].text : 'I had trouble generating a response. Please try again.';

  return { text: text, thinking: ['Used Gemini 2.0 Flash', 'Processed ' + messages.length + ' message(s) of context', 'Generated response'] };
}

// ===== SIMULATION MODE =====
function simulateResponse(text) {
  var lower = text.toLowerCase();
  var thinking = ['Analyzing your question...', 'Searching knowledge base...', 'Formulating response...', 'Done!'];
  
  // Coding questions
  if (/code|function|python|javascript|html|css|api|sort|filter|map|reduce|component|react|node|express|database|sql|algorithm/i.test(text)) {
    return {
      text: "Here's a code solution:\n\n```javascript\nfunction sortByKey(arr, key, asc) {\n  asc = asc !== false;\n  return [...arr].sort((a, b) => {\n    const va = a[key] ?? '', vb = b[key] ?? '';\n    if (va < vb) return asc ? -1 : 1;\n    if (va > vb) return asc ? 1 : -1;\n    return 0;\n  });\n}\n```\n\n**How it works:**\n- Creates a shallow copy to avoid mutation\n- Uses nullish coalescing for missing keys\n- O(n log n) time complexity\n\n> 🔑 **Add a free Gemini API key** in Settings for real-time, context-aware coding help!",
      thinking: thinking
    };
  }
  
  // Planning
  if (/plan|schedule|launch|timeline|steps|guide|strategy|build|create|develop/i.test(text)) {
    return {
      text: "Here's a strategic plan:\n\n## Phase 1: Foundation (Week 1-2)\n- Define clear objectives and metrics\n- Research competitors and market\n- Identify required resources\n\n## Phase 2: Build (Week 3-6)\n- Create MVP with core features\n- Set up testing pipeline\n- Gather early feedback\n\n## Phase 3: Launch (Week 7-8)\n- Fix bugs from feedback\n- Optimize performance\n- Soft launch to limited audience\n\n> 🔑 **Add a free Gemini API key** in Settings for personalized planning with real AI!",
      thinking: thinking
    };
  }
  
  // Explanations
  if (/explain|what is|how does|why|define|meaning/i.test(text)) {
    return {
      text: "Great question! Let me break this down:\n\n## Understanding the Concept\n\nAt its core, this works through a few key principles:\n\n### 1. The Basic Idea\nThink of it as a sophisticated pattern recognition system that learns from data to identify relationships and generate useful outputs.\n\n### 2. Key Components\n- **Input Processing** — Information is broken into manageable pieces\n- **Pattern Matching** — The system finds relevant patterns from its training\n- **Output Generation** — Results are synthesized in a readable format\n\n### 3. Real-World Analogy\nImagine a master chef who has tasted thousands of dishes. When you ask for something \"spicy but sweet,\" they instantly draw on their experience — no recipe needed.\n\n> 🔑 **Add a free Gemini API key** in Settings for deep, personalized explanations!",
      thinking: thinking
    };
  }
  
  // Creative
  if (/write|story|poem|song|design|creative|imagine/i.test(text)) {
    return {
      text: "I love creative challenges! Here's something I've crafted:\n\n---\n\n**The Last Library**\n\nIn 2147, when all knowledge lived in the cloud and paper was a forgotten luxury, Maya discovered a door that shouldn't exist.\n\nCarved from actual, organic wood in a basement sealed for a century, it opened to shelves stretching into darkness — filled with books whose pages still smelled of ink and time.\n\n\"No one remembers how to read these,\" she whispered.\n\nBut someone did. And they'd left a note: *\"They deleted the past. We preserved it. Now it's your turn.\"*\n\n---\n\n> 🔑 **Add a free Gemini API key** in Settings for unlimited creative writing!",
      thinking: ['Engaging creative mode...', 'Brainstorming unique angles...', 'Crafting compelling narrative...', 'Done!']
    };
  }
  
  // Analysis
  if (/analyze|compare|vs|versus|pros|cons|review|evaluate/i.test(text)) {
    return {
      text: "Here's my analysis:\n\n## Comparison\n\n| Factor | Option A | Option B | Winner |\n|--------|----------|----------|--------|\n| Speed | ★★★★★ | ★★★ | A |\n| Cost | ★★ | ★★★★ | B |\n| Features | ★★★ | ★★★★★ | B |\n| Ease of Use | ★★★★ | ★★★ | A |\n\n### Recommendation\n- **For rapid prototyping** → Option A\n- **For production systems** → Option B\n\n> 🔑 **Add a free Gemini API key** in Settings for deep, data-driven analysis!",
      thinking: thinking
    };
  }
  
  // Default - friendly
  return {
    text: "Hey! I'm Nexus AI and I'm here to help.\n\nI can assist with:\n- **💻 Coding** — write, debug, explain code\n- **📋 Planning** — break down projects into steps\n- **🎨 Creative work** — stories, ideas, brainstorming\n- **📊 Analysis** — compare options, evaluate tradeoffs\n- **📚 Learning** — explain concepts clearly\n\n> 🔑 **Add a free Gemini API key** in Settings (click ⚙) for full AI power! Get yours free at [Google AI Studio](https://aistudio.google.com/apikey).\n\nWhat would you like to explore?",
    thinking: ['Ready to help!', 'Simulation mode active', 'Add a Gemini key for full power']
  };
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', function() {
  updateStatusBadge();
  renderAll();
  document.getElementById('userInput').focus();
});
