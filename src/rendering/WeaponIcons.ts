import type { WeaponId } from '../systems/EconomyCatalog';

/**
 * Ícone vetorial SVG de moeda dourada (garante renderização nítida sem falha de emoji '▯' em qualquer Windows/Android/iOS)
 */
export const GOLD_COIN_SVG = `
  <svg class="gold-coin-svg" viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: -0.2em; display: inline-block;">
    <circle cx="12" cy="12" r="10" fill="#f59e0b" stroke="#d97706" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="7.5" fill="#fbbf24" stroke="#fef08a" stroke-width="1"/>
    <circle cx="12" cy="12" r="5" stroke="#d97706" stroke-width="0.8" stroke-dasharray="1.5 1"/>
    <text x="12" y="15.5" font-size="10" font-weight="900" text-anchor="middle" fill="#78350f" font-family="sans-serif">¢</text>
  </svg>
`;

export interface WeaponBadgeInfo {
  label: string;
  color: string;
  accentBg: string;
}

export function getWeaponBadgeInfo(id: WeaponId): WeaponBadgeInfo {
  switch (id) {
    case 'pistol':
      return {
        label: 'SECUNDÁRIA TÁTICA',
        color: '#4ade80',
        accentBg: 'rgba(74, 222, 128, 0.15)',
      };
    case 'revolver':
      return {
        label: 'MAGNUM • ALTO IMPACTO',
        color: '#fb923c',
        accentBg: 'rgba(251, 146, 60, 0.15)',
      };
    case 'shotgun':
      return {
        label: 'CALIBRE 12 • DISPERSÃO',
        color: '#f87171',
        accentBg: 'rgba(248, 113, 113, 0.15)',
      };
    case 'smg':
      return {
        label: 'SMG • HIPER CADÊNCIA',
        color: '#38bdf8',
        accentBg: 'rgba(56, 189, 248, 0.15)',
      };
    case 'rifle':
      return {
        label: 'FUZIL • COMBATE TOTAL',
        color: '#2dd4bf',
        accentBg: 'rgba(45, 212, 191, 0.15)',
      };
    case 'plasma_rifle':
      return {
        label: 'ENERGIA • BIO-PLASMA',
        color: '#c084fc',
        accentBg: 'rgba(192, 132, 252, 0.18)',
      };
    case 'sniper':
      return {
        label: 'SNIPER • PERFURANTE .50',
        color: '#f43f5e',
        accentBg: 'rgba(244, 63, 94, 0.15)',
      };
    case 'grenade_launcher':
      return {
        label: 'PESADA • EXPLOSÃO 40MM',
        color: '#facc15',
        accentBg: 'rgba(250, 204, 21, 0.15)',
      };
    default:
      return {
        label: 'ARMAMENTO DE FOGO',
        color: '#94a3b8',
        accentBg: 'rgba(148, 163, 184, 0.15)',
      };
  }
}

/**
 * Retorna o ícone SVG tático estilizado para cada armamento militar
 */
export function getWeaponIconSvg(id: WeaponId): string {
  switch (id) {
    case 'pistol':
      return `
        <svg viewBox="0 0 64 36" fill="none" xmlns="http://www.w3.org/2000/svg" class="weapon-svg-icon">
          <!-- Slide e cano -->
          <path d="M12 8H54V18H36L33 22H14V17H12V8Z" fill="#38bdf8" fill-opacity="0.25" stroke="#38bdf8" stroke-width="2" stroke-linejoin="round"/>
          <line x1="16" y1="12" x2="26" y2="12" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
          <line x1="42" y1="12" x2="50" y2="12" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
          <!-- Empunhadura e gatilho -->
          <path d="M22 22L16 34H26L31 22H22Z" fill="#1e293b" stroke="#38bdf8" stroke-width="2" stroke-linejoin="round"/>
          <path d="M25 21C27 24 28 25 31 25" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>
          <!-- Cano de saída -->
          <rect x="54" y="11" width="3" height="4" rx="1" fill="#38bdf8"/>
        </svg>
      `;

    case 'revolver':
      return `
        <svg viewBox="0 0 64 36" fill="none" xmlns="http://www.w3.org/2000/svg" class="weapon-svg-icon">
          <!-- Cano longo e mira -->
          <path d="M18 10H56V16H36L34 18H18V10Z" fill="#fb923c" fill-opacity="0.25" stroke="#fb923c" stroke-width="2" stroke-linejoin="round"/>
          <rect x="54" y="7" width="2" height="3" fill="#fb923c"/>
          <!-- Tambor de 6 tiros -->
          <rect x="23" y="9" width="12" height="11" rx="2" fill="#334155" stroke="#fb923c" stroke-width="2"/>
          <circle cx="29" cy="14.5" r="2" fill="#fb923c"/>
          <!-- Cão e empunhadura curva -->
          <path d="M18 13L14 9V14" stroke="#fb923c" stroke-width="2" stroke-linecap="round"/>
          <path d="M20 20L13 33C14 35 18 35 22 34L26 20" fill="#1e293b" stroke="#fb923c" stroke-width="2" stroke-linejoin="round"/>
          <path d="M24 21C26 23 27 24 29 23" stroke="#fb923c" stroke-width="1.8"/>
        </svg>
      `;

    case 'shotgun':
      return `
        <svg viewBox="0 0 72 32" fill="none" xmlns="http://www.w3.org/2000/svg" class="weapon-svg-icon">
          <!-- Coronha sólida -->
          <path d="M6 16L18 12V22L8 24C6 24 5 20 6 16Z" fill="#1e293b" stroke="#f87171" stroke-width="2" stroke-linejoin="round"/>
          <!-- Receptor e câmara -->
          <rect x="18" y="12" width="18" height="9" rx="1" fill="#f87171" fill-opacity="0.25" stroke="#f87171" stroke-width="2"/>
          <!-- Cano duplo e tubo inferior -->
          <line x1="36" y1="13.5" x2="68" y2="13.5" stroke="#f87171" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="36" y1="17.5" x2="64" y2="17.5" stroke="#f87171" stroke-width="2.5" stroke-linecap="round"/>
          <!-- Bomba (pump handle) estriada -->
          <rect x="42" y="16" width="14" height="6" rx="2" fill="#334155" stroke="#f87171" stroke-width="1.8"/>
          <!-- Gatilho -->
          <path d="M22 21C23 24 25 25 28 24" stroke="#f87171" stroke-width="1.8"/>
        </svg>
      `;

    case 'smg':
      return `
        <svg viewBox="0 0 64 36" fill="none" xmlns="http://www.w3.org/2000/svg" class="weapon-svg-icon">
          <!-- Trilho e corpo estilo Vector -->
          <path d="M10 8H48V14L38 21H18L10 16V8Z" fill="#38bdf8" fill-opacity="0.22" stroke="#38bdf8" stroke-width="2" stroke-linejoin="round"/>
          <line x1="12" y1="7" x2="44" y2="7" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>
          <!-- Empunhadura e carregador estendido -->
          <path d="M19 21L14 33H22L26 21" fill="#1e293b" stroke="#38bdf8" stroke-width="2" stroke-linejoin="round"/>
          <!-- Carregador reto longo -->
          <rect x="30" y="19" width="6" height="15" rx="1" transform="rotate(-10 30 19)" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8"/>
          <!-- Cano curto e quebra-chamas -->
          <rect x="48" y="10" width="8" height="4" rx="1" fill="#38bdf8"/>
        </svg>
      `;

    case 'rifle':
      return `
        <svg viewBox="0 0 72 32" fill="none" xmlns="http://www.w3.org/2000/svg" class="weapon-svg-icon">
          <!-- Coronha tática ajustável -->
          <path d="M5 14H16V22H11L5 18V14Z" fill="#1e293b" stroke="#2dd4bf" stroke-width="2" stroke-linejoin="round"/>
          <!-- Mira holográfica superior -->
          <path d="M24 7H34L36 12H22L24 7Z" fill="#2dd4bf" fill-opacity="0.3" stroke="#2dd4bf" stroke-width="1.8"/>
          <!-- Corpo do rifle (upper e lower) -->
          <rect x="16" y="12" width="26" height="8" rx="1" fill="#2dd4bf" fill-opacity="0.22" stroke="#2dd4bf" stroke-width="2"/>
          <!-- Carregador curvo 30 tiros -->
          <path d="M27 20L28 31C30 31 34 30 35 28L33 20H27Z" fill="#0f172a" stroke="#2dd4bf" stroke-width="1.8" stroke-linejoin="round"/>
          <!-- Cano longo e mira frontal -->
          <line x1="42" y1="14.5" x2="68" y2="14.5" stroke="#2dd4bf" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="62" y1="11" x2="62" y2="14" stroke="#2dd4bf" stroke-width="2"/>
          <rect x="66" y="13" width="4" height="3" fill="#2dd4bf"/>
        </svg>
      `;

    case 'plasma_rifle':
      return `
        <svg viewBox="0 0 72 32" fill="none" xmlns="http://www.w3.org/2000/svg" class="weapon-svg-icon">
          <!-- Chassis bio-cibernético -->
          <path d="M8 12H20L24 10H50L54 13L46 22H18L10 21V12Z" fill="#c084fc" fill-opacity="0.2" stroke="#c084fc" stroke-width="2" stroke-linejoin="round"/>
          <!-- Núcleos de energia de plasma pulsante -->
          <rect x="25" y="12" width="7" height="6" rx="2" fill="#a855f7" stroke="#e9d5ff" stroke-width="1.5"/>
          <rect x="35" y="12" width="7" height="6" rx="2" fill="#a855f7" stroke="#e9d5ff" stroke-width="1.5"/>
          <!-- Prongs de foco magnético no cano -->
          <path d="M54 11L67 9V14L57 14" stroke="#c084fc" stroke-width="2" stroke-linejoin="round"/>
          <path d="M54 19L67 21V16L57 16" stroke="#c084fc" stroke-width="2" stroke-linejoin="round"/>
          <circle cx="62" cy="15" r="2.5" fill="#38bdf8"/>
          <!-- Empunhadura ergonômica -->
          <path d="M19 22L15 32H23L26 22" fill="#1e293b" stroke="#c084fc" stroke-width="1.8"/>
        </svg>
      `;

    case 'sniper':
      return `
        <svg viewBox="0 0 80 32" fill="none" xmlns="http://www.w3.org/2000/svg" class="weapon-svg-icon">
          <!-- Luneta telescópica de alta precisão -->
          <path d="M22 6H46L48 10H20L22 6Z" fill="#f43f5e" fill-opacity="0.3" stroke="#f43f5e" stroke-width="1.8"/>
          <line x1="28" y1="10" x2="28" y2="13" stroke="#f43f5e" stroke-width="2"/>
          <line x1="40" y1="10" x2="40" y2="13" stroke="#f43f5e" stroke-width="2"/>
          <!-- Coronha pesada antimaterial -->
          <path d="M4 14H18V22H12L4 20V14Z" fill="#1e293b" stroke="#f43f5e" stroke-width="2" stroke-linejoin="round"/>
          <!-- Receptor longo -->
          <rect x="18" y="13" width="26" height="8" rx="1" fill="#f43f5e" fill-opacity="0.22" stroke="#f43f5e" stroke-width="2"/>
          <!-- Cano de calibre .50 ultra longo -->
          <line x1="44" y1="15.5" x2="76" y2="15.5" stroke="#f43f5e" stroke-width="2.5" stroke-linecap="round"/>
          <!-- Freio de boca reforçado (muzzle brake) -->
          <rect x="74" y="13" width="5" height="5" rx="1" fill="#f43f5e"/>
          <!-- Bipé frontal -->
          <line x1="58" y1="17" x2="54" y2="28" stroke="#f43f5e" stroke-width="1.8" stroke-linecap="round"/>
          <line x1="60" y1="17" x2="64" y2="28" stroke="#f43f5e" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      `;

    case 'grenade_launcher':
      return `
        <svg viewBox="0 0 68 34" fill="none" xmlns="http://www.w3.org/2000/svg" class="weapon-svg-icon">
          <!-- Cano grosso calibre 40mm -->
          <rect x="28" y="9" width="34" height="11" rx="2" fill="#facc15" fill-opacity="0.25" stroke="#facc15" stroke-width="2.2"/>
          <line x1="38" y1="9" x2="38" y2="20" stroke="#facc15" stroke-width="2"/>
          <line x1="48" y1="9" x2="48" y2="20" stroke="#facc15" stroke-width="2"/>
          <!-- Tambor e articulação -->
          <circle cx="26" cy="15" r="7" fill="#1e293b" stroke="#facc15" stroke-width="2"/>
          <circle cx="26" cy="15" r="2.5" fill="#facc15"/>
          <!-- Coronha reforçada -->
          <path d="M6 17H19V24L9 24L5 21V17Z" fill="#1e293b" stroke="#facc15" stroke-width="2" stroke-linejoin="round"/>
          <path d="M22 22L17 32H25L28 22" fill="#1e293b" stroke="#facc15" stroke-width="2"/>
        </svg>
      `;

    default:
      return `
        <svg viewBox="0 0 64 36" fill="none" xmlns="http://www.w3.org/2000/svg" class="weapon-svg-icon">
          <rect x="10" y="10" width="44" height="14" rx="2" stroke="#94a3b8" stroke-width="2"/>
        </svg>
      `;
  }
}

