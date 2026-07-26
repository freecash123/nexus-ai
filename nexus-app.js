// ===== NEXUS AI — CORE ENGINE =====
var STATE_KEY = 'nexus_ai_state_v2';
var state = loadState();
var isGenerating = false;
var currentImage = null;
var cameraStream = null;
var synth = window.speechSynthesis;
var isSpeaking = false;
var voiceRecognition = null;

function defaultState() {
  return {
    chats: { 'default': { id:'default', title:'New Chat', messages:[], createdAt:Date.now() } },
    activeChat: 'default',
    settings: { provider:'simulation', apiKey:'' }
  };
}

function loadState() {
  try { var s = localStorage.getItem(STATE_KEY); if (s) { var p = JSON.parse(s); if (p.chats && p.activeChat) return p; } } catch(e) {}
  return defaultState();
}

function saveState() {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch(e) {}
}

// ===== RENDERING =====
function renderAll() {
  renderSidebar();
  renderChat();
  updateSendBtn();
}

function renderSidebar() {
  var list = document.getElementById('chatList');
  if (!list) return;
  list.innerHTML = '';
  Object.values(state.chats).sort(function(a,b) { return b.createdAt - a.createdAt; }).forEach(function(chat) {
    var div = document.createElement('div');
    var isActive = chat.id === state.activeChat;
    div.className = 'chat-item' + (isActive ? ' active' : '');
    div.innerHTML = '<span class="dot"></span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(chat.title) + '</span><span class="delete-chat" title="Delete">\u00d7</span>';
    div.querySelector('.delete-chat').addEventListener('click', function(e) { e.stopPropagation(); deleteChat(chat.id); });
    div.addEventListener('click', function() { switchToChat(chat.id); });
    list.appendChild(div);
  });
}

function renderChat() {
  var container = document.getElementById('messages');
  var welcome = document.getElementById('welcomeScreen');
  var chat = state.chats[state.activeChat];
  
  // ALWAYS begin fresh
  container.innerHTML = '';
  
  if (!chat || chat.messages.length === 0) {
    // Show welcome screen
    if (welcome) {
      welcome.style.display = 'flex';
      container.appendChild(welcome);
    }
  } else {
    // Hide welcome, show messages
    if (welcome) welcome.style.display = 'none';
    chat.messages.forEach(function(msg) {
      container.appendChild(buildMsgEl(msg));
    });
  }
  container.scrollTop = container.scrollHeight;
}

function buildMsgEl(msg) {
  var div = document.createElement('div');
  div.className = 'msg ' + msg.role;
  
  if (msg.role === 'user') {
    var content = msg.content;
    if (msg.image) {
      content = '<img src="' + msg.image + '" class="msg-image" style="max-width:240px;max-height:180px;border-radius:10px;margin-bottom:8px;display:block;cursor:pointer" onclick="window.open(this.src)">\n' + content;
    }
    div.innerHTML = '<div class="msg-avatar">U</div><div class="msg-body"><div class="msg-header">You</div><div class="msg-content">' + fmt(content) + '</div></div>';
  } else {
    var thinkingHtml = '';
    if (msg.thinking && msg.thinking.length > 0) {
      thinkingHtml = '<div class="thinking-block"><div class="thinking-header">Reasoning</div><div class="thinking-steps">' + msg.thinking.map(function(s) { return '<div class="thinking-step done"><span class="step-dot"></span>' + esc(s) + '</div>'; }).join('') + '</div></div>';
    }
    div.innerHTML = '<div class="msg-avatar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.04Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.04Z"/></svg></div><div class="msg-body"><div class="msg-header">Nexus AI</div>' + thinkingHtml + '<div class="msg-content">' + fmt(msg.content) + '</div></div>';
  }
  return div;
}

function esc(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

function fmt(t) {
  if (!t) return '';
  return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/```(\w*)\n([\s\S]*?)```/g,'<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/\n/g,'<br>').replace(/^### (.+)$/gm,'<h4>$1</h4>').replace(/^## (.+)$/gm,'<h3>$1</h3>').replace(/^# (.+)$/gm,'<h2>$1</h2>')
    .replace(/^- (.+)$/gm,'<li>$1</li>').replace(/(<li>.*<\/li>\n?)+/g,'<ul>$&</ul>');
}

// ===== CHAT MANAGEMENT =====
function switchToChat(id) {
  state.activeChat = id;
  saveState();
  renderAll();
  // Close sidebar on mobile
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.add('collapsed');
    document.getElementById('sidebarOverlay').classList.remove('active');
  }
}

function newChat() {
  var id = 'chat_' + Date.now();
  state.chats[id] = { id: id, title: 'New Chat', messages: [], createdAt: Date.now() };
  state.activeChat = id;
  saveState();
  renderAll();
  if (window.innerWidth <= 768) toggleSidebar();
}

function deleteChat(id) {
  if (Object.keys(state.chats).length <= 1) {
    state = defaultState();
    saveState();
    renderAll();
    return;
  }
  delete state.chats[id];
  if (state.activeChat === id) state.activeChat = Object.keys(state.chats)[0];
  saveState();
  renderAll();
}

function toggleSidebar() {
  var s = document.getElementById('sidebar');
  var o = document.getElementById('sidebarOverlay');
  s.classList.toggle('collapsed');
  if (window.innerWidth <= 768) o.classList.toggle('active');
}

function ensureChat() {
  var chat = state.chats[state.activeChat];
  if (!chat) { state.activeChat = 'default'; chat = state.chats['default']; if (!chat) { state = defaultState(); chat = state.chats['default']; } }
  return chat;
}

// ===== SETTINGS =====
function openSettings() {
  document.getElementById('settingsModal').style.display = 'flex';
  document.getElementById('apiProvider').value = state.settings.provider;
  document.getElementById('apiKey').value = state.settings.apiKey || '';
  document.getElementById('geminiSettings').style.display = state.settings.provider === 'gemini' ? 'block' : 'none';
}

function closeSettings() { document.getElementById('settingsModal').style.display = 'none'; }

function saveSettings() {
  state.settings.provider = document.getElementById('apiProvider').value;
  state.settings.apiKey = document.getElementById('apiKey').value.trim();
  saveState();
  closeSettings();
  updateStatus();
}

function clearAllData() {
  if (confirm('Delete all conversations?')) { state = defaultState(); saveState(); renderAll(); closeSettings(); }
}

function updateStatus() {
  var b = document.getElementById('statusBadge');
  b.className = 'status-badge online';
  b.innerHTML = '<span class="status-dot"></span>Active';
}

// ===== INPUT =====
function updateSendBtn() {
  var inp = document.getElementById('userInput');
  var btn = document.getElementById('sendBtn');
  if (inp && inp.value.trim() && !isGenerating) { btn.classList.add('active'); btn.disabled = false; }
  else { btn.disabled = true; btn.classList.remove('active'); }
}

function autoResize(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 150) + 'px'; updateSendBtn(); }

function handleKeyDown(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }

function sendQuick(text) { document.getElementById('userInput').value = text; sendMessage(); }

// ===== MESSAGING =====
function sendMessage() {
  if (isGenerating) return;
  var inp = document.getElementById('userInput');
  var text = inp.value.trim();
  if (!text && !currentImage) return;
  
  var chat = ensureChat();
  
  // Save message with optional image
  var msg = { role: 'user', content: text || '[Image]' };
  if (currentImage) { msg.image = currentImage; }
  chat.messages.push(msg);
  
  if (chat.messages.length === 1) { chat.title = text ? (text.length > 40 ? text.substring(0,40) + '...' : text) : 'Image Chat'; }
  
  inp.value = '';
  inp.style.height = 'auto';
  currentImage = null;
  hideImagePreview();
  
  isGenerating = true;
  updateSendBtn();
  saveState();
  renderAll();

  // Show thinking
  var container = document.getElementById('messages');
  var thinkDiv = document.createElement('div');
  thinkDiv.className = 'msg ai';
  thinkDiv.id = 'thinkingMsg';
  thinkDiv.innerHTML = '<div class="msg-avatar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" stroke-width="2.5"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.04Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.04Z"/></svg></div><div class="msg-body"><div class="msg-header">Nexus AI</div><div class="thinking-block"><div class="thinking-header"><div class="thinking-spinner"></div>Thinking...</div></div></div>';
  container.appendChild(thinkDiv);
  container.scrollTop = container.scrollHeight;

  // Use setTimeout chain for compatibility
  setTimeout(function() {
    try {
      var resp;
      if (state.settings.provider === 'gemini' && state.settings.apiKey) {
        callGeminiAPI(chat.messages, function(r) { finish(r); }, function(e) { fail(e); });
        return;
      } else {
        resp = simulateResponse(text, chat.messages);
      }
      finish(resp);
    } catch(e) { fail(e); }
  }, 600);

  function finish(resp) {
    var el = document.getElementById('thinkingMsg');
    if (el && el.parentNode) el.remove();
    chat.messages.push({ role: 'ai', content: resp.text, thinking: resp.thinking });
    isGenerating = false;
    saveState();
    updateSendBtn();
    renderAll();
    // Auto-speak if enabled
    if (document.getElementById('speakBtn').classList.contains('speaking')) {
      speakText(resp.text);
    }
  }

  function fail(e) {
    console.error(e);
    var el = document.getElementById('thinkingMsg');
    if (el && el.parentNode) el.remove();
    chat.messages.push({ role: 'ai', content: 'Error: ' + (e.message || 'Something went wrong') });
    isGenerating = false;
    saveState();
    updateSendBtn();
    renderAll();
  }
}

// ===== GEMINI API =====
function callGeminiAPI(messages, onOk, onErr) {
  var key = state.settings.apiKey;
  var sysPrompt = "You are Nexus AI, a powerful personal assistant. Be helpful, warm, thorough. Use markdown. You can see and describe images, write code, analyze data, and have natural conversations.";
  
  var history = messages.slice(0,-1).map(function(m) {
    return { role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] };
  });
  var last = messages[messages.length-1];
  var parts = [{ text: last.content }];
  
  // If last user message has an image, include it
  if (last.image && last.image.startsWith('data:image')) {
    var base64 = last.image.split(',')[1];
    var mime = last.image.match(/data:(image\/\w+);/);
    parts.push({ inline_data: { mime_type: mime ? mime[1] : 'image/jpeg', data: base64 } });
  }
  
  var contents = history.length > 0 ? history : [];
  contents.push({ role: 'user', parts: parts });

  fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + key, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: contents,
      systemInstruction: { parts: [{ text: sysPrompt }] },
      generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 4096 }
    })
  }).then(function(r) { if (!r.ok) return r.json().then(function(e) { throw new Error(e.error ? e.error.message : 'API error'); }); return r.json(); })
  .then(function(d) {
    var t = (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts && d.candidates[0].content.parts[0]) ? d.candidates[0].content.parts[0].text : 'No response generated.';
    onOk({ text: t, thinking: ['Gemini 2.0 Flash', 'Analyzed context', 'Generated response'] });
  }).catch(function(e) { onErr(e); });
}

// ===== SIMULATION =====
function simulateResponse(text, messages) {
  var lower = text.toLowerCase();
  
  // Image response
  var lastMsg = messages[messages.length-1];
  if (lastMsg.image) {
    return {
      text: "I can see you've shared an image! \n\nTo analyze images in detail (describe content, read text, identify objects), add a free Gemini API key in Settings (⚙). Get yours free at https://aistudio.google.com/apikey\n\nIn the meantime, I can still chat about anything!",
      thinking: ['Image detected', 'Add Gemini API key for full image analysis', 'Ready for text chat']
    };
  }
  
  // Analysis first (before coding)
  if (/\banalyze\b|\bcompare\b|\bvs\b|\bversus\b|\bpros?\b|\bcons?\b|\breview\b|\bevaluate\b|\bbetter\b|\bdifference\b|\bwhich\b|\bshould I\b/i.test(lower)) {
    return {
      text: "Here's my comparison analysis:\n\n## Comparison\n\n| Factor | Option A | Option B | Notes |\n|--------|----------|----------|-------|\n| Speed | ★★★★★ | ★★★ | A is faster |\n| Cost | ★★ | ★★★★ | B is cheaper |\n| Features | ★★★ | ★★★★★ | B has more |\n| Ease of Use | ★★★★ | ★★★ | A is simpler |\n| Community | ★★★ | ★★★★★ | B is larger |\n\n### Recommendation\n- For quick projects → **Option A**\n- For production → **Option B**\n\nWhat's your specific use case?",
      thinking: ['Comparing options...', 'Evaluating factors...', 'Analysis ready']
    };
  }
  
  // Coding
  if (/\bcode\b|\bfunction\b|python|javascript|\bhtml\b|\bcss\b|react|node|express|\bapi\b|\bsort\b|\bfilter\b|\bmap\b|\balgorithm\b|\bbug\b|\bdebug\b|\bfix\b|\bimplement\b/i.test(lower)) {
    if (/python|django|flask|pandas/i.test(lower)) {
      return { text: "Here's a Python solution:\n\n```python\ndef process_data(items, key='name'):\n    \"\"\"Sort and filter data safely.\"\"\"\n    valid = [d for d in items if d.get(key)]\n    return sorted(valid, key=lambda x: x.get(key, ''))\n\n# Example\ndata = [{'name':'Zara','score':92},{'name':'Alex','score':78}]\nresult = process_data(data, 'score')\nprint(result)\n```\n\n**Key points:**\n- List comprehension for filtering\n- O(n log n) sorting with lambda\n- Safe .get() for missing keys", thinking: ['Python solution', 'Best practices applied', 'Ready'] };
    }
    if (/javascript|react|node|express|jsx/i.test(lower)) {
      return { text: "Here's a JavaScript solution:\n\n```javascript\nconst sortByKey = (arr, key, asc = true) => {\n  return [...arr].sort((a, b) => {\n    const va = a[key] ?? '';\n    const vb = b[key] ?? '';\n    if (va < vb) return asc ? -1 : 1;\n    if (va > vb) return asc ? 1 : -1;\n    return 0;\n  });\n};\n\n// React hook\nfunction useSorted(data, key) {\n  return useMemo(() => sortByKey(data, key), [data, key]);\n}\n```\n\n**Why:**\n- Immutable (spreads, no mutation)\n- Null-safe (?? operator)\n- Memoized in React", thinking: ['JS solution', 'Modern patterns', 'Ready'] };
    }
    return { text: "Here's a clean solution:\n\n```javascript\nfunction solve(input) {\n  if (!input || !Array.isArray(input)) {\n    throw new Error('Expected array');\n  }\n  return input\n    .filter(Boolean)\n    .map(item => ({ ...item, processed: true }))\n    .sort((a, b) => (a.priority || 0) - (b.priority || 0));\n}\n```\n\n**Approach:** Validate → Filter → Transform → Sort\n\nWhat language are you using?", thinking: ['Code solution', 'Clean architecture', 'Ready'] };
  }
  
  // Math/Science
  if (/\bmath\b|\bcalculate\b|\bequation\b|\bformula\b|physics|chemistry|\bscience\b|\bsolve\b|\bcompute\b/i.test(lower)) {
    return { text: "Let me work through this:\n\n## Step-by-Step Solution\n\n**Step 1:** Identify the problem\n**Step 2:** Set up the formula\n**Step 3:** Plug in values\n**Step 4:** Solve\n**Step 5:** Verify\n\n```\nAnswer: [calculated from your input]\n```\n\nShare the specific numbers and I'll compute the exact answer!", thinking: ['Math mode', 'Setting up equations', 'Ready'] };
  }
  
  // Tech/AI
  if (/\bai\b|artificial intelligence|machine learning|deep learning|neural|llm|transformer|chatgpt|gemini|openai|gpt/i.test(lower)) {
    return { text: "## AI Overview (2026)\n\n**Where we are:**\n- AI models can reason, code, create, and hold deep conversations\n- Multimodal AI understands text, images, audio, and video together\n- AI agents autonomously complete complex multi-step tasks\n- Context windows have expanded to millions of tokens\n\n**Key trends:**\n- **AI Agents** — Autonomous task completion\n- **On-Device AI** — Models running locally on phones\n- **Multimodal** — Combined text, vision, and audio\n- **Open Source** — Competing with proprietary systems\n\nWhat area interests you most?", thinking: ['AI knowledge', 'Latest trends', 'Ready'] };
  }
  
  // Planning
  if (/\bplan\b|\bschedule\b|\blaunch\b|\btimeline\b|\bstrategy\b|\bproject\b|\bgoal\b|\bstart\b.*\bproject\b/i.test(lower)) {
    return { text: "## Strategic Plan\n\n### Phase 1: Foundation (Week 1-2)\n- Define clear objectives\n- Research and gather requirements\n- Identify resources needed\n\n### Phase 2: Build (Week 3-6)\n- Create MVP with core features\n- Get feedback from testers\n- Iterate based on real data\n\n### Phase 3: Launch (Week 7-8)\n- Fix issues from feedback\n- Polish and optimize\n- Launch and monitor\n\n**Success tip:** Stay focused on MVP. Ship early!\n\nWhat's your specific project?", thinking: ['Planning mode', 'Structuring timeline', 'Ready'] };
  }
  
  // Explanations
  if (/\bexplain\b|what is|how does|\bwhy\b|tell me about|\bdefine\b|\bmeaning\b|how.*work|\bunderstand\b/i.test(lower)) {
    return { text: "Great question! Let me break this down:\n\n## Understanding It\n\n### 1. The Core Idea\nAt its heart, this is about recognizing patterns and relationships from data — similar to how your brain learns from experience.\n\n### 2. How It Works\n- **Input** → Information is received and processed\n- **Analysis** → Patterns are identified and matched\n- **Output** → A tailored response is generated\n\n### 3. Simple Analogy\nThink of a master chef who's tasted thousands of dishes. When you ask for something \"spicy but sweet,\" they draw on experience — no recipe needed.\n\nWant me to dive deeper into any aspect?", thinking: ['Explanation mode', 'Breaking it down', 'Ready'] };
  }
  
  // Creative
  if (/\bwrite\b|\bstory\b|\bpoem\b|\bsong\b|\bcreative\b|\bimagine\b|\bidea\b|\bfiction\b/i.test(lower)) {
    return { text: "Here's something original:\n\n---\n\n**The Last Signal**\n\nIn 2087, Earth received its final message from deep space:\n\n*\"We found what we were looking for. But we also found what was looking for us.\"*\n\nDr. Marina Chen stared at the transmission for three hours before noticing the pattern hidden in the static — a heartbeat, impossibly slow, riding the carrier wave toward Earth.\n\n47 hours until arrival.\n\n---\n\nWant me to continue, or try a different genre?", thinking: ['Creative mode', 'Crafting story', 'Ready'] };
  }
  
  // Default
  return {
    text: "Hey! I'm Nexus AI — your intelligent assistant.\n\n**I can help with:**\n- 💻 **Coding** — write, debug, explain code\n- 📋 **Planning** — break down projects into steps\n- 🎨 **Creative Work** — stories, ideas, content\n- 📊 **Analysis** — compare options, evaluate\n- 📚 **Learning** — explain concepts clearly\n- 🔬 **Science & Math** — solve problems\n- 🤖 **Tech & AI** — discuss latest technology\n\nWhat would you like to explore?",
    thinking: ['Nexus AI ready', 'Ask me anything!']
  };
}

// ===== MULTIMEDIA =====

// Image Upload
function triggerImageUpload() {
  document.getElementById('imageInput').click();
}

function handleImageUpload(event) {
  var file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }
  var reader = new FileReader();
  reader.onload = function(e) {
    currentImage = e.target.result;
    showImagePreview(currentImage);
  };
  reader.readAsDataURL(file);
}

function showImagePreview(src) {
  var preview = document.getElementById('imagePreview');
  var img = document.getElementById('previewImg');
  img.src = src;
  preview.style.display = 'block';
}

function hideImagePreview() {
  document.getElementById('imagePreview').style.display = 'none';
  document.getElementById('previewImg').src = '';
  document.getElementById('imageInput').value = '';
}

function clearImage() {
  currentImage = null;
  hideImagePreview();
}

// Voice Input (Speech-to-Text)
function toggleVoiceInput() {
  var btn = document.getElementById('voiceBtn');
  var hint = document.getElementById('voiceHint');
  
  if (voiceRecognition) {
    voiceRecognition.stop();
    voiceRecognition = null;
    btn.classList.remove('recording');
    hint.style.display = 'none';
    return;
  }
  
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert('Voice input needs Chrome or Edge browser'); return; }
  
  voiceRecognition = new SR();
  voiceRecognition.lang = 'en-US';
  voiceRecognition.interimResults = true;
  voiceRecognition.continuous = false;
  
  btn.classList.add('recording');
  hint.style.display = 'block';
  hint.textContent = 'Listening... Speak now';
  
  voiceRecognition.onresult = function(e) {
    var t = '';
    for (var i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
    document.getElementById('userInput').value = t;
    updateSendBtn();
    if (e.results[0].isFinal) hint.textContent = 'Captured! Press send';
  };
  
  voiceRecognition.onerror = function(e) {
    btn.classList.remove('recording');
    hint.textContent = 'Error: ' + e.error;
    voiceRecognition = null;
    setTimeout(function() { hint.style.display = 'none'; }, 2000);
  };
  
  voiceRecognition.onend = function() {
    btn.classList.remove('recording');
    hint.style.display = 'none';
    voiceRecognition = null;
  };
  
  voiceRecognition.start();
}

// Camera
function toggleCamera() {
  if (cameraStream) { closeCamera(); return; }
  
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Camera needs a secure connection (HTTPS) and a modern browser');
    return;
  }
  
  var btn = document.getElementById('cameraBtn');
  btn.classList.add('camera-on');
  
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
    .then(function(stream) {
      cameraStream = stream;
      var video = document.getElementById('camVideo');
      video.srcObject = stream;
      document.getElementById('cameraView').style.display = 'block';
    })
    .catch(function(err) {
      btn.classList.remove('camera-on');
      alert('Camera error: ' + err.message);
    });
}

function capturePhoto() {
  var video = document.getElementById('camVideo');
  if (!video.videoWidth) return;
  var canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  currentImage = canvas.toDataURL('image/jpeg', 0.85);
  showImagePreview(currentImage);
  closeCamera();
}

function closeCamera() {
  if (cameraStream) { cameraStream.getTracks().forEach(function(t) { t.stop(); }); cameraStream = null; }
  document.getElementById('cameraView').style.display = 'none';
  document.getElementById('cameraBtn').classList.remove('camera-on');
}

// Text-to-Speech
function toggleSpeech() {
  var btn = document.getElementById('speakBtn');
  
  if (synth.speaking && !synth.paused) {
    synth.cancel();
    btn.classList.remove('speaking');
    return;
  }
  
  var chat = state.chats[state.activeChat];
  if (!chat || chat.messages.length === 0) return;
  
  var lastAI = null;
  for (var i = chat.messages.length - 1; i >= 0; i--) {
    if (chat.messages[i].role === 'ai') { lastAI = chat.messages[i]; break; }
  }
  if (!lastAI) return;
  
  btn.classList.add('speaking');
  speakText(lastAI.content, function() { btn.classList.remove('speaking'); });
}

function speakText(text, onEnd) {
  if (!text || !synth) return;
  var clean = text.replace(/```[\s\S]*?```/g, 'code omitted').replace(/[#*`>~|_\-\\]/g, ' ').replace(/\n+/g, '. ').replace(/\s+/g, ' ').trim();
  if (!clean) return;
  var u = new SpeechSynthesisUtterance(clean);
  u.rate = 1.0;
  u.pitch = 1.0;
  u.volume = 1.0;
  var voices = synth.getVoices();
  var pref = voices.find(function(v) { return v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')); });
  if (pref) u.voice = pref;
  if (onEnd) { u.onend = onEnd; u.onerror = onEnd; }
  synth.speak(u);
}

// ===== DRAG & DROP + PASTE =====
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    var chatArea = document.getElementById('chatArea');
    if (chatArea) {
      chatArea.addEventListener('dragover', function(e) { e.preventDefault(); e.stopPropagation(); });
      chatArea.addEventListener('drop', function(e) {
        e.preventDefault(); e.stopPropagation();
        var file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
          var reader = new FileReader();
          reader.onload = function(ev) { currentImage = ev.target.result; showImagePreview(currentImage); };
          reader.readAsDataURL(file);
        }
      });
    }
    document.addEventListener('paste', function(e) {
      var items = e.clipboardData.items;
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          var blob = items[i].getAsFile();
          var reader = new FileReader();
          reader.onload = function(ev) { currentImage = ev.target.result; showImagePreview(currentImage); };
          reader.readAsDataURL(blob);
          break;
        }
      }
    });
  });
})();


// ===== LIVE CAMERA MODE =====
var liveCamActive = false;
var liveCamInterval = null;
var liveSnapshots = [];

function toggleLiveCamera() {
  var btn = document.getElementById('cameraBtn');
  if (liveCamActive) { stopLiveCamera(); return; }
  
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Camera needs HTTPS and a modern browser');
    return;
  }
  
  btn.classList.add('camera-on');
  btn.textContent = '🔴';
  
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
    .then(function(stream) {
      cameraStream = stream;
      var video = document.getElementById('camVideo');
      video.srcObject = stream;
      document.getElementById('cameraView').style.display = 'block';
      liveCamActive = true;
      
      // Auto-capture frames and send for analysis
      document.getElementById('userInput').value = 'What do you see in this image? Describe it.';
      document.getElementById('userInput').placeholder = 'Live camera active — type to ask about what I see...';
      
      // Capture first frame after 1 second
      setTimeout(function() {
        if (liveCamActive) captureLiveFrame();
      }, 1000);
    })
    .catch(function(err) {
      btn.classList.remove('camera-on');
      btn.textContent = '📷';
      alert('Camera error: ' + err.message);
    });
}

function captureLiveFrame() {
  if (!liveCamActive) return;
  capturePhotoToImage();
  if (currentImage && currentImage.startsWith('data:image')) {
    // Auto-send if there's a prompt in the input
    var inp = document.getElementById('userInput');
    if (inp.value.trim()) {
      sendMessage();
    }
  }
}

function capturePhotoToImage() {
  var video = document.getElementById('camVideo');
  if (!video.videoWidth) return;
  var canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  currentImage = canvas.toDataURL('image/jpeg', 0.8);
}

function stopLiveCamera() {
  liveCamActive = false;
  if (cameraStream) { cameraStream.getTracks().forEach(function(t) { t.stop(); }); cameraStream = null; }
  document.getElementById('cameraView').style.display = 'none';
  var btn = document.getElementById('cameraBtn');
  btn.classList.remove('camera-on');
  btn.textContent = '📷';
  document.getElementById('userInput').placeholder = 'Message Nexus AI...';
  hideImagePreview();
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', function() {
  updateStatus();
  renderAll();
  var inp = document.getElementById('userInput');
  if (inp) inp.focus();
});
