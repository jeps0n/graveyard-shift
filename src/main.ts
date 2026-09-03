import { Application, Container, Graphics, Text } from 'pixi.js';
import './style.css';

const GAME_WIDTH = 1000;
const GAME_HEIGHT = 800;

const app = new Application();

await app.init({
  width: window.innerWidth,
  height: window.innerHeight,
  background: '#0b0d10',
  antialias: true,
});

document.body.appendChild(app.canvas);

// --------------------------------------------------
// Game root
// --------------------------------------------------

const game = new Container();

app.stage.addChild(game);

// --------------------------------------------------
// Background
// --------------------------------------------------

const background = new Graphics()
  .rect(0, 0, GAME_WIDTH, GAME_HEIGHT)
  .fill('#0b0d10');

game.addChild(background);

// --------------------------------------------------
// Title
// --------------------------------------------------

const title = new Text({
  text: 'GRAVEYARD SHIFT',
  style: {
    fontFamily: 'Arial',
    fontSize: 48,
    fontWeight: '900',
    fill: '#ffffff',
    align: 'center',
  },
});

title.anchor.set(0.5);
title.position.set(GAME_WIDTH / 2, 100);

game.addChild(title);

// --------------------------------------------------
// Subtitle
// --------------------------------------------------

const subtitle = new Text({
  text: 'THE DEAD END • OPEN 24 HOURS',
  style: {
    fontFamily: 'Arial',
    fontSize: 18,
    fontWeight: '700',
    fill: '#8fdcff',
    align: 'center',
  },
});

subtitle.anchor.set(0.5);
subtitle.position.set(GAME_WIDTH / 2, 145);

game.addChild(subtitle);

// --------------------------------------------------
// Reel area
// --------------------------------------------------

const reelArea = new Container();

reelArea.position.set(GAME_WIDTH / 2, 390);

game.addChild(reelArea);

// Reel frame
const reelFrame = new Graphics()
  .roundRect(-310, -180, 620, 360, 20)
  .fill('#151a20')
  .stroke({
    color: '#38434d',
    width: 4,
  });

reelArea.addChild(reelFrame);

// Reel window
const reelWindow = new Graphics()
  .roundRect(-290, -160, 580, 320, 12)
  .fill('#080a0d');

reelArea.addChild(reelWindow);

// --------------------------------------------------
// Placeholder reel cells
// --------------------------------------------------

const CELL_WIDTH = 112;
const CELL_HEIGHT = 96;
const GAP = 6;

for (let row = 0; row < 3; row++) {
  for (let col = 0; col < 5; col++) {
    const x =
      -((5 * CELL_WIDTH + 4 * GAP) / 2) +
      col * (CELL_WIDTH + GAP);

    const y =
      -((3 * CELL_HEIGHT + 2 * GAP) / 2) +
      row * (CELL_HEIGHT + GAP);

    const cell = new Graphics()
      .roundRect(x, y, CELL_WIDTH, CELL_HEIGHT, 8)
      .fill('#171d24')
      .stroke({
        color: '#2b353e',
        width: 2,
      });

    reelArea.addChild(cell);

    const cellText = new Text({
      text: `${col + 1}-${row + 1}`,
      style: {
        fontFamily: 'Arial',
        fontSize: 16,
        fill: '#56636e',
      },
    });

    cellText.anchor.set(0.5);
    cellText.position.set(
      x + CELL_WIDTH / 2,
      y + CELL_HEIGHT / 2,
    );

    reelArea.addChild(cellText);
  }
}

// --------------------------------------------------
// Spin button
// --------------------------------------------------

const spinButton = new Graphics()
  .roundRect(-100, -30, 200, 60, 30)
  .fill('#252d35')
  .stroke({
    color: '#8fdcff',
    width: 2,
  });

spinButton.position.set(GAME_WIDTH / 2, 590);

game.addChild(spinButton);

const spinText = new Text({
  text: 'SPIN',
  style: {
    fontFamily: 'Arial',
    fontSize: 24,
    fontWeight: '900',
    fill: '#ffffff',
  },
});

spinText.anchor.set(0.5);
spinText.position.set(GAME_WIDTH / 2, 590);

game.addChild(spinText);

// --------------------------------------------------
// HUD
// --------------------------------------------------

const balanceText = new Text({
  text: 'BALANCE  $100.00',
  style: {
    fontFamily: 'Arial',
    fontSize: 18,
    fontWeight: '700',
    fill: '#ffffff',
  },
});

balanceText.anchor.set(0.5);
balanceText.position.set(320, 680);

game.addChild(balanceText);

const betText = new Text({
  text: 'BET  $1.00',
  style: {
    fontFamily: 'Arial',
    fontSize: 18,
    fontWeight: '700',
    fill: '#ffffff',
  },
});

betText.anchor.set(0.5);
betText.position.set(500, 680);

game.addChild(betText);

const winText = new Text({
  text: 'WIN  $0.00',
  style: {
    fontFamily: 'Arial',
    fontSize: 18,
    fontWeight: '700',
    fill: '#ffffff',
  },
});

winText.anchor.set(0.5);
winText.position.set(680, 680);

game.addChild(winText);

// --------------------------------------------------
// Responsive logical resolution
// --------------------------------------------------

function resizeGame() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  app.renderer.resize(width, height);

  const scaleX = width / GAME_WIDTH;
  const scaleY = height / GAME_HEIGHT;

  const scale = Math.min(scaleX, scaleY);

  game.scale.set(scale);

  game.x = (width - GAME_WIDTH * scale) / 2;
  game.y = (height - GAME_HEIGHT * scale) / 2;
}

window.addEventListener('resize', resizeGame);

resizeGame();