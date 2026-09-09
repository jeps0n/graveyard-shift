import { Application } from 'pixi.js';
import './style.css';
import { loadSymbolAssets } from './assets/SymbolAssets';
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
const gameHost = document.createElement('section');
gameHost.className = 'game-host';
const rightPresentation = document.createElement('aside');
rightPresentation.className = 'presentation-side presentation-side--right';
rightPresentation.dataset.mode = 'portfolio';
const receiptHost = document.createElement('div');
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
await loadSymbolAssets();
const game = new Game(app, receiptHost);
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
  game.view.y = (height - GAME_HEIGHT * scale) / 2;
}
window.addEventListener('resize', resizeGame);
resizeGame();
