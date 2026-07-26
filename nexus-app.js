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
    if (welcome && welcome.parentNode) welcome.style.display = 'none';
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
  if (hasApi) {
    badge.className = 'status-badge online';
    badge.innerHTML = '<span class="status-dot"></span>Gemini Connected';
  } else {
    badge.className = 'status-badge online';
    badge.innerHTML = '<span class="status-dot"></span>Nexus AI Active';
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

  // Use setTimeout chain instead of async/await for max compatibility
  var steps = ['Analyzing your question...', 'Retrieving context...', 'Formulating strategy...', 'Generating answer...'];
  var stepIdx = 1;
  
  function next() {
    if (stepIdx < steps.length) {
      updateThinkingStep(steps[stepIdx]);
      stepIdx++;
      setTimeout(next, 500);
    } else {
      setTimeout(done, 400);
    }
  }
  
  function done() {
    try {
      var resp;
      if (state.settings.provider === 'gemini' && state.settings.apiKey) {
        callGeminiWithCallback(chat.messages, show, fail);
        return;
      } else {
        resp = simulateResponse(text);
      }
      show(resp);
    } catch(e) {
      fail(e);
    }
  }
  
  function show(resp) {
    var el = document.getElementById('thinkingMsg');
    if (el && el.parentNode) el.remove();
    chat.messages.push({ role: 'ai', content: resp.text, thinking: resp.thinking });
    isGenerating = false;
    updateSendBtn();
    renderAll();
  }
  
  function fail(e) {
    console.error('Nexus Error:', e);
    var el = document.getElementById('thinkingMsg');
    if (el && el.parentNode) el.remove();
    chat.messages.push({ role: 'ai', content: 'Error: ' + (e.message || 'Unknown') });
    isGenerating = false;
    updateSendBtn();
    renderAll();
  }
  
  setTimeout(next, 500);
}

// Keep old async versions for reference but they won't be called directly
async function doSendMessage() {
  // Legacy - not used
}

async function callGemini(messages) {
  // Legacy - use callGeminiWithCallback instead
  var apiKey = state.settings.apiKey;
  var systemPrompt = "You are Nexus AI, a personal AI assistant. Be helpful, thoughtful, warm, thorough. Use markdown.";
  var history = messages.slice(0,-1).map(function(m){return{role:m.role==='user'?'user':'model',parts:[{text:m.content}]};});
  var last = messages[messages.length-1];
  var contents = history.length>0?history:[];
  contents.push({role:'user',parts:[{text:last.content}]});
  var resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key='+apiKey,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:contents,systemInstruction:{parts:[{text:systemPrompt}]},generationConfig:{temperature:0.7,topK:40,topP:0.95,maxOutputTokens:4096}})});
  if(!resp.ok){var err=await resp.json();throw new Error(err.error?err.error.message:'API error');}
  var data=await resp.json();
  var text=(data.candidates&&data.candidates[0]&&data.candidates[0].content&&data.candidates[0].content.parts&&data.candidates[0].content.parts[0])?data.candidates[0].content.parts[0].text:'No response';
  return{text:text,thinking:['Used Gemini 2.0 Flash','Processed messages','Generated']};
}

function callGeminiWithCallback(messages, onSuccess, onError) {
  var apiKey = state.settings.apiKey;
  var systemPrompt = "You are Nexus AI, a personal AI assistant. Be helpful, thoughtful, warm, thorough. Use markdown.";
  var history = messages.slice(0,-1).map(function(m){return{role:m.role==='user'?'user':'model',parts:[{text:m.content}]};});
  var last = messages[messages.length-1];
  var contents = history.length>0?history:[];
  contents.push({role:'user',parts:[{text:last.content}]});
  
  fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key='+apiKey,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({contents:contents,systemInstruction:{parts:[{text:systemPrompt}]},generationConfig:{temperature:0.7,topK:40,topP:0.95,maxOutputTokens:4096}})
  }).then(function(r){if(!r.ok)return r.json().then(function(e){throw new Error(e.error?e.error.message:'API error '+r.status)});return r.json()})
  .then(function(d){var t=(d.candidates&&d.candidates[0]&&d.candidates[0].content&&d.candidates[0].content.parts&&d.candidates[0].content.parts[0])?d.candidates[0].content.parts[0].text:'No response';onSuccess({text:t,thinking:['Gemini 2.0 Flash','Processed','Generated']});})
  .catch(function(e){onError(e);});
}

// ===== GEMINI API =====

function callGeminiCallback(messages, onSuccess, onError) {
  var apiKey = state.settings.apiKey;
  var systemPrompt = "You are Nexus AI, a highly capable personal AI assistant. You think, reason, remember context, and help users with anything. Be helpful, thoughtful, warm, and thorough. Use markdown for formatting.";

  var conversationHistory = messages.slice(0, -1).map(function(m) {
    return { role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] };
  });
  var lastMsg = messages[messages.length - 1];
  var contents = conversationHistory.length > 0 ? conversationHistory : [];
  contents.push({ role: 'user', parts: [{ text: lastMsg.content }] });

  fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: contents,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 4096 }
    })
  }).then(function(resp) {
    if (!resp.ok) return resp.json().then(function(err) { throw new Error(err.error ? err.error.message : 'API error ' + resp.status); });
    return resp.json();
  }).then(function(data) {
    var text = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) ? data.candidates[0].content.parts[0].text : 'Could not generate response.';
    onSuccess({ text: text, thinking: ['Used Gemini 2.0 Flash', 'Processed messages', 'Generated response'] });
  }).catch(function(e) {
    onError(e);
  });
}

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
function simulateResponse(text, messages) {
  var lower = text.toLowerCase();
  var thinking = ['Analyzing your question...', 'Retrieving knowledge...', 'Formulating response...', 'Done!'];
  
  // ===== CODING =====
  if (/code|function|python|javascript|html|css|api|sort|filter|map|reduce|component|react|node|express|database|sql|algorithm|bug|error|debug|fix|implement|write.*script/i.test(text)) {
    if (/python/i.test(text) || /sort|filter|map|dict/i.test(text)) {
      return {text: "Here's a Python solution:\n\n```python\ndef sort_by_key(data, key, reverse=False):\n    \"\"\"Sort a list of dictionaries by a key.\"\"\"\n    return sorted(data, key=lambda x: x.get(key, ''), reverse=reverse)\n\n# Example\ndata = [{'name':'Alice','age':30},{'name':'Bob','age':25}]\nresult = sort_by_key(data, 'age')\nprint(result)\n```\n\n**Key points:**\n- Uses `sorted()` with `lambda` — O(n log n)\n- Handles missing keys with `.get()`\n- Returns a new list, doesn't mutate original\n\nNeed this in another language or with more features?", thinking:thinking};
    }
    if (/javascript|react|component|node|express/i.test(text)) {
      return {text: "Here's a modern JavaScript solution:\n\n```javascript\nconst sortByKey = (arr, key, asc = true) => {\n  return [...arr].sort((a, b) => {\n    const va = a[key] ?? '';\n    const vb = b[key] ?? '';\n    if (va < vb) return asc ? -1 : 1;\n    if (va > vb) return asc ? 1 : -1;\n    return 0;\n  });\n};\n\n// React hook example\nfunction useSortedData(data, sortKey) {\n  return React.useMemo(\n    () => sortByKey(data, sortKey),\n    [data, sortKey]\n  );\n}\n```\n\n**Why this approach:**\n- Immutable — spreads to avoid mutation\n- Null-safe with `??` operator\n- Memoized in React for performance\n\nWant me to adapt this for your specific use case?", thinking:thinking};
    }
    return {text: "Here's a code solution for your request:\n\n```javascript\nfunction solve(arr) {\n  // Your input processed here\n  const result = arr\n    .filter(Boolean)\n    .map(item => ({ ...item, processed: true }))\n    .sort((a, b) => a.priority - b.priority);\n  return result;\n}\n```\n\n**Approach:**\n- Filter invalid inputs first\n- Transform data immutably\n- Sort by priority\n- Return clean result\n\nThis pattern works for most data processing tasks. Can you share more details so I can give you a more specific solution?", thinking:thinking};
  }
  
  // ===== PLANNING =====
  if (/plan|schedule|launch|timeline|steps|guide|strategy|build|create|develop|project|start/i.test(text)) {
    return {text: "Here's a strategic action plan:\n\n## Phase 1: Foundation (Week 1-2)\n- Define clear, measurable objectives\n- Research competitors and market landscape\n- Identify required resources and constraints\n- Set up project tracking tools\n\n## Phase 2: Build & Execute (Week 3-6)\n- Create MVP with core features only\n- Daily check-ins and weekly reviews\n- Gather feedback from early testers\n- Iterate based on real data\n\n## Phase 3: Polish & Launch (Week 7-8)\n- Fix bugs from beta feedback\n- Optimize performance and UX\n- Prepare launch materials\n- Soft launch, then full launch\n\n**Key success factors:**\n- Stay focused on MVP — avoid scope creep\n- Build in 20% buffer time\n- Ship early, iterate often\n\nWhat specific area would you like me to dive deeper into?", thinking:thinking};
  }
  
  // ===== EXPLANATIONS =====
  if (/explain|what is|how does|why|tell me about|define|meaning|how.*work|understand/i.test(text)) {
    return {text: "Great question! Let me break this down clearly:\n\n## The Core Concept\n\nAt its foundation, this operates on three key principles:\n\n### 1. Pattern Recognition\nJust like your brain learns to recognize faces after seeing thousands of them, this system identifies patterns from vast amounts of data — finding connections that aren't obvious to the human eye.\n\n### 2. Context Understanding\nUnlike simple search engines that match keywords, this understands *meaning*. When you ask about \"apple,\" it knows whether you mean the fruit or the company based on context.\n\n### 3. Generative Capability\nInstead of just finding existing answers, it creates new responses tailored to your specific question — like a chef creating a dish rather than reheating leftovers.\n\n**Real-world analogy:** Imagine a librarian who has read every book ever written and can instantly synthesize information from any of them to answer your question in plain language.\n\nWant me to go deeper on any specific aspect?", thinking:thinking};
  }
  
  // ===== CREATIVE =====
  if (/write|story|poem|song|design|creative|imagine|idea|brainstorm/i.test(text)) {
    return {text: "Here's something creative I've crafted:\n\n---\n\n**The Last Signal**\n\nIn 2087, Earth received its final message from the Kepler colony:\n\n*\"We found what we were looking for. But we also found what was looking for us.\"*\n\nDr. Marina Chen stared at the transmission for three hours before she noticed the pattern hidden in the static — a heartbeat, impossibly slow, embedded in the carrier wave. Something was using the signal itself as a vessel, riding it back toward Earth at the speed of light.\n\nThe countdown gave them 47 hours.\n\n---\n\nThis could work as a sci-fi short story, novel opening, or screenplay. Want me to continue it, or would you prefer a different genre?", thinking:['Engaging creative mode...', 'Brainstorming unique angles...', 'Crafting narrative...', 'Done!']};
  }
  
  // ===== ANALYSIS =====
  if (/analyze|compare|vs|versus|pros|cons|review|evaluate|better|difference|which|should I/i.test(text)) {
    return {text: "Here's my analysis:\n\n## Comparison\n\n| Factor | Option A | Option B | Notes |\n|--------|----------|----------|-------|\n| Speed | ★★★★★ | ★★★ | A is 40% faster |\n| Cost | ★★ | ★★★★ | B is cheaper at scale |\n| Features | ★★★ | ★★★★★ | B has richer ecosystem |\n| Learning Curve | ★★★★ | ★★ | A is easier to start |\n| Community | ★★★ | ★★★★★ | B has more resources |\n\n### Recommendation\n- **For quick projects / beginners** → Option A\n- **For production / long-term** → Option B\n- **Hybrid approach** → Start with A, migrate to B at scale\n\nThe right choice depends on your specific context. What's your timeline and scale?", thinking:thinking};
  }
  
  // ===== MATH / SCIENCE =====
  if (/math|calculate|equation|formula|physics|chemistry|biology|science|solve|compute/i.test(text)) {
    return {text: "Let me work through this step by step:\n\n## Solution\n\n**Step 1:** Identify what we're solving for\n**Step 2:** Set up the equation based on the given parameters\n**Step 3:** Solve systematically\n**Step 4:** Verify the answer\n\n```\nFinal result: [calculated based on your input]\n```\n\n**Key formulas used:**\n- Basic arithmetic and algebra\n- Standard mathematical principles\n\nCan you share the specific numbers or equation? I can work through the exact calculation for you.", thinking:['Parsing mathematical problem...', 'Selecting appropriate formulas...', 'Computing step by step...', 'Verifying result...']};
  }
  
  // ===== TECH / AI =====
  if (/ai|artificial intelligence|machine learning|deep learning|neural|gpt|llm|transformer|chatgpt|gemini|openai/i.test(text)) {
    return {text: "## AI & Machine Learning Overview\n\n### What is AI?\nArtificial Intelligence is the broader field of creating machines that can perform tasks requiring human-like intelligence — reasoning, learning, perception, and creativity.\n\n### Key Branches:\n- **Machine Learning** — Systems that learn from data without explicit programming\n- **Deep Learning** — Neural networks with many layers, inspired by the brain\n- **NLP** — Understanding and generating human language\n- **Computer Vision** — Understanding images and video\n\n### How Modern AI Works:\n1. **Training** — Feed massive datasets into neural networks\n2. **Pattern Learning** — Network adjusts millions of parameters\n3. **Inference** — Trained model generates outputs from new inputs\n4. **Fine-tuning** — Further training for specific tasks\n\n### Current State (2026):\n- Models can reason, code, create, and hold conversations\n- Multimodal AI understands text, images, audio together\n- AI agents can autonomously complete complex tasks\n- Open-source models competing with proprietary ones\n\nWhat specific aspect of AI would you like to explore?", thinking:['Accessing AI knowledge base...', 'Organizing information...', 'Structuring explanation...', 'Done!']};
  }
  
  // ===== DEFAULT — helpful assistant =====
  return {
    text: "Hey! I'm Nexus AI and I'm here to help with anything you need.\n\n**I can assist with:**\n- 💻 **Coding** — write, debug, and explain code in any language\n- 📋 **Planning** — break down complex projects into actionable steps\n- 🎨 **Creative Work** — stories, ideas, brainstorming, content\n- 📊 **Analysis** — compare options, evaluate tradeoffs, review data\n- 📚 **Learning** — explain concepts clearly at any level\n- 🔬 **Science & Math** — solve problems step by step\n- 🤖 **Tech & AI** — discuss the latest in technology\n\n**I remember our conversation** within each chat, so feel free to ask follow-up questions!\n\nWhat would you like to explore?",
    thinking: ['Nexus AI ready', 'Simulation mode active', 'Ready to help with anything']
  };
}

// ===== INIT =====
window.addEventListener("unhandledrejection", function(e) { console.error("Unhandled rejection:", e.reason); });
document.addEventListener("DOMContentLoaded", function() {
  updateStatusBadge();
  renderAll();
  document.getElementById('userInput').focus();
});
