import { Application } from 'pixi.js';
import './style.css';
import { loadSymbolAssets } from './assets/SymbolAssets';
import gameInfoLeftUrl from './assets/gameInfoLeft.png';
import gameInfoRightUrl from './assets/gameInfoRight.png';
import localsPanelArtworkUrl from './assets/localsPanelArtwork.png';
import { DevModeController } from './dev/DevModeController';
import { Game } from './game/Game';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
} from './presentation/GameView';
const shell = document.createElement('main');
shell.className = 'presentation-shell';
const leftPresentation = document.createElement('section');
leftPresentation.className = 'presentation-side presentation-side--left';
leftPresentation.setAttribute('aria-hidden', 'true');
const leftArtworkPlaceholder = document.createElement('div');
leftArtworkPlaceholder.className = 'art-placeholder art-placeholder--left';
leftArtworkPlaceholder.style.backgroundImage = `url(${gameInfoLeftUrl})`;
leftPresentation.appendChild(leftArtworkPlaceholder);
const gameHost = document.createElement('section');
gameHost.className = 'game-host';
const footerArtworkPlaceholder = document.createElement('footer');
footerArtworkPlaceholder.className = 'portfolio-footer';
footerArtworkPlaceholder.setAttribute('aria-label', 'Technical demonstration details');
const footerLabel = document.createElement('span');
footerLabel.className = 'portfolio-footer__label';
footerLabel.textContent = 'TECHNICAL DEMONSTRATION BY';
const footerName = document.createElement('span');
footerName.className = 'portfolio-footer__name';
footerName.textContent = 'jeff samson';
const footerDivider = document.createElement('span');
footerDivider.className = 'portfolio-footer__divider';
footerDivider.setAttribute('aria-hidden', 'true');
const footerTech = document.createElement('span');
footerTech.className = 'portfolio-footer__tech';
footerTech.textContent = 'VITE · TYPESCRIPT · PIXIJS · GSAP';
const footerContent = document.createElement('div');
footerContent.className = 'portfolio-footer__content';
footerContent.append(footerLabel, footerName, footerDivider, footerTech);
footerArtworkPlaceholder.appendChild(footerContent);
const rightPresentation = document.createElement('aside');
rightPresentation.className = 'presentation-side presentation-side--right';
rightPresentation.dataset.mode = 'portfolio';
const rightArtworkPlaceholder = document.createElement('div');
rightArtworkPlaceholder.className = 'art-placeholder art-placeholder--right';
rightArtworkPlaceholder.style.backgroundImage = `url(${gameInfoRightUrl})`;
rightPresentation.appendChild(rightArtworkPlaceholder);
const localsBarPlaceholder = document.createElement('button');
localsBarPlaceholder.className = 'art-placeholder art-placeholder--locals locals-bar-trigger';
localsBarPlaceholder.type = 'button';
const localsBarContent = document.createElement('span');
localsBarContent.className = 'locals-bar-trigger__content';
const localsBarPrefix = document.createElement('span');
localsBarPrefix.textContent = 'Meet the';
const localsBarSpace1 = document.createElement('span');
localsBarSpace1.setAttribute('aria-hidden', 'true');
localsBarSpace1.textContent = '\u00A0';
const localsBarEmphasis = document.createElement('span');
localsBarEmphasis.className = 'locals-bar-trigger__emphasis';
localsBarEmphasis.textContent = 'Dead End';
const localsBarSpace2 = document.createElement('span');
localsBarSpace2.setAttribute('aria-hidden', 'true');
localsBarSpace2.textContent = '\u00A0';
const localsBarSuffix = document.createElement('span');
localsBarSuffix.textContent = 'Locals';
localsBarContent.append(
  localsBarPrefix,
  localsBarSpace1,
  localsBarEmphasis,
  localsBarSpace2,
  localsBarSuffix,
);
localsBarPlaceholder.appendChild(localsBarContent);
localsBarPlaceholder.setAttribute('aria-haspopup', 'dialog');
localsBarPlaceholder.setAttribute('aria-expanded', 'false');
gameHost.append(localsBarPlaceholder, footerArtworkPlaceholder);
const localsBackdrop = document.createElement('div');
localsBackdrop.className = 'locals-backdrop';
localsBackdrop.hidden = true;
const localsPanel = document.createElement('section');
localsPanel.className = 'locals-panel';
localsPanel.setAttribute('role', 'dialog');
localsPanel.setAttribute('aria-modal', 'true');
localsPanel.setAttribute('aria-labelledby', 'locals-panel-title');
const localsPanelHeader = document.createElement('div');
localsPanelHeader.className = 'locals-panel__header';
const localsPanelTitle = document.createElement('h2');
localsPanelTitle.id = 'locals-panel-title';
localsPanelTitle.className = 'locals-panel__title';
localsPanelTitle.textContent = 'The locals found at the Dead End...';
const localsCloseButton = document.createElement('button');
localsCloseButton.className = 'locals-panel__close';
localsCloseButton.type = 'button';
localsCloseButton.textContent = 'CLOSE';
localsCloseButton.setAttribute('aria-label', 'Close Meet the Locals');
const localsPanelBody = document.createElement('div');
localsPanelBody.className = 'locals-panel__body';
const localsImage = document.createElement('img');
localsImage.className = 'locals-panel__image';
localsImage.src = localsPanelArtworkUrl;
localsImage.alt = 'The Dead End Locals';
localsPanelBody.appendChild(localsImage);
localsPanelHeader.append(localsPanelTitle, localsCloseButton);
localsPanel.append(localsPanelHeader, localsPanelBody);
localsBackdrop.appendChild(localsPanel);
function setLocalsOpen(open: boolean): void {
  localsBackdrop.hidden = !open;
  localsBarPlaceholder.setAttribute('aria-expanded', String(open));
  if (open) {
    localsCloseButton.focus();
  } else {
    localsBarPlaceholder.focus();
  }
}
localsBarPlaceholder.addEventListener('click', () => setLocalsOpen(true));
localsCloseButton.addEventListener('click', () => setLocalsOpen(false));
localsBackdrop.addEventListener('pointerdown', (event) => {
  if (event.target === localsBackdrop) setLocalsOpen(false);
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !localsBackdrop.hidden) {
    setLocalsOpen(false);
  }
});
const receiptHost = document.createElement('div');
shell.append(
  leftPresentation,
  gameHost,
  rightPresentation,
  localsBackdrop,
);
document.body.appendChild(shell);
const app = new Application();
await app.init({
  width: Math.max(1, gameHost.clientWidth),
  height: Math.max(1, gameHost.clientHeight),
  background: '#0b0d10',
  antialias: true,
});
gameHost.appendChild(app.canvas);
await loadSymbolAssets();
const game = new Game(app, receiptHost);
// ─────────────────────────────────────────────
// Responsive Game Composition
// ─────────────────────────────────────────────
// The visual center of the 5×3 reel grid in native GameView coordinates.
// ReelView starts at y=105 and the grid is 380px tall, so its center is y=295.
// We center this point in the viewport rather than centering the full 1000×800
// GameView, which keeps the middle reel tile at the dead center of the app.
const REEL_GRID_CENTER_Y = 295;
// Visual composition offset in native GameView coordinates. Because this value
// belongs to the 1000×800 game composition, it must scale with the GameView.
// Keeping it in native coordinates prevents the offset from becoming
// proportionally larger as the viewport shrinks. X positioning remains untouched.
const GAME_VISUAL_Y_OFFSET = -80;
const devModeController = new DevModeController({
  rightPresentation,
  receiptHost,
  onModeChange: (enabled) => {
    game.setDevMode(enabled);
  },
  onSetAfterMidnightArmed: (armed) => game.setAfterMidnightTriggerArmed(armed),
  onReplayLastSpin: () => game.replayLastSpin(),
  onCoordinatesVisibleChange: (visible) => game.setDevCoordinatesVisible(visible),
  onPaylinesVisibleChange: (visible) => game.setDevPaylinesVisible(visible),
});
game.setLastSpinReplayAvailableHandler((available) => {
  devModeController.setReplayAvailable(available);
});
game.setAfterMidnightDevTriggerConsumedHandler(() => {
  devModeController.markAfterMidnightConsumed();
});
game.setAfterMidnightDevAvailabilityHandler((available) => {
  devModeController.setAfterMidnightAvailable(available);
});
function resizeGame(): void {
  const width = Math.max(1, gameHost.clientWidth);
  const height = Math.max(1, gameHost.clientHeight);
  app.renderer.resize(width, height);
  // ─────────────────────────────────────────────
  // Vertical Safe Region
  // ─────────────────────────────────────────────
  // Reserve only the Locals bar's minimum responsive height for gameplay
  // layout. The visible bar is allowed to grow downward afterward to meet the
  // cabinet exactly, so it absorbs unused top space without moving/rescaling
  // the playable GameView.
  const localsStyle = getComputedStyle(localsBarPlaceholder);
  const reservedTopBarHeight =
    Number.parseFloat(localsStyle.minHeight) ||
    localsBarPlaceholder.getBoundingClientRect().height;
  const footerStyle = getComputedStyle(footerArtworkPlaceholder);
  const reservedFooterBarHeight =
    Number.parseFloat(footerStyle.minHeight) ||
    footerArtworkPlaceholder.getBoundingClientRect().height;
  const playableTop = reservedTopBarHeight;
  const playableBottom = Math.max(playableTop + 1, height - reservedFooterBarHeight);
  const playableHeight = Math.max(1, playableBottom - playableTop);
  const scaleX = width / GAME_WIDTH;
  const scaleY = playableHeight / GAME_HEIGHT;
  const adjustedScaleY = scaleY >= 0.97 ? 1 : scaleY;
  const scale = Math.min(scaleX, adjustedScaleY);
  game.view.scale.set(scale);
  game.view.x = (width - GAME_WIDTH * scale) / 2;
  // Preserve the reel-centered composition when space allows, then clamp the translated
  // GameView into the reserved playable region so cabinet art and controls can
  // never slide underneath either persistent bar.
  const desiredY =
    playableTop +
    playableHeight / 2 -
    REEL_GRID_CENTER_Y * scale +
    GAME_VISUAL_Y_OFFSET * scale;
  const minY = playableTop;
  const maxY = playableBottom - GAME_HEIGHT * scale;
  game.view.y = Math.min(Math.max(desiredY, minY), Math.max(minY, maxY));
  // Let the visible Locals bar absorb otherwise-empty space above the
  // cabinet. This is presentation-only: the GameView position/scale above has
  // already been resolved from the reserved minimum bar height.
  const flushLocalsHeight = Math.max(
    reservedTopBarHeight,
    Math.ceil(game.view.y)
  );
  localsBarPlaceholder.style.height = `${flushLocalsHeight}px`;
  // Mirror the same invariant below: reserve only the footer's minimum
  // usable height reserved for gameplay, then grow the visible footer upward
  // into any otherwise-empty space below the cabinet. This keeps the footer
  // flush to the cabinet without moving or rescaling the playable GameView.
  const gameBottom = game.view.y + GAME_HEIGHT * scale;
  const flushFooterHeight = Math.max(
    reservedFooterBarHeight,
    Math.ceil(height - gameBottom)
  );
  footerArtworkPlaceholder.style.height = `${flushFooterHeight}px`;
}
window.addEventListener('resize', resizeGame);
resizeGame();
