// Monsters, bosses and props, built from primitives (and the human kit for the goblin and skeleton) and rendered to sprite sheets.
import * as THREE from 'three';
import { scene, mat, DIRS, yUp, katanaItem, makeHero, show, dur, sheet, setView, sleep } from './sprites.js';

const TAU = Math.PI * 2, V = (x, y, z) => new THREE.Vector3(x, y, z), clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t), tri = u => 1 - Math.abs(2 * u - 1);
const add = (g, mesh, x = 0, y = 0, z = 0) => { mesh.position.set(x, y, z); g.add(mesh); return mesh; };
const ball = (r, m, sx = 1, sy = 1, sz = 1, w = 28, h = 20) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, w, h), m); s.scale.set(sx, sy, sz); return s; };
function seg(m, r) { const c = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 10), m); c.userData.r = r; return c; }
function place(c, a, b) { const d = b.clone().sub(a), L = d.length(); c.position.copy(a).addScaledVector(d, 0.5); c.quaternion.setFromUnitVectors(yUp, d.clone().normalize()); c.scale.set(c.userData.r, L, c.userData.r); }
function eyes(g, y, z, spread, r = 0.07, look = 0, color = 0x15131c) {
  for (const s of [-1, 1]) { add(g, ball(r, mat(0xffffff, 0.2, 0, { clearcoat: 1 })), s * spread, y, z); add(g, ball(r * 0.55, mat(color, 0.2, 0, { clearcoat: 1 })), s * spread + look * s * 0.01, y - r * 0.05, z + r * 0.62); add(g, ball(r * 0.2, mat(0xffffff, 0.1)), s * spread - 0.015, y + r * 0.2, z + r * 0.9); }
}
// a rock-like lumpy blob for golems and bones
function rock(r, m, sx = 1, sy = 1, sz = 1, seed = 1) {
  const g = new THREE.IcosahedronGeometry(r, 1), p = g.attributes.position; let h = seed * 9301;
  for (let i = 0; i < p.count; i++) { h = (h * 9301 + 49297) % 233280; const k = 1 + (h / 233280 - 0.5) * 0.28; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); }
  g.computeVertexNormals(); const mesh = new THREE.Mesh(g, m); mesh.scale.set(sx, sy, sz); return mesh;
}

// ---- builders: each returns { root, set(anim, u, loop) } ---------------------------------------------------------------
function slime(color = 0x5ed56b, size = 1) {
  const root = new THREE.Group(), g = new THREE.Group(); root.add(g);
  const jelly = mat(color, 0.12, 0, { transparent: true, opacity: 0.95, clearcoat: 0.55, clearcoatRoughness: 0.12, envMapIntensity: 0.9 });
  const body = add(g, ball(0.45, jelly, 1, 0.82, 1, 40, 28), 0, 0.37, 0);
  const c2 = new THREE.Color(color).multiplyScalar(1.25); const core = add(g, ball(0.2, mat(c2.getHex(), 0.5, 0, { emissive: color, emissiveIntensity: 0.4, transparent: true, opacity: 0.9 }), 1, 0.8, 1), 0.04, 0.3, -0.12);
  const face = new THREE.Group(); g.add(face); eyes(face, 0.45, 0.34, 0.15, 0.085); const mouth = add(face, new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 16, Math.PI), mat(0x25422c, 0.5)), 0, 0.33, 0.43); mouth.rotation.z = Math.PI;
  root.scale.setScalar(size);
  return { root, set(a, u) {
    let sy = 1, sxz = 1, y = 0, z = 0, fade = 1; face.visible = true;
    if (a === 'idle') { const s = Math.sin(u * TAU); sy = 1 + 0.07 * s; sxz = 1 - 0.04 * s; }
    else if (a === 'move') { const h = Math.sin(u * Math.PI); y = h * 0.32; sy = 1 + 0.18 * h - (1 - h) * 0.22; sxz = 1 - 0.1 * h + (1 - h) * 0.16; }
    else if (a === 'attack') { const w = u < 0.4 ? -ease(u / 0.4) : ease((u - 0.4) / 0.6) * 1.0 - 1 + (u > 0.4 ? 1 : 0); sy = u < 0.4 ? 1 - 0.3 * ease(u / 0.4) : lerp(0.7, 1.15, tri(clamp((u - 0.4) / 0.6, 0, 1))); sxz = 1 / Math.sqrt(sy); z = u < 0.4 ? -0.06 * u : lerp(-0.02, 0.35, tri(clamp((u - 0.4) / 0.6, 0, 1))); y = u > 0.4 && u < 0.7 ? 0.12 : 0; }
    else if (a === 'hurt') { sy = 1 - 0.25 * tri(u); sxz = 1 + 0.2 * tri(u); }
    else if (a === 'death') { const e = ease(u); sy = lerp(1, 0.16, e); sxz = lerp(1, 1.7, e); face.visible = u < 0.55; fade = lerp(1, 0.5, e); }
    g.scale.set(sxz, sy, sxz); g.position.set(0, y, z); jelly.opacity = 0.95 * fade;
  } };
}
function slimeKing() {
  const s = slime(0x2fc84a, 2.2), crown = new THREE.Group(), gold = mat(0xe8b83a, 0.25, 0.9);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.09, 24, 1, true), gold); crown.add(band);
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU, sp = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 8), gold); sp.position.set(Math.cos(a) * 0.2, 0.12, Math.sin(a) * 0.2); crown.add(sp); const gem = ball(0.03, mat(i % 2 ? 0xff3a5a : 0x3a9aff, 0.1, 0, { emissive: i % 2 ? 0xff2040 : 0x2080ff, emissiveIntensity: 0.6 })); gem.position.set(Math.cos(a) * 0.2, 0.22, Math.sin(a) * 0.2); crown.add(gem); }
  crown.position.set(0, 0.67, 0.02); const body = s.root.children[0]; body.add(crown);
  return s;
}
function bat() {
  const root = new THREE.Group(), g = new THREE.Group(); root.add(g);
  const fur = mat(0x4a3560, 0.7), skin = mat(0x6b4a85, 0.6, 0, { side: THREE.DoubleSide });
  add(g, ball(0.16, fur, 1, 0.95, 1.15)); const head = add(g, ball(0.12, fur), 0, 0.07, 0.17);
  for (const s of [-1, 1]) { const ear = add(g, new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 8), fur), s * 0.07, 0.2, 0.15); ear.rotation.z = -s * 0.2; add(g, ball(0.025, mat(0xff3a3a, 0.2, 0, { emissive: 0xff2020, emissiveIntensity: 1.2 })), s * 0.05, 0.09, 0.27); const fang = add(g, new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.045, 6), mat(0xffffff, 0.4)), s * 0.025, 0.0, 0.27); fang.rotation.x = Math.PI; }
  const wings = [];
  for (const s of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(s * 0.1, 0.04, 0); g.add(piv); const sh = new THREE.Shape(); sh.moveTo(0, 0.05); sh.lineTo(0.35, 0.22); sh.lineTo(0.7, 0.12); sh.lineTo(0.62, -0.02); sh.lineTo(0.5, 0.0); sh.lineTo(0.42, -0.14); sh.lineTo(0.28, -0.04); sh.lineTo(0.15, -0.16); sh.lineTo(0, -0.1); const w = new THREE.Mesh(new THREE.ShapeGeometry(sh), skin); w.rotation.x = -Math.PI / 2; if (s < 0) w.scale.x = -1; piv.add(w); const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.7, 6), fur); bone.rotation.z = Math.PI / 2 - 0.3; bone.position.set(s * 0.33, 0.0, 0.0); bone.rotation.z = s * (Math.PI / 2 - 0.3); piv.add(bone); wings.push([piv, s]); }
  return { root, set(a, u) {
    let flap = Math.sin(u * TAU) * 0.85, y = 0.75 + 0.05 * Math.sin(u * TAU), pitch = 0, fold = 0;
    if (a === 'move') pitch = 0.25; if (a === 'attack') { pitch = lerp(-0.2, 0.7, tri(u)); y = 0.75 - 0.35 * tri(u); flap = Math.sin(u * TAU * 2) * 0.9; }
    if (a === 'hurt') pitch = -0.4 * tri(u);
    if (a === 'death') { y = lerp(0.75, 0.1, ease(u)); flap = lerp(0.9, 1.45, u); pitch = lerp(0, 1.2, ease(u)); }
    for (const [piv, s] of wings) piv.rotation.z = s * flap; g.position.y = y; g.rotation.x = pitch;
  } };
}
function spider(color = 0x3b2d4c) {
  const root = new THREE.Group(), body = mat(color, 0.55, 0.1), glossy = mat(0x1a1424, 0.3, 0.2, { clearcoat: 0.8 });
  const g = new THREE.Group(); root.add(g); add(g, ball(0.17, body), 0, 0.3, 0.14); const abd = add(g, ball(0.27, body, 1, 0.9, 1.15), 0, 0.34, -0.2);
  const mark = add(g, ball(0.09, mat(0xd8483a, 0.35, 0, { emissive: 0xa02010, emissiveIntensity: 0.6 }), 1, 0.4, 1.4), 0, 0.57, -0.2);
  for (const s of [-1, 1]) { for (let i = 0; i < 2; i++) add(g, ball(0.035, mat(0xff4a3a, 0.2, 0, { emissive: 0xff3020, emissiveIntensity: 1 })), s * (0.05 + i * 0.05), 0.35 + i * 0.02, 0.3); const fang = add(g, new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.1, 6), glossy), s * 0.04, 0.2, 0.3); fang.rotation.x = Math.PI * 0.8; }
  const legs = []; for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const hip = V(s * 0.12, 0.3, 0.17 - i * 0.1), a = seg(glossy, 0.03), b = seg(glossy, 0.022); g.add(a); g.add(b); legs.push({ s, i, hip, a, b }); }
  return { root, set(an, u) {
    const run = an === 'move' || an === 'attack'; let rise = 0, abdY = 0;
    if (an === 'death') rise = -0.15 * ease(u); if (an === 'attack') abdY = 0.15 * tri(u);
    abd.position.y = 0.34 + abdY + 0.012 * Math.sin(u * TAU * 2); mark.position.y = 0.57 + abdY;
    for (const L of legs) {
      const ph = u * TAU * (an === 'idle' ? 1 : 2) + (L.i % 2 ? 0 : Math.PI) + (L.s > 0 ? 0 : Math.PI * 0.5), splay = [0.55, 0.9, 0.9, 0.55][L.i];
      const foot = V(L.s * (0.62 + 0.04 * L.i), 0.0, 0.5 - L.i * 0.34 + (run ? 0.14 * Math.cos(ph) : 0.02 * Math.cos(ph))); foot.y = run ? Math.max(0, Math.sin(ph)) * 0.16 : 0;
      if (an === 'death') { foot.x *= lerp(1, 0.55, ease(u)); foot.y += 0.3 * ease(u); }
      const hip = L.hip.clone(); hip.y += rise; const knee = hip.clone().lerp(foot, 0.5); knee.y += 0.34; knee.x += L.s * 0.12;
      place(L.a, hip, knee); place(L.b, knee, foot);
    }
    g.position.y = 0.0; g.position.z = an === 'attack' ? 0.1 * tri(u) : 0;
  } };
}
function mushroom() {
  const root = new THREE.Group(), g = new THREE.Group(); root.add(g);
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.42, 20), mat(0xf1e3c5, 0.7)), 0, 0.27, 0);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 18, 0, TAU, 0, Math.PI * 0.55), mat(0xd23b3b, 0.35, 0, { clearcoat: 0.6 })); cap.scale.set(1, 0.8, 1); add(g, cap, 0, 0.42, 0);
  const rimm = add(g, new THREE.Mesh(new THREE.TorusGeometry(0.385, 0.03, 10, 32), mat(0xb02e2e, 0.5)), 0, 0.42, 0); rimm.rotation.x = Math.PI / 2;
  let h = 7; for (let i = 0; i < 9; i++) { h = (h * 9301 + 49297) % 233280; const a = h / 233280 * TAU, el = 0.35 + (i % 3) * 0.3, r = 0.4 * Math.sin(el * 1.25 + 0.2); const sp = add(g, ball(0.055 + (i % 3) * 0.012, mat(0xfff4dc, 0.6), 1, 0.35, 1), Math.cos(a) * r, 0.42 + 0.32 * Math.cos(el * 1.25 + 0.2), Math.sin(a) * r); sp.lookAt(sp.position.clone().multiplyScalar(2)); }
  const face = new THREE.Group(); g.add(face); eyes(face, 0.3, 0.17, 0.075, 0.055); for (const s of [-1, 1]) add(face, ball(0.03, mat(0xf29a9a, 0.6), 1, 0.6, 0.5), s * 0.12, 0.23, 0.17);
  const feet = [-1, 1].map(s => add(g, ball(0.07, mat(0xe6d6b4, 0.7), 1, 0.6, 1.3), s * 0.1, 0.04, 0.03));
  return { root, set(a, u) {
    let y = 0, sy = 1, sxz = 1, tilt = 0; face.visible = true;
    if (a === 'idle') { sy = 1 + 0.04 * Math.sin(u * TAU); } else if (a === 'move') { const hh = Math.sin(u * Math.PI); y = hh * 0.22; sy = 1 + 0.08 * hh; tilt = Math.sin(u * TAU) * 0.08; }
    else if (a === 'attack') { tilt = lerp(-0.35, 0.3, tri(u)); y = 0.1 * tri(u); sy = 1 + 0.12 * tri(u); } else if (a === 'hurt') { tilt = -0.25 * tri(u); }
    else if (a === 'death') { sy = lerp(1, 0.3, ease(u)); sxz = lerp(1, 1.4, ease(u)); face.visible = u < 0.5; }
    g.position.y = y; g.scale.set(sxz, sy, sxz); g.rotation.x = tilt; feet.forEach((f, i) => f.position.z = 0.03 + (a === 'move' ? 0.08 * Math.sin(u * TAU + i * Math.PI) : 0));
  } };
}
function ghost() {
  const root = new THREE.Group(), g = new THREE.Group(); root.add(g);
  const pts = [[0.0, 0.95], [0.2, 0.92], [0.34, 0.8], [0.38, 0.62], [0.36, 0.45], [0.4, 0.26], [0.36, 0.1], [0.3, 0.0]].map(p => new THREE.Vector2(p[0], p[1]));
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), mat(0xd8e8ff, 0.3, 0, { transparent: true, opacity: 0.9, emissive: 0x7fb0ff, emissiveIntensity: 0.75, clearcoat: 0.6 })); g.add(body);
  for (const s of [-1, 1]) { add(g, ball(0.06, mat(0x14122a, 0.2), 1, 1.35, 0.5), s * 0.14, 0.7, 0.3); const arm = add(g, ball(0.07, mat(0xeaf2ff, 0.3, 0, { transparent: true, opacity: 0.85, emissive: 0x9fc4ff, emissiveIntensity: 0.2 }), 0.8, 1.6, 0.8), s * 0.36, 0.45, 0.1); arm.rotation.z = s * 0.5; }
  add(g, ball(0.045, mat(0x14122a, 0.2), 1, 1.5, 0.6), 0, 0.55, 0.33);
  return { root, set(a, u) {
    let y = 0.12 + 0.07 * Math.sin(u * TAU), sc = 1, lean = 0; if (a === 'move') lean = 0.2; if (a === 'attack') { lean = lerp(-0.1, 0.6, tri(u)); sc = 1 + 0.2 * tri(u); } if (a === 'hurt') lean = -0.3 * tri(u);
    if (a === 'death') { y = lerp(0.12, 0.5, u); sc = lerp(1, 0.1, ease(u)); body.material.opacity = lerp(0.9, 0.0, ease(u)); } else body.material.opacity = 0.9;
    g.position.y = y; g.scale.setScalar(sc); g.rotation.x = lean; g.rotation.z = Math.sin(u * TAU) * 0.06;
  } };
}
function golem() {
  const root = new THREE.Group(), g = new THREE.Group(); root.add(g);
  const stone = mat(0x7c7a78, 0.9, 0, { flatShading: true }), dark = mat(0x5a5856, 0.95, 0, { flatShading: true }), moss = mat(0x5a8a3a, 0.9), glow = mat(0xffa030, 0.4, 0, { emissive: 0xff7a10, emissiveIntensity: 2.2 });
  const torso = add(g, rock(0.5, stone, 1.05, 1.1, 0.8, 3), 0, 1.25, 0); const head = add(g, rock(0.25, stone, 1, 0.9, 0.95, 5), 0, 1.92, 0.12);
  for (const s of [-1, 1]) add(head, ball(0.05, glow, 1, 0.7, 0.5), s * 0.11, 0.03, 0.22);
  const parts = {}; for (const s of [-1, 1]) {
    const sh = add(g, rock(0.27, dark, 1, 0.9, 1, 7 + s), s * 0.66, 1.62, 0), ua = add(g, rock(0.2, stone, 0.9, 1.5, 0.9, 11 + s), s * 0.78, 1.15, 0.05), fist = add(g, rock(0.27, dark, 1, 1, 1, 13 + s), s * 0.8, 0.62, 0.15);
    const th = add(g, rock(0.26, stone, 1, 1.5, 1, 17 + s), s * 0.3, 0.6, 0), ft = add(g, rock(0.27, dark, 1.1, 0.6, 1.4, 19 + s), s * 0.3, 0.16, 0.1); parts[s] = { sh, ua, fist, th, ft };
  }
  add(g, rock(0.16, glow, 1, 1, 0.5, 2), 0, 1.3, 0.38); for (let i = 0; i < 6; i++) add(g, ball(0.08 + (i % 3) * 0.02, moss, 1, 0.4, 1), -0.5 + i * 0.2, 1.65 - (i % 2) * 0.35, 0.2 - (i % 3) * 0.25);
  return { root, set(a, u) {
    let bob = 0.02 * Math.sin(u * TAU), arms = 0, step = 0, sink = 1, lean = 0;
    if (a === 'move') { step = Math.sin(u * TAU); bob = 0.05 * Math.abs(step); lean = 0.06; } if (a === 'attack') { arms = u < 0.45 ? -ease(u / 0.45) * 1.2 : lerp(-1.2, 1.1, ease(clamp((u - 0.45) / 0.3, 0, 1))); bob = u > 0.7 ? -0.08 : 0; lean = u > 0.45 ? 0.25 : -0.1; }
    if (a === 'hurt') lean = -0.15 * tri(u); if (a === 'death') { sink = lerp(1, 0.5, ease(u)); lean = lerp(0, -0.25, ease(u)); }
    g.position.y = bob; g.rotation.x = lean; g.scale.set(1, sink, 1);
    for (const s of [-1, 1]) { const p = parts[s]; p.fist.position.set(s * 0.8, 0.62 + arms * 0.6 + (a === 'death' ? -0.2 * ease(u) : 0), 0.15 + arms * 0.4); p.ua.position.set(s * 0.78, 1.15 + arms * 0.3, 0.05 + arms * 0.2); p.th.position.z = (s > 0 ? 1 : -1) * 0.18 * step; p.ft.position.set(s * 0.3, 0.16 + Math.max(0, (s > 0 ? 1 : -1) * step) * 0.14, 0.1 + (s > 0 ? 1 : -1) * 0.2 * step); }
  } };
}
// the kit-based ones: goblin and skeleton
function kitFigure(kit, cfg) {
  const rig = makeHero(kit, cfg), clips = cfg.map;
  return { root: rig.holder, set(a, u, loop) { const c = clips[a] || clips.idle, d = dur(rig, c); show(rig, c, cfg.stance && (a === 'idle' || a === 'move') ? 'stance' : null, loop ? u * d : clamp(u, 0, 1) * d * 0.999); } };
}
const goblinCfg = { outfit: 'peasant', tint: 0x7a5a3a, skin: [0.55, 1.1, 0.5], brow: 0x20301a, scale: 0.8, stance: null, clips: ['Idle_Loop', 'Walk_Loop', 'Sword_Attack', 'Death01', 'Hit_Chest'],
  map: { idle: 'Idle_Loop', move: 'Walk_Loop', attack: 'Sword_Attack', death: 'Death01', hurt: 'Hit_Chest' },
  dress(c) { const green = c.mat(0x7fbf5a, 0.6), leather = c.mat(0x6a4a2a, 0.8); for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 8), green); ear.rotation.z = -s * 1.2; c.onHead(ear, s * 0.17, 0.0, 0); }
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 8), green); nose.rotation.x = Math.PI / 2; c.onHead(nose, 0, -0.03, 0.12);
    c.band(c.b.pelvis, c.yP - 0.1, c.yP + 0.1, 1.0, 0.9, leather); const belt = c.band(c.b.pelvis, c.yP + 0.08, c.yP + 0.13, 0.9, 0.9, c.mat(0x3a2a18, 0.7));
    for (const h of [c.b.hand_r]) { const club = new THREE.Group(), wood = c.mat(0x7a5230, 0.8); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.7, 10), wood); sh.rotation.x = Math.PI / 2; sh.position.z = -0.25; club.add(sh); const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), wood); head.scale.set(1, 1, 1.5); head.position.z = -0.62; club.add(head); for (let i = 0; i < 6; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.07, 6), c.mat(0xbfc3c8, 0.3, 0.9)); const a = i / 6 * TAU; sp.position.set(Math.cos(a) * 0.09, Math.sin(a) * 0.09, -0.6); sp.rotation.set(-Math.sin(a) * 1.4, 0, Math.cos(a) * 1.4); club.add(sp); } club.position.copy(c.wp(h)); club.quaternion.setFromUnitVectors(V(0, 0, -1), V(0.1, 0.85, 0.52).normalize()); c.put(h, club); } } };
const skeletonCfg = { outfit: 'ranger', hide: /./, noHead: true, stance: 'Sword_Idle', clips: ['Idle_Loop', 'Walk_Loop', 'Sword_Attack', 'Death01', 'Hit_Chest'],
  map: { idle: 'Idle_Loop', move: 'Walk_Loop', attack: 'Sword_Attack', death: 'Death01', hurt: 'Hit_Chest' },
  dress(c) { const bone = c.mat(0xcdbf9e, 0.72), dark = c.mat(0x2a2630, 0.8), glow = c.mat(0x7fe8ff, 0.2, 0, { emissive: 0x4ad8ff, emissiveIntensity: 2 });
    const skull = new THREE.Group(); skull.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 22, 16).scale(1, 1.05, 1.1), bone)); const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.045, 0.09), bone); jaw.position.set(0, -0.1, 0.04); skull.add(jaw);
    for (const s of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), dark); eye.position.set(s * 0.042, 0.0, 0.085); skull.add(eye); const gl = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), glow); gl.position.set(s * 0.042, 0.0, 0.1); skull.add(gl); }
    skull.scale.setScalar(1.3); c.onHead(skull, 0, -0.01, 0);
    for (const [a, b2, r0, r1] of [[c.b.upperarm_r, c.b.lowerarm_r, 0.045, 0.036], [c.b.lowerarm_r, c.b.hand_r, 0.036, 0.028], [c.b.upperarm_l, c.b.lowerarm_l, 0.045, 0.036], [c.b.lowerarm_l, c.b.hand_l, 0.036, 0.028], [c.b.thigh_r, c.b.calf_r, 0.06, 0.045], [c.b.calf_r, c.b.foot_r, 0.045, 0.035], [c.b.thigh_l, c.b.calf_l, 0.06, 0.045], [c.b.calf_l, c.b.foot_l, 0.045, 0.035]]) c.tube(a, b2, 0, 1, r0, r1, bone, false);
    for (const h of [c.b.hand_r, c.b.hand_l]) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), bone); m.position.copy(c.wp(h)); c.put(h, m); }
    for (const f of [c.b.foot_r, c.b.foot_l]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.17), bone); m.position.copy(c.wp(f)).add(V(0, -0.02, 0.05)); c.put(f, m); }
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.42, 10), bone); sp.position.set(0, (c.yP + c.yS3) / 2, c.cz); c.put(c.b.spine_02, sp);
    for (let i = 0; i < 5; i++) { const y = c.yS1 + 0.02 + i * 0.058; const rb = new THREE.Mesh(new THREE.TorusGeometry(0.9 - i * 0.04, 0.016, 6, 22).rotateX(Math.PI / 2), bone); rb.position.set(0, y, c.cz); rb.scale.set(c.ta * 0.8, 1, c.tb * 1.1); c.put(c.b.spine_02, rb); }
    const cl = new THREE.Mesh(new THREE.BoxGeometry(c.ta * 1.7, 0.035, 0.05), bone); cl.position.set(0, c.yS3 + 0.07, c.cz); c.put(c.b.spine_03, cl);
    const pv = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 8, 20).rotateX(Math.PI / 2), bone); pv.position.set(0, c.yP, c.cz); pv.scale.set(1.2, 1, 0.8); c.put(c.b.pelvis, pv);
    const cape = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.5, 14, 1, true, 0.3 * Math.PI, 1.4 * Math.PI), c.mat(0x8a2430, 0.85)); cape.position.set(0, c.yS3 - 0.08, c.cz - 0.02); c.put(c.b.spine_03, cape); },
  weapon(c) { const g = new THREE.Group(), steel = c.mat(0x9a8f80, 0.5, 0.8); const bl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.85), steel); bl.position.z = -0.5; g.add(bl); const tip = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.1, 4), steel); tip.rotation.x = -Math.PI / 2; tip.position.z = -0.97; g.add(tip); const gd = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.03), c.mat(0x5a4a3a, 0.5, 0.5)); gd.position.z = -0.08; g.add(gd); const gr = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 8), c.mat(0x3a2a1a, 0.8)); gr.rotation.x = Math.PI / 2; gr.position.z = 0.0; g.add(gr); return g; } };

// ---- props ----------------------------------------------------------------------------------------------------------
function woodTex(base = '#8a5a2e', seed = 1) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = base; x.fillRect(0, 0, 256, 256); let h = seed * 977;
  const rnd = () => (h = (h * 9301 + 49297) % 233280) / 233280;
  for (let p = 0; p < 4; p++) { x.fillStyle = `rgba(${rnd() < 0.5 ? '255,220,170' : '30,15,5'},${0.06 + rnd() * 0.08})`; x.fillRect(0, p * 64, 256, 64); x.fillStyle = 'rgba(20,10,0,0.55)'; x.fillRect(0, p * 64, 256, 2); for (let i = 0; i < 40; i++) { x.strokeStyle = `rgba(30,15,5,${0.05 + rnd() * 0.12})`; x.lineWidth = 1 + rnd(); const y = p * 64 + 4 + rnd() * 56; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(80, y + rnd() * 6 - 3, 170, y + rnd() * 6 - 3, 256, y + rnd() * 4 - 2); x.stroke(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const wood = () => mat(0xffffff, 0.75, 0, { map: woodTex('#8a5a2e', 2) }), woodDark = () => mat(0xffffff, 0.8, 0, { map: woodTex('#5e3c1e', 5) }), metal = c => mat(c, 0.35, 0.9), gold = mat(0xe8b83a, 0.22, 1, { clearcoat: 0.4 });
const lathe = (pts, m, seg = 28) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg), m);
const props = {
  crate() { const g = new THREE.Group(), w = wood(); add(g, new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), w), 0, 0.4, 0); const fr = woodDark(); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(g, new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.84, 0.09), fr), x * 0.4, 0.4, z * 0.4); for (const y of [0.04, 0.76]) { add(g, new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.08, 0.84), fr), 0, y, 0); } const d = add(g, new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.05, 0.04), fr), 0, 0.4, 0.42); d.rotation.z = 0.78; return g; },
  barrel() { const g = new THREE.Group(), w = wood(); add(g, lathe([[0.0, 0.0], [0.26, 0.0], [0.34, 0.2], [0.38, 0.45], [0.34, 0.7], [0.26, 0.9], [0.0, 0.9]], w)); for (const y of [0.12, 0.45, 0.78]) { const r = 0.26 + 0.12 * Math.sin((y / 0.9) * Math.PI) + 0.01; const t = add(g, new THREE.Mesh(new THREE.TorusGeometry(r, 0.022, 8, 28), metal(0x3a3d44)), 0, y, 0); t.rotation.x = Math.PI / 2; } add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.02, 24), mat(0x6a4524, 0.8)), 0, 0.9, 0); return g; },
  chest(open) { const g = new THREE.Group(), w = wood(), band = metal(0x4a4d55);
    add(g, new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.42, 0.58), w), 0, 0.21, 0); for (const x of [-0.32, 0.32]) add(g, new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.44, 0.6), band), x, 0.22, 0);
    const lid = new THREE.Group(); const lw = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.9, 20, 1, false, 0, Math.PI), w); lw.rotation.set(0, 0, Math.PI / 2); lw.rotation.order = 'ZYX'; lw.rotation.y = -Math.PI / 2; lid.add(lw); for (const x of [-0.32, 0.32]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.07, 20, 1, false, 0, Math.PI), band); b.rotation.set(0, 0, Math.PI / 2); b.rotation.order = 'ZYX'; b.rotation.y = -Math.PI / 2; b.position.x = x; lid.add(b); }
    lid.position.set(0, 0.42, -0.0); g.add(lid); lw.rotation.set(Math.PI / 2, 0, Math.PI / 2); lid.children.forEach(m => { m.rotation.set(0, Math.PI / 2, Math.PI / 2); });
    if (open) { lid.position.set(0, 0.42, -0.29); lid.rotation.x = -1.95; add(g, new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.02, 0.46), mat(0xffd35a, 0.3, 0, { emissive: 0xffb020, emissiveIntensity: 1.6 })), 0, 0.4, 0); for (let i = 0; i < 9; i++) { const c = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 14), gold), (i % 5 - 2) * 0.14 + ((i * 37) % 7) * 0.01, 0.42 + (i > 4 ? 0.02 : 0), (i < 5 ? -0.1 : 0.1)); c.rotation.x = 1.2 + (i % 3) * 0.2; } }
    else add(g, new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.04), gold), 0, 0.42, 0.3); return g; },
  pot() { const g = new THREE.Group(); add(g, lathe([[0.0, 0.0], [0.18, 0.0], [0.3, 0.2], [0.34, 0.4], [0.25, 0.6], [0.16, 0.68], [0.2, 0.74], [0.17, 0.74], [0.0, 0.66]], mat(0xb8643a, 0.55, 0, { clearcoat: 0.3 }))); const b = add(g, new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.02, 8, 28), mat(0x7a3a1a, 0.7)), 0, 0.38, 0); b.rotation.x = Math.PI / 2; return g; },
  pillar() { const g = new THREE.Group(), st = mat(0x8a8478, 0.9, 0, { flatShading: false }); add(g, new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.18, 0.8), st), 0, 0.09, 0); add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 1.5, 20), st), 0, 0.93, 0); add(g, new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.2, 0.82), st), 0, 1.78, 0); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, fl = add(g, new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.4, 0.03), mat(0x5e5a52, 0.95)), Math.cos(a) * 0.3, 0.93, Math.sin(a) * 0.3); fl.lookAt(V(0, 0.93, 0)); } add(g, ball(0.22, mat(0x6a8a4a, 0.9), 1, 0.4, 1), 0.2, 0.2, 0.15); return g; },
  brazier() { const g = new THREE.Group(), iron = metal(0x2a2c32); for (let i = 0; i < 3; i++) { const a = i / 3 * TAU, leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.8, 8), iron); leg.position.set(Math.cos(a) * 0.17, 0.4, Math.sin(a) * 0.17); leg.lookAt(V(0, 1.2, 0)); leg.rotateX(Math.PI / 2); g.add(leg); } add(g, lathe([[0.0, 0.0], [0.12, 0.0], [0.3, 0.12], [0.34, 0.2], [0.3, 0.2], [0.0, 0.1]], iron), 0, 0.78, 0); add(g, ball(0.28, mat(0xff8a2a, 0.5, 0, { emissive: 0xff5a10, emissiveIntensity: 2 }), 1, 0.35, 1), 0, 0.95, 0); return g; },
  tomb() { const g = new THREE.Group(), st = mat(0x8a8a90, 0.9); add(g, new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.3), st), 0, 0.05, 0); const t = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.14, 24, 1, false, 0, Math.PI), st), 0, 0.5, 0); t.rotation.x = Math.PI / 2; t.scale.set(1, 1, 1); t.rotation.set(Math.PI / 2, 0, 0); t.position.y = 0.55; add(g, new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.5, 0.14), st), 0, 0.3, 0); const cross = mat(0x5a5a60, 0.9); add(g, new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.02), cross), 0, 0.5, 0.08); add(g, new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.02), cross), 0, 0.55, 0.08); add(g, ball(0.16, mat(0x5a8a3a, 0.9), 1, 0.45, 1), 0.2, 0.06, 0.12); return g; },
  bones() { const g = new THREE.Group(), b = mat(0xe9e2cf, 0.55); const sk = add(g, ball(0.13, b, 1, 1.05, 1.1), 0.1, 0.13, 0); add(g, new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.09), b), 0.1, 0.04, 0.08); for (const s of [-1, 1]) add(g, ball(0.03, mat(0x15131c, 0.4)), 0.1 + s * 0.05, 0.15, 0.1); for (let i = 0; i < 4; i++) { const f = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8), b), -0.12 + i * 0.1, 0.03, -0.18 + i * 0.12); f.rotation.set(Math.PI / 2 - 0.2, 0, i * 0.7); add(g, ball(0.035, b), f.position.x + 0.02, 0.03, f.position.z + 0.2); } return g; },
  coin() { const g = new THREE.Group(), c = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 28), gold), 0, 0.3, 0); c.rotation.x = Math.PI / 2; const r = add(g, new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 8, 28), mat(0xffd96a, 0.2, 1)), 0, 0.3, 0.027); const st = add(g, ball(0.08, mat(0xffd96a, 0.2, 1), 1, 1, 0.2), 0, 0.3, 0.03); g.userData.spin = true; return g; },
  gem(color) { const g = new THREE.Group(), m = mat(color, 0.04, 0, { clearcoat: 1, transmission: 0, emissive: color, emissiveIntensity: 0.35, envMapIntensity: 2.2, flatShading: true }); const o = add(g, new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), m), 0, 0.32, 0); o.scale.set(1, 1.35, 1); g.userData.spin = true; return g; },
  heart() { const g = new THREE.Group(), s = new THREE.Shape(); s.moveTo(0, -0.22); s.bezierCurveTo(-0.3, 0.02, -0.28, 0.28, 0, 0.14); s.bezierCurveTo(0.28, 0.28, 0.3, 0.02, 0, -0.22); const h = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.05, bevelSegments: 6, curveSegments: 16 }), mat(0xe8283a, 0.2, 0, { clearcoat: 1, emissive: 0xc01028, emissiveIntensity: 0.4 })); h.position.set(0, 0.34, -0.05); g.add(h); g.userData.spin = true; return g; },
  key() { const g = new THREE.Group(), t = add(g, new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 10, 22), gold), 0, 0.5, 0); const sh = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.4, 10), gold), 0, 0.25, 0); for (const y of [0.1, 0.18]) add(g, new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.04), gold), 0.07, y, 0); g.userData.spin = true; return g; },
  potion(color) { const g = new THREE.Group(), glass = mat(0xdfe9f5, 0.05, 0, { transparent: true, opacity: 0.45, clearcoat: 1 }); add(g, ball(0.2, glass), 0, 0.22, 0); add(g, ball(0.17, mat(color, 0.1, 0, { emissive: color, emissiveIntensity: 0.9, transparent: true, opacity: 0.95 }), 1, 0.85, 1), 0, 0.2, 0); add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.16, 14), glass), 0, 0.42, 0); add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.08, 12), mat(0x8a5a30, 0.8)), 0, 0.54, 0); g.userData.spin = true; return g; },
};

const MONSTERS = {
  slime: { make: () => slime(0x24b83e), view: 1.7, center: 0.5, dirs: 1 }, slime_blue: { make: () => slime(0x2c78e8), view: 1.7, center: 0.5, dirs: 1 }, slime_red: { make: () => slime(0xe8402f), view: 1.7, center: 0.5, dirs: 1 },
  slime_king: { make: slimeKing, view: 3.4, center: 0.9, dirs: 1 },
  bat: { make: bat, view: 2.0, center: 0.8, dirs: 8 }, spider: { make: () => spider(), view: 2.2, center: 0.35, dirs: 8 }, mushroom: { make: mushroom, view: 1.5, center: 0.4, dirs: 8 }, ghost: { make: ghost, view: 1.7, center: 0.55, dirs: 1 },
  golem: { make: golem, view: 3.0, center: 1.15, dirs: 8 },
  goblin: { make: kit => kitFigure(kit, goblinCfg), view: 2.1, center: 0.85, dirs: 8, kit: true }, skeleton: { make: kit => kitFigure(kit, skeletonCfg), view: 1.9, center: 0.88, dirs: 8, kit: true },
};
const ANIMS = [['idle', 6, true], ['move', 8, true], ['attack', 6, false], ['hurt', 3, false], ['death', 6, false]];
export async function runThings(job, only, kit, log) {
  if (job === 'monsters') for (const [name, cfg] of Object.entries(MONSTERS)) {
    if (only && only !== name) continue; const m = cfg.make(kit); scene.add(m.root); setView(cfg.view, cfg.center);
    for (const [label, n, loop] of ANIMS) { await sheet(`sprites/mon_${name}_${label}.png`, cfg.dirs, n, (r, k) => { m.root.rotation.y = cfg.dirs === 1 ? 0 : DIRS[r] * Math.PI / 180; m.set(label, loop ? k / n : k / (n - 1), loop); }, log); await sleep(20); }
    scene.remove(m.root);
  }
  if (job === 'props') {
    const list = { crate: [() => props.crate(), 1.5, 0.45], barrel: [() => props.barrel(), 1.5, 0.45], chest: [() => props.chest(false), 1.6, 0.35], chest_open: [() => props.chest(true), 1.6, 0.45], pot: [() => props.pot(), 1.3, 0.4], pillar: [() => props.pillar(), 2.6, 1.0], brazier: [() => props.brazier(), 1.6, 0.6], tomb: [() => props.tomb(), 1.4, 0.4], bones: [() => props.bones(), 1.1, 0.2] };
    for (const [name, [make, view, center]] of Object.entries(list)) { if (only && only !== name) continue; const o = make(); scene.add(o); setView(view, center); await sheet(`sprites/prop_${name}.png`, 1, 1, () => {}, log); scene.remove(o); await sleep(20); }
    const items = { coin: () => props.coin(), gem_green: () => props.gem(0x2fd37a), gem_red: () => props.gem(0xff3a5a), gem_blue: () => props.gem(0x3a9aff), heart: () => props.heart(), key: () => props.key(), potion_red: () => props.potion(0xff3a4a), potion_blue: () => props.potion(0x3a8aff) };
    for (const [name, make] of Object.entries(items)) { if (only && only !== name) continue; const o = make(); scene.add(o); setView(0.75, 0.3); await sheet(`sprites/item_${name}.png`, 1, 8, (r, k) => { o.rotation.y = k / 8 * TAU; o.position.y = Math.sin(k / 8 * TAU) * 0.0; }, log); scene.remove(o); await sleep(20); }
  }
}

// ---- the office: furniture, plants, cars and colleagues ------------------------------------------------------------------------------
const ash = () => mat(0xe3d2a8, 0.5, 0, { clearcoat: 0.25 }), chromeM = () => mat(0xcfd3d8, 0.28, 0.95), seatM = c => mat(c, 0.75), box = (w, h, d, m, x = 0, y = 0, z = 0, g) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y + h / 2, z); if (g) g.add(b); return b; };
const screenM = () => mat(0x12263c, 0.25, 0, { emissive: 0x3a86d8, emissiveIntensity: 1.1 });
function officeChair(g, x, z, face = 0, color = 0x3d4048) { // face: rotation about Y (0 = looking south, +Z)
  const c = new THREE.Group(), s = seatM(color); box(0.46, 0.07, 0.46, s, 0, 0.44, 0, c); box(0.44, 0.5, 0.07, s, 0, 0.5, -0.22, c); box(0.05, 0.42, 0.05, chromeM(), 0, 0.03, 0, c); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU, leg = box(0.34, 0.03, 0.04, chromeM(), 0, 0.04, 0, c); leg.position.set(Math.cos(a) * 0.16, 0.05, Math.sin(a) * 0.16); leg.rotation.y = -a; }
  c.position.set(x, 0, z); c.rotation.y = face; g.add(c); return c;
}
function deskBuild(userNorth = true, tilt = 0) {
  const g = new THREE.Group(), top = ash(); box(1.6, 0.04, 0.8, top, 0, 0.72, 0, g); for (const sx of [-0.74, 0.74]) for (const sz of [-0.34, 0.34]) box(0.04, 0.72, 0.04, chromeM(), sx, 0, sz, g);
  box(1.5, 0.3, 0.02, mat(0xc9b88e, 0.6), 0, 0.42, -0.38, g); // modesty panel
  const mon = new THREE.Group(); box(0.58, 0.34, 0.025, mat(0x1b1d22, 0.4), 0, 0.2, -0.012, mon); const sc = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.3, 0.012), mat(0x1a3556, 0.2, 0, { emissive: 0x58a8ff, emissiveIntensity: 2.4 })); sc.position.set(0, 0.37, 0.004); mon.add(sc); box(0.05, 0.2, 0.05, mat(0x1b1d22, 0.4), 0, 0, -0.02, mon); box(0.2, 0.015, 0.14, mat(0x1b1d22, 0.4), 0, 0, 0, mon); mon.position.set(0, 0.76, 0.1); mon.scale.setScalar(1.45); mon.rotation.y = tilt; g.add(mon);
  box(0.42, 0.018, 0.14, mat(0x2a2c32, 0.5), 0, 0.76, -0.15, g); box(0.06, 0.02, 0.1, mat(0x2a2c32, 0.5), 0.3, 0.76, -0.14, g); const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.09, 14), mat([0xd8483a, 0x3a86d8, 0xf2f2f2][Math.floor(Math.random() * 3)], 0.4)); mug.position.set(-0.62, 0.81, 0.2); g.add(mug);
  if (!userNorth) g.rotation.y = Math.PI; return g; // the chair is a prop of its own, so someone can sit in it
}
function tableSeg() { const g = new THREE.Group(); box(2.0, 0.05, 1.0, ash(), 0, 0.72, 0, g); box(0.09, 0.72, 0.09, chromeM(), 0, 0, 0, g); box(1.5, 0.04, 0.09, chromeM(), 0, 0, 0, g); box(0.16, 0.012, 0.16, mat(0x1c1d21, 0.4), 0, 0.77, 0, g); return g; }
function sofaBuild(color = 0x8f4a44) { const g = new THREE.Group(), m = seatM(color); box(2.0, 0.34, 0.85, m, 0, 0.1, 0, g); box(2.0, 0.5, 0.22, m, 0, 0.44, -0.32, g); for (const x of [-0.95, 0.95]) box(0.14, 0.32, 0.8, m, x, 0.44, 0, g); box(1.9, 0.12, 0.7, seatM(0xc9c2b6), 0, 0.42, 0.06, g).material = mat(new THREE.Color(color).multiplyScalar(1.25).getHex(), 0.8); for (const x of [-0.9, 0.9]) box(0.06, 0.1, 0.06, chromeM(), x, 0, 0.3, g); return g; }
function plantBuild(big = false) { const g = new THREE.Group(); const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.4, 20), mat(0xe8e4dc, 0.6)); pot.position.y = 0.2; g.add(pot); const leaf = mat(0x3c8a44, 0.55, 0, { clearcoat: 0.3 }); for (let i = 0; i < (big ? 14 : 9); i++) { const a = i / 9 * TAU * 1.7, l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), leaf); l.scale.set(0.5, 1.5, 0.12); l.position.set(Math.cos(a) * 0.12, 0.7 + (i % 3) * 0.2, Math.sin(a) * 0.12); l.rotation.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7); g.add(l); } return g; }
function shelfBuild() { const g = new THREE.Group(), wd = mat(0x8a6a44, 0.7); box(1.2, 1.9, 0.04, mat(0x5a4630, 0.8), 0, 0, -0.18, g); for (const x of [-0.6, 0.6]) box(0.04, 1.9, 0.4, wd, x, 0, 0, g); for (let i = 0; i < 6; i++) { box(1.2, 0.03, 0.4, wd, 0, i * 0.37, 0, g); let x = -0.55; while (x < 0.5) { const w = 0.04 + Math.random() * 0.05, h = 0.22 + Math.random() * 0.1; box(w, h, 0.26, mat([0x3a6ab0, 0xb04a3a, 0x3a8a5a, 0xd8b04a, 0x6a4a9a, 0xe8e4dc][Math.floor(Math.random() * 6)], 0.7), x + w / 2, i * 0.37 + 0.03, 0, g); x += w + 0.005; if (Math.random() < 0.12) x += 0.14; } } return g; }
function cabinetBuild() { const g = new THREE.Group(), m = mat(0x9a9ca2, 0.5, 0.3); box(0.5, 1.3, 0.6, m, 0, 0, 0, g); for (let i = 0; i < 3; i++) { box(0.44, 0.38, 0.02, mat(0x8a8c92, 0.5, 0.3), 0, 0.06 + i * 0.41, 0.31, g); box(0.18, 0.02, 0.03, chromeM(), 0, 0.28 + i * 0.41, 0.33, g); } return g; }
function fridgeBuild() { const g = new THREE.Group(), m = mat(0xe8eaee, 0.35, 0.2, { clearcoat: 0.4 }); box(0.78, 1.85, 0.72, m, 0, 0, 0, g); box(0.76, 0.02, 0.01, mat(0x2a2c32, 0.5), 0, 1.1, 0.365, g); box(0.03, 0.5, 0.04, chromeM(), 0.3, 1.2, 0.4, g); box(0.03, 0.6, 0.04, chromeM(), 0.3, 0.4, 0.4, g); box(0.5, 0.28, 0.01, mat(0xf2c94a, 0.5), -0.1, 1.55, 0.37, g); return g; }
function counterBuild(coffee = false) { const g = new THREE.Group(); box(2.0, 0.9, 0.65, mat(0x6b6e73, 0.5), 0, 0, 0, g); box(2.04, 0.04, 0.7, mat(0xdad6cc, 0.3), 0, 0.9, 0, g); if (coffee) { box(0.42, 0.52, 0.4, mat(0x1c1d21, 0.35, 0.4), -0.3, 0.94, -0.05, g); box(0.34, 0.06, 0.3, chromeM(), -0.3, 1.46, -0.05, g); box(0.1, 0.1, 0.02, mat(0xff4a3a, 0.3, 0, { emissive: 0xff2a1a, emissiveIntensity: 1.3 }), -0.18, 1.3, 0.17, g); const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 14), mat(0xf2f2f2, 0.4)); mug.position.set(-0.3, 1.02, 0.2); g.add(mug); box(0.3, 0.2, 0.3, mat(0xd8d6d0, 0.5), 0.5, 0.94, 0, g); } else { box(0.5, 0.03, 0.4, chromeM(), -0.4, 0.94, 0, g); const t = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 8), chromeM()); t.position.set(-0.4, 1.05, -0.12); g.add(t); box(0.4, 0.16, 0.1, mat(0xcc3a3a, 0.6), 0.5, 0.94, 0, g); } return g; }
function printerBuild() { const g = new THREE.Group(); box(0.95, 0.95, 0.7, mat(0xc9cbd0, 0.5, 0.1), 0, 0, 0, g); box(0.96, 0.08, 0.72, mat(0x3a3c42, 0.5), 0, 0.95, 0, g); box(0.5, 0.12, 0.3, mat(0x1c2a3c, 0.3, 0, { emissive: 0x2a6ab0, emissiveIntensity: 0.9 }), 0.15, 1.0, 0.2, g); box(0.4, 0.02, 0.3, mat(0xf4f2ec, 0.6), -0.25, 1.03, 0.1, g); return g; }
function coolerBuild() { const g = new THREE.Group(); box(0.4, 0.95, 0.4, mat(0xe8eaee, 0.4), 0, 0, 0, g); const bt = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.5, 20), mat(0x6ab8ff, 0.1, 0, { transparent: true, opacity: 0.6, clearcoat: 1 })); bt.position.y = 1.2; g.add(bt); box(0.04, 0.05, 0.04, mat(0x3a86d8, 0.4), -0.08, 0.7, 0.21, g); box(0.04, 0.05, 0.04, mat(0xd8483a, 0.4), 0.08, 0.7, 0.21, g); return g; }
function rackBuild() { const g = new THREE.Group(); box(0.75, 1.95, 0.85, mat(0x1c1d22, 0.4, 0.5), 0, 0, 0, g); for (let i = 0; i < 9; i++) { box(0.62, 0.1, 0.02, mat(0x2a2c32, 0.4, 0.4), 0, 0.12 + i * 0.2, 0.43, g); for (let k = 0; k < 4; k++) box(0.02, 0.02, 0.01, mat(k % 2 ? 0x3aff7a : 0x3a9aff, 0.2, 0, { emissive: k % 2 ? 0x1aff5a : 0x1a7aff, emissiveIntensity: 2 }), -0.2 + k * 0.05, 0.14 + i * 0.2, 0.445, g); } return g; }
function lampBuild() { const g = new THREE.Group(); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 8), chromeM()); p.position.y = 0.8; g.add(p); box(0.28, 0.03, 0.28, chromeM(), 0, 0, 0, g); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.3, 20, 1, true), mat(0xf6efe0, 0.8, 0, { emissive: 0xffe6b0, emissiveIntensity: 0.9 })); sh.position.y = 1.62; g.add(sh); return g; }
function receptionBuild() { const g = new THREE.Group(); box(2.4, 1.0, 0.7, mat(0xf2f0ea, 0.35), 0, 0, 0, g); box(2.46, 0.05, 0.78, mat(0xb08a5a, 0.5), 0, 1.0, 0, g); box(0.5, 0.3, 0.03, screenM(), 0.5, 1.15, -0.1, g); return g; }
function whiteboardBuild() { const g = new THREE.Group(); box(1.6, 1.0, 0.04, mat(0xf8f8f6, 0.25, 0, { clearcoat: 0.6 }), 0, 0.85, 0, g); box(1.66, 0.04, 0.06, chromeM(), 0, 0.83, 0, g); box(1.66, 0.04, 0.06, chromeM(), 0, 1.81, 0, g); for (const x of [-0.7, 0.7]) box(0.04, 0.9, 0.04, chromeM(), x, 0, 0, g); for (let i = 0; i < 4; i++) box(0.9 - i * 0.12, 0.012, 0.01, mat([0x3a86d8, 0xd8483a, 0x2a2c32, 0x3a8a5a][i], 0.5), -0.2, 1.5 - i * 0.14, 0.025, g); return g; }
function treeBuild(tone = 0x3a7a3c) { const g = new THREE.Group(); const t = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 1.6, 10), mat(0x5a4230, 0.9)); t.position.y = 0.8; g.add(t); for (const [x, y, z, r] of [[0, 2.3, 0, 0.95], [0.5, 1.9, 0.2, 0.7], [-0.5, 2.0, -0.2, 0.75], [0.1, 2.9, 0.1, 0.65]]) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), mat(new THREE.Color(tone).offsetHSL(0, 0, (y - 2) * 0.05).getHex(), 0.8)); s.position.set(x, y, z); g.add(s); } return g; }
function carBuild(color = 0xb23a30) { const g = new THREE.Group(), paint = mat(color, 0.3, 0.5, { clearcoat: 1 }), glass = mat(0x1a2636, 0.1, 0.3, { clearcoat: 1 }); box(1.7, 0.5, 4.1, paint, 0, 0.3, 0, g); box(1.5, 0.45, 2.1, paint, 0, 0.78, -0.1, g); box(1.52, 0.38, 1.9, glass, 0, 0.8, -0.1, g).scale.set(1, 1, 1.02); for (const [x, z] of [[-0.85, -1.3], [0.85, -1.3], [-0.85, 1.3], [0.85, 1.3]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 20), mat(0x15161a, 0.7)); w.rotation.z = Math.PI / 2; w.position.set(x, 0.34, z); g.add(w); } for (const x of [-0.6, 0.6]) { box(0.3, 0.12, 0.04, mat(0xfff2c0, 0.2, 0, { emissive: 0xffe090, emissiveIntensity: 0.9 }), x, 0.5, 2.06, g); box(0.3, 0.1, 0.04, mat(0xd01818, 0.3, 0, { emissive: 0xc01010, emissiveIntensity: 0.8 }), x, 0.5, -2.06, g); } return g; }
function trashBuild() { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.45, 18), mat(0x4a4d55, 0.5, 0.4)); b.position.y = 0.225; g.add(b); return g; }
function benchBuild() { const g = new THREE.Group(); box(1.5, 0.06, 0.45, mat(0x9a7248, 0.7), 0, 0.45, 0, g); box(1.5, 0.4, 0.05, mat(0x9a7248, 0.7), 0, 0.6, -0.2, g); for (const x of [-0.65, 0.65]) box(0.05, 0.45, 0.4, mat(0x2a2c32, 0.5, 0.5), x, 0, 0, g); return g; }
function bikeRackBuild() { const g = new THREE.Group(); for (let i = 0; i < 5; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 8, 18, Math.PI), chromeM()); t.position.set(-0.8 + i * 0.4, 0.02, 0); t.rotation.set(0, 0, 0); g.add(t); } box(2.0, 0.03, 0.06, chromeM(), 0, 0, 0, g); return g; }
const OFFICE_PROPS = {
  desk_e: [() => { const g = deskBuild(true, 0.65); g.rotation.y = -Math.PI / 2; return g; }, 2.4, 0.6], desk_w: [() => { const g = deskBuild(true, -0.65); g.rotation.y = Math.PI / 2; return g; }, 2.4, 0.6], // screen faces the sitter: west / east of the desk
  chair_e: [() => { const g = new THREE.Group(); officeChair(g, 0, 0, Math.PI / 2, 0x3d4048); return g; }, 1.3, 0.4], chair_w: [() => { const g = new THREE.Group(); officeChair(g, 0, 0, -Math.PI / 2, 0x3d4048); return g; }, 1.3, 0.4],
  desk_a: [() => deskBuild(true), 2.4, 0.6], desk_b: [() => deskBuild(false), 2.4, 0.6], table: [tableSeg, 2.6, 0.5], chair_s: [() => { const g = new THREE.Group(); officeChair(g, 0, 0, 0, 0x3d4048); return g; }, 1.3, 0.4], chair_n: [() => { const g = new THREE.Group(); officeChair(g, 0, 0, Math.PI, 0x3d4048); return g; }, 1.3, 0.4], chair_m_s: [() => { const g = new THREE.Group(); officeChair(g, 0, 0, 0, 0x5a5d66); return g; }, 1.3, 0.4], chair_m_n: [() => { const g = new THREE.Group(); officeChair(g, 0, 0, Math.PI, 0x5a5d66); return g; }, 1.3, 0.4], sofa: [() => sofaBuild(), 2.6, 0.5], sofa_grey: [() => sofaBuild(0x5d6066), 2.6, 0.5], plant: [() => plantBuild(), 1.6, 0.7], plant_big: [() => plantBuild(true), 2.0, 0.8],
  shelf: [shelfBuild, 2.4, 0.95], cabinet: [cabinetBuild, 1.6, 0.65], fridge: [fridgeBuild, 2.4, 0.9], counter: [() => counterBuild(false), 2.6, 0.55], coffee: [() => counterBuild(true), 2.6, 0.7], printer: [printerBuild, 1.7, 0.6], cooler: [coolerBuild, 1.6, 0.7], rack: [rackBuild, 2.6, 0.95],
  lamp: [lampBuild, 2.1, 0.85], reception: [receptionBuild, 3.2, 0.6], whiteboard: [whiteboardBuild, 2.4, 0.9], tree: [() => treeBuild(), 3.6, 1.5], tree_b: [() => treeBuild(0x4a8a3a), 3.6, 1.5], car_red: [() => carBuild(0xb23a30), 5.2, 0.7], car_blue: [() => carBuild(0x2f5fa8), 5.2, 0.7], car_white: [() => carBuild(0xe6e6e2), 5.2, 0.7],
  trash: [trashBuild, 1.0, 0.3], bench: [benchBuild, 2.0, 0.5], bikes: [bikeRackBuild, 2.4, 0.3],
};
// colleagues: the character kit in everyday clothes
const person = (tint, hairKey, hairCol, extra) => ({ outfit: 'peasant', tint, stance: null, clips: ['Idle_Loop', 'Walk_Loop'], map: { idle: 'Idle_Loop', move: 'Walk_Loop' }, dress(c) { c.hair(c.kit.hair[hairKey], hairCol); if (extra) extra(c); } });
const glasses = c => { for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.005, 6, 16), c.mat(0x15161a, 0.4)); c.onHead(r, s * 0.045, -0.005, 0.1); } const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.005, 0.005), c.mat(0x15161a, 0.4)); c.onHead(b, 0, -0.005, 0.1); };
const lanyard = c => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.01), c.mat(0xd8483a, 0.6)); l.position.set(0, c.yS3 - 0.22, c.cz + 0.15); c.put(c.b.spine_03, l); const card = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.012), c.mat(0xf4f2ec, 0.5)); card.position.set(0, c.yS3 - 0.5, c.cz + 0.15); c.put(c.b.spine_03, card); };
const NPCS = { anna: person(0x4a7ac8, 'long', 0x6a3a22, lanyard), erik: person(0x6a8a5a, 'buzz', 0x2a2018, glasses), sofie: person(0xc8745a, 'parted', 0x1a1210, lanyard), mads: person(0x8a8a96, 'beard', 0x8a7a68, glasses), freja: person(0xa86ad0, 'long', 0xe0b070, lanyard), you: { ...person(0x2e5f9e, 'parted', 0x3a2a1c, lanyard), clips: ['Idle_Loop', 'Walk_Loop', 'Sitting_Idle_Loop', 'Sitting_Enter'], map: { idle: 'Idle_Loop', move: 'Walk_Loop', sit: 'Sitting_Idle_Loop', sitdown: 'Sitting_Enter' } } };
export async function runOffice(only, kit, log) {
  for (const [name, [make, view, center]] of Object.entries(OFFICE_PROPS)) { if (only && only !== name) continue; const o = make(); scene.add(o); setView(view, center); await sheet(`sprites/prop_${name}.png`, 1, 1, () => {}, log); scene.remove(o); await sleep(15); }
  for (const [name, cfg] of Object.entries(NPCS)) {
    if (only && only !== name) continue; cfg.scale = 1; const m = kitFigure(kit, cfg); scene.add(m.root); setView(2.3, 1.0);
    for (const [label, n, loop] of [['idle', 6, true], ['move', 8, true], ...(name === 'you' ? [['sit', 6, true], ['sitdown', 8, false]] : [])]) { await sheet(`sprites/npc_${name}_${label}.png`, 8, n, (r, k) => { m.root.rotation.y = DIRS[r] * Math.PI / 180; m.set(label, loop ? k / n : k / (n - 1), loop); }, log); await sleep(15); }
    scene.remove(m.root);
  }
}
