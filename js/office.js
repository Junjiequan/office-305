// Building 305 at DTU Lyngby, handcrafted from the floor plan: two floors round a corridor, an entrance lobby, kitchens, meeting
// rooms and offices, with a yard (parking, trees, lawn) round the ground floor. One tile is about 0.77 m.
import { ZONES } from './data.js';

export const ZONE_LIST = Object.keys(ZONES), TINTS = [null, 'pink', 'ochre', 'green', 'blue'];
const S = 1.3, cx = m => Math.round(m * S);
export const BW = 82, BH = 22; // the building in tiles
const R = { n0: 1, n1: 7, wc1: 8, c0: 9, c1: 12, wc2: 13, s0: 14, s1: 20 }; // rows inside the building
// [from m, to m, id, name, kind, desks, accent]
const NORTH0 = [[5.5, 17, '105', 'DST', 'office', 8], [17, 24, '115', 'Meeting room 115', 'meeting', 16], [24, 31, '117', 'Meeting room 117', 'meeting', 16], [31, 37.4, '121', 'Diff', 'office', 4, 'blue'], [37.4, 43.8, '125', 'DRAM', 'office', 4], [43.8, 50.2, '127', 'Office 127', 'office', 4], [50.2, 56.7, '129', 'LSS', 'office', 4]];
const SOUTH0 = [[5.5, 11, 'lobby', 'Entrance', 'lobby'], [11, 17, '106', 'Admin', 'office', 4], [17, 19, '108', 'Printer 108', 'printer'], [19, 21.2, '110', 'Meeting room 110', 'small', 2], [21.2, 24.7, '112', 'Meeting room 112', 'small', 5], [24.7, 36.7, '114', 'Kitchen 114', 'kitchen'], [36.7, 41.7, '122', 'Office 122', 'office', 4], [41.7, 46.7, '126', 'Office 126', 'office', 4], [46.7, 51.7, '128', 'Office 128', 'office', 4], [51.7, 56.7, '130', 'Spec', 'office', 4]];
const NORTH1 = [[5.5, 17, '205', 'DRAM', 'office', 8], [17, 20.5, '211', 'Office 211', 'office', 2], [20.5, 24, '213', 'Office 213', 'office', 2], [24, 27.5, 'GL', 'GL', 'office', 2], [27.5, 31, 'Hea', 'Hea', 'office', 2], [31, 43, '221', 'Office 221', 'office', 12], [43, 50.2, '229', 'Office 229', 'office', 4], [50.2, 56.7, 'HD', 'Hot desks', 'lounge', 4]];
const SOUTH1 = [[5.5, 12, 'SR', 'Student room', 'lounge', 6], [12, 16.5, '206', 'Meeting room 206', 'meeting', 6, 'pink'], [16.5, 22.5, '208', 'Meeting room 208', 'meeting', 12, 'ochre'], [22.5, 24.7, '212', 'Copy room 212', 'printer'], [24.7, 36.7, '214', 'Kitchen 214', 'kitchen'], [36.7, 42.7, '222', 'Meeting room 222', 'meeting', 12, 'green'], [42.7, 46.2, '2a', 'Office 2a', 'office', 2], [46.2, 49.7, '2b', 'Office 2b', 'office', 2], [49.7, 53.2, '2c', 'Office 2c', 'office', 2], [53.2, 56.7, '2d', 'Office 2d', 'office', 2]];
const KIND_ZONE = { office: 'carpet', meeting: 'laminate', small: 'laminate', lounge: 'carpet', kitchen: 'tiles', printer: 'tiles', lobby: 'marble' };

export function buildFloor(floor) {
  const ox = 6, oy = floor === 0 ? 10 : 4, W = ox + BW + 6, H = oy + BH + (floor === 0 ? 12 : 4), N = W * H, cells = new Uint8Array(N), zone = new Uint8Array(N), tint = new Uint8Array(N), wallTint = new Uint8Array(N);
  const props = [], rooms = [], signs = [], npcs = [], stairs = [], lights = [], occ = new Set(), I = (x, y) => y * W + x, zi = k => ZONE_LIST.indexOf(k);
  const fill = (x0, y0, w, h, z, t = 0) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue; cells[I(x, y)] = 1; zone[I(x, y)] = zi(z); tint[I(x, y)] = t; } };
  const put = (t, x, y, w = 1, h = 1, o = {}) => { const p = Object.assign({ t, x, y, w, h, solid: true }, o); props.push(p); if (p.solid) for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) occ.add(Math.floor(x + i) + ',' + Math.floor(y + j)); return p; };
  const free = (x, y, w = 1, h = 1) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const xx = Math.floor(x + i), yy = Math.floor(y + j); if (xx < 1 || yy < 1 || xx >= W - 1 || yy >= H - 1 || !cells[I(xx, yy)] || occ.has(xx + ',' + yy)) return false; } return true; };
  const light = (x, y, r, color) => lights.push({ x: x * 64, y: y * 43, r, color });
  const chair = (x, y, dir, m = false) => put((m ? 'chair_m_' : 'chair_') + ({ 4: 'n', 6: 'e', 2: 'w' }[dir] || 's'), x - 0.5, y - 0.5, 1, 1, { solid: false, chair: true, dir }); // x, y: where the chair stands (tile units)
  const addStairs = (id, x, y, to) => { stairs.push({ id, x, y, w: 2, h: 2, up: to > floor, to }); for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) occ.add((x + i) + ',' + (y + j)); };
  if (floor === 2) { // ---- the roof: a flat terrace with a roof garden, reached only by the two stairs from the first floor
    fill(ox + 1, oy + 1, BW - 2, BH - 2, 'roof'); fill(ox + 22, oy + 5, 38, 12, 'grass'); fill(ox + 20, oy + 10, 2, 2, 'paving'); fill(ox + 60, oy + 10, 2, 2, 'paving'); fill(ox + 22, oy + 10, 38, 2, 'paving');
    for (const [x, y] of [[ox + 24, oy + 6], [ox + 30, oy + 7], [ox + 37, oy + 6], [ox + 44, oy + 7], [ox + 51, oy + 6], [ox + 57, oy + 7], [ox + 27, oy + 14], [ox + 34, oy + 14], [ox + 47, oy + 14], [ox + 55, oy + 14]]) put((x + y) % 2 ? 'tree' : 'tree_b', x, y, 1, 1);
    for (const x of [ox + 26, ox + 33, ox + 40, ox + 48, ox + 55]) put('bench', x, oy + 9, 2, 1);
    for (const x of [ox + 8, ox + 14, ox + 68, ox + 74]) { put('plant_big', x, oy + 2, 1, 1); put('plant_big', x, oy + BH - 3, 1, 1); }
    for (const x of [ox + 12, ox + 25, ox + 41, ox + 57, ox + 70]) put('lamp', x, oy + 3, 1, 1);
    for (const [x, y] of [[ox + 10, oy + 8], [ox + 10, oy + 13], [ox + 72, oy + 8], [ox + 72, oy + 13]]) put('bench', x, y, 2, 1);
    addStairs('RW', ox + 3, oy + 16, 1); addStairs('RE', ox + 77, oy + 16, 1);
    npcs.push({ id: 'erik', name: 'Erik', role: 'Roof', x: ox + 40.5, y: oy + 11.5, dir: 0, lines: ['Best view in Lyngby. On a clear day you can nearly see the sea.', 'Nobody ever remembers the roof garden. That is why it is quiet.', 'The way back down is the stairs where you came up.'] });
    return { floor, W, H, ox, oy, cells, zone, tint, wallTint, props, rooms, signs, npcs, stairs, lights, spawn: { x: ox + 4, y: oy + 12 } };
  }
  // ---- the building: all wall, then carve the corridor, halls and rooms
  fill(ox + 1, oy + R.c0, BW - 2, 4, 'corridor'); fill(ox + 1, oy + 1, 6, BH - 2, 'corridor'); fill(ox + 75, oy + 1, 6, BH - 2, 'corridor');
  const sets = floor === 0 ? [[NORTH0, R.n0, R.n1, false], [SOUTH0, R.s0, R.s1, true]] : [[NORTH1, R.n0, R.n1, false], [SOUTH1, R.s0, R.s1, true]];
  for (const [list, r0, r1, south] of sets) for (const [x0m, x1m, id, name, kind, n, accent] of list) {
    const c0 = ox + cx(x0m), c1 = ox + cx(x1m), rx = c0 + 1, ry = oy + r0, rw = c1 - c0 - 1, rh = r1 - r0 + 1, t = accent ? TINTS.indexOf(accent) : 0;
    fill(rx, ry, rw, rh, KIND_ZONE[kind], t); const dx = kind === 'kitchen' ? rx + Math.floor((rw - 2) / 2) : rw >= 5 ? c0 + 2 : c0 + 1, doorRow = oy + (south ? R.wc2 : R.wc1); fill(dx, doorRow, 2, 1, 'corridor');
    const accRow = south ? doorRow : oy + r0 - 1; if (accent) for (let x = rx; x < rx + rw; x++) wallTint[I(x, accRow)] = t;
    rooms.push({ id, name, kind, floor, x: rx, y: ry, w: rw, h: rh, south, door: dx, n: n || 0, accent });
    signs.push({ text: /^\d/.test(id) && !name.includes(id) ? `${id} · ${name}` : name, x: dx + 1, y: doorRow, south });
    light(rx + rw / 2, ry + rh / 2, Math.max(rw * 40, rh * 60) + 140, kind === 'meeting' ? 0xfff0d8 : 0xfff4e4);
  }
  if (floor === 0) fill(ox + 10, oy + BH - 1, 3, 1, 'marble'); // the entrance doors
  // ---- the yard (ground floor): parking, paving, lawn, trees
  if (floor === 0) {
    const keep = cells.slice(), keepZ = zone.slice(), keepT = tint.slice();
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (!(x >= ox && x < ox + BW && y >= oy && y < oy + BH)) { cells[I(x, y)] = 1; zone[I(x, y)] = zi('paving'); }
    fill(ox + 14, oy + BH + 1, BW - 24, 6, 'asphalt'); fill(1, oy + BH + 8, W - 2, H - (oy + BH + 8) - 1, 'grass'); fill(1, 1, W - 2, 6, 'grass');
    for (let i = 0; i < 13; i++) if (i % 5 !== 3) put(['car_red', 'car_blue', 'car_white'][i % 3], ox + 16 + i * 4, oy + BH + 1, 2, 5, { label: 'parked car' });
    for (const [x, y] of [[ox + 3, oy + BH + 9], [ox + 20, oy + BH + 10], [ox + 40, oy + BH + 9], [ox + 62, oy + BH + 10], [ox + 82, oy + BH + 9], [3, oy + 14], [W - 4, oy + 16], [3, 4], [W - 4, 3], [ox + 14, 3], [ox + 50, 4], [ox + 70, 3], [3, oy + BH + 4], [W - 4, oy + BH + 5]]) put(((x + y) % 2) ? 'tree' : 'tree_b', x, y, 1, 1);
    for (const x of [ox + 6, ox + 20, ox + 40, ox + 60, ox + 78]) { put('lamp', x, oy + BH, 1, 1); light(x + 0.5, oy + BH - 1, 380, 0xffdca0); }
    put('bench', ox + 15, oy + BH, 2, 1); put('bikes', ox + 3, oy + BH + 1, 2, 1); put('bikes', ox + 3, oy + BH + 3, 2, 1); put('bench', ox + 24, oy - 2, 2, 1); put('bench', ox + 52, oy - 2, 2, 1);
    for (const x of [ox + 18, ox + 46, ox + 70]) { put('lamp', x, oy - 2, 1, 1); light(x + 0.5, oy - 3, 380, 0xffdca0); }
    put('trash', ox + 14, oy + BH, 1, 1); put('plant_big', ox + 8, oy + BH, 1, 1); put('plant_big', ox + 14 + 3, oy + BH, 1, 1);
  }
  // ---- furniture, room by room
  const midRow = r => r.y + Math.floor(r.h / 2), layout = r => {
    const left = r.x, right = r.x + r.w, far = r.south ? r.y + r.h - 1 : r.y, near = r.south ? r.y : r.y + r.h - 1;
    // a pod is four desks: two rows of  [chair desk | desk chair]  with the aisle (hall side) kept free
    const pod = (x, y) => { for (let k = 0; k < 2; k++) { const yy = y + k * 2; put('desk_e', x + 1, yy, 1, 2, { desk: true }); chair(x + 0.65, yy + 1, 6); put('desk_w', x + 2, yy, 1, 2, { desk: true }); chair(x + 3.35, yy + 1, 2); } };
    const podFree = (x, y) => free(x, y, 4, 4);
    if (r.kind === 'office') {
      const nb = Math.max(1, Math.ceil(r.n / 4)), total = nb * 4 + (nb - 1), x0 = left + Math.max(0, Math.floor((r.w - total) / 2));
      for (let i = 0; i < nb; i++) pod(x0 + i * 5, r.y + 1);
      if (r.w >= 9) put('shelf', right - 2, far, 2, 1); if (r.w > 6 && r.w < 9) put('cabinet', right - 1, far, 1, 1); if (r.w > 6) put('cabinet', left, far, 1, 1); if (r.w > 8) put('plant', right - 1, near, 1, 1); if (r.w >= 9) put('whiteboard', left + 3, far, 2, 1, { solid: false });
    } else if (r.kind === 'meeting' || r.kind === 'small') {
      const segs = Math.max(1, Math.min(4, Math.floor((r.w - 2) / 2))), tx = left + Math.floor((r.w - segs * 2) / 2), row = midRow(r);
      for (let s = 0; s < segs; s++) { put('table', tx + s * 2, row, 2, 1, { table: true }); for (const dx of [0.5, 1.5]) { chair(tx + s * 2 + dx + 0.5, row - 0.35, 0, true); chair(tx + s * 2 + dx + 0.5, row + 1.35, 4, true); } }
      if (r.w >= 5) put('whiteboard', left + 1, far, 2, 1, { solid: false }); put('tv_w', right - 1, midRow(r), 1, 2, { solid: false }); if (r.w >= 6) put('plant', right - 1, far, 1, 1); if (r.w > 5) put('cabinet', left, near, 1, 1);
    } else if (r.kind === 'kitchen') { // a wall splits the room: dining on the left, the kitchen on the right with the sink and coffee machine against the right wall and the fridge against the partition
      const px = left + 9, ft = far; for (let yy = r.y + 3; yy < r.y + r.h; yy++) cells[I(px, yy)] = 0;
      put('coffee_w', right - 1, r.y + 1, 1, 2, { label: 'coffee' }); put('counter_w', right - 1, r.y + 3, 1, 2); put('counter_w', right - 1, r.y + 5, 1, 2);
      put('fridge', px + 1, r.y + 4, 1, 1); put('cooler', px + 1, r.y + 6, 1, 1); put('plant_big', px + 1, r.y + 1, 1, 1);
      const row = midRow(r); for (const tx of [left + 2, left + 5]) { put('table', tx, row, 2, 1, { table: true }); for (const dx of [0.5, 1.5]) { chair(tx + dx + 0.5, row - 0.35, 0, true); chair(tx + dx + 0.5, row + 1.35, 4, true); } }
      put('sofa', left + 1, ft, 2, 1); put('sofa_grey', left + 4, ft, 2, 1); put('plant', left + 7, ft, 1, 1);
    } else if (r.kind === 'lounge') {
      put('sofa', left + 1, far, 2, 1); put('sofa_grey', left + 4 < right - 2 ? left + 4 : left + 1, far + (r.south ? -2 : 2), 2, 1); put('plant_big', right - 1, far, 1, 1);
      if (r.n >= 4 && r.w >= 7) for (const y of [r.y + 1, r.y + 3]) if (podFree(right - 4, y)) { pod(right - 4, y); break; }
    } else if (r.kind === 'printer') { put('printer', left, far, 1, 1); put('cabinet', right - 1, far, 1, 1); }
    else if (r.kind === 'lobby') { put('reception', left + 1, r.y + 1, 3, 1); put('sofa', left + 1, r.y + 4, 2, 1); put('plant_big', left, near, 1, 1); put('lamp', right - 1, r.y, 1, 1); put('plant_big', right - 1, near, 1, 1); }
  };
  for (const r of rooms) layout(r);
  // a colleague can sit at a side chair of a pod (the seat is taken, so the player cannot sit there)
  const seated = (roomId, i, fallback) => { const r = rooms.find(r => r.id === roomId), cs = r ? props.filter(p => p.chair && (p.dir === 6 || p.dir === 2) && p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h) : [], c = cs[i]; if (!c) return fallback; c.taken = true; return { x: c.x, y: c.y, seat: { dir: c.dir } }; };
  for (let x = ox + 10, i = 0; x < ox + BW - 10; x += 9, i++) { const t = ['plant', 'bench', 'cooler', 'plant_big', 'bench'][i % 5], w = t === 'bench' ? 2 : 1; if (free(x, oy + R.c0, w, 1) && !rooms.some(r => !r.south && x + w > r.door - 1 && x < r.door + 3)) put(t, x, oy + R.c0, w, 1); }
  for (let x = ox + 12; x < ox + BW - 6; x += 12) light(x, oy + 10.5, 320, 0xfff6ea);
  for (const hx of [ox + 3, ox + 78]) { light(hx, oy + 10.5, 380, 0xfff6ea); light(hx, oy + 4, 300, 0xfff6ea); light(hx, oy + 17, 300, 0xfff6ea); }
  // ---- stairs: one in each end hall, one in each kitchen
  const kit = rooms.find(r => r.kind === 'kitchen');
  for (const [id, x, y] of [['W', ox + 3, oy + 3], ['E', ox + 77, oy + 3], ['K', kit.x, kit.south ? kit.y : kit.y + kit.h - 2]]) addStairs(id, x, y, floor === 0 ? 1 : 0);
  if (floor === 1) { addStairs('RW', ox + 3, oy + 16, 2); addStairs('RE', ox + 77, oy + 16, 2); } // the way up to the roof
  // ---- colleagues
  const at = (id, dx, dy) => { const r = rooms.find(r => r.id === id); return { x: r.x + dx, y: r.y + dy }; };
  if (floor === 0) {
    npcs.push({ id: 'sofie', name: 'Sofie', role: 'Reception', ...at('lobby', 3.5, 2.7), dir: 0, lines: ['Welcome to building 305!', 'Meeting rooms 206, 208 and 222 are upstairs. There are stairs at both ends, and one in each kitchen.', 'Visitors sign in with me. Colleagues just wave.'] });
    npcs.push({ id: 'anna', name: 'Anna', role: 'Admin', ...seated('106', 1, at('106', 1.5, 6.5)), dir: 0, lines: ['Hi! If the printer is jammed, it is always the one in 108.', 'Need a desk for a week? Ask me. Need one for a month? Ask me nicely.', 'The kitchen has the good coffee machine. Do not tell the other floor.'] });
    npcs.push({ id: 'erik', name: 'Erik', role: 'DST', ...seated('105', 5, at('105', 11.5, 6.5)), dir: 0, lines: ['Shh... the build is running.', 'It passes locally. That is all I am going to say.', 'The whiteboards are free. The markers are somewhere. Mostly.'] });
    npcs.push({ id: 'mads', name: 'Mads', role: 'Kitchen', x: kit.x + 11.5, y: kit.y + (kit.south ? kit.h - 3 : 3), dir: 0, lines: ['Fresh coffee. Cup number four, but who is counting?', 'The fridge is a shared ecosystem. Label your lunch.', 'The first floor has a twin of this kitchen. It is quieter.'] });
    npcs.push({ id: 'freja', name: 'Freja', role: 'Outside', x: ox + 24.5, y: oy - 3, dir: 0, lines: ['Taking five minutes of sunshine.', 'You can walk all around the building, the yard goes on both sides.', 'The cars are decorative. Do not try to start them.'] });
  } else {
    npcs.push({ id: 'freja', name: 'Freja', role: 'Hot desks', ...seated('HD', 0, at('HD', 3.5, 4.5)), dir: 0, lines: ['Hot desk today, a different one tomorrow. Like a nomad with a laptop.', 'I can only focus in the student room when it is silent.'] });
    npcs.push({ id: 'sofie', name: 'Sofie', role: 'Meetings', ...at('222', 2.5, 1.5), dir: 0, lines: ['222 has the green curtains. Best room in the building.', '208 is warm and orange; 206 is the small pink one for six people.', 'Book early. Everyone wants Friday 14:00.'] });
    npcs.push({ id: 'anna', name: 'Anna', role: 'DRAM', ...seated('205', 6, at('205', 9.5, 6.5)), dir: 0, lines: ['This is DRAM. We have the window seats.', 'Coffee runs on this floor are at 10 and at 14.'] });
    npcs.push({ id: 'mads', name: 'Mads', role: 'Office 221', ...seated('221', 9, at('221', 1.5, 6.5)), dir: 0, lines: ['Sit at any desk: press E next to a chair.', 'One day there will be something to do at the desks. For now: nice view.'] });
  }
  const spawn = floor === 0 ? { x: ox + 11.5, y: oy + BH + 3 } : { x: ox + 4, y: oy + 7 };
  return { floor, W, H, ox, oy, cells, zone, tint, wallTint, props, rooms, signs, npcs, stairs, lights, spawn };
}
