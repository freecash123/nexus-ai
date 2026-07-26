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
  
  // Check for attached image
  var hasImage = !!currentImage;
  if (hasImage) {
    // Clear image preview after sending
    setTimeout(function() { clearImage(); }, 100);
  }
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
  // Check if there's an image attached
  var imgEl = document.getElementById('previewImg');
  if (imgEl && imgEl.src && imgEl.src.startsWith('data:image')) {
    return {
      text: "I can see you've shared an image! \ud83d\udcf7\n\nIn **Simulation Mode** I can't analyze images directly, but here's what I can tell you:\n\n- The image appears to be uploaded successfully\n- It's encoded as a data URL (ready for processing)\n- With a **Gemini API key** (free from Google AI Studio), I can describe, analyze, and answer questions about any image\n\n> \ud83d\udd11 **Add a free Gemini API key** in Settings (\u2699) for real image analysis, object recognition, text extraction, and visual Q&A!\n\nWhat would you like to know about the image?",
      thinking: ['Image detected', 'Analyzing image data...', 'Simulation mode — add API key for full analysis', 'Ready to help']
    };
  }
  
  var lower = text.toLowerCase();
  var lower = text.toLowerCase();
  var thinking = ['Analyzing your question...', 'Retrieving knowledge...', 'Formulating response...', 'Done!'];
  
  // ===== 1. ANALYSIS — check FIRST (before coding, since "compare Python vs JS" should be analysis not code) =====
  if (/\banalyze\b|\bcompare\b|\bvs\b|\bversus\b|\bpros?\b|\bcons?\b|\breview\b|\bevaluate\b|\bbetter\b|\bdifference\b|\bwhich\b.*\bbetter\b|\bshould I\b|\bchoice\b|\bdecide\b/i.test(text)) {
    return {text: "Here's a balanced comparison:\n\n## Comparison Analysis\n\n| Factor | Option A | Option B | Notes |\n|--------|----------|----------|-------|\n| Speed | \u2605\u2605\u2605\u2605\u2605 | \u2605\u2605\u2605 | A is faster |\n| Cost | \u2605\u2605 | \u2605\u2605\u2605\u2605 | B is more affordable |\n| Features | \u2605\u2605\u2605 | \u2605\u2605\u2605\u2605\u2605 | B has more |\n| Ease of Use | \u2605\u2605\u2605\u2605 | \u2605\u2605\u2605 | A is simpler |\n| Community | \u2605\u2605\u2605 | \u2605\u2605\u2605\u2605\u2605 | B is larger |\n\n### Key Differences\n- **Option A** excels at speed and simplicity\n- **Option B** wins on features and ecosystem\n\n### Recommendation\n- For quick projects: **Option A**\n- For production systems: **Option B**\n- The best choice depends on your specific needs — timeline, team size, and project requirements\n\nWhat's your specific use case? I can give you a more targeted recommendation.", thinking:thinking};
  }
  
  // ===== 2. CODING =====
  if (/\bcode\b|\bfunction\b|python|javascript|\bhtml\b|\bcss\b|\bapi\b|\bsort\b|\bfilter\b|\bmap\b|\breduce\b|\bcomponent\b|react|node|express|\bdatabase\b|\bsql\b|\balgorithm\b|\bbug\b|\berror\b|\bdebug\b|\bfix\b|\bimplement\b|write.*script|\bprogram\b|\bcompile\b|\bsyntax\b/i.test(text)) {
    if (/python|django|flask|pandas|numpy/i.test(text)) {
      return {text: "Here's a Python solution:\n\n```python\ndef process_data(data, sort_key='name'):\n    \"\"\"Process and sort data safely.\"\"\"\n    # Filter out invalid entries\n    valid = [d for d in data if d.get(sort_key)]\n    # Sort by key with missing key handling\n    return sorted(valid, key=lambda x: x.get(sort_key, ''))\n\n# Example usage\nitems = [\n    {'name': 'Charlie', 'score': 85},\n    {'name': 'Alice', 'score': 92},\n    {'name': 'Bob', 'score': 78}\n]\nresult = process_data(items, 'score')\nprint(result)\n```\n\n**Why this works:**\n- Uses list comprehension for clean filtering\n- `sorted()` with `lambda` — O(n log n)\n- `dict.get()` handles missing keys gracefully\n- Immutable — returns new list\n\nNeed this adapted for your specific use case?", thinking:thinking};
    }
    if (/javascript|react|node|express|component|jsx|npm|webpack|vite/i.test(text)) {
      return {text: "Here's a modern JavaScript/React approach:\n\n```javascript\n// Utility: Sort array of objects by key\nconst sortBy = (arr, key, asc = true) => {\n  return [...arr].sort((a, b) => {\n    const va = a[key] ?? '';\n    const vb = b[key] ?? '';\n    if (va < vb) return asc ? -1 : 1;\n    if (va > vb) return asc ? 1 : -1;\n    return 0;\n  });\n};\n\n// React Component\nfunction DataTable({ data }) {\n  const [sortKey, setSortKey] = React.useState('name');\n  const [ascending, setAscending] = React.useState(true);\n  \n  const sorted = React.useMemo(\n    () => sortBy(data, sortKey, ascending),\n    [data, sortKey, ascending]\n  );\n  \n  return (\n    <table>\n      <thead>\n        <tr>\n          <th onClick={() => { setSortKey('name'); setAscending(sortKey === 'name' ? !ascending : true); }}>\n            Name {sortKey === 'name' ? (ascending ? '\u2191' : '\u2193') : ''}\n          </th>\n        </tr>\n      </thead>\n      <tbody>\n        {sorted.map(item => (\n          <tr key={item.id}><td>{item.name}</td></tr>\n        ))}\n      </tbody>\n    </table>\n  );\n}\n```\n\n**Key patterns:**\n- Immutable spread to avoid mutation\n- `useMemo` for performance\n- Null-safe with `??`\n- Click-to-sort headers\n\nWant me to adapt this for your framework?", thinking:thinking};
    }
    return {text: "Here's a solution for your coding request:\n\n```javascript\n// Clean, modular approach\nfunction solve(input) {\n  // 1. Validate input\n  if (!input || !Array.isArray(input)) {\n    throw new Error('Expected an array');\n  }\n  \n  // 2. Process data\n  const result = input\n    .filter(item => item != null)\n    .map(item => transform(item))\n    .sort((a, b) => a.priority - b.priority);\n  \n  return result;\n}\n\nfunction transform(item) {\n  return { ...item, processed: true, timestamp: Date.now() };\n}\n```\n\n**Approach:**\n- Validate inputs first\n- Chain operations (filter \u2192 map \u2192 sort)\n- Keep functions small and focused\n- Immutable patterns throughout\n\nWhat language or framework are you using? I can tailor this specifically.", thinking:thinking};
  }
  
  // ===== 3. MATH / SCIENCE =====
  if (/\bmath\b|\bcalculate\b|\bequation\b|\bformula\b|physics|chemistry|biology|\bscience\b|\bsolve\b|\bcompute\b|\bderivative\b|\bintegral\b|\balgebra\b|\bprobability\b|\bstatistics\b/i.test(text)) {
    return {text: "Let me work through this step by step:\n\n## Step-by-Step Solution\n\n**Given:** Your problem statement\n\n**Step 1:** Identify what we're solving for\n**Step 2:** Set up the appropriate formula/equation\n**Step 3:** Plug in the values\n**Step 4:** Simplify and solve\n**Step 5:** Verify the answer\n\n```\nFinal Answer: [calculated from your specific numbers]\n```\n\n**Key concepts applied:**\n- Standard mathematical principles\n- Logical problem decomposition\n\nCan you share the specific numbers, equation, or problem? I'll work through the exact calculation for you.", thinking:['Parsing the problem...', 'Selecting formulas...', 'Computing step by step...', 'Verifying...']};
  }
  
  // ===== 4. TECH / AI =====
  if (/\bai\b|artificial intelligence|machine learning|deep learning|neural|\bllm\b|transformer|chatgpt|gemini|openai|\bgpt\b|claude|anthropic|\bcrypto\b|blockchain|web3|\biot\b|\bvr\b|\bar\b|quantum/i.test(text)) {
    return {text: "## AI & Technology Overview\n\n### Current State (2026)\nThe AI landscape has evolved rapidly. Here's where things stand:\n\n**Large Language Models:**\n- Models can now reason, code, create, and hold nuanced conversations\n- Multimodal AI understands text, images, audio, and video together\n- Context windows have expanded to millions of tokens\n- Open-source models compete with proprietary systems\n\n**Key Trends:**\n- **AI Agents** — Autonomous systems that complete complex, multi-step tasks\n- **AI-First Development** — Code generation and debugging as standard practice\n- **On-Device AI** — Powerful models running locally on phones and laptops\n- **Multimodal Fusion** — Seamless combination of text, vision, and audio\n\n**What This Means:**\nAI is becoming an operating system for knowledge work — not just a chatbot, but a reasoning engine that helps with everything from coding to creative work.\n\nWhat specific area of tech or AI would you like to explore deeper?", thinking:['Accessing knowledge base...', 'Organizing latest developments...', 'Structuring clear explanation...', 'Done!']};
  }
  
  // ===== 5. PLANNING =====
  if (/\bplan\b|\bschedule\b|\blaunch\b|\btimeline\b|\bsteps\b|\bguide\b|\bstrategy\b|\bbuild\b|\bcreate\b|\bdevelop\b|\bproject\b|\bstart\b.*\bproject\b|\bgoal\b|\bobjective\b|\brainstorm\b/i.test(text)) {
    return {text: "Here's a structured action plan:\n\n## Strategic Plan\n\n### Phase 1: Foundation (Week 1-2)\n- Define clear, measurable objectives\n- Research the landscape and competitors\n- Identify required resources and constraints\n- Set up tracking and communication tools\n\n### Phase 2: Build & Execute (Week 3-6)\n- Create MVP with core features only\n- Daily check-ins, weekly reviews\n- Gather feedback from 5-10 early testers\n- Iterate based on real data\n\n### Phase 3: Polish & Launch (Week 7-8)\n- Fix issues from beta feedback\n- Optimize performance and user experience\n- Prepare launch materials and documentation\n- Soft launch \u2192 gather data \u2192 full launch\n\n### Success Factors\n- **Stay focused** — avoid scope creep, MVP first\n- **Build buffer** — add 20% to time estimates\n- **Ship early** — done is better than perfect\n\nWhat's your specific project? I can tailor this plan to your exact needs.", thinking:thinking};
  }
  
  // ===== 6. EXPLANATIONS =====
  if (/\bexplain\b|what is|how does|\bwhy\b|tell me about|\bdefine\b|\bmeaning\b|how.*work|\bunderstand\b|\blearn\b/i.test(text)) {
    return {text: "Great question! Let me break this down:\n\n## Understanding the Concept\n\nAt its core, this works on three principles:\n\n### 1. Pattern Recognition\nJust like your brain recognizes faces after seeing thousands, this system identifies patterns in data — finding connections invisible to the human eye.\n\n### 2. Context Awareness\nUnlike simple keyword matching, it understands *meaning*. When you mention \"apple,\" it knows from context whether you mean the fruit or the company.\n\n### 3. Generative Capability\nInstead of retrieving existing answers, it creates new responses tailored to you — like a chef creating a dish rather than reheating leftovers.\n\n**Simple analogy:** Imagine a librarian who's read every book ever written and can instantly synthesize information from any of them into plain language.\n\nWant me to go deeper on any specific aspect?", thinking:thinking};
  }
  
  // ===== 7. CREATIVE =====
  if (/\bwrite\b|\bstory\b|\bpoem\b|\bsong\b|\bdesign\b|\bcreative\b|\bimagine\b|\bidea\b|\bdream\b|\bfiction\b|\bnarrative\b/i.test(text)) {
    return {text: "Here's something original I've crafted:\n\n---\n\n**The Last Signal**\n\nIn 2087, Earth received its final message from the Kepler colony:\n\n*\"We found what we were looking for. But we also found what was looking for us.\"*\n\nDr. Marina Chen stared at the transmission for three hours before she noticed it — a heartbeat, impossibly slow, hidden in the carrier wave. Something was using the signal itself as a vessel, riding it back toward Earth at the speed of light.\n\n47 hours until arrival.\n\nShe had two choices: warn the world and cause panic, or face whatever was coming alone.\n\nShe chose neither. She chose to answer.\n\n---\n\nThis could be a short story, novel opening, or screenplay treatment. Want me to continue, or try a different genre?", thinking:['Engaging creative mode...', 'Exploring unique angles...', 'Crafting narrative...', 'Done!']};
  }
  
  // ===== 8. DEFAULT — always helpful =====
  return {
    text: "Hey! I'm Nexus AI \u2014 your intelligent assistant.\n\n**I can help you with:**\n- \ud83d\udcbb **Coding** \u2014 write, debug, and explain code in any language\n- \ud83d\udccb **Planning** \u2014 break down projects into actionable steps\n- \ud83c\udfa8 **Creative Work** \u2014 stories, ideas, brainstorming, content creation\n- \ud83d\udcca **Analysis** \u2014 compare options, evaluate tradeoffs, review data\n- \ud83d\udcda **Learning** \u2014 explain concepts clearly at any level\n- \ud83d\udd2c **Science & Math** \u2014 solve problems step by step\n- \ud83e\udd16 **Tech & AI** \u2014 discuss the latest in technology\n\n**I remember our conversation** within each chat, so feel free to ask follow-ups.\n\nWhat would you like to explore?",
    thinking: ['Nexus AI ready', 'Active and listening', 'Ask me anything!']
  };
}


// ===== MULTIMEDIA FEATURES =====
var currentImage = null;
var mediaRecorder = null;
var audioChunks = [];
var isRecording = false;
var cameraStream = null;
var speechSynth = window.speechSynthesis;
var isSpeaking = false;

// === IMAGE UPLOAD ===
function handleImageUpload(event) {
  var file = event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    currentImage = e.target.result;
    document.getElementById('previewImg').src = currentImage;
    document.getElementById('imagePreview').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function clearImage() {
  currentImage = null;
  document.getElementById('imagePreview').style.display = 'none';
  document.getElementById('imageInput').value = '';
}

// === VOICE INPUT (Speech-to-Text) ===
function toggleVoiceInput() {
  var btn = document.getElementById('voiceBtn');
  var hint = document.getElementById('voiceHint');
  
  if (isRecording) {
    stopVoiceInput();
    return;
  }
  
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert('Voice input is not supported in your browser. Try Chrome or Edge.');
    return;
  }
  
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.continuous = false;
  
  isRecording = true;
  btn.classList.add('recording');
  hint.classList.add('active');
  hint.textContent = '🎤 Listening... Speak now';
  
  recognition.onresult = function(event) {
    var transcript = '';
    for (var i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    document.getElementById('userInput').value = transcript;
    updateSendBtn();
    if (event.results[0].isFinal) {
      hint.textContent = '✓ Captured! Click send or press Enter';
    }
  };
  
  recognition.onerror = function(event) {
    stopVoiceInput();
    hint.textContent = '❌ Voice error: ' + event.error;
    setTimeout(function() { hint.classList.remove('active'); }, 2000);
  };
  
  recognition.onend = function() {
    stopVoiceInput();
  };
  
  recognition.start();
}

function stopVoiceInput() {
  isRecording = false;
  var btn = document.getElementById('voiceBtn');
  var hint = document.getElementById('voiceHint');
  btn.classList.remove('recording');
  hint.classList.remove('active');
}

// === CAMERA ===
function toggleCamera() {
  var camView = document.getElementById('cameraView');
  var btn = document.getElementById('cameraBtn');
  
  if (cameraStream) {
    closeCamera();
    return;
  }
  
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Camera is not supported in your browser.');
    return;
  }
  
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
    .then(function(stream) {
      cameraStream = stream;
      var video = document.getElementById('camVideo');
      video.srcObject = stream;
      camView.style.display = 'block';
      btn.classList.add('camera-on');
    })
    .catch(function(err) {
      alert('Camera access denied: ' + err.message);
    });
}

function capturePhoto() {
  var video = document.getElementById('camVideo');
  var canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  var ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);
  currentImage = canvas.toDataURL('image/jpeg', 0.9);
  document.getElementById('previewImg').src = currentImage;
  document.getElementById('imagePreview').style.display = 'block';
  closeCamera();
}

function closeCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(function(track) { track.stop(); });
    cameraStream = null;
  }
  document.getElementById('cameraView').style.display = 'none';
  document.getElementById('cameraBtn').classList.remove('camera-on');
}

// === TEXT-TO-SPEECH (Read aloud) ===
function toggleSpeech() {
  var btn = document.getElementById('speakBtn');
  
  if (isSpeaking) {
    speechSynth.cancel();
    isSpeaking = false;
    btn.classList.remove('speaking');
    return;
  }
  
  var chat = state.chats[state.activeChat];
  if (!chat || chat.messages.length === 0) return;
  
  // Read the last AI message
  var lastAIMsg = null;
  for (var i = chat.messages.length - 1; i >= 0; i--) {
    if (chat.messages[i].role === 'ai') {
      lastAIMsg = chat.messages[i];
      break;
    }
  }
  
  if (!lastAIMsg) return;
  
  // Strip markdown for clean speech
  var text = lastAIMsg.content
    .replace(/```[\s\S]*?```/g, '(code block omitted)')
    .replace(/[#*`>~|_\-]/g, ' ')
    .replace(/\n+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (!text) return;
  
  isSpeaking = true;
  btn.classList.add('speaking');
  
  var utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  
  // Try to use a good voice
  var voices = speechSynth.getVoices();
  var preferred = voices.find(function(v) { return v.lang.startsWith('en') && v.name.includes('Google') || v.name.includes('Daniel') || v.name.includes('Samantha'); });
  if (preferred) utterance.voice = preferred;
  
  utterance.onend = function() {
    isSpeaking = false;
    btn.classList.remove('speaking');
  };
  
  utterance.onerror = function() {
    isSpeaking = false;
    btn.classList.remove('speaking');
  };
  
  speechSynth.speak(utterance);
}

// Voice synthesis for any text (used after AI responds)
function speakText(text) {
  if (!text) return;
  var clean = text.replace(/```[\s\S]*?```/g, '(code omitted)').replace(/[#*`>~|_\-]/g, ' ').replace(/\n+/g, '. ').replace(/\s+/g, ' ').trim();
  var u = new SpeechSynthesisUtterance(clean);
  u.rate = 1.0;
  speechSynth.speak(u);
}

// === DRAG & DROP IMAGE ===
document.addEventListener('DOMContentLoaded', function() {
  // Setup drag and drop on the chat area
  var chatArea = document.getElementById('chatArea');
  if (chatArea) {
    chatArea.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.stopPropagation();
    });
    chatArea.addEventListener('drop', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        var reader = new FileReader();
        reader.onload = function(ev) {
          currentImage = ev.target.result;
          document.getElementById('previewImg').src = currentImage;
          document.getElementById('imagePreview').style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });
  }
  
  // Clipboard paste support
  document.addEventListener('paste', function(e) {
    var items = e.clipboardData.items;
    for (var i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        var blob = items[i].getAsFile();
        var reader = new FileReader();
        reader.onload = function(ev) {
          currentImage = ev.target.result;
          document.getElementById('previewImg').src = currentImage;
          document.getElementById('imagePreview').style.display = 'block';
        };
        reader.readAsDataURL(blob);
        break;
      }
    }
  });
});


// ===== INIT =====
window.addEventListener("unhandledrejection", function(e) { console.error("Unhandled rejection:", e.reason); });
document.addEventListener("DOMContentLoaded", function() {
  updateStatusBadge();
  renderAll();
  document.getElementById('userInput').focus();
});
