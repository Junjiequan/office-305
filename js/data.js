// Constants and tables for Office 305. Distances are screen pixels at zoom 1; the ground is drawn squashed (TH < TW) as a 3/4 view,
// matching the camera pitch the sprites were rendered with.
export const PPM = 64;                 // pixels per metre across the screen
export const TW = 64, TH = 43;         // one tile: 64 px wide, 43 px tall on screen
export const K = TH / TW;              // vertical squash of the ground plane
export const PS = 1.2;                 // furniture is drawn a little larger than life so rooms feel furnished

// who you can be: the four rendered characters, in office terms
export const CHAR = 0.8; // characters are drawn at this fraction of the sprite size
export const AVATARS = {
  boxer: { name: 'You', icon: '🧑', blurb: 'A colleague on a quiet day in building 305.', speed: 4.4 },
};

// floor and wall materials (512 px tiles from Poly Haven, CC0)
export const ZONES = {
  carpet: { tex: 'dirty_carpet', lift: 0.30 }, laminate: { tex: 'laminate_floor_02', lift: 0 }, tiles: { tex: 'floor_tiles_02', lift: 0 }, corridor: { tex: 'concrete_tiles_02', lift: 0.14 },
  marble: { tex: 'marble_tiles', lift: 0.04 }, asphalt: { tex: 'asphalt_04', lift: -0.1 }, grass: { tex: 'grass_ground', lift: 0 }, paving: { tex: 'concrete_tiles_02', lift: 0.05 }, roof: { tex: 'asphalt_04', lift: 0.3 },
};
export const WALL_TEX = 'painted_plaster_wall';
// accent colours of the rooms that have a mood board (206 pink, 208 ochre, 222 green)
export const ACCENTS = { pink: 'rgba(216,150,150,', ochre: 'rgba(226,160,70,', green: 'rgba(110,160,120,', blue: 'rgba(110,140,200,' };
