// Loads the pre-rendered sprites and textures, makes the small procedural textures, builds the animations.
import { ZONES, WALL_TEX } from './data.js';
import { TAU } from './fx.js';

const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const radial = (x, w, h, stops) => { const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.min(w, h) / 2); for (const [t, c] of stops) g.addColorStop(t, c); return g; };
const RATES = { idle: 7, walk: 11, move: 9, sit: 6, sitdown: 10 };
// animations for every loaded character sheet that does not have them yet (hero_ninja_walk -> hero_ninja_walk_<dir>)
export function makeAnimsFor(scene, keys) {
  const A = scene.anims, reg = scene.registry.get('sheets');
  for (const key of keys) { const m = reg[key]; if (!m || !scene.textures.exists(key) || key.startsWith('prop_')) continue; for (let d = 0; d < m.rows; d++) if (!A.exists(`${key}_${d}`)) A.create({ key: `${key}_${d}`, frames: A.generateFrameNumbers(key, { start: d * m.cols, end: d * m.cols + m.cols - 1 }), frameRate: RATES[key.split('_').pop()] || 8, repeat: key.endsWith('_sitdown') ? 0 : -1 }); }
}
export class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    this.load.on('progress', v => { const f = document.getElementById('barfill'); if (f) f.style.width = (v * 100) + '%'; });
    this.load.json('man_heroes', 'assets/sprites/manifest_heroes.json'); this.load.json('man_office', 'assets/sprites/manifest_office.json');
    for (const t of [...new Set([...Object.values(ZONES).map(z => z.tex), WALL_TEX])]) this.load.image('tex_' + t, `assets/tex/${t}_d.jpg`);
  }
  create() {
    const reg = this.registry.set('sheets', {}) && this.registry.get('sheets');
    for (const k of ['man_heroes', 'man_office']) for (const [file, m] of Object.entries(this.cache.json.get(k))) {
      const key = file.replace('sprites/', '').replace('.png', ''); reg[key] = Object.assign({ file }, m);
      if (key.startsWith('prop_') || key.startsWith('npc_') || /^hero_\w+_idle$/.test(key)) this.load.spritesheet(key, 'assets/' + file, { frameWidth: m.frame, frameHeight: m.frame });
    }
    this.load.once('complete', () => { this.makeTextures(); makeAnimsFor(this, Object.keys(reg)); const l = document.getElementById('loading'); if (l) l.style.display = 'none'; window.dispatchEvent(new Event('boot-done')); });
    this.load.start();
  }
  makeTextures() {
    const add = (key, w, h, draw) => { const [c, x] = cv(w, h); draw(x, w, h); this.textures.addCanvas(key, c); };
    add('glow', 128, 128, (x, w, h) => { x.fillStyle = radial(x, w, h, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,.55)'], [0.6, 'rgba(255,255,255,.12)'], [1, 'rgba(255,255,255,0)']]); x.fillRect(0, 0, w, h); });
    add('spark', 32, 32, (x, w, h) => { x.fillStyle = radial(x, w, h, [[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,.5)'], [1, 'rgba(255,255,255,0)']]); x.fillRect(0, 0, w, h); });
    add('puff', 64, 64, (x, w, h) => { x.fillStyle = radial(x, w, h, [[0, 'rgba(255,255,255,.55)'], [0.6, 'rgba(255,255,255,.2)'], [1, 'rgba(255,255,255,0)']]); x.fillRect(0, 0, w, h); });
    add('shadow', 64, 32, (x, w, h) => { x.save(); x.scale(1, h / w); x.fillStyle = radial(x, w, w, [[0, 'rgba(0,0,0,.55)'], [0.65, 'rgba(0,0,0,.28)'], [1, 'rgba(0,0,0,0)']]); x.fillRect(0, 0, w, w); x.restore(); });
    const stairs = (key, up) => add(key, 192, 140, (x, w, h) => { // a light concrete staircase seen from the front, with a handrail
      x.fillStyle = 'rgba(0,0,0,.28)'; x.beginPath(); x.ellipse(w / 2, h - 12, 84, 14, 0, 0, TAU); x.fill();
      for (let i = 0; i < 6; i++) { const y = 16 + i * 17, ins = up ? 8 + i * 2 : 8 + (5 - i) * 2, g = x.createLinearGradient(0, y, 0, y + 17); g.addColorStop(0, up ? `rgb(${236 - i * 12},${232 - i * 12},${224 - i * 12})` : `rgb(${176 + i * 10},${172 + i * 10},${166 + i * 10})`); g.addColorStop(1, 'rgb(160,156,150)'); x.fillStyle = g; x.fillRect(ins, y, w - ins * 2, 17); x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(ins, y + 14, w - ins * 2, 3); }
      x.strokeStyle = '#9aa0a8'; x.lineWidth = 5; x.lineCap = 'round'; for (const sx of [6, w - 6]) { x.beginPath(); x.moveTo(sx, 14); x.lineTo(sx, h - 26); x.stroke(); } x.fillStyle = '#3a86d8'; x.beginPath(); const ay = 70; x.moveTo(w / 2, up ? ay - 18 : ay + 18); x.lineTo(w / 2 - 14, up ? ay + 6 : ay - 6); x.lineTo(w / 2 + 14, up ? ay + 6 : ay - 6); x.closePath(); x.fill(); });
    stairs('stairs_up', true); stairs('stairs_down', false);
  }
}
