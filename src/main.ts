import { Application } from 'pixi.js';
import './style.css';
import { Game } from './game/Game';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
} from './presentation/GameView';
const app = new Application();
await app.init({
  width: window.innerWidth,
  height: window.innerHeight,
  background: '#0b0d10',
  antialias: true,
});
document.body.appendChild(app.canvas);
const game = new Game(app);
function resizeGame(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
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