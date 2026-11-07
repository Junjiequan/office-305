// The HUD, menus and dialogue are plain HTML on top of the game canvas (and scaled with it).
import { AVATARS } from './data.js';
import { sfx } from './fx.js';

export const UI = { game: null, handlers: {}, el: {} };
const $ = id => document.getElementById(id);
const cache = {};

export function initUI(game) {
  UI.game = game; const wrap = $('wrap'), ui = document.createElement('div'); ui.id = 'ui'; wrap.appendChild(ui);
  ui.innerHTML = `
  <div id="hud">
    <div id="loc" class="panel"><small id="locbuild">Building 305 · DTU Lyngby</small><div id="locname"></div><div id="locfloor"></div></div>
    <div id="mini" class="panel"><canvas id="minicv" width="200" height="140"></canvas></div>
    <div id="hint"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk &nbsp; <kbd>Shift</kbd> hurry &nbsp; <kbd>E</kbd> talk · sit · stairs<br><kbd>Esc</kbd> pause &nbsp; <kbd>M</kbd> mute</div>
    <div id="prompt" class="panel"></div>
    <div id="dialog" class="panel"><div id="dlgname"></div><div id="dlgtext"></div><div id="dlgnext">E · next</div></div>
    <div id="toast"></div>
  </div>
  <div id="menu" class="overlay show">
    <h1>Office 305</h1><div class="sub">Building 305 · DTU Lyngby · two floors and a roof to explore</div>
    <div class="cards" id="cards"></div>
    <button class="btn" id="startbtn">Walk in</button>
    <div class="hint"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk &nbsp; <kbd>Shift</kbd> hurry &nbsp; <kbd>E</kbd> talk to a colleague, sit down, take the stairs &nbsp; <kbd>Esc</kbd> pause &nbsp; <kbd>M</kbd> mute</div>
  </div>
  <div id="pause" class="overlay"><div class="big">Paused</div><div class="stats">Take a breath, the coffee will still be warm.</div><div><button class="btn" id="resume">Resume</button><button class="btn alt" id="quit">Change look</button></div></div>`;
  const fit = () => { ui.style.transform = `scale(${wrap.clientWidth / 1280})`; };
  fit(); window.addEventListener('resize', fit);
  for (const id of ['hud', 'menu', 'pause', 'toast', 'prompt', 'dialog']) UI.el[id] = $(id);
  UI.miniCtx = $('minicv').getContext('2d');
  window.addEventListener('boot-done', buildMenu);
  $('startbtn').onclick = () => startRun(UI.selected || 'ninja');
  $('resume').onclick = () => UI.handlers.resume && UI.handlers.resume();
  $('quit').onclick = () => { UI.show('pause', false); showMenu(); };
  window.addEventListener('keydown', e => { if (e.code === 'KeyM') sfx.toggleMute(); });
  document.addEventListener('pointerdown', () => sfx.unlock(), { once: true });
}
UI.show = (id, on = true) => UI.el[id].classList[on ? 'add' : 'remove']('show');
function startRun(hero) {
  sfx.unlock(); UI.show('menu', false); UI.show('pause', false); UI.el.hud.style.display = 'block';
  const g = UI.game; if (g.scene.isActive('Game') || g.scene.isPaused('Game')) g.scene.stop('Game'); g.scene.start('Game', { hero, floor: 0, fresh: true });
}
export function showMenu() {
  const g = UI.game; if (g.scene.isActive('Game') || g.scene.isPaused('Game')) g.scene.stop('Game');
  UI.el.hud.style.display = 'none'; UI.show('pause', false); UI.show('menu', true); UI.dialog(null);
}
function buildMenu() {
  const cards = $('cards'); cards.innerHTML = ''; UI.selected = 'boxer'; UI.cardCanvases = {};
  for (const [k, h] of Object.entries(AVATARS)) {
    const d = document.createElement('div'); d.className = 'card' + (k === UI.selected ? ' sel' : ''); d.dataset.k = k;
    d.innerHTML = `<canvas width="128" height="128"></canvas><h3>${h.name}</h3><p>${h.blurb}</p>`;
    d.onclick = () => { UI.selected = k; localStorage.setItem('office305Hero', k); [...cards.children].forEach(c => c.classList.toggle('sel', c.dataset.k === k)); sfx.click(); }; d.ondblclick = () => startRun(k);
    cards.appendChild(d); UI.cardCanvases[k] = d.querySelector('canvas');
  }
  let f = 0, last = 0; const tick = t => { if (t - last > 140) { last = t; f++; for (const [k, c] of Object.entries(UI.cardCanvases)) { const tex = UI.game.textures.get('npc_you_idle').getSourceImage(), x = c.getContext('2d'); x.clearRect(0, 0, 128, 128); x.drawImage(tex, (f % 6) * 128, 0, 128, 128, 0, 0, 128, 128); } } requestAnimationFrame(tick); }; requestAnimationFrame(tick);
}
// ---- called by the game scene
UI.location = (name, floorText) => { const set = (id, v) => { if (cache[id] !== v) { cache[id] = v; $(id).textContent = v; } }; set('locname', name); set('locfloor', floorText); };
UI.toast = (title, sub = '', color = '#ffe3a0', ms = 2400) => { const t = UI.el.toast; t.innerHTML = `<span style="color:${color}">${title}</span>${sub ? `<small>${sub}</small>` : ''}`; t.style.opacity = 1; clearTimeout(UI._tt); UI._tt = setTimeout(() => { t.style.opacity = 0; }, ms); };
UI.prompt = text => { const p = UI.el.prompt; if (!text) { p.style.display = 'none'; return; } if (cache.prompt !== text) { cache.prompt = text; p.innerHTML = text; } p.style.display = 'block'; };
UI.dialog = (name, role, text, more) => { const d = UI.el.dialog; if (!name) { d.style.display = 'none'; return; } d.style.display = 'block'; $('dlgname').innerHTML = `${name}<span>${role || ''}</span>`; $('dlgtext').textContent = text; $('dlgnext').textContent = more ? 'E · next' : 'E · close'; };
