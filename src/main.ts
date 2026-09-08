import { Application } from 'pixi.js';
import './style.css';
import { Game } from './game/Game';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
} from './presentation/GameView';
// Development mode gives the entire right presentation region to the
// Dev Receipt. Flip this to false when the final right-side artwork exists.
const SHOW_DEV_RECEIPT = true;
const shell = document.createElement('main');
shell.className = 'presentation-shell';
const leftPresentation = document.createElement('section');
leftPresentation.className = 'presentation-side presentation-side--left';
leftPresentation.setAttribute('aria-hidden', 'true');
const gameHost = document.createElement('section');
gameHost.className = 'game-host';
const rightPresentation = document.createElement('aside');
rightPresentation.className = 'presentation-side presentation-side--right';
rightPresentation.dataset.mode = SHOW_DEV_RECEIPT ? 'dev' : 'portfolio';
shell.append(
  leftPresentation,
  gameHost,
  rightPresentation,
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
const game = new Game(
  app,
  SHOW_DEV_RECEIPT ? rightPresentation : undefined,
);
function resizeGame(): void {
  const width = Math.max(1, gameHost.clientWidth);
  const height = Math.max(1, gameHost.clientHeight);
  app.renderer.resize(width, height);
  const scaleX = width / GAME_WIDTH;
  const scaleY = height / GAME_HEIGHT;
  const scale = Math.min(scaleX, scaleY);
  game.view.scale.set(scale);
  game.view.x = (width - GAME_WIDTH * scale) / 2;
  game.view.y = (height - GAME_HEIGHT * scale) / 2;
}
window.addEventListener('resize', resizeGame);
resizeGame();
