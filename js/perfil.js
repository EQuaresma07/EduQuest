// ===== SISTEMA DE NÍVEIS =====
export const NIVEIS = [
  { nivel: 1,  nome: 'Recruta',       emoji: '🪖',  xpMin: 0     },
  { nivel: 2,  nome: 'Soldado',       emoji: '⚔️',  xpMin: 200   },
  { nivel: 3,  nome: 'Guerreiro',     emoji: '🛡️',  xpMin: 500   },
  { nivel: 4,  nome: 'Veterano',      emoji: '🗡️',  xpMin: 1000  },
  { nivel: 5,  nome: 'Caçador',       emoji: '🏹',  xpMin: 2000  },
  { nivel: 6,  nome: 'Mago',          emoji: '🔮',  xpMin: 3500  },
  { nivel: 7,  nome: 'Campeão',       emoji: '👑',  xpMin: 5500  },
  { nivel: 8,  nome: 'Lendário',      emoji: '🐉',  xpMin: 8000  },
  { nivel: 9,  nome: 'Imortal',       emoji: '⚡',  xpMin: 12000 },
  { nivel: 10, nome: 'Transcendente', emoji: '🌟',  xpMin: 18000 },
];

export function calcularNivel(xp) {
  let atual = NIVEIS[0];
  for (const n of NIVEIS) {
    if (xp >= n.xpMin) atual = n;
    else break;
  }
  const proximoIdx = NIVEIS.findIndex(n => n.nivel === atual.nivel + 1);
  const proximo    = proximoIdx >= 0 ? NIVEIS[proximoIdx] : null;
  const xpAtual    = xp - atual.xpMin;
  const xpNecessario = proximo ? proximo.xpMin - atual.xpMin : 0;
  const progresso  = proximo ? Math.min(100, Math.round((xpAtual / xpNecessario) * 100)) : 100;
  return { ...atual, proximo, xpAtual, xpNecessario, progresso };
}

// ===== AVATARES DISPONÍVEIS =====
export const AVATARES = [
  '🦊','🐺','🦁','🐯','🐻','🐼','🦅','🦉','🐲','🦄',
  '🤖','👾','💀','🎭','🧙','🧝','🧜','🦸','🕵️','🥷',
  '🌟','⚡','🔥','❄️','🌊','🌪️','☄️','💎','🎮','🏆'
];

// ===== AUTH GUARD =====
// Chama esta função nas páginas que exigem login
// Redireciona para login.html se não estiver autenticado
export async function requireAuth(auth, onAuthStateChanged, db, doc, getDoc) {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        location.href = 'login.html';
        return;
      }
      // Verifica se tem perfil cadastrado
      const snap = await getDoc(doc(db, 'alunos', user.uid));
      if (!snap.exists()) {
        location.href = 'cadastro.html';
        return;
      }
      resolve({ user, perfil: snap.data() });
    });
  });
}

// ===== HELPER: renderiza avatar (emoji ou imagem base64) =====
export function renderAvatar(avatar, avatarTipo, size = 'sm') {
  const cls = size === 'lg' ? 'perfil-avatar-img-lg' : 'perfil-avatar-img';
  if (avatarTipo === 'imagem' && avatar && avatar.startsWith('data:')) {
    return `<img src="${avatar}" class="${cls}" alt="avatar" style="border-radius:50%;object-fit:cover;"/>`;
  }
  const px = size === 'lg' ? '4rem' : '1.6rem';
  return `<span style="font-size:${px};line-height:1;">${avatar || '🦊'}</span>`;
}
