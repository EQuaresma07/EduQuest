// ===== SISTEMA GLOBAL DE NOTIFICAÇÕES =====
// Importar em qualquer página que precise escutar notificações ao vivo

import { db, collection, query, where, onSnapshot, doc, getDoc, updateDoc, getDocs } from './firebase.js';

let unsubAmigos   = null;
let unsubBatalha  = null;

export function iniciarNotificacoes(auth, user, onAuthStateChanged) {
  onAuthStateChanged(auth, (u) => {
    if (!u) { pararNotificacoes(); return; }
    escutarSolicitacoesAmizade(u.uid);
    escutarDesafioBatalha(u.uid);
  });
}

// ===== NOTIFICAÇÃO: SOLICITAÇÃO DE AMIZADE =====
function escutarSolicitacoesAmizade(uid) {
  if (unsubAmigos) unsubAmigos();
  unsubAmigos = onSnapshot(collection(db, 'alunos', uid, 'amigos'), (snap) => {
    let pendentes = 0;
    snap.forEach(d => {
      const data = d.data();
      if (data.status === 'pendente' && data.solicitanteUid !== uid) pendentes++;
    });
    if (pendentes > 0) {
      mostrarToast(
        '👥 Solicitação de amizade',
        `Você tem ${pendentes} solicitação(ões) pendente(s)!`,
        'info',
        () => location.href = 'amigos.html'
      );
    }
  });
}

// ===== NOTIFICAÇÃO: DESAFIO DE BATALHA =====
function escutarDesafioBatalha(uid) {
  if (unsubBatalha) unsubBatalha();

  // Escuta batalhas onde este jogador foi desafiado e ainda estão aguardando
  unsubBatalha = onSnapshot(
    query(collection(db,'batalhas'), where('desafiadoUid','==',uid), where('status','==','aguardando')),
    async (snap) => {
      if (snap.empty) return;
      const batalha = snap.docs[0].data();
      const batalhaId = snap.docs[0].id;

      // Evita notificar mais de uma vez a mesma batalha
      const jaNotificou = sessionStorage.getItem('notif_batalha_' + batalhaId);
      if (jaNotificou) return;
      sessionStorage.setItem('notif_batalha_' + batalhaId, '1');

      // Verifica se já expirou
      if (batalha.expiraEm && new Date() > new Date(batalha.expiraEm)) return;

      // Busca nome do anfitrião
      const anfSnap = await getDoc(doc(db,'alunos',batalha.anfitriaoUid));
      const anfNome = anfSnap.exists() ? anfSnap.data().apelido : batalha.anfitriaoApelido || 'Alguém';

      mostrarAlertaBatalha(anfNome, batalhaId, batalha);
    }
  );
}

// ===== TOAST (solicitação de amizade) =====
function mostrarToast(titulo, mensagem, tipo, onClick) {
  // Evita duplicata
  if (document.getElementById('cognix-toast')) return;

  const toast = document.createElement('div');
  toast.id = 'cognix-toast';
  toast.innerHTML = `
    <div class="cog-toast-icon">👥</div>
    <div class="cog-toast-body">
      <div class="cog-toast-title">${titulo}</div>
      <div class="cog-toast-msg">${mensagem}</div>
    </div>
    <button class="cog-toast-close" id="cogToastClose">✕</button>`;
  toast.style.cssText = `
    position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;
    display:flex;align-items:center;gap:0.75rem;
    background:rgba(10,10,30,0.95);border:1px solid rgba(0,200,255,0.4);
    border-radius:14px;padding:1rem 1.2rem;min-width:280px;max-width:340px;
    box-shadow:0 8px 32px rgba(0,0,0,0.5);backdrop-filter:blur(12px);
    cursor:pointer;animation:slideInToast 0.4s cubic-bezier(.175,.885,.32,1.275);`;
  document.body.appendChild(toast);

  if (!document.getElementById('cog-toast-style')) {
    const s = document.createElement('style');
    s.id = 'cog-toast-style';
    s.textContent = `
      @keyframes slideInToast { from{transform:translateX(120%);opacity:0} to{transform:translateX(0);opacity:1} }
      @keyframes slideOutToast { from{transform:translateX(0);opacity:1} to{transform:translateX(120%);opacity:0} }
      .cog-toast-icon{font-size:1.5rem;flex-shrink:0;}
      .cog-toast-body{flex:1;}
      .cog-toast-title{font-family:'Orbitron',sans-serif;color:#00c8ff;font-size:0.78rem;letter-spacing:1px;margin-bottom:3px;}
      .cog-toast-msg{color:#c8d8e8;font-size:0.82rem;line-height:1.4;}
      .cog-toast-close{background:none;border:none;color:#6a8a9a;font-size:0.9rem;cursor:pointer;padding:0 0 0 0.5rem;flex-shrink:0;}
      .cog-toast-close:hover{color:#fff;}`;
    document.head.appendChild(s);
  }

  toast.onclick = (e) => {
    if (e.target.id === 'cogToastClose') { fecharToast(toast); return; }
    fecharToast(toast);
    if (onClick) onClick();
  };
  document.getElementById('cogToastClose').onclick = (e) => { e.stopPropagation(); fecharToast(toast); };
  setTimeout(() => fecharToast(toast), 8000);
}

function fecharToast(el) {
  if (!el || !el.parentNode) return;
  el.style.animation = 'slideOutToast 0.3s ease forwards';
  setTimeout(() => el.remove(), 300);
}

// ===== ALERTA BATALHA (chamativo) =====
function mostrarAlertaBatalha(anfNome, batalhaId, batalha) {
  if (document.getElementById('cognix-batalha-alert')) return;

  const overlay = document.createElement('div');
  overlay.id = 'cognix-batalha-alert';
  overlay.innerHTML = `
    <div class="cog-batalha-box">
      <div class="cog-batalha-pulse">⚔️</div>
      <div class="cog-batalha-titulo">DESAFIO DE BATALHA!</div>
      <div class="cog-batalha-sub"><strong>${anfNome}</strong> te desafiou para uma batalha!</div>
      <div class="cog-batalha-info" id="cogBatInfoDisc">
        📚 Carregando...
      </div>
      <div style="display:flex;gap:0.75rem;margin-top:1.5rem;">
        <button class="cog-btn-aceitar" id="cogBtnAceitar">⚔️ ACEITAR</button>
        <button class="cog-btn-recusar" id="cogBtnRecusar">❌ Recusar</button>
      </div>
      <div class="cog-batalha-timer">⏱️ Expira em <span id="cogBatTimer">5:00</span></div>
    </div>`;

  overlay.style.cssText = `
    position:fixed;inset:0;z-index:99999;
    display:flex;align-items:center;justify-content:center;
    background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);
    animation:fadeBatIn 0.3s ease;`;

  if (!document.getElementById('cog-bat-style')) {
    const s = document.createElement('style');
    s.id = 'cog-bat-style';
    s.textContent = `
      @keyframes fadeBatIn{from{opacity:0}to{opacity:1}}
      @keyframes pulseEmoji{0%,100%{transform:scale(1)}50%{transform:scale(1.2)}}
      @keyframes glowBorder{0%,100%{box-shadow:0 0 20px rgba(255,68,85,0.4)}50%{box-shadow:0 0 40px rgba(255,68,85,0.8),0 0 60px rgba(255,68,85,0.3)}}
      .cog-batalha-box{
        background:rgba(10,10,30,0.98);border:2px solid rgba(255,68,85,0.6);
        border-radius:20px;padding:2rem;text-align:center;max-width:360px;width:90%;
        animation:glowBorder 2s ease-in-out infinite;}
      .cog-batalha-pulse{font-size:4rem;line-height:1;animation:pulseEmoji 1s ease-in-out infinite;margin-bottom:1rem;}
      .cog-batalha-titulo{font-family:'Orbitron',sans-serif;color:#ff4455;font-size:1.2rem;letter-spacing:4px;font-weight:900;margin-bottom:0.5rem;}
      .cog-batalha-sub{color:white;font-size:1rem;margin-bottom:0.5rem;}
      .cog-batalha-info{color:#8aaabb;font-size:0.85rem;line-height:1.8;margin-top:0.5rem;}
      .cog-batalha-timer{color:#6a8a9a;font-size:0.8rem;margin-top:1rem;font-family:'Orbitron',sans-serif;}
      .cog-btn-aceitar{
        flex:1;padding:0.85rem;border:none;border-radius:12px;
        background:linear-gradient(135deg,#ff2244,#cc1133);
        color:white;font-family:'Orbitron',sans-serif;font-size:0.85rem;
        letter-spacing:2px;cursor:pointer;font-weight:700;
        transition:transform 0.15s,box-shadow 0.15s;}
      .cog-btn-aceitar:hover{transform:scale(1.04);box-shadow:0 4px 16px rgba(255,34,68,0.5);}
      .cog-btn-recusar{
        flex:1;padding:0.85rem;border:1px solid rgba(255,255,255,0.15);border-radius:12px;
        background:rgba(255,255,255,0.05);color:#aaa;
        font-family:'Orbitron',sans-serif;font-size:0.8rem;cursor:pointer;
        transition:background 0.15s;}
      .cog-btn-recusar:hover{background:rgba(255,255,255,0.1);color:white;}`;
    document.head.appendChild(s);
  }

  document.body.appendChild(overlay);

  // Preenche info da batalha
  const DISC_NOMES = { informatica:'💻 Informática', matematica:'📐 Matemática', portugues:'📖 Português', ciencias:'🔬 Ciências' };
  const DIFF_NOMES = { facil:'🟢 Fácil', medio:'🟡 Médio', dificil:'🔴 Difícil' };
  const discNome = batalha.modoMix
    ? '🎲 Mix de disciplinas'
    : (DISC_NOMES[batalha.disciplina] || batalha.disciplina || '');
  const diffNome = DIFF_NOMES[batalha.dificuldade] || batalha.dificuldade || '';
  document.getElementById('cogBatInfoDisc').innerHTML = `
    ${discNome}<br>${diffNome}<br>
    ❓ ${batalha.questoes?.length||0} questões · ⏱️ ${batalha.tempoPorQuestao}s/questão<br>
    🎮 ${batalha.modo === 'velocidade' ? '⚡ Modo Velocidade' : '🎯 Modo Normal'}`;

  // Countdown
  const expira = new Date(batalha.expiraEm);
  const timer = setInterval(() => {
    const diff = expira - Date.now();
    if (diff <= 0) { clearInterval(timer); overlay.remove(); return; }
    const m = Math.floor(diff/60000), s = Math.floor((diff%60000)/1000);
    const el = document.getElementById('cogBatTimer');
    if (el) el.textContent = `${m}:${String(s).padStart(2,'0')}`;
  }, 1000);

  // Aceitar
  document.getElementById('cogBtnAceitar').onclick = async () => {
    clearInterval(timer);
    overlay.remove();
    await updateDoc(doc(db,'batalhas',batalhaId), { status:'em_andamento', iniciadaEm:new Date() });
    localStorage.setItem('batalha_id',   batalhaId);
    localStorage.setItem('batalha_lado', 'B');
    location.href = 'batalha.html';
  };

  // Recusar
  document.getElementById('cogBtnRecusar').onclick = async () => {
    clearInterval(timer);
    overlay.remove();
    await updateDoc(doc(db,'batalhas',batalhaId), { status:'cancelada' });
  };
}

export function pararNotificacoes() {
  if (unsubAmigos)  { unsubAmigos();  unsubAmigos  = null; }
  if (unsubBatalha) { unsubBatalha(); unsubBatalha = null; }
}
