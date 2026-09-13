const app = document.getElementById("app");
const state = { ws:null, room:null, player:null, youtubeReady:false, provider:null };

function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function wsUrl(){
  const p = location.protocol === "https:" ? "wss:" : "ws:";
  return `${p}//${location.host}`;
}
function connect(){
  if(state.ws && state.ws.readyState<=1) return;
  state.ws = new WebSocket(wsUrl());
  state.ws.onmessage = e => handleWS(JSON.parse(e.data));
  state.ws.onclose = () => setTimeout(connect,1200);
}
function send(x){ if(state.ws?.readyState===1) state.ws.send(JSON.stringify(x)); }

function header(){
  return `<header class="topbar">
    <button class="icon-btn" onclick="goHome()" aria-label="Voltar">✕</button>
    <div class="brand">Namaguederaz</div>
    <button class="icon-btn" onclick="renderSettings()" aria-label="Configurações">⚙</button>
  </header>`;
}

function renderHome(rooms=[]){
  app.innerHTML=`<div class="screen">
    <header class="topbar">
      <button class="icon-btn" onclick="renderSettings()">⚙</button>
      <div class="brand">Namaguederaz</div>
      <button class="icon-btn" onclick="promptJoin()">♟</button>
    </header>
    <input class="search" placeholder="Pesquisar salas" oninput="filterRooms(this.value)">
    <div class="section-title">Público</div>
    <div id="rooms" class="room-list"></div>
    <button class="fab" onclick="renderProviders()">+</button>
  </div>`;
  paintRooms(rooms);
  send({type:"list-public"});
}
let cachedRooms=[];
function paintRooms(rooms){
  cachedRooms=rooms;
  const el=document.getElementById("rooms"); if(!el)return;
  if(!rooms.length){el.innerHTML=`<div class="empty">Nenhuma sala pública ativa no momento.</div>`;return}
  el.innerHTML=rooms.map(r=>`<button class="room-card" onclick="joinRoom('${esc(r.id)}')">
    <div class="room-thumb"></div><div class="room-info">
      <div class="room-title">${esc(r.title)}</div>
      <div class="room-meta">${esc(r.provider)} • ${r.users} pessoa(s)</div>
    </div>
  </button>`).join("");
}
function filterRooms(q){paintRooms(cachedRooms.filter(r=>r.title.toLowerCase().includes(q.toLowerCase())))}

function renderProviders(){
  app.innerHTML=`<div class="screen">${header()}
    <input class="search" placeholder="Pesquisar plataforma">
    <div class="section-title">Assistir com Namaguederaz</div>
    <div class="provider-grid">
      <button class="provider" onclick="renderYoutube()"><strong>YouTube</strong><small>Vídeos com player oficial</small></button>
      <button class="provider" onclick="renderYoutubeLive()"><strong>YouTube Live</strong><small>Transmissões ao vivo</small></button>
      <button class="provider" onclick="renderWeb('Twitch')"><strong>Twitch</strong><small>Web dentro do app</small></button>
      <button class="provider" onclick="renderNetflix()"><strong>Netflix</strong><small>Acesso oficial</small></button>
      <button class="provider" onclick="renderWeb('Web')"><strong>Web</strong><small>Navegador interno</small></button>
    </div>
    <div class="back-note">A reprodução de serviços protegidos usa somente métodos oficiais e compatíveis.</div>
  </div>`;
}
function renderYoutube(){
  app.innerHTML=`<div class="screen">${header()}
    <input id="yturl" class="search" placeholder="Cole a URL do vídeo do YouTube">
    <div class="notice">Cole um link do YouTube. Ao iniciar o vídeo, aparecerá <b>Assistir na sala</b>.</div>
    <button class="provider" style="margin:16px;width:calc(100% - 32px)" onclick="loadYT()">Abrir vídeo</button>
    <div id="ytbox" class="video-wrap hidden"><div id="player"></div><button id="watch" class="watch-btn" onclick="createFromCurrent()">Assistir na sala</button></div>
  </div>`;
}
function extractYT(v){
  try{const u=new URL(v); if(u.hostname.includes("youtu.be")) return u.pathname.slice(1); return u.searchParams.get("v")||""}catch{return ""}
}
function loadYT(){
  const id=extractYT(document.getElementById("yturl").value.trim());
  if(!id){alert("Cole uma URL válida do YouTube.");return}
  document.getElementById("ytbox").classList.remove("hidden");
  if(state.player?.loadVideoById) state.player.loadVideoById(id);
  else window.pendingYT=id;
  if(window.YT?.Player) initYT();
}
function initYT(){
  const id=window.pendingYT; if(!id || !document.getElementById("player"))return;
  window.pendingYT=null;
  state.player=new YT.Player("player",{videoId:id,playerVars:{playsinline:1,rel:0},events:{
    onStateChange:e=>{ if(e.data===1) document.getElementById("watch").style.display="block"; }
  }});
}
window.onYouTubeIframeAPIReady=()=>{state.youtubeReady=true;initYT()};

function createFromCurrent(){
  const id=state.player?.getVideoData?.().video_id;
  if(!id)return;
  createRoom({provider:"YouTube",content:id,title:state.player.getVideoData().title||"Vídeo do YouTube"});
}
function renderYoutubeLive(){renderYoutube()}
function renderNetflix(){
  app.innerHTML=`<div class="screen">${header()}
    <div class="notice"><b>Netflix</b><br><br>O Namaguederaz não burla DRM. O acesso ao conteúdo ocorre pelos meios oficiais da Netflix. Quando a integração oficial permitir, o botão <b>Assistir na sala</b> será usado do mesmo jeito.</div>
    <button class="provider" style="margin:16px;width:calc(100% - 32px)" onclick="renderWeb('Netflix')"><strong>Abrir Netflix</strong><small>Navegação interna quando suportada pelo ambiente</small></button>
  </div>`;
}
function renderWeb(label="Web"){
  app.innerHTML=`<div class="screen">${header()}
    <div class="notice">Navegador interno • proteção contra pop-ups, redirecionamentos indesejados e rastreadores comuns.</div>
    <div style="display:flex;padding:0 16px 12px;gap:8px"><input id="weburl" class="search" style="margin:0" placeholder="https://..."><button class="chip" onclick="openWeb()">Abrir</button></div>
    <div class="video-wrap" style="height:60vh;aspect-ratio:auto"><iframe id="webframe" class="web-frame" sandbox="allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-presentation allow-same-origin allow-scripts" referrerpolicy="no-referrer"></iframe><button id="webwatch" class="watch-btn" onclick="createWebRoom()">Assistir na sala</button></div>
  </div>`;
}
function safeUrl(raw){
  try{const u=new URL(raw); if(!["http:","https:"].includes(u.protocol))return ""; return u.href}catch{return ""}
}
function openWeb(){
  const u=safeUrl(document.getElementById("weburl").value.trim()); if(!u){alert("Digite uma URL http(s) válida.");return}
  const f=document.getElementById("webframe"); f.src=u; f.onload=()=>document.getElementById("webwatch").style.display="block";
}
function createWebRoom(){
  const u=document.getElementById("webframe").src; createRoom({provider:"Web",content:u,title:new URL(u).hostname});
}
function createRoom({provider,content,title}){
  state.pendingRoom={provider,content,title};
  send({type:"create-room",provider,content,title,public:true});
}
function handleWS(msg){
  if(msg.type==="public-rooms"){paintRooms(msg.rooms)}
  if(msg.type==="room-created"||msg.type==="room-joined"){state.room=msg.room; renderRoom()}
  if(msg.type==="room-state" && state.room){state.room=msg.room; updateRoomUsers(msg.users)}
  if(msg.type==="room-event") handleRoomEvent(msg.event);
  if(msg.type==="error") alert(msg.message);
}
function joinRoom(id){send({type:"join-room",roomId:id})}
function promptJoin(){const id=prompt("Código da sala:");if(id)joinRoom(id.trim().toUpperCase())}
function renderRoom(){
  const r=state.room;
  const content=r.provider==="YouTube"
    ? `<div id="roomPlayer" class="video-wrap"><div id="roomYT"></div></div>`
    : `<div class="video-wrap"><iframe class="web-frame" src="${esc(r.content)}" sandbox="allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-presentation allow-same-origin allow-scripts"></iframe></div>`;
  app.innerHTML=`<div class="room">${content}
    <div class="room-head"><div class="room-title-big">${esc(r.title)}</div><div class="room-sub">${esc(r.provider)} • código ${esc(r.id)} • <span id="users">${r.users}</span> pessoa(s)</div>
      <div class="room-tools"><button class="chip" onclick="copyCode('${r.id}')">Copiar código</button><button class="chip" onclick="toggleMic()">🎙 Microfone: desligado</button></div>
    </div>
    <div class="chat"><div class="messages" id="messages"></div></div>
    <div class="chatbar"><input id="chatInput" placeholder="Bate-papo" onkeydown="if(event.key==='Enter')sendChat()"><button class="send" onclick="sendChat()">➤</button></div>
  </div>`;
  if(r.provider==="YouTube") setTimeout(()=>initRoomYT(r.content),50);
}
function initRoomYT(id){
  if(window.YT?.Player){
    state.roomPlayer=new YT.Player("roomYT",{videoId:id,playerVars:{playsinline:1,controls:1},events:{
      onStateChange:e=>{
        if(e.data===1)send({type:"room-event",event:{kind:"play",at:state.roomPlayer.getCurrentTime()}});
        if(e.data===2)send({type:"room-event",event:{kind:"pause",at:state.roomPlayer.getCurrentTime()}});
      }
    }});
  }else setTimeout(()=>initRoomYT(id),500);
}
function handleRoomEvent(ev){
  if(!state.roomPlayer)return;
  if(ev.kind==="play"){state.roomPlayer.seekTo(ev.at,true);state.roomPlayer.playVideo()}
  if(ev.kind==="pause"){state.roomPlayer.seekTo(ev.at,true);state.roomPlayer.pauseVideo()}
  if(ev.kind==="chat"){addMsg("Participante",ev.text)}
}
function updateRoomUsers(n){const e=document.getElementById("users");if(e)e.textContent=n}
function sendChat(){const i=document.getElementById("chatInput"),t=i?.value.trim();if(!t)return;addMsg("Você",t);send({type:"room-event",event:{kind:"chat",text:t}});i.value=""}
function addMsg(who,text){const e=document.getElementById("messages");if(e)e.insertAdjacentHTML("beforeend",`<div class="msg"><b>${esc(who)}</b><span>${esc(text)}</span></div>`)}
function toggleMic(){alert("Microfone começa desligado. A ativação será adicionada quando o sistema de voz for integrado.");}
async function copyCode(c){try{await navigator.clipboard.writeText(c);alert("Código copiado: "+c)}catch{alert("Código da sala: "+c)}}
function renderSettings(){
  app.innerHTML=`<div class="screen">${header()}
    <div class="section-title">Configurações</div>
    <div class="settings-row"><div>Reação rápida<small>Reação ao tocar duas vezes nas mensagens</small></div><div>♡</div></div>
    <div class="settings-row"><div>Restringir convites<small>Permitir somente convites de amigos</small></div><div class="toggle"><i></i></div></div>
    <div class="settings-row"><div>Ocultar conteúdo maduro<small>Não mostrar conteúdo explícito</small></div><div class="toggle on"><i></i></div></div>
    <div class="settings-row"><div>Feedback tátil<small>Vibrar em resposta a toques e ações</small></div><div class="toggle on"><i></i></div></div>
    <div class="settings-row"><div>Leitor de vídeo flutuante<small>Permite vídeos fora do aplicativo quando suportado</small></div><div class="toggle on"><i></i></div></div>
    <div class="settings-row"><div>Proteção anti-anúncios<small>Bloqueia pop-ups, redirecionamentos indesejados e rastreadores comuns no navegador interno.</small></div><div class="toggle on"><i></i></div></div>
  </div>`;
}
function goHome(){if(state.room){send({type:"leave-room"});state.room=null}renderHome([])}
window.addEventListener("popstate",goHome);
connect();
renderHome([]);
