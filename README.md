# Office 305

A bright, modern 2D exploration game set in building 305 at DTU Lyngby: two floors, a yard, handcrafted rooms, NPCs to chat with and desks to sit at (more desk activities to come).

Run locally (no build step):

```bash
python3 -m http.server 8090   # from the parent folder, then open /dungeon-2d/
```

Controls: WASD/arrows walk, Shift hurry, E talk / sit / stairs / coffee, Esc pause, M mute.

Stack: Phaser 3 (CDN) + plain ES modules. Characters and furniture are pre-rendered from 3D into 8-direction sprite sheets (tools/).
