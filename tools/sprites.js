// Pre-renders smooth 8-direction sprite sheets (Dead Cells style) from CC0 3D models: Quaternius' character kit for the heroes,
// procedural creatures and props for the rest. Run through render.html with the save server (savepng.py) running.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const FRAME = 128, SS = 2, PITCH = 42 * Math.PI / 180; let VIEW = 2.3, CENTER = 1.0;
const KIT = '../../cs-game/models/q/', KATANA = '../../cs-game/models/antique_katana_01/antique_katana_01_2k.gltf';
const OUT = 'http://127.0.0.1:8092/save?name=';
const DIRS = [0, -45, -90, -135, 180, 135, 90, 45]; // facing S SW W NW N NE E SE as seen from the camera
const yUp = new THREE.Vector3(0, 1, 0), Z_NEG = new THREE.Vector3(0, 0, -1);

// ---- renderer, light and camera: a high orthographic view, key light from the top left, a cool rim from behind
const R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
R.setPixelRatio(1); R.setSize(FRAME * SS, FRAME * SS); R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.35; R.setClearColor(0x000000, 0);
const scene = new THREE.Scene(), pm = new THREE.PMREMGenerator(R); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
scene.add(new THREE.HemisphereLight(0xe6eeff, 0x6a5a50, 1.5));
const key = new THREE.DirectionalLight(0xfff1dc, 3.6); key.position.set(-3, 5, 4); scene.add(key);
const rim = new THREE.DirectionalLight(0xa8ccff, 1.6); rim.position.set(3, 3, -4); scene.add(rim);
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 40);
// frames the world: `view` metres across, looking at height `center`; returns where the feet land in a frame (0..1 from the top)
export function setView(view, center) { VIEW = view; CENTER = center; cam.left = -view / 2; cam.right = view / 2; cam.top = view / 2; cam.bottom = -view / 2; cam.updateProjectionMatrix(); cam.position.set(0, center + 12 * Math.sin(PITCH), 12 * Math.cos(PITCH)); cam.lookAt(0, center, 0); return 0.5 + center * Math.cos(PITCH) / view; }
setView(2.3, 1.0);
export const MANIFEST = {};

function outline(c, color = '#120d1a') {
  const o = document.createElement('canvas'); o.width = o.height = FRAME; const x = o.getContext('2d');
  const k = document.createElement('canvas'); k.width = k.height = FRAME; const kx = k.getContext('2d'); kx.drawImage(c, 0, 0); kx.globalCompositeOperation = 'source-in'; kx.fillStyle = color; kx.fillRect(0, 0, FRAME, FRAME);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) x.drawImage(k, dx, dy);
  x.drawImage(c, 0, 0); return o;
}
function grab(line = true) {
  R.render(scene, cam); const c = document.createElement('canvas'); c.width = c.height = FRAME; const x = c.getContext('2d');
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(R.domElement, 0, 0, FRAME, FRAME); return line ? outline(c) : c;
}
async function save(name, canvas, log) {
  const out = document.getElementById('out'); out.appendChild(canvas); canvas.style.width = Math.min(canvas.width, 480) + 'px';
  await fetch(OUT + name, { method: 'POST', mode: 'no-cors', body: canvas.toDataURL('image/png') }); log('saved ' + name + ' ' + canvas.width + 'x' + canvas.height);
}
export async function sheet(name, rows, cols, draw, log, line = true) {
  MANIFEST[name] = { cols, rows, frame: FRAME, view: VIEW, originY: 0.5 + CENTER * Math.cos(PITCH) / VIEW };
  const c = document.createElement('canvas'); c.width = cols * FRAME; c.height = rows * FRAME; const x = c.getContext('2d');
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) { draw(r, k); x.drawImage(grab(line), k * FRAME, r * FRAME); }
  await save(name, c, log);
}
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export { scene, mat, DIRS, yUp, katanaItem, loadKit, makeHero, show, dur };

// ---- the character kit
const UPPER_ARMS = /^(clavicle|upperarm|lowerarm|hand|index|middle|ring|pinky|thumb)/;
async function loadKit() {
  const L = new GLTFLoader(), files = ['ranger.gltf', 'peasant.gltf', 'hero.gltf', 'ual.glb', 'hair_beard.gltf', 'hair_long.gltf', 'hair_buzzed.gltf', 'hair_parted.gltf'];
  const [ranger, peasant, hero, ual, beard, long, buzz, parted] = await Promise.all(files.map(f => L.loadAsync(KIT + f)));
  const katana = await L.loadAsync(KATANA);
  const boneY = (root, n) => { let y = 1; root.updateMatrixWorld(true); root.traverse(o => { if (o.isBone && o.name === n) y = o.getWorldPosition(new THREE.Vector3()).y; }); return y; };
  const ratio = boneY(hero.scene, 'pelvis') / boneY(ual.scene, 'pelvis');
  const prep = (name, filter) => {
    const src = ual.animations.find(c => c.name === name); if (!src) throw new Error('no clip ' + name); const tracks = [];
    for (const t of src.tracks) {
      const dot = t.name.lastIndexOf('.'), node = t.name.slice(0, dot), prop = t.name.slice(dot + 1);
      if (prop === 'quaternion') { if (!filter || filter.test(node)) tracks.push(t.clone()); }
      else if (prop === 'position' && node === 'pelvis' && !filter) { const c = t.clone(); for (let i = 0; i < c.values.length; i++) c.values[i] *= ratio; tracks.push(c); }
    }
    return new THREE.AnimationClip(name + (filter ? '_U' : ''), src.duration, tracks);
  };
  return { ranger, peasant, hero, katana, hair: { beard, long, buzz, parted }, prep };
}
function katanaItem(gltf, scale) {
  const root = gltf.scene.clone(true);
  root.traverse(o => { if (o.isMesh) { const m = o.material = o.material.clone(); m.envMapIntensity = 1.5; m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n\troughnessFactor = max(roughnessFactor, 0.34);').replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n\tmetalnessFactor = min(metalnessFactor, 0.35);'); }; } });
  const inner = new THREE.Group(); inner.add(root);
  inner.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0)));
  inner.scale.setScalar(scale); inner.position.z = -0.1 * scale; const g = new THREE.Group(); g.add(inner); return g;
}
const mat = (color, rough = 0.6, metal = 0, extra) => new THREE.MeshPhysicalMaterial(Object.assign({ color, roughness: rough, metalness: metal, envMapIntensity: 0.9, side: THREE.DoubleSide }, extra));

// ---- dressing a hero: the kit body or outfit, hair, and pieces built here; everything hangs on the one skeleton
function makeHero(kit, cfg) {
  const src = cfg.outfit === 'hero' ? kit.hero : cfg.outfit === 'ranger' ? kit.ranger : kit.peasant;
  const model = SkeletonUtils.clone(src.scene), holder = new THREE.Group(); holder.add(model);
  const owned = new Map(), own = m => { if (!owned.has(m)) { const c = m.clone(); c.vertexColors = false; c.envMapIntensity = 1.0; if (cfg.tint != null && /Ranger|Peasant/.test(m.name)) c.color.setHex(cfg.tint); if (/Hair/i.test(m.name)) c.color.setHex(0x2a1c12); owned.set(m, c); } return owned.get(m); };
  model.traverse(o => { if (o.isSkinnedMesh || o.isMesh) { o.material = own(o.material); o.frustumCulled = false; if (cfg.hide && cfg.hide.test(o.name)) o.visible = false; } });
  const B = n => { let f = null; model.traverse(o => { if (!f && o.isBone && o.name === n) f = o; }); return f; };
  const b = {}; for (const n of ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'Head', 'upperarm_r', 'lowerarm_r', 'hand_r', 'upperarm_l', 'lowerarm_l', 'hand_l', 'thigh_r', 'calf_r', 'foot_r', 'thigh_l', 'calf_l', 'foot_l']) b[n] = B(n);
  scene.add(holder);
  if (cfg.outfit !== 'hero' && !cfg.noHead) kit.hero.scene.traverse(o => { // the head of the base body under an outfit
    if (!o.isSkinnedMesh) return;
    const body = /Superhero/i.test(o.material.name), m = o.material.clone(); m.vertexColors = false; m.envMapIntensity = 0.6;
    if (/Hair/i.test(o.material.name)) m.color.setHex(cfg.brow ?? 0x2a1c12);
    if (body) { if (cfg.skin) m.color.setRGB(...cfg.skin); m.onBeforeCompile = sh => { sh.vertexShader = 'varying float vRestY;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvRestY = position.y;'); sh.fragmentShader = 'varying float vRestY;\n' + sh.fragmentShader.replace('#include <clipping_planes_fragment>', 'if (vRestY < 1.5) discard;\n\t#include <clipping_planes_fragment>'); }; m.customProgramCacheKey = () => 'head-only'; }
    const mesh = new THREE.SkinnedMesh(o.geometry, m); mesh.bind(new THREE.Skeleton(o.skeleton.bones.map(bb => B(bb.name)), o.skeleton.boneInverses), o.bindMatrix); mesh.frustumCulled = false; model.add(mesh);
  });
  holder.updateMatrixWorld(true);
  const wp = bone => bone.getWorldPosition(new THREE.Vector3());
  const put = (bone, obj) => { obj.traverse(o => { if (o.isMesh) o.frustumCulled = false; }); obj.updateMatrixWorld(true); bone.attach(obj); return obj; };
  const ta = wp(b.upperarm_l).distanceTo(wp(b.upperarm_r)) * 0.5, tb = ta * 0.62, cz = wp(b.spine_02).z;
  const tube = (a, bb, t0, t1, r0, r1, m, open = true) => { const A = wp(a), d = wp(bb).sub(A), L = d.length(), mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, 1, 18, 1, open), m); mesh.position.copy(A).addScaledVector(d, (t0 + t1) / 2); mesh.quaternion.setFromUnitVectors(yUp, d.clone().normalize()); mesh.scale.set(1, L * (t1 - t0), 1); return put(a, mesh); };
  const band = (bone, y0, y1, k0, k1, m) => { const mesh = new THREE.Mesh(new THREE.CylinderGeometry(k1, k0, 1, 30, 1, true), m); mesh.position.set(0, (y0 + y1) / 2, cz); mesh.scale.set(ta, y1 - y0, tb); return put(bone, mesh); };
  const ring = (bone, y, k, r, m) => { const mesh = new THREE.Mesh(new THREE.TorusGeometry(k, r, 8, 30).rotateX(Math.PI / 2), m); mesh.position.set(0, y, cz); mesh.scale.set(ta, ta, tb); return put(bone, mesh); };
  const yP = wp(b.pelvis).y, yS1 = wp(b.spine_01).y, yS3 = wp(b.spine_03).y, yN = wp(b.neck_01).y;
  const hc = wp(b.Head).add(new THREE.Vector3(0, 0.105, -0.012));
  const onHead = (obj, x, y, z) => { obj.position.set(hc.x + x, hc.y + y, hc.z + z); return put(b.Head, obj); };
  const hair = (gltf, color) => gltf.scene.traverse(o => { if (!o.isMesh) return; const m = o.material.clone(); m.vertexColors = false; m.color.setHex(color); const mesh = new THREE.Mesh(o.geometry, m); model.add(mesh); mesh.updateMatrixWorld(true); put(b.Head, mesh); });
  const C = { b, mat, put, tube, band, ring, onHead, hair, wp, ta, tb, cz, yP, yS1, yS3, yN, hc, kit, model };
  cfg.dress(C);
  // clips: locomotion over the whole body, the sword stance over the arms
  const mixer = new THREE.AnimationMixer(model), act = {}, add = (key, clip) => { const a = mixer.clipAction(clip); a.play(); a.paused = true; a.enabled = false; act[key] = a; };
  for (const n of cfg.clips) add(n, kit.prep(n)); if (cfg.stance) add('stance', kit.prep(cfg.stance, UPPER_ARMS));
  if (cfg.scale) holder.scale.setScalar(cfg.scale);
  const rig = { holder, model, mixer, act, cfg, C };
  show(rig, 'Idle_Loop', cfg.stance ? 'stance' : null, 0);
  if (cfg.weapon) { // held in the stance pose, as the game does it: hand position and blade direction, then hung on the hand bone
    const w = cfg.weapon(C), dir = new THREE.Vector3(0.1, 0.85, 0.52).normalize(); w.position.copy(wp(b.hand_r)); w.quaternion.setFromUnitVectors(Z_NEG, dir); put(b.hand_r, w); rig.weapon = w;
  }
  return rig;
}
function show(rig, main, stance, t) {
  for (const [k, a] of Object.entries(rig.act)) { const on = k === main || k === stance; a.enabled = on; a.setEffectiveWeight(k === main ? 1 : on ? 24 : 0); if (k === main) a.time = t; else a.time = 0; }
  rig.mixer.update(0); rig.holder.updateMatrixWorld(true);
}
const dur = (rig, n) => rig.act[n].getClip().duration;

// ---- the four heroes
const darkCloth = 0x14161d, red = 0xd23a2e;
const HEROES = {
  ninja: {
    outfit: 'ranger', tint: 0x6f86d8, hide: /Pauldron/, stance: 'Sword_Idle', clips: ['Idle_Loop', 'Walk_Loop', 'Sword_Attack', 'Death01', 'Hit_Chest'],
    dress(c) { const cloth = c.mat(darkCloth, 0.9); c.onHead(new THREE.Mesh(new THREE.SphereGeometry(0.097, 22, 14).scale(1, 0.72, 1.06), cloth), 0, -0.088, 0.006);
      const hb = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.013, 8, 24), c.mat(red, 0.6)); hb.rotation.x = Math.PI / 2; c.onHead(hb, 0, 0.035, 0);
      for (const s of [-1, 1]) { const tail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.012), c.mat(red, 0.6)); tail.rotation.set(0.5, 0, s * 0.25); c.onHead(tail, s * 0.04, -0.06, -0.13); }
      c.band(c.b.spine_01, c.yS1 - 0.02, c.yS1 + 0.07, 0.82, 0.82, c.mat(red, 0.7)); },
    weapon(c) { const g = katanaItem(c.kit.katana, 0.55); return g; },
  },
  boxer: {
    outfit: 'hero', stance: null, clips: ['Idle_Loop', 'Walk_Loop', 'Punch_Cross', 'Death01', 'Hit_Chest'],
    dress(c) { c.hair(c.kit.hair.buzz, 0x241a14); const shorts = c.mat(0xc9222c, 0.5), white = c.mat(0xf1ede4, 0.7);
      c.band(c.b.pelvis, c.yP - 0.09, c.yP + 0.11, 0.98, 0.84, shorts); c.band(c.b.pelvis, c.yP + 0.075, c.yP + 0.125, 0.85, 0.83, white);
      for (const [a, bb] of [[c.b.thigh_r, c.b.calf_r], [c.b.thigh_l, c.b.calf_l]]) c.tube(a, bb, -0.06, 0.48, 0.112, 0.102, shorts);
      for (const h of [c.b.hand_r, c.b.hand_l]) { const g = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 18).scale(1.05, 1, 1.15), c.mat(0xd0222b, 0.38, 0, { clearcoat: 0.5, clearcoatRoughness: 0.3 })); g.position.copy(c.wp(h)); c.put(h, g); }
      const hb = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 8, 24), white); hb.rotation.x = Math.PI / 2; c.onHead(hb, 0, 0.04, 0); },
  },
  samurai: {
    outfit: 'peasant', tint: 0xb85a52, hide: null, stance: 'Sword_Idle', clips: ['Idle_Loop', 'Walk_Loop', 'Sword_Attack', 'Death01', 'Hit_Chest'],
    dress(c) { const lac = c.mat(0xa02a2a, 0.36, 0.3), dark = c.mat(0x17181d, 0.5, 0.3), gold = c.mat(0xd2a83a, 0.32, 0.85); c.hair(c.kit.hair.parted, 0x1a1210);
      const helm = new THREE.Group(); helm.add(new THREE.Mesh(new THREE.SphereGeometry(0.125, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), dark));
      const shik = new THREE.Mesh(new THREE.CylinderGeometry(0.127, 0.21, 0.1, 24, 1, true, 0.28 * Math.PI, 1.44 * Math.PI), lac); shik.position.y = -0.05; helm.add(shik);
      const peak = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.012, 0.07), dark); peak.position.set(0, 0.004, 0.138); peak.rotation.x = -0.25; helm.add(peak);
      const crest = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.009, 6, 24, Math.PI), gold); crest.position.set(0, 0.045, 0.123); helm.add(crest);
      for (const s of [-1, 1]) { const horn = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.17, 8), gold); horn.position.set(s * 0.07, 0.15, 0.1); horn.rotation.set(0.2, 0, -s * 0.5); helm.add(horn); }
      c.onHead(helm, 0, 0.03, 0);
      const yTop = c.yS3 + 0.08, yBot = c.yP + 0.04; c.band(c.b.spine_02, yBot, yTop, 0.98, 1.1, lac);
      for (const f of [0.22, 0.5, 0.78]) c.ring(c.b.spine_02, yBot + (yTop - yBot) * f, 0.99 + 0.1 * f, 0.03, gold);
      for (const [a, f2] of [[c.b.upperarm_r, c.b.lowerarm_r], [c.b.upperarm_l, c.b.lowerarm_l]]) { const A = c.wp(a), d = c.wp(f2).sub(A).normalize(), plate = new THREE.Group(); plate.add(new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.03, 0.2), lac)); for (const x of [0.06, 0, -0.06]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.034, 0.204), gold); l.position.x = x; plate.add(l); } plate.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), d); plate.position.copy(A).addScaledVector(d, 0.08).add(new THREE.Vector3(0, 0.055, 0)); c.put(a, plate); }
      for (let i = 0; i < 7; i++) { const th = (i + 0.5) / 7 * Math.PI * 2, p = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.21, 0.02), i % 2 ? lac : c.mat(0x7a1c1c, 0.4, 0.3)); p.position.set(Math.sin(th) * c.ta * 1.08, c.yP - 0.06, c.cz + Math.cos(th) * c.tb * 1.3); p.rotation.y = th; c.put(c.b.pelvis, p); }
      c.band(c.b.pelvis, c.yP + 0.03, c.yP + 0.09, 1.0, 1.0, gold);
      for (const [a, bb] of [[c.b.lowerarm_r, c.b.hand_r], [c.b.lowerarm_l, c.b.hand_l]]) c.tube(a, bb, 0.15, 0.95, 0.052, 0.042, dark);
      for (const [a, bb] of [[c.b.calf_r, c.b.foot_r], [c.b.calf_l, c.b.foot_l]]) c.tube(a, bb, 0.05, 0.9, 0.07, 0.056, lac); },
    weapon(c) { return katanaItem(c.kit.katana, 0.95); },
  },
  wizard: {
    outfit: 'peasant', tint: 0xa488f0, hide: /Legs|Feet/, stance: 'Sword_Idle', clips: ['Idle_Loop', 'Walk_Loop', 'Sword_Attack', 'Death01', 'Hit_Chest'],
    dress(c) { const robe = c.mat(0x4a348c, 0.85), gold = c.mat(0xd2a83a, 0.35, 0.85), cloth = c.mat(0x3a2a70, 0.85); c.hair(c.kit.hair.long, 0xe6e3dc); c.hair(c.kit.hair.beard, 0xeeebe4);
      const hat = new THREE.Group(), cone = new THREE.Mesh(new THREE.ConeGeometry(0.118, 0.42, 22), cloth); cone.position.set(0, 0.2, -0.022); cone.rotation.set(-0.16, 0, 0.1); hat.add(cone);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.26, 0.014, 28), cloth); brim.rotation.x = 0.05; hat.add(brim);
      const hbnd = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.124, 0.042, 22), c.mat(0xd2a83a, 0.4, 0.5)); hbnd.position.y = 0.027; hat.add(hbnd); c.onHead(hat, 0, 0.07, 0);
      const geo = new THREE.CylinderGeometry(1, 1, 1, 32, 10, true), pp = geo.attributes.position; for (let i = 0; i < pp.count; i++) { const t = pp.getY(i) + 0.5, r = 0.84 + 1.4 * Math.pow(1 - t, 0.5); pp.setX(i, pp.getX(i) * r); pp.setZ(i, pp.getZ(i) * r); } geo.computeVertexNormals();
      const y0 = 0.05, y1 = c.yS1 + 0.04, skirt = new THREE.Mesh(geo, robe); skirt.position.set(0, (y0 + y1) / 2, c.cz); skirt.scale.set(c.ta, y1 - y0, c.ta * 0.86); c.put(c.b.pelvis, skirt);
      const hem = new THREE.Mesh(new THREE.TorusGeometry(2.24, 0.04, 8, 36).rotateX(Math.PI / 2), gold); hem.position.set(0, y0, c.cz); hem.scale.set(c.ta, c.ta, c.ta * 0.86); c.put(c.b.pelvis, hem);
      c.band(c.b.spine_01, c.yS1 + 0.01, c.yS1 + 0.07, 0.86, 0.86, gold);
      for (const [f, h2] of [[c.b.lowerarm_r, c.b.hand_r], [c.b.lowerarm_l, c.b.hand_l]]) { c.tube(f, h2, 0.1, 0.95, 0.055, 0.1, robe); c.tube(f, h2, 0.9, 0.96, 0.101, 0.104, gold); } },
    weapon(c) { const g = new THREE.Group(), wood = c.mat(0x5a3a22, 0.7), shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 1.7, 12), wood); shaft.rotation.x = Math.PI / 2; shaft.position.z = -0.4; g.add(shaft);
      const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.095, 3), c.mat(0xb69cff, 0.1, 0, { emissive: 0x8a5cff, emissiveIntensity: 1.6, clearcoat: 1 })); orb.position.z = -1.32; g.add(orb);
      for (let i = 0; i < 4; i++) { const claw = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.2, 6), wood); const a = i / 4 * Math.PI * 2; claw.position.set(Math.cos(a) * 0.1, Math.sin(a) * 0.1, -1.25); claw.rotation.set(-Math.PI / 2 - Math.sin(a) * 0.5, 0, Math.cos(a) * 0.5); g.add(claw); }
      return g; },
  },
};

async function renderHero(kit, name, log) {
  const rig = makeHero(kit, HEROES[name]), cfg = rig.cfg, st = cfg.stance ? 'stance' : null, atk = cfg.clips[2];
  const anims = [['idle', 'Idle_Loop', 6, true], ['walk', 'Walk_Loop', 8, true], ['attack', atk, 8, false], ['death', 'Death01', 6, false], ['hurt', 'Hit_Chest', 3, false]];
  for (const [label, clip, n, loop] of anims) {
    const d = dur(rig, clip);
    await sheet(`sprites/hero_${name}_${label}.png`, 8, n, (r, k) => { rig.holder.rotation.y = DIRS[r] * Math.PI / 180; const t = loop ? k / n * d : k / (n - 1) * d * 0.999; show(rig, clip, label === 'attack' || label === 'death' || label === 'hurt' ? null : st, t); }, log);
    await sleep(30);
  }
  scene.remove(rig.holder);
}
export async function run(job, only, log) {
  const kit = await loadKit(); log('kit loaded');
  if (job === 'heroes') { setView(2.3, 1.0); for (const n of Object.keys(HEROES)) { if (only && only !== n) continue; await renderHero(kit, n, log); } }
  else if (job === 'office') { const mod = await import('./things.js'); await mod.runOffice(only, kit, log); }
  else { const mod = await import('./things.js'); await mod.runThings(job, only, kit, log); }
  await fetch(OUT + `sprites/manifest_${job}${only ? '_' + only : ''}.json`, { method: 'POST', mode: 'no-cors', body: JSON.stringify(MANIFEST) }); log('manifest saved');
}
