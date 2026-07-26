// ==================== NEXUS AI ENGINE ====================
var STATE_KEY = 'nexus_ai_v3';
var state = loadState();
var isGenerating = false;
var currentImage = null;
var cameraStream = null;
var synth = window.speechSynthesis;
var voiceRec = null;
var voiceConvActive = false;
var liveCamActive = false;
var liveCamTimer = null;

function defaultState() {
  return {
    chats: { 'default': { id:'default', title:'New Chat', messages:[], createdAt:Date.now() } },
    activeChat: 'default',
    settings: { provider:'simulation', apiKey:'' }
  };
}
function loadState() {
  try { var s=localStorage.getItem(STATE_KEY); if(s){var p=JSON.parse(s);if(p.chats&&p.activeChat)return p;} }catch(e){}
  return defaultState();
}
function saveState() { try { localStorage.setItem(STATE_KEY,JSON.stringify(state)); } catch(e) {} }

// ==================== RENDER ====================
function renderAll() { renderSidebar(); renderChat(); updateSendBtn(); }

function renderSidebar() {
  var list = document.getElementById('chatList');
  if (!list) return;
  list.innerHTML = '';
  Object.values(state.chats).sort(function(a,b){return b.createdAt-a.createdAt}).forEach(function(c){
    var d = document.createElement('div');
    d.className = 'chat-item'+(c.id===state.activeChat?' active':'');
    d.innerHTML = '<span class="dot"></span><span class="title">'+esc(c.title)+'</span><span class="del">×</span>';
    d.querySelector('.del').addEventListener('click',function(e){e.stopPropagation();deleteChat(c.id);});
    d.addEventListener('click',function(){switchChat(c.id);});
    list.appendChild(d);
  });
}

function renderChat() {
  var mc = document.getElementById('messages');
  var w = document.getElementById('welcomeScreen');
  var chat = state.chats[state.activeChat];
  
  if (!chat || chat.messages.length === 0) {
    mc.innerHTML = '';
    if (w) { w.style.display = 'flex'; mc.appendChild(w); }
  } else {
    if (w) w.style.display = 'none';
    // Rebuild all messages
    mc.innerHTML = '';
    chat.messages.forEach(function(msg){ mc.appendChild(buildMsg(msg)); });
  }
  mc.parentElement.scrollTop = mc.parentElement.scrollHeight;
}

function buildMsg(msg) {
  var d = document.createElement('div');
  d.className = 'msg ' + msg.role;
  if (msg.role === 'user') {
    var c = msg.content || '';
    if (msg.image) c = '<img src="'+msg.image+'" class="msg-img" onclick="window.open(this.src)">\n' + c;
    d.innerHTML = '<div class="avatar">U</div><div class="msg-body"><div class="label">You</div><div class="content">'+fmt(c)+'</div></div>';
  } else {
    var th = '';
    if (msg.thinking && msg.thinking.length) {
      th = '<div class="think"><div class="think-head">Reasoning</div>'+msg.thinking.map(function(s){return '<div style="opacity:0.6;margin:2px 0;font-size:10px">✓ '+esc(s)+'</div>';}).join('')+'</div>';
    }
    d.innerHTML = '<div class="avatar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/></svg></div><div class="msg-body"><div class="label">Nexus AI</div>'+th+'<div class="content">'+fmt(msg.content)+'</div></div>';
  }
  return d;
}

function esc(t) { var d=document.createElement('div'); d.textContent=t||''; return d.innerHTML; }
function fmt(t) {
  if (!t) return '';
  return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/```(\w*)\n([\s\S]*?)```/g,'<pre><code>$2</code></pre>').replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/\n/g,'<br>').replace(/^### (.+)$/gm,'<h4>$1</h4>').replace(/^## (.+)$/gm,'<h3>$1</h3>').replace(/^# (.+)$/gm,'<h2>$1</h2>')
    .replace(/^- (.+)$/gm,'<li>$1</li>').replace(/(<li>.*<\/li>\n?)+/g,'<ul>$&</ul>');
}

// ==================== CHAT ====================
function switchChat(id) {
  state.activeChat = id; saveState(); renderAll();
  if (window.innerWidth <= 768) closeSidebarMobile();
}
function newChat() {
  var id='chat_'+Date.now();
  state.chats[id]={id:id,title:'New Chat',messages:[],createdAt:Date.now()};
  state.activeChat=id; saveState(); renderAll();
  if (window.innerWidth <= 768) closeSidebarMobile();
}
function deleteChat(id) {
  if (Object.keys(state.chats).length<=1) { state=defaultState(); saveState(); renderAll(); return; }
  delete state.chats[id];
  if (state.activeChat===id) state.activeChat=Object.keys(state.chats)[0];
  saveState(); renderAll();
}
function toggleSidebar() {
  var s=document.getElementById('sidebar');
  var o=document.getElementById('sbOverlay');
  if (window.innerWidth<=768) {
    s.classList.toggle('collapsed');
    o.classList.toggle('active');
  } else {
    s.classList.toggle('collapsed');
  }
}
function closeSidebarMobile() {
  document.getElementById('sidebar').classList.add('collapsed');
  document.getElementById('sbOverlay').classList.remove('active');
}
function ensureChat() {
  var c=state.chats[state.activeChat];
  if(!c){state.activeChat='default';c=state.chats['default'];if(!c){state=defaultState();c=state.chats['default'];}}
  return c;
}

// ==================== SETTINGS ====================
function openSettings() {
  document.getElementById('settingsModal').style.display='flex';
  document.getElementById('apiProvider').value=state.settings.provider;
  document.getElementById('apiKey').value=state.settings.apiKey||'';
  document.getElementById('gemSet').style.display=state.settings.provider==='gemini'?'block':'none';
}
function closeSettings() { document.getElementById('settingsModal').style.display='none'; }
function saveSettings() {
  state.settings.provider=document.getElementById('apiProvider').value;
  state.settings.apiKey=document.getElementById('apiKey').value.trim();
  saveState(); closeSettings(); updateStatus();
}
function clearAllData() {
  if(confirm('Delete ALL conversations?')){state=defaultState();saveState();renderAll();closeSettings();}
}
function updateStatus() {
  var b=document.getElementById('statusBadge');
  b.className='badge';b.innerHTML='<span class="dot2"></span>Active';
}

// ==================== INPUT ====================
function updateSendBtn() {
  var inp=document.getElementById('userInput');
  var btn=document.getElementById('sendBtn');
  if(inp&&inp.value.trim()&&!isGenerating){btn.classList.add('active');btn.disabled=false;}
  else{btn.disabled=true;btn.classList.remove('active');}
}
function autoResize(e){e.style.height='auto';e.style.height=Math.min(e.scrollHeight,150)+'px';updateSendBtn();}
function handleKeyDown(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}}
function sendQuick(t){document.getElementById('userInput').value=t;sendMessage();}

// ==================== SEND MESSAGE ====================
function sendMessage() {
  if (isGenerating) return;
  var inp = document.getElementById('userInput');
  var text = inp.value.trim();
  if (!text && !currentImage) return;
  
  var chat = ensureChat();
  var msg = { role:'user', content: text || '[Image]' };
  if (currentImage) { msg.image = currentImage; }
  chat.messages.push(msg);
  if (chat.messages.length === 1) chat.title = text ? (text.length>30?text.substring(0,30)+'...':text) : 'Image Chat';
  
  inp.value = ''; inp.style.height = 'auto';
  currentImage = null; hideImagePreview();
  isGenerating = true; updateSendBtn(); saveState(); renderAll();

  // Thinking indicator
  var mc = document.getElementById('messages');
  var td = document.createElement('div');
  td.className = 'msg ai'; td.id = 'thinkingMsg';
  td.innerHTML = '<div class="avatar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/></svg></div><div class="msg-body"><div class="label">Nexus AI · thinking</div><div class="think"><div class="think-head"><div class="spinner"></div>Thinking...</div></div></div>';
  mc.appendChild(td);
  mc.parentElement.scrollTop = mc.parentElement.scrollHeight;

  setTimeout(function() {
    try {
      var resp;
      if (state.settings.provider==='gemini'&&state.settings.apiKey) {
        callGemini(chat.messages, function(r){done(r);}, function(e){fail(e);});
        return;
      }
      resp = simulate(text, chat.messages);
      done(resp);
    } catch(e) { fail(e); }
  }, 400);

  function done(r) {
    var el = document.getElementById('thinkingMsg');
    if (el && el.parentNode) el.remove();
    chat.messages.push({ role:'ai', content:r.text, thinking:r.thinking });
    isGenerating = false; saveState(); updateSendBtn(); renderAll();
    // Auto-speak in voice conv mode
    if (voiceConvActive) speakResponse(r.text);
  }
  function fail(e) {
    console.error(e);
    var el = document.getElementById('thinkingMsg');
    if (el&&el.parentNode) el.remove();
    chat.messages.push({ role:'ai', content:'Error: '+(e.message||'Something went wrong') });
    isGenerating=false; saveState(); updateSendBtn(); renderAll();
  }
}

// ==================== GEMINI API ====================
function callGemini(messages, ok, err) {
  var key = state.settings.apiKey;
  var sp = "You are Nexus AI, a powerful helpful assistant. Be warm, thorough, concise. Use markdown. You can see and describe images.";
  var hist = messages.slice(0,-1).map(function(m){return{role:m.role==='user'?'user':'model',parts:[{text:m.content}]};});
  var last = messages[messages.length-1];
  var parts = [{text:last.content||'What do you see in this image?'}];
  if (last.image && last.image.startsWith('data:image')) {
    var b64 = last.image.split(',')[1];
    var mt = (last.image.match(/data:(image\/\w+);/)||['','image/jpeg'])[1];
    parts.push({inline_data:{mime_type:mt,data:b64}});
  }
  var contents = hist.length>0?hist:[];
  contents.push({role:'user',parts:parts});
  fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key='+key,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({contents:contents,systemInstruction:{parts:[{text:sp}]},generationConfig:{temperature:0.7,topK:40,topP:0.95,maxOutputTokens:4096}})
  }).then(function(r){if(!r.ok)return r.json().then(function(e){throw new Error(e.error?e.error.message:'API error '+r.status)});return r.json();})
  .then(function(d){
    var t=(d.candidates&&d.candidates[0]&&d.candidates[0].content&&d.candidates[0].content.parts&&d.candidates[0].content.parts[0])?d.candidates[0].content.parts[0].text:'No response';
    ok({text:t,thinking:['Gemini 2.0 Flash','Analyzed context','Generated']});
  }).catch(function(e){err(e);});
}

// ==================== SIMULATION ====================
function simulate(text, messages) {
  var lower = (text||'').toLowerCase();
  var last = messages[messages.length-1];
  if (last.image) return {text:"I can see you've shared an image! To analyze it in detail, add a free Gemini key in Settings ⚙ (https://aistudio.google.com/apikey). I can still chat about anything!",thinking:['Image detected','Add API key for vision']};
  
  if (/\bcompare\b|\bvs\b|\bversus\b|\banalyze\b|\bpros?\b|\bcons?\b|\breview\b|\bevaluate\b/i.test(lower)) {
    return {text:"## Comparison\n\n| Factor | A | B | Notes |\n|--------|---|---|-------|\n| Speed | ★★★★★ | ★★★ | Faster |\n| Cost | ★★ | ★★★★ | Cheaper |\n| Features | ★★★ | ★★★★★ | Richer |\n| Ease | ★★★★ | ★★★ | Simpler |\n\n**Recommendation:** Depends on your needs. Quick projects → A. Production → B.",thinking:['Comparing options','Evaluating factors','Done']};
  }
  if (/\bcode\b|\bfunction\b|python|javascript|html|css|react|node|\bapi\b|\bsort\b|\balgorithm\b|\bbug\b/i.test(lower)) {
    var l = lower;
    if (/python|django|flask/i.test(l)) return {text:"```python\ndef process(data, key='name'):\n    return sorted([d for d in data if d.get(key)],key=lambda x:x.get(key,''))\n# Example\ndata=[{'n':'Zara','s':92},{'n':'Alex','s':78}]\nprint(process(data,'s'))\n```\nUses `sorted()` with lambda O(n log n). Safe `.get()` for missing keys.",thinking:['Python solution','Best practices','Done']};
    if (/javascript|react|node/i.test(l)) return {text:"```javascript\nconst sortBy=(arr,key,asc=true)=>[...arr].sort((a,b)=>{(a[key]??'')<(b[key]??'')?asc?-1:1:asc?1:-1;return 0});\n// React: useMemo(()=>sortBy(data,key),[data,key])\n```\nImmutable. Null-safe. Memoized.",thinking:['JS solution','Modern patterns','Done']};
    return {text:"```javascript\nfunction solve(input){return input.filter(Boolean).map(i=>({...i,done:true})).sort((a,b)=>(a.p||0)-(b.p||0));}\n```\nValidate → Filter → Transform → Sort. What language?",thinking:['Coding','Clean approach','Done']};
  }
  if (/\bmath\b|\bcalculate\b|\bequation\b|\bformula\b|physics|chemistry|\bsolve\b/i.test(lower)) return {text:"## Step-by-Step\n\n1. Identify problem\n2. Set up formula\n3. Plug values\n4. Solve\n5. Verify\n\nShare numbers for exact answer!",thinking:['Math mode','Setting up','Ready']};
  if (/\bai\b|artificial intelligence|machine learning|chatgpt|gemini|openai|llm/i.test(lower)) return {text:"## AI in 2026\n- Models reason, code, create, converse\n- Multimodal: text, images, audio, video\n- AI agents complete complex tasks\n- On-device models run locally\n- Open source competes with proprietary\n\nWhat interests you?",thinking:['AI knowledge','Latest trends','Done']};
  if (/\bplan\b|\bschedule\b|\blaunch\b|\bstrategy\b|\bproject\b/i.test(lower)) return {text:"## Plan\n\n### Phase 1 (Wk 1-2): Foundation\nDefine goals, research, gather resources\n### Phase 2 (Wk 3-6): Build\nMVP, test, iterate\n### Phase 3 (Wk 7-8): Launch\nPolish, fix, ship\n\n**Tip:** Stay focused on MVP!",thinking:['Planning','Structuring','Done']};
  if (/\bexplain\b|what is|how does|\bwhy\b|\bdefine\b/i.test(lower)) return {text:"## Breaking It Down\n\n**Core idea:** Pattern recognition from data — like your brain learning from experience.\n\n**How:** Input → Analysis → Output. Think of a chef who's tasted thousands of dishes creating something new from experience.\n\nWant more detail?",thinking:['Explaining','Simplifying','Done']};
  if (/\bwrite\b|\bstory\b|\bpoem\b|\bcreative\b|\bimagine\b/i.test(lower)) return {text:"## The Last Signal\n\nIn 2087, Earth received a final message: *\"We found what we were looking for. But we also found what was looking for us.\"*\n\nDr. Chen noticed a heartbeat hidden in the static — something riding the signal toward Earth. 47 hours to arrival.\n\n---\nContinue? Or different genre?",thinking:['Creative mode','Writing','Done']};
  return {text:"Hey! I'm Nexus AI — your assistant.\n\n**I can help with:**\n💻 Coding · 📋 Planning · 🎨 Creative · 📊 Analysis · 📚 Learning · 🔬 Science · 🤖 AI/Tech\n\nWhat can I help you with?",thinking:['Ready','Ask me anything']};
}

// ==================== IMAGE UPLOAD ====================
function triggerImageUpload() { document.getElementById('imageInput').click(); }
function handleImageUpload(e) {
  var f = e.target.files[0];
  if (!f) return;
  if (!f.type.startsWith('image/')) { alert('Please select an image'); return; }
  var r = new FileReader();
  r.onload = function(ev) { currentImage = ev.target.result; showImgPreview(currentImage); };
  r.readAsDataURL(f);
}
function showImgPreview(src) {
  document.getElementById('previewImg').src = src;
  document.getElementById('imagePreview').style.display = 'block';
}
function hideImagePreview() {
  document.getElementById('imagePreview').style.display = 'none';
  document.getElementById('imageInput').value = '';
}
function clearImage() { currentImage = null; hideImagePreview(); }

// ==================== VOICE CONVERSATION (REAL-TIME) ====================
function toggleVoiceConversation() {
  var btn = document.getElementById('voiceBtn');
  var hint = document.getElementById('voiceHint');
  
  if (voiceConvActive) {
    stopVoiceConversation();
    return;
  }
  
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert('Voice needs Chrome or Edge. Try on mobile Chrome!'); return; }
  
  voiceConvActive = true;
  btn.classList.add('recording');
  hint.style.display = 'block';
  hint.textContent = '🎤 Listening... Speak to me!';
  hint.style.color = 'var(--red)';
  
  startListening();
}

function startListening() {
  if (!voiceConvActive) return;
  
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  voiceRec = new SR();
  voiceRec.lang = 'en-US';
  voiceRec.interimResults = false;
  voiceRec.continuous = false;
  
  voiceRec.onresult = function(e) {
    var text = e.results[0][0].transcript.trim();
    if (!text) { restartListen(); return; }
    
    var hint = document.getElementById('voiceHint');
    hint.textContent = '🗣 Heard: "' + text + '" — thinking...';
    hint.style.color = 'var(--accent)';
    
    // Set text and send
    document.getElementById('userInput').value = text;
    
    // We need to manually trigger send since this is voice mode
    var inp = document.getElementById('userInput');
    var chat = ensureChat();
    chat.messages.push({ role:'user', content: text });
    if (chat.messages.length === 1) chat.title = text.length > 30 ? text.substring(0,30)+'...' : text;
    inp.value = ''; inp.style.height = 'auto';
    isGenerating = true;
    updateSendBtn();
    saveState();
    renderAll();
    
    // Thinking
    var mc = document.getElementById('messages');
    var td = document.createElement('div');
    td.className = 'msg ai'; td.id = 'thinkingMsgV';
    td.innerHTML = '<div class="avatar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/></svg></div><div class="msg-body"><div class="label">Nexus AI · listening</div><div class="think"><div class="think-head"><div class="spinner"></div>Processing your voice...</div></div></div>';
    mc.appendChild(td);
    mc.parentElement.scrollTop = mc.parentElement.scrollHeight;
    
    // Get response
    setTimeout(function() {
      var resp;
      try {
        if (state.settings.provider === 'gemini' && state.settings.apiKey) {
          callGemini(chat.messages, function(r) { voiceDone(r, chat); }, function(e) { voiceFail(e, chat); });
          return;
        }
        resp = simulate(text, chat.messages);
        voiceDone(resp, chat);
      } catch(e) { voiceFail(e, chat); }
    }, 300);
  };
  
  voiceRec.onerror = function(e) {
    var hint = document.getElementById('voiceHint');
    if (e.error === 'no-speech' || e.error === 'aborted') {
      // Just restart listening
      restartListen();
      return;
    }
    hint.textContent = 'Voice error: ' + e.error;
    hint.style.color = 'var(--text3)';
    setTimeout(function() {
      if (voiceConvActive) restartListen();
    }, 1500);
  };
  
  voiceRec.onend = function() {
    // Auto-restart if in voice conv mode
    if (voiceConvActive) {
      restartListen();
    }
  };
  
  voiceRec.start();
}

function restartListen() {
  if (!voiceConvActive) return;
  var hint = document.getElementById('voiceHint');
  hint.textContent = '🎤 Listening...';
  hint.style.color = 'var(--red)';
  setTimeout(function() { startListening(); }, 300);
}

function voiceDone(resp, chat) {
  var el = document.getElementById('thinkingMsgV');
  if (el && el.parentNode) el.remove();
  chat.messages.push({ role:'ai', content:resp.text, thinking:resp.thinking });
  isGenerating = false;
  saveState();
  updateSendBtn();
  renderAll();
  
  // Speak the response aloud!
  speakResponse(resp.text);
  
  // Continue listening
  if (voiceConvActive) {
    var hint = document.getElementById('voiceHint');
    hint.textContent = '🎤 Listening... (I replied — your turn!)';
    hint.style.color = 'var(--red)';
    setTimeout(function() { restartListen(); }, 1500);
  }
}

function voiceFail(e, chat) {
  var el = document.getElementById('thinkingMsgV');
  if (el && el.parentNode) el.remove();
  chat.messages.push({ role:'ai', content:'Sorry, I had trouble: '+(e.message||'error') });
  isGenerating = false;
  saveState();
  updateSendBtn();
  renderAll();
  if (voiceConvActive) restartListen();
}

function stopVoiceConversation() {
  voiceConvActive = false;
  if (voiceRec) { try { voiceRec.stop(); } catch(e) {} voiceRec = null; }
  var btn = document.getElementById('voiceBtn');
  var hint = document.getElementById('voiceHint');
  btn.classList.remove('recording');
  hint.style.display = 'none';
  if (synth) synth.cancel();
}

// Text-to-speech response
function speakResponse(text) {
  if (!synth || !text) return;
  var clean = text.replace(/```[\s\S]*?```/g,'code omitted').replace(/[#*`>~|_\-\\]/g,' ').replace(/\n+/g,'. ').replace(/\s+/g,' ').trim();
  if (!clean) return;
  var u = new SpeechSynthesisUtterance(clean);
  u.rate = 1.05;
  u.pitch = 1.0;
  u.volume = 1.0;
  var voices = synth.getVoices();
  var pref = voices.find(function(v){return v.lang.startsWith('en')&&(v.name.includes('Google')||v.name.includes('Samantha')||v.name.includes('Daniel')||v.name.includes('Karen'));});
  if (pref) u.voice = pref;
  synth.speak(u);
}

// ==================== CAMERA & LIVE ====================
function toggleCamera() {
  if (cameraStream) { closeCamera(); return; }
  if (!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){alert('Camera needs HTTPS');return;}
  var btn = document.getElementById('cameraBtn');
  btn.classList.add('camera-on');
  navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false})
    .then(function(s){cameraStream=s;document.getElementById('camVideo').srcObject=s;document.getElementById('cameraView').style.display='block';})
    .catch(function(e){btn.classList.remove('camera-on');alert('Camera: '+e.message);});
}
function capturePhoto() {
  var v=document.getElementById('camVideo');if(!v.videoWidth)return;
  var c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;
  c.getContext('2d').drawImage(v,0,0);currentImage=c.toDataURL('image/jpeg',0.85);
  showImgPreview(currentImage);closeCamera();
}
function closeCamera() {
  if(cameraStream){cameraStream.getTracks().forEach(function(t){t.stop();});cameraStream=null;}
  stopLiveCamera();
  document.getElementById('cameraView').style.display='none';
  document.getElementById('cameraBtn').classList.remove('camera-on');
}
function captureLiveSend() {
  capturePhotoToCurrent();
  if (currentImage && currentImage.startsWith('data:image')) {
    document.getElementById('userInput').value = 'What do you see? Describe this.';
    sendMessage();
  }
}
function capturePhotoToCurrent() {
  var v=document.getElementById('camVideo');if(!v.videoWidth)return;
  var c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;
  c.getContext('2d').drawImage(v,0,0);currentImage=c.toDataURL('image/jpeg',0.8);
}

// LIVE CAMERA
function toggleLiveCamera() {
  var liveBtn = document.getElementById('liveBtn');
  var capBtn = document.getElementById('liveCapBtn');
  var camBtn = document.getElementById('cameraBtn');
  var camView = document.getElementById('cameraView');
  
  if (liveCamActive) {
    stopLiveCamera();
    liveBtn.classList.remove('live-active');
    capBtn.style.display = 'none';
    return;
  }
  
  if (!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){alert('Camera needs HTTPS');return;}
  
  liveBtn.classList.add('live-active');
  navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false})
    .then(function(s){
      cameraStream = s;
      document.getElementById('camVideo').srcObject = s;
      camView.style.display = 'block';
      camBtn.classList.add('camera-on');
      capBtn.style.display = 'inline-block';
      liveCamActive = true;
      document.getElementById('userInput').placeholder = 'Live camera active — ask me what I see!';
    })
    .catch(function(e){
      liveBtn.classList.remove('live-active');
      alert('Camera: '+e.message);
    });
}

function stopLiveCamera() {
  liveCamActive = false;
  if (liveCamTimer) { clearInterval(liveCamTimer); liveCamTimer = null; }
  if (cameraStream) { cameraStream.getTracks().forEach(function(t){t.stop();}); cameraStream = null; }
  document.getElementById('cameraView').style.display = 'none';
  document.getElementById('cameraBtn').classList.remove('camera-on');
  document.getElementById('liveBtn').classList.remove('live-active');
  document.getElementById('liveCapBtn').style.display = 'none';
  document.getElementById('userInput').placeholder = 'Message Nexus AI...';
}

// ==================== SPEECH (READ ALOUD) ====================
function toggleSpeech() {
  var btn = document.getElementById('speakBtn');
  if (synth.speaking && !synth.paused) { synth.cancel(); btn.classList.remove('speaking'); return; }
  var chat = state.chats[state.activeChat];
  if (!chat||chat.messages.length===0) return;
  var last=null;
  for(var i=chat.messages.length-1;i>=0;i--){if(chat.messages[i].role==='ai'){last=chat.messages[i];break;}}
  if(!last)return;
  btn.classList.add('speaking');
  var clean = last.content.replace(/```[\s\S]*?```/g,'code omitted').replace(/[#*`>~|_\-\\]/g,' ').replace(/\n+/g,'. ').replace(/\s+/g,' ').trim();
  var u = new SpeechSynthesisUtterance(clean);
  u.rate=1.0;
  u.onend=function(){btn.classList.remove('speaking');};
  u.onerror=function(){btn.classList.remove('speaking');};
  synth.speak(u);
}

// ==================== DRAG/DROP/PASTE ====================
(function(){
  document.addEventListener('DOMContentLoaded',function(){
    var ca=document.getElementById('chatArea');
    if(ca){
      ca.addEventListener('dragover',function(e){e.preventDefault();});
      ca.addEventListener('drop',function(e){e.preventDefault();
        var f=e.dataTransfer.files[0];
        if(f&&f.type.startsWith('image/')){
          var r=new FileReader();
          r.onload=function(ev){currentImage=ev.target.result;showImgPreview(currentImage);};
          r.readAsDataURL(f);
        }
      });
    }
    document.addEventListener('paste',function(e){
      var items=e.clipboardData.items;
      for(var i=0;i<items.length;i++){
        if(items[i].type.startsWith('image/')){
          var b=items[i].getAsFile();
          var r=new FileReader();
          r.onload=function(ev){currentImage=ev.target.result;showImgPreview(currentImage);};
          r.readAsDataURL(b);
          break;
        }
      }
    });
    // Load voices
    if(synth) synth.getVoices();
  });
})();

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded',function(){
  updateStatus();
  renderAll();
  document.getElementById('userInput').focus();
});
