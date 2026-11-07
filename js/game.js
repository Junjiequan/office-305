import { PPM, TW, TH, K, PS, CHAR, SEAT_POSE, AVATARS, ZONES, WALL_TEX } from './data.js';
import { buildFloor, ZONE_LIST, TINTS, BW, BH } from './office.js';
import { sfx, clamp, lerp, TAU, dirOf } from './fx.js';
import { UI } from './ui.js';
import { makeAnimsFor } from './boot.js';

const hash = (x, y) => (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0;
const TINT_RGB = { pink: '216,140,150', ochre: '226,160,70', green: '110,170,120', blue: '100,130,200' };
const COFFEE_LINES = ['Tastes like Monday.', 'Strong enough to stand a spoon in.', 'You feel 12% more productive.', 'The good machine. The other floor is jealous.', 'Oat milk, naturally.'];

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }
  init(d) { this.d = d; }
  preload() { const reg = this.registry.get('sheets'); this.need = []; }
  create() {
    const d = this.d; this.hero = d.hero; this.floor = d.floor || 0; this.sheets = this.registry.get('sheets'); makeAnimsFor(this, this.need);
    this.L = buildFloor(this.floor); const L = this.L; this.worldW = L.W * TW; this.worldH = L.H * TH; this.t = 0; this.paused = false; this.frame = 0; this.lightsDyn = []; window.__g = this;
    this.propSolid = new Uint8Array(L.W * L.H); for (const p of L.props) if (p.solid) for (let j = 0; j < p.h; j++) for (let i = 0; i < p.w; i++) this.propSolid[(p.y + j) * L.W + (p.x + i)] = 1;
    for (const s of L.stairs) for (let j = 0; j < s.h; j++) for (let i = 0; i < s.w; i++) this.propSolid[(s.y + j) * L.W + (s.x + i)] = 1;
    this.explored = new Uint8Array(L.W * L.H); this.paint(); this.makeProps(); this.makeNpcs(); this.makePlayer(); this.setupInput(); this.setupCamera();
    this.dark = document.getElementById('dark').getContext('2d'); this.zoomBase = 1.3; this.room = null; this.talk = null; this.sit = null;
    this.cameras.main.fadeIn(450, 11, 10, 18); this.events.once('shutdown', () => { UI.prompt(null); UI.dialog(null); });
    if (d.fresh) UI.toast('Building 305', 'Friday afternoon · take a look around', '#ffe3a0', 3200);
  }

  // ---------------------------------------------------------------- painting
  paint() {
    const L = this.L, W = L.W, H = L.H, img = k => this.textures.get('tex_' + k).getSourceImage(), zI = ZONE_LIST.map(z => img(ZONES[z].tex)), wallI = img(WALL_TEX), grassI = img(ZONES.grass.tex);
    const wall = (x, y) => x < 0 || y < 0 || x >= W || y >= H || !L.cells[y * W + x], isFloor = (x, y) => !wall(x, y), ring = (x, y) => x === 0 || y === 0 || x === W - 1 || y === H - 1;
    const near = (x, y, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (isFloor(x + dx, y + dy)) return true; return false; };
    const CH = 1024, cols = Math.ceil(this.worldW / CH), rows = Math.ceil(this.worldH / CH), asphalt = ZONE_LIST.indexOf('asphalt'), carpet = ZONE_LIST.indexOf('carpet');
    for (let cj = 0; cj < rows; cj++) for (let ci = 0; ci < cols; ci++) {
      const x0 = ci * CH, y0 = cj * CH, w = Math.min(CH, this.worldW - x0), h = Math.min(CH, this.worldH - y0), c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.fillStyle = '#dfe4ea'; g.fillRect(0, 0, w, h);
      const cx0 = Math.floor(x0 / TW), cx1 = Math.min(W - 1, Math.floor((x0 + w) / TW)), cy0 = Math.floor(y0 / TH), cy1 = Math.min(H - 1, Math.floor((y0 + h) / TH));
      for (let y = cy0; y <= cy1; y++) for (let x = cx0; x <= cx1; x++) {
        const dx = x * TW - x0, dy = y * TH - y0, hs = hash(x, y), i = y * W + x;
        if (isFloor(x, y)) {
          const z = L.zone[i], zc = ZONES[ZONE_LIST[z]]; g.drawImage(zI[z], (x * 64) % 512, (y * 64) % 512, 64, 64, dx, dy, TW + 1, TH + 1);
          if (zc.lift > 0) { g.fillStyle = `rgba(255,255,255,${zc.lift})`; g.fillRect(dx, dy, TW + 1, TH + 1); } else if (zc.lift < 0) { g.fillStyle = `rgba(0,0,0,${-zc.lift})`; g.fillRect(dx, dy, TW + 1, TH + 1); }
          if (z === carpet && !L.tint[i]) { g.fillStyle = 'rgba(92,112,160,.30)'; g.fillRect(dx, dy, TW + 1, TH + 1); }
          if (L.tint[i]) { g.fillStyle = `rgba(${TINT_RGB[TINTS[L.tint[i]]]},.26)`; g.fillRect(dx, dy, TW + 1, TH + 1); }
          g.fillStyle = `rgba(0,0,0,${(hs % 100) / 100 * 0.07})`; g.fillRect(dx, dy, TW + 1, TH + 1);
          if (z === asphalt && (x - (this.L.ox + 14)) % 4 === 2 && y > this.L.oy + BH) { g.fillStyle = 'rgba(240,240,240,.55)'; g.fillRect(dx, dy, 3, TH + 1); }
        } else if (this.floor === 0 && ring(x, y)) { // the hedge round the yard
          g.drawImage(grassI, (x * 64) % 512, (y * 64) % 512, 64, 64, dx, dy, TW + 1, TH + 1); g.fillStyle = 'rgba(30,110,50,.45)'; g.fillRect(dx, dy, TW + 1, TH + 1);
          for (let k = 0; k < 5; k++) { g.fillStyle = `rgba(${40 + (hs >> k) % 40},${110 + (hs >> (k + 3)) % 60},50,.55)`; g.beginPath(); g.arc(dx + (hs >> k) % 60, dy + (hs >> (k + 2)) % 38, 8 + k % 3 * 3, 0, TAU); g.fill(); }
        } else if (isFloor(x, y + 1)) { // a wall face: plaster with a skirting board
          g.drawImage(wallI, (x * 64) % 512, (y * 64) % 448, 64, 64, dx, dy, TW + 1, TH + 1); g.fillStyle = 'rgba(244,240,230,.28)'; g.fillRect(dx, dy, TW + 1, TH + 1);
          if (L.wallTint[i]) { g.fillStyle = `rgba(${TINT_RGB[TINTS[L.wallTint[i]]]},.62)`; g.fillRect(dx, dy, TW + 1, TH - 7); }
          const gr = g.createLinearGradient(0, dy, 0, dy + TH); gr.addColorStop(0, 'rgba(0,0,0,.05)'); gr.addColorStop(0.7, 'rgba(0,0,0,.10)'); gr.addColorStop(1, 'rgba(0,0,0,.32)'); g.fillStyle = gr; g.fillRect(dx, dy, TW + 1, TH + 1);
          g.fillStyle = 'rgba(58,56,66,.92)'; g.fillRect(dx, dy + TH - 8, TW + 1, 8); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(dx, dy + TH - 9, TW + 1, 1); g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(dx, dy, TW + 1, 2);
        } else if (near(x, y, 2)) { // the top of a wall
          g.drawImage(wallI, (x * 64) % 512, (y * 64) % 512, 64, 64, dx, dy, TW + 1, TH + 1); g.fillStyle = 'rgba(250,248,242,.40)'; g.fillRect(dx, dy, TW + 1, TH + 1);
          if (isFloor(x - 1, y)) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(dx, dy, 2, TH); } if (isFloor(x + 1, y)) { g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(dx + TW - 3, dy, 3, TH); } if (isFloor(x, y - 1)) { g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(dx, dy, TW + 1, 3); }
        } else { g.drawImage(zI[ZONE_LIST.indexOf('paving')], (x * 64) % 512, (y * 64) % 512, 64, 64, dx, dy, TW + 1, TH + 1); g.fillStyle = 'rgba(232,238,246,.62)'; g.fillRect(dx, dy, TW + 1, TH + 1); }
      }
      for (let y = cy0; y <= cy1; y++) for (let x = cx0; x <= cx1; x++) if (isFloor(x, y)) { // ambient occlusion where the floor meets a wall
        const dx = x * TW - x0, dy = y * TH - y0;
        if (wall(x, y - 1) && !ring(x, y - 1)) { const gr = g.createLinearGradient(0, dy, 0, dy + 16); gr.addColorStop(0, 'rgba(0,0,0,.34)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(dx, dy, TW + 1, 16); }
        if (wall(x - 1, y)) { const gr = g.createLinearGradient(dx, 0, dx + 12, 0); gr.addColorStop(0, 'rgba(0,0,0,.26)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(dx, dy, 12, TH + 1); }
        if (wall(x + 1, y)) { const gr = g.createLinearGradient(dx + TW, 0, dx + TW - 12, 0); gr.addColorStop(0, 'rgba(0,0,0,.26)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(dx + TW - 12, dy, 12, TH + 1); }
      }
      const key = `chunk_${this.floor}_${ci}_${cj}`; if (this.textures.exists(key)) this.textures.remove(key); this.textures.addCanvas(key, c); this.add.image(x0, y0, key).setOrigin(0).setDepth(0);
    }
    for (const s of L.signs) this.add.text(s.x * TW, (s.y + 0.5) * TH, s.text, { fontFamily: 'Avenir Next, Segoe UI, sans-serif', fontStyle: 'bold', fontSize: '13px', color: '#fff7e6', backgroundColor: 'rgba(24,18,36,.72)', padding: { x: 8, y: 3 } }).setOrigin(0.5).setDepth(30000);
  }
  isWall(cx, cy) { const L = this.L; return cx < 0 || cy < 0 || cx >= L.W || cy >= L.H || !L.cells[cy * L.W + cx]; }
  solidAt(px, py) { const cx = Math.floor(px / TW), cy = Math.floor(py / TH); return this.isWall(cx, cy) || this.propSolid[cy * this.L.W + cx] === 1; }
  boxFree(x, y, hx, hy) { for (const [ax, ay] of [[x - hx, y - hy], [x + hx, y - hy], [x - hx, y + hy], [x + hx, y + hy], [x, y - hy], [x, y + hy], [x - hx, y], [x + hx, y]]) if (this.solidAt(ax, ay)) return false; return true; }
  moveEntity(e, dx, dy) { if (dx && this.boxFree(e.x + dx, e.y, e.hx, e.hy)) e.x += dx; if (dy && this.boxFree(e.x, e.y + dy, e.hx, e.hy)) e.y += dy; }

  // ---------------------------------------------------------------- furniture, colleagues, player
  makeProps() {
    this.items = []; this.chairs = []; this.coffee = [];
    for (const p of this.L.props) {
      const key = 'prop_' + p.t, info = this.sheets[key]; if (!info) continue; const cx = (p.x + p.w / 2) * TW, cy = (p.y + p.h / 2) * TH, bottom = cy + p.h * TH / 2;
      if (!p.chair && !['whiteboard', 'tv', 'tv_w'].includes(p.t) && p.t !== 'bench') this.add.image(cx, cy + 2, 'shadow').setScale(p.w * TW * 0.95 / 64, p.h * TH * 0.95 / 32 * 0.5 + 0.12).setAlpha(0.9).setDepth(1);
      const s = this.add.sprite(cx, cy, key, 0).setOrigin(0.5, info.originY).setScale(PS * PPM * info.view / 128).setDepth(p.chair ? cy + 6 : ['whiteboard', 'tv', 'tv_w'].includes(p.t) ? cy - 6 : bottom); p.spr = s; p.cx = cx; p.cy = cy;
      if (p.chair) this.chairs.push(p); if (p.label === 'coffee') this.coffee.push(p);
    }
    for (const s of this.L.stairs) { const spr = this.add.image((s.x + 1) * TW, (s.y + 1) * TH, s.up ? 'stairs_up' : 'stairs_down').setScale(0.7).setDepth((s.y + 2) * TH); s.cx = (s.x + 1) * TW; s.cy = (s.y + 1) * TH; s.spr = spr; }
  }
  makeNpcs() {
    this.npcs = []; const L = this.L;
    for (const n of L.npcs) {
      const prefix = 'npc_' + n.id, info = this.sheets[prefix + '_idle']; if (!info) continue; const seat = n.seat, pose = seat && SEAT_POSE[seat.dir], x = seat ? (n.x + 0.5) * TW + pose.dx : (n.x + 0.5) * TW, y = seat ? (n.y + 0.5) * TH + pose.dy : (n.y + 0.5) * TH;
      const spr = this.add.sprite(x, y, prefix + '_idle', 0).setOrigin(0.5, info.originY).setScale(PPM * info.view / 128 * CHAR).setDepth(y), sh = this.add.image(x, y, 'shadow').setScale(0.7 * CHAR, 0.9 * CHAR).setDepth(1);
      const npc = Object.assign({}, n, { x, y, hx: 14, hy: 8, prefix, spr, sh, dir: n.dir || 0, anim: '', route: null, wait: 0, line: 0 });
      if (n.id === 'freja' && this.floor === 0) npc.route = [[x, y], [x + 14 * TW, y]];
      if (seat) { npc.sitting = true; npc.dir = seat.dir; npc.seatY = (n.y + 0.5) * TH; spr.setOrigin(0.5, this.sheets[prefix + '_sit'].originY); this.setAnim(npc, 'sit'); } else this.setAnim(npc, 'idle'); npc.spr.anims.setProgress(Math.random()); this.npcs.push(npc);
    }
  }
  setAnim(e, a, force) { const key = `${e.prefix}_${a}_${e.dir}`; if (force || e.spr.anims.currentAnim?.key !== key) { e.spr.play(key); } e.anim = a; }
  makePlayer() {
    const prefix = 'npc_you', info = this.sheets[prefix + '_idle'], d = this.d; let sp = this.L.spawn, spawnX = (sp.x) * TW, spawnY = sp.y * TH;
    if (d.from) { const st = this.L.stairs.find(s => s.id === d.from); if (st) { spawnX = (st.x + 1) * TW; spawnY = (st.y + 3.1) * TH; } }
    const p = this.p = { prefix, x: spawnX, y: spawnY, vx: 0, vy: 0, hx: 12, hy: 8, dir: 0, moving: false, anim: '', stepT: 0, speed: AVATARS[this.hero].speed };
    p.spr = this.add.sprite(p.x, p.y, prefix + '_idle', 0).setOrigin(0.5, info.originY).setScale(PPM * info.view / 128 * CHAR).setDepth(p.y); p.sh = this.add.image(p.x, p.y, 'shadow').setScale(0.75 * CHAR, 0.95 * CHAR).setDepth(1);
    this.setAnim(p, 'idle', true); this.playerLight = { x: p.x, y: p.y - 30, r: 190, color: 0xffeccc, k: 0.55 };
  }
  setupInput() {
    const kb = this.input.keyboard; this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,E,ESC,P,SPACE'); kb.on('keydown-ESC', () => this.togglePause()); kb.on('keydown-P', () => this.togglePause()); kb.on('keydown-E', () => this.interact()); kb.on('keydown-SPACE', () => { if (this.talk) this.interact(); });
    UI.handlers.resume = () => this.togglePause(false);
  }
  setupCamera() { const c = this.cameras.main; c.setBounds(0, 0, this.worldW, this.worldH); this.camTarget = this.add.zone(this.p.x, this.p.y - 30, 4, 4); c.startFollow(this.camTarget, true, 0.09, 0.09); this.zoom = 1.3; c.setZoom(this.zoom); c.centerOn(this.p.x, this.p.y - 30); }
  togglePause(force) { if (this.talk) return; this.paused = force === undefined ? !this.paused : force; UI.show('pause', this.paused); }

  // ---------------------------------------------------------------- interaction
  nearest() {
    const p = this.p, best = { kind: null, d: 1e9 }, test = (kind, obj, x, y, r) => { const d = Math.hypot(x - p.x, (y - p.y) / K); if (d < r && d < best.d) { best.kind = kind; best.obj = obj; best.d = d; } };
    for (const n of this.npcs) test('npc', n, n.x, n.y, 92); for (const c of this.chairs) if (!c.taken) test('chair', c, c.cx, c.cy, 62); for (const s of this.L.stairs) test('stairs', s, s.cx, s.cy + 30, 105); for (const c of this.coffee) test('coffee', c, c.cx, c.cy + 20, 90); return best;
  }
  interact() {
    if (this.paused || this.transition) return; const p = this.p;
    if (this.talk) return this.nextLine();
    if (this.sit) return this.standUp();
    const n = this.nearest(); if (!n.kind) return;
    if (n.kind === 'npc') { this.talk = { npc: n.obj, i: 0 }; n.obj.wait = 99; sfx.chat(); this.showLine(); }
    else if (n.kind === 'chair') this.sitDown(n.obj);
    else if (n.kind === 'stairs') this.useStairs(n.obj);
    else if (n.kind === 'coffee') { sfx.chat(); UI.toast('Coffee', COFFEE_LINES[Math.floor(Math.random() * COFFEE_LINES.length)], '#f0d6a8', 2200); }
  }
  showLine() { const t = this.talk, n = t.npc; UI.dialog(n.name, n.role, n.lines[t.i], t.i < n.lines.length - 1); }
  nextLine() { const t = this.talk; t.i++; if (t.i >= t.npc.lines.length) { t.npc.wait = 1.2; this.talk = null; UI.dialog(null); return; } sfx.chat(); this.showLine(); }
  sitDown(ch) {
    const p = this.p, pose = SEAT_POSE[ch.dir] || SEAT_POSE[0]; this.sit = { chair: ch, from: { x: p.x, y: p.y }, t0: this.time.now };
    p.x = ch.cx + pose.dx; p.y = ch.cy + pose.dy; p.vx = p.vy = 0; p.dir = ch.dir; sfx.sit(); // the chair direction picks the seated animation row
    this.tweens.add({ targets: this.cameras.main, zoom: 1.6, duration: 500, ease: 'Cubic.easeInOut' }); this.zoom = 1.6;
    UI.toast('Seated', 'Soon: something to do at your desk', '#f0d6a8', 2600);
  }
  standUp() { const s = this.sit; if (!s || s.leaving) return; s.leaving = true; this.p.spr.playReverse(`${this.p.prefix}_sitdown_${this.p.dir}`); sfx.sit(); this.time.delayedCall(360, () => this.finishStand()); }
  finishStand() { const p = this.p, s = this.sit; if (!s) return; this.sit = null; const c = s.chair; p.x = s.from.x; p.y = s.from.y; if (!this.boxFree(p.x, p.y, p.hx, p.hy)) for (const [dx, dy] of [[0, 46], [0, -46], [-34, 10], [34, 10], [0, 0]]) { p.x = c.cx + dx; p.y = c.cy + 6 + dy; if (this.boxFree(p.x, p.y, p.hx, p.hy)) break; } this.tweens.add({ targets: this.cameras.main, zoom: 1.3, duration: 450, ease: 'Cubic.easeInOut' }); this.zoom = 1.3; }
  useStairs(s) {
    this.transition = true; sfx.stairs(); this.cameras.main.fadeOut(300, 11, 10, 18); UI.prompt(null);
    this.time.delayedCall(320, () => this.scene.restart({ hero: this.hero, floor: s.to, from: s.id }));
  }

  // ---------------------------------------------------------------- per frame
  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05); this.frame++; if (this.paused) { this.updateLighting(); return; } this.t += dt;
    this.updatePlayer(dt); this.updateNpcs(dt); this.updateRoom(); this.updatePrompt(); this.updateLighting(); if (this.frame % 8 === 0) this.drawMini();
  }
  updatePlayer(dt) {
    const p = this.p, k = this.keys; let ix = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0), iy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0); const il = Math.hypot(ix, iy); if (il) { ix /= il; iy /= il; }
    if (this.sit) { if (il) this.standUp(); else { p.moving = false; this.syncPlayer(); this.animPlayer(); return; } }
    if (this.talk) { ix = iy = 0; const n = this.talk.npc; if (!n.sitting) n.dir = dirOf(p.x - n.x, p.y - n.y); }
    const sp = p.speed * PPM * (k.SHIFT.isDown ? 1.55 : 1); p.vx = lerp(p.vx, ix * sp, Math.min(1, dt * 12)); p.vy = lerp(p.vy, iy * sp * K, Math.min(1, dt * 12));
    this.moveEntity(p, p.vx * dt, p.vy * dt); p.moving = il > 0.1 && (Math.abs(p.vx) + Math.abs(p.vy)) > 8;
    for (const n of this.npcs) { const dx = p.x - n.x, dy = (p.y - n.y) / K, d = Math.hypot(dx, dy); if (d < 34 && d > 0.1) { p.x += dx / d * (34 - d) * 0.6; p.y += dy / d * (34 - d) * 0.6 * K; } }
    if (il) p.dir = dirOf(ix, iy); if (p.moving) { p.stepT -= dt; if (p.stepT <= 0) { sfx.step(); p.stepT = k.SHIFT.isDown ? 0.22 : 0.34; } }
    this.syncPlayer(); this.animPlayer();
    const sx = Math.floor(p.x / TW), sy = Math.floor(p.y / TH), L = this.L; for (let dy = -7; dy <= 7; dy++) for (let dx = -11; dx <= 11; dx++) { if (dx * dx / 121 + dy * dy / 49 > 1) continue; const x = sx + dx, y = sy + dy; if (x >= 0 && y >= 0 && x < L.W && y < L.H) this.explored[y * L.W + x] = 1; }
  }
  syncPlayer() { const p = this.p, seat = this.sit ? this.sit.chair : null; p.spr.setPosition(p.x, p.y + (seat ? 8 : 0)).setDepth(seat ? seat.cy + 14 + (seat.dir === 4 ? 34 : 0) : p.y); p.sh.setPosition(p.x, p.y).setDepth(seat ? seat.cy + 3 : p.y - 1); this.playerLight.x = p.x; this.playerLight.y = p.y - 34; this.camTarget.setPosition(p.x, p.y - 34); }
  animPlayer() { const p = this.p; if (this.sit) { if (this.sit.leaving) return; p.spr.setOrigin(0.5, this.sheets.npc_you_sit.originY); const k = `${p.prefix}_${this.time.now - this.sit.t0 > 800 ? 'sit' : 'sitdown'}_${p.dir}`; if (p.spr.anims.currentAnim?.key !== k) p.spr.play(k); return; } p.spr.setOrigin(0.5, this.sheets.npc_you_idle.originY); const a = p.moving ? 'move' : 'idle'; const key = `${p.prefix}_${a}_${p.dir}`; if (p.spr.anims.currentAnim?.key !== key) p.spr.play(key); p.spr.anims.timeScale = this.keys.SHIFT.isDown && p.moving ? 1.5 : 1; }
  updateNpcs(dt) {
    const p = this.p;
    for (const n of this.npcs) {
      if (n.sitting) { n.spr.setPosition(n.x, n.y + 8).setDepth(n.seatY + 14); n.sh.setPosition(n.x, n.y).setDepth(n.seatY + 3); continue; }
      const dx = p.x - n.x, dy = (p.y - n.y) / K, d = Math.hypot(dx, dy);
      if (n.route && n.wait <= 0) { const t = n.route[n.ri || 0], tx = t[0] - n.x, ty = (t[1] - n.y) / K, td = Math.hypot(tx, ty); if (td < 8) { n.ri = ((n.ri || 0) + 1) % n.route.length; n.wait = 3 + Math.random() * 3; } else { n.dir = dirOf(tx, ty * K); this.moveEntity(n, tx / td * 1.4 * PPM * dt, ty / td * 1.4 * PPM * dt * K); if (n.anim !== 'move') this.setAnim(n, 'move', true); else this.setAnim(n, 'move'); } }
      else { n.wait -= dt; if (n.anim !== 'idle' || n.spr.anims.currentAnim.key !== `${n.prefix}_idle_${n.dir}`) { if (d < 170 && !n.route) n.dir = dirOf(dx, dy * K); this.setAnim(n, 'idle', n.anim !== 'idle'); } else if (d < 170 && !n.route) { const nd = dirOf(dx, dy * K); if (nd !== n.dir) { n.dir = nd; this.setAnim(n, 'idle', true); } } }
      n.spr.setPosition(n.x, n.y).setDepth(n.y); n.sh.setPosition(n.x, n.y).setDepth(n.y - 1);
    }
  }
  roomAt(px, py) {
    const L = this.L, cx = Math.floor(px / TW), cy = Math.floor(py / TH), fl = ['Ground floor', 'First floor', 'Roof'][this.floor];
    for (const r of L.rooms) if (cx >= r.x && cx < r.x + r.w && cy >= r.y && cy < r.y + r.h) return { name: r.name, floor: fl };
    const bx = cx - L.ox, by = cy - L.oy; if (bx >= 0 && bx < BW && by >= 0 && by < BH) { if (this.floor === 2) return { name: ZONE_LIST[L.zone[cy * L.W + cx]] === 'grass' ? 'Roof garden' : 'Roof terrace', floor: fl }; if (bx <= 7 || bx >= 74) return { name: 'Stair hall', floor: fl }; return { name: 'Corridor', floor: fl }; }
    const z = ZONE_LIST[L.zone[cy * L.W + cx]]; return { name: z === 'asphalt' ? 'Parking' : z === 'grass' ? 'Lawn' : 'Yard', floor: 'Outside' };
  }
  updateRoom() { const r = this.roomAt(this.p.x, this.p.y); if (!this.room || r.name !== this.room.name) { this.room = r; UI.location(r.name, r.floor); } }
  updatePrompt() {
    if (this.talk || this.paused) { UI.prompt(null); return; } if (this.sit) { UI.prompt('<kbd>E</kbd> &nbsp; Stand up'); return; }
    const n = this.nearest(); const text = { npc: `<kbd>E</kbd> &nbsp; Talk to ${n.obj && n.obj.name}`, chair: '<kbd>E</kbd> &nbsp; Sit down', stairs: `<kbd>E</kbd> &nbsp; Stairs ${n.obj && n.obj.up ? 'up' : 'down'}`, coffee: '<kbd>E</kbd> &nbsp; Coffee' }[n.kind]; UI.prompt(text || null);
  }
  drawMini() {
    const g = UI.miniCtx, L = this.L, sx = 200 / L.W, sy = 140 / L.H; g.clearRect(0, 0, 200, 140);
    for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) { const i = y * L.W + x; if (!this.explored[i] || !L.cells[i]) continue; const z = ZONE_LIST[L.zone[i]]; g.fillStyle = z === 'grass' ? 'rgba(90,150,90,.7)' : z === 'asphalt' ? 'rgba(120,120,130,.7)' : 'rgba(215,205,235,.75)'; g.fillRect(x * sx, y * sy, sx + 0.5, sy + 0.5); }
    for (const s of L.stairs) { g.fillStyle = '#6ad0ff'; g.fillRect(s.cx / TW * sx - 2, s.cy / TH * sy - 2, 4, 4); }
    for (const n of this.npcs) if (this.explored[Math.floor(n.y / TH) * L.W + Math.floor(n.x / TW)]) { g.fillStyle = '#ffd36a'; g.fillRect(n.x / TW * sx - 1.5, n.y / TH * sy - 1.5, 3, 3); }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(this.p.x / TW * sx, this.p.y / TH * sy, 3, 0, TAU); g.fill();
  }
  updateLighting() { if (!this.lit) { this.lit = true; this.dark.clearRect(0, 0, 1280, 720); } } // bright, evenly lit: no darkness layer
}
