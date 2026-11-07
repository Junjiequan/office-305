import { Boot } from './boot.js';
import { GameScene } from './game.js';
import { initUI } from './ui.js';

const game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', width: 1280, height: 720, backgroundColor: '#dfe4ea',
  scale: { mode: Phaser.Scale.NONE }, render: { antialias: true, antialiasGL: true, roundPixels: false, powerPreference: 'high-performance' },
  input: { mouse: { preventDefaultWheel: true }, touch: true }, scene: [Boot, GameScene],
});
window.__phaser = game;
initUI(game);
