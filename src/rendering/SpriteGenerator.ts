import type { SkinId } from '../systems/EconomyCatalog';
import { SKINS_CATALOG } from '../systems/EconomyCatalog';
import type { ZombieType } from '../config';

/**
 * Gerador de texturas de sprites 2D no Canvas para personagens e zumbis.
 * Renderizados em perspectiva 3/4 isométrica (em pé, com tronco, rosto frontal, pernas ativas
 * e postura dinâmica de combate em vez de parecerem deitados no chão).
 */
export class SpriteGenerator {
  private static cache: Map<string, HTMLCanvasElement> = new Map();

  // Gera o sprite do Sobrevivente em perspectiva 3/4 em pé com arma
  public static createPlayerSprite(skinId: SkinId, walkFrame: number = 0, isFiring: boolean = false): HTMLCanvasElement {
    const key = `player_${skinId}_${walkFrame}_${isFiring}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    const skin = SKINS_CATALOG[skinId] || SKINS_CATALOG['skin_urban'];
    const jacketHex = '#' + skin.jacketColor.toString(16).padStart(6, '0');
    const backpackHex = '#' + skin.backpackColor.toString(16).padStart(6, '0');
    const pantsHex = '#' + skin.pantsColor.toString(16).padStart(6, '0');

    ctx.save();
    ctx.translate(64, 64);

    // 1. Sombra elíptica realista no chão sob os pés
    ctx.beginPath();
    ctx.ellipse(0, 22, 26, 11, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fill();

    // 2. Anel de seleção tático iluminado
    ctx.beginPath();
    ctx.ellipse(0, 22, 32, 14, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    const legBob = Math.sin(walkFrame * 2) * 5;

    // 3. Pernas e Botas Táticas (em pé, passada realista)
    ctx.fillStyle = pantsHex;
    // Perna esquerda
    ctx.beginPath();
    ctx.roundRect(-14, 4 + legBob, 10, 18, 4);
    ctx.fill();
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Bota esquerda
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.roundRect(-15, 18 + legBob, 12, 7, 3);
    ctx.fill();

    // Perna direita
    ctx.fillStyle = pantsHex;
    ctx.beginPath();
    ctx.roundRect(4, 4 - legBob, 10, 18, 4);
    ctx.fill();
    ctx.stroke();
    // Bota direita
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.roundRect(3, 18 - legBob, 12, 7, 3);
    ctx.fill();

    // 4. Mochila Militar nas costas
    ctx.fillStyle = backpackHex;
    ctx.beginPath();
    ctx.roundRect(-16, -18, 32, 22, 6);
    ctx.fill();
    ctx.stroke();

    // 5. Tronco ereto e Jaqueta Tática / Macacão / Armadura por Skin
    ctx.fillStyle = jacketHex;
    ctx.beginPath();
    ctx.roundRect(-18, -16, 36, 26, 7);
    ctx.fill();
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Detalhes únicos no tronco para cada Skin:
    if (skinId === 'skin_scientist') {
      // Jaleco de laboratório com botões frontais, gola aberta e respingos de sangue da contaminação
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-2, -16, 4, 26);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, -10, 1.8, 0, Math.PI * 2);
      ctx.arc(0, -3, 1.8, 0, Math.PI * 2);
      ctx.arc(0, 4, 1.8, 0, Math.PI * 2);
      ctx.fill();
      // Manchas de sangue no jaleco
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.arc(-8, -4, 4, 0, Math.PI * 2);
      ctx.arc(-5, 3, 2.5, 0, Math.PI * 2);
      ctx.arc(9, -8, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (skinId === 'skin_mechanic') {
      // Macacão de operário com suspensórios de couro e placa peitoral de aço rebitada
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-12, -16, 5, 26);
      ctx.fillRect(7, -16, 5, 26);
      // Placa de ferro soldada no peito
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.roundRect(-8, -10, 16, 16, 2);
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Rebites
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-6, -8, 2, 2);
      ctx.fillRect(4, -8, 2, 2);
      ctx.fillRect(-6, 2, 2, 2);
      ctx.fillRect(4, 2, 2, 2);
    } else if (skinId === 'skin_containment') {
      // Macacão Hazmat de radiação com símbolo de Biohazard no peito
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.roundRect(-12, -12, 24, 20, 4);
      ctx.fill();
      // Símbolo radioativo amarelo
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(0, -2, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.arc(0, -2, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (skinId === 'skin_tracker') {
      // Colete stealth de kevlar escuro com faixas de camuflagem azul
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-13, -13, 26, 21, 4);
      ctx.fill();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // Coldre transversal peitoral
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-10, -8, 20, 4);
      ctx.fillRect(-10, 0, 20, 4);
    } else if (skinId === 'skin_scavenger') {
      // Poncho rústico de sobrevivente com bandoleira de munição transversal
      ctx.fillStyle = '#365314';
      ctx.beginPath();
      ctx.moveTo(-16, -14);
      ctx.lineTo(16, -14);
      ctx.lineTo(12, 10);
      ctx.lineTo(-12, 10);
      ctx.closePath();
      ctx.fill();
      // Bandoleira de balas de rifle douradas
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-14, -14);
      ctx.lineTo(14, 8);
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      [-8, -2, 4, 10].forEach((bx, idx) => {
        const by = [-8, -2, 4, 10][idx] - 3;
        ctx.fillRect(bx - 1.5, by, 3, 5);
      });
    } else {
      // Sobrevivente Urbano clássico: Colete balístico tático com bolsos utilitários
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-13, -12, 26, 20, 4);
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = '#334155';
      ctx.fillRect(-10, -5, 8, 8);
      ctx.fillRect(2, -5, 8, 8);
    }

    // 6. Cabeça Ereta com Rosto, Cabelo/Capacete/Máscaras Personalizadas
    ctx.fillStyle = '#f5d0b5'; // Tom de pele
    ctx.beginPath();
    ctx.ellipse(0, -27, 14, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Chapéus e coberturas de cabeça temáticas por skin:
    if (skinId === 'skin_containment') {
      // Capacete de proteção total Hazmat amarelo com visor dourado/espelhado
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(0, -28, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Grande viseira curvada espelhada
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.roundRect(-11, -33, 22, 12, 6);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-7, -31, 14, 3);
    } else if (skinId === 'skin_scavenger') {
      // Capuz rústico sobre toda a cabeça
      ctx.fillStyle = '#27272a';
      ctx.beginPath();
      ctx.arc(0, -28, 16.5, Math.PI * 0.75, Math.PI * 2.25);
      ctx.lineTo(13, -15);
      ctx.lineTo(-13, -15);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Sombra profunda do capuz
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.arc(0, -28, 14, Math.PI, Math.PI * 2);
      ctx.fill();
    } else if (skinId === 'skin_mechanic') {
      // Máscara de soldador basculante de ferro escuro
      ctx.fillStyle = '#292524';
      ctx.beginPath();
      ctx.roundRect(-13, -36, 26, 22, 4);
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Visor de vidro escuro retangular reforçado
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(-8, -29, 16, 5);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-8, -29, 16, 5);
    } else if (skinId === 'skin_tracker') {
      // Balaclava tática preta + Visor holográfico de visão noturna ciano
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.arc(0, -28, 15, Math.PI * 0.8, Math.PI * 2.2);
      ctx.lineTo(10, -18);
      ctx.lineTo(-10, -18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Óculos holográfico de visão noturna duplo ciano neon
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.roundRect(-12, -31, 24, 6, 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (skinId === 'skin_scientist') {
      // Cabelo grisalho despenteado + Máscara de gás química
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(0, -32, 14, Math.PI, Math.PI * 2);
      ctx.fill();
      // Óculos de proteção laboratorial
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-10, -30, 20, 4.5);
      // Máscara com respiradores laterais
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(0, -22, 7, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(-11, -24, 4, 7);
      ctx.fillRect(7, -24, 4, 7);
    } else {
      // Sobrevivente Urbano Padrão: Boné com aba escura e óculos esportivos
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, -31, 14, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Aba do boné
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-12, -33, 24, 4);

      // Olhos e sobrancelhas
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-7, -28, 4, 3.5);
      ctx.fillRect(3, -28, 4, 3.5);
      ctx.fillStyle = '#090d16';
      ctx.fillRect(-5.5, -27.5, 2.5, 2.5);
      ctx.fillRect(4.5, -27.5, 2.5, 2.5);

      // Óculos escuros esportivos azuis
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-11, -30, 22, 4.5);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-11, -30, 22, 4.5);
    }

    // 7. Braços e Arma empunhada em PRIMEIRO PLANO (Sobressaindo nitidamente à frente)
    const recoil = isFiring ? -5 : 0;
    // Braço esquerdo segurando guarda-mão
    ctx.fillStyle = jacketHex;
    ctx.beginPath();
    ctx.roundRect(-24, -10, 10, 18, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f5d0b5';
    ctx.beginPath();
    ctx.arc(-19, 8, 5, 0, Math.PI * 2);
    ctx.fill();

    // Braço direito empunhando coronha
    ctx.fillStyle = jacketHex;
    ctx.beginPath();
    ctx.roundRect(14, -10 + recoil, 10, 18, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f5d0b5';
    ctx.beginPath();
    ctx.arc(19, 8 + recoil, 5, 0, Math.PI * 2);
    ctx.fill();

    // ARMA DESTACADA EM PRIMEIRO PLANO:
    // Sombra da arma
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(8, -26 + recoil, 14, 46);

    // Corpo principal de metal escuro (Receiver)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(6, -20 + recoil, 16, 26);
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2;
    ctx.strokeRect(6, -20 + recoil, 16, 26);

    // Pente curvo (Magazine extendido)
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(14, -6 + recoil, 9, 20, 3);
    ctx.fill();
    ctx.strokeStyle = '#090d16';
    ctx.stroke();

    // Guarda-mão longo reforçado cinza fosco
    ctx.fillStyle = '#334155';
    ctx.fillRect(8, -48 + recoil, 12, 30);
    ctx.strokeRect(8, -48 + recoil, 12, 30);

    // Trilho tático e cano comprido de aço cromado
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(11, -62 + recoil, 6, 16);

    // Quebra-chamas na boca do cano
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(9, -65 + recoil, 10, 5);

    // Mira óptica holográfica neon com ponto vermelho brilhante
    ctx.fillStyle = '#020617';
    ctx.fillRect(9, -32 + recoil, 10, 8);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(12, -30 + recoil, 4, 4);

    if (isFiring) {
      // Clarão intenso e realista do disparo
      ctx.fillStyle = '#fef08a';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(14, -70 + recoil, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();

    this.cache.set(key, canvas);
    return canvas;
  }

  // Gera sprites dos zumbis em postura bípede ameaçadora 3/4
  public static createZombieSprite(type: ZombieType, animFrame: number = 0, isHit: boolean = false): HTMLCanvasElement {
    const key = `zombie_${type}_${animFrame}_${isHit}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.save();
    ctx.translate(64, 64);

    let scale = 1.0;
    let skinColor = '#22c55e'; // Verde zumbi vibrante/infectado
    let clothesColor = '#14532d'; // Roupas rasgadas em tom verde escuro militar/podre
    let eyeColor = '#ef4444'; // Olhos vermelhos ameaçadores

    if (type === 'runner') {
      scale = 0.95;
      skinColor = '#4ade80'; // Verde mais claro e tóxico/ágil
      clothesColor = '#166534';
      eyeColor = '#ff0000';
    } else if (type === 'brute') {
      scale = 1.5;
      skinColor = '#15803d'; // Verde musgo robusto e pesado
      clothesColor = '#052e16';
      eyeColor = '#f97316';
    } else if (type === 'exploder') {
      scale = 1.2;
      skinColor = '#39ff14'; // Verde fluorescente radioativo
      clothesColor = '#064e3b';
      eyeColor = '#eab308';
    } else if (type === 'boss') {
      scale = 2.2;
      skinColor = '#16a34a'; // Verde profundo titânico
      clothesColor = '#022c22';
      eyeColor = '#f43f5e';
    }

    ctx.scale(scale, scale);

    // 1. Sombra no chão
    ctx.beginPath();
    ctx.ellipse(0, 24, 26, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fill();

    const shamble = Math.sin(animFrame * 2) * 5;

    // 2. Pernas cambaleantes
    ctx.fillStyle = clothesColor;
    ctx.beginPath();
    ctx.roundRect(-13, 6 + shamble, 9, 18, 3);
    ctx.fill();
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(4, 6 - shamble, 9, 18, 3);
    ctx.fill();
    ctx.stroke();

    // 3. Tronco corcunda em decomposição
    ctx.fillStyle = isHit ? '#ef4444' : clothesColor;
    ctx.beginPath();
    ctx.roundRect(-16, -14, 32, 24, 6);
    ctx.fill();
    ctx.stroke();

    // Costelas e carne viva expostas
    ctx.fillStyle = '#881337';
    ctx.fillRect(-10, -8, 20, 10);
    ctx.fillStyle = '#e2e8f0'; // Ossos
    ctx.fillRect(-8, -6, 6, 1.8);
    ctx.fillRect(2, -6, 6, 1.8);
    ctx.fillRect(-7, -3, 6, 1.8);
    ctx.fillRect(1, -3, 6, 1.8);

    // 4. Braços alongados com garras afiadas esticados para frente
    ctx.fillStyle = isHit ? '#ef4444' : skinColor;
    // Braço esquerdo
    ctx.beginPath();
    ctx.roundRect(-22, -18 + shamble, 7, 22, 3);
    ctx.fill();
    ctx.stroke();
    // Garras
    ctx.fillStyle = '#020617';
    ctx.fillRect(-24, 3 + shamble, 9, 5);

    // Braço direito
    ctx.fillStyle = isHit ? '#ef4444' : skinColor;
    ctx.beginPath();
    ctx.roundRect(15, -18 - shamble, 7, 22, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#020617';
    ctx.fillRect(15, 3 - shamble, 9, 5);

    // 5. Cabeça zumbi frontal assustadora
    ctx.fillStyle = isHit ? '#ef4444' : skinColor;
    ctx.beginPath();
    ctx.ellipse(0, -26, 13, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#05070a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Ferida aberta no crânio
    ctx.fillStyle = '#4c0519';
    ctx.fillRect(2, -37, 7, 5);

    // Cavidades e olhos vermelhos brilhantes
    ctx.fillStyle = '#020617';
    ctx.fillRect(-7, -29, 5, 5);
    ctx.fillRect(2, -29, 5, 5);
    ctx.fillStyle = eyeColor;
    ctx.fillRect(-5.5, -27.5, 2.5, 2.5);
    ctx.fillRect(3.5, -27.5, 2.5, 2.5);

    // Mandíbula e dentes apodrecidos
    ctx.fillStyle = '#020617';
    ctx.fillRect(-6, -21, 12, 5);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-5, -21, 2, 2);
    ctx.fillRect(-1, -21, 2, 2);
    ctx.fillRect(3, -21, 2, 2);
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(-4, -16, 8, 3); // Sangue escorrendo no queixo

    // Pústulas volumosas para Exploder
    if (type === 'exploder') {
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(-8, -4, 6, 0, Math.PI * 2);
      ctx.arc(9, -2, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    this.cache.set(key, canvas);
    return canvas;
  }
}
