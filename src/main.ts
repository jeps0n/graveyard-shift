import { Application } from 'pixi.js';
import './style.css';
import { loadSymbolAssets } from './assets/SymbolAssets';
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
leftArtworkPlaceholder.textContent = 'LEFT ARTWORK / WORLD BUILDING';
leftPresentation.appendChild(leftArtworkPlaceholder);
const gameHost = document.createElement('section');
gameHost.className = 'game-host';
const footerArtworkPlaceholder = document.createElement('div');
footerArtworkPlaceholder.className = 'art-placeholder art-placeholder--footer';
footerArtworkPlaceholder.textContent = 'FOOTER ARTWORK';
const rightPresentation = document.createElement('aside');
rightPresentation.className = 'presentation-side presentation-side--right';
rightPresentation.dataset.mode = 'portfolio';
const rightArtworkPlaceholder = document.createElement('div');
rightArtworkPlaceholder.className = 'art-placeholder art-placeholder--right';
rightArtworkPlaceholder.textContent = 'ARTWORK / GAME INFO';
rightPresentation.appendChild(rightArtworkPlaceholder);
const localsBarPlaceholder = document.createElement('button');
localsBarPlaceholder.className = 'art-placeholder art-placeholder--locals locals-bar-trigger';
localsBarPlaceholder.type = 'button';
localsBarPlaceholder.textContent = 'Meet the DEAD END Locals';
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
localsPanelTitle.textContent = 'MEET THE LOCALS';
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
// The visual center of the 5×3 reel grid in native GameView coordinates.
// ReelView starts at y=105 and the grid is 380px tall, so its center is y=295.
// We center this point in the viewport rather than centering the full 1000×800
// GameView, which keeps the middle reel tile at the dead center of the app.
const REEL_GRID_CENTER_Y = 295;
// Visual composition offset: the reel grid reads better slightly above the
// mathematical viewport center, leaving more breathing room for the controls.
// X positioning remains untouched.
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
function resizeGame(): void {
  const width = Math.max(1, gameHost.clientWidth);
  const height = Math.max(1, gameHost.clientHeight);
  app.renderer.resize(width, height);
  const scaleX = width / GAME_WIDTH;
  const scaleY = height / GAME_HEIGHT;
  const scale = Math.min(scaleX, scaleY);
  game.view.scale.set(scale);
  game.view.x = (width - GAME_WIDTH * scale) / 2;
  // Keep the reel grid itself vertically centered in the application.
  // This translates the entire GameView as one unit, so reels, cabinet art,
  // HUD, wager controls, and SPIN preserve all of their existing spacing.
  game.view.y =
    height / 2 -
    REEL_GRID_CENTER_Y * scale +
    GAME_VISUAL_Y_OFFSET;
  // Lock the HTML artwork bars directly to the rendered GameView edges.
  // Both bars live inside gameHost, so they always share the cabinet width
  // and respond to resizing with the exact same geometry.
  const gameTop = game.view.y;
  const gameBottom = game.view.y + GAME_HEIGHT * scale;

  // LOCALS BAR fills only the space above the rendered cabinet and stays
  // flush against its top edge, mirroring the footer behavior below.
  localsBarPlaceholder.style.top = '0';
  localsBarPlaceholder.style.height = `${Math.max(0, Math.ceil(gameTop) + 1)}px`;

  // FOOTER ARTWORK fills only the space below the rendered cabinet.
  footerArtworkPlaceholder.style.top = `${Math.floor(gameBottom) - 1}px`;
  footerArtworkPlaceholder.style.bottom = '0';
}
window.addEventListener('resize', resizeGame);
resizeGame();
