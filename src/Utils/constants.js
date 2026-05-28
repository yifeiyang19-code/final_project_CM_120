export const ARENA = {
  WIDTH: 3840,
  HEIGHT: 2048,
  TILE_WIDTH: 32,
  TILE_HEIGHT: 32,
  PLAYER_SPAWN: { x: 694, y: 1610 },
  BOSS_SPAWN: { x: 1920.5, y: 302 },
  BOSS_LANDING_POINT: { x: 1920.5, y: 946 }
};

export const PLAYER_STATS = {
  MAX_HP: 4,
  IFRAME_MS: 900,
  CONTACT_DAMAGE: 1
};

export const PHYSICS_CONSTANTS = {
  GRAVITY_Y: 900,
  FRICTION: 0.8,
  FIXED_STEP_SECONDS: 1 / 60
};

export const BOSS_STATS = {
  MAX_INTEGRITY: 100,
  PHASE2_THRESHOLD: 0.70,
  PHASE3_THRESHOLD: 0.35
};

export const ARENA_SOLID_COLLIDERS = [
  
  [0, 0, 40, 2048],
  [3800, 0, 40, 2048],
  [0, 1508, 3840, 148],

  
  [0, 1335, 220, 210],
  [3620, 1335, 220, 210],

  
  [0, 0, 3840, 24]
];

export const ARENA_PLATFORM_COLLIDERS = [
  
  [206, 1282, 408, 18],
  [206, 1057, 408, 18],
  [206, 832, 408, 18],
  [206, 602, 408, 18],

  
  [3226, 1282, 408, 18],
  [3226, 1057, 408, 18],
  [3226, 832, 408, 18],
  [3226, 602, 408, 18],

  
  [590, 422, 2660, 18],
  [980, 1222, 370, 18],
  [1480, 1022, 320, 18],
  [2040, 1022, 320, 18],
  [2490, 1222, 370, 18],
  [790, 1362, 300, 18],
  [2750, 1362, 300, 18],

  
  [418, 1384, 205, 16],
  [3217, 1384, 205, 16],
  [610, 662, 148, 16],
  [3082, 662, 148, 16]
];



export const ARENA_COLLIDERS = [
  ...ARENA_SOLID_COLLIDERS,
  ...ARENA_PLATFORM_COLLIDERS
];

export const COLLISION_TUNING = {
  PLATFORM_ONE_WAY_TOLERANCE: 18,
  PLATFORM_EDGE_INSET: 18,
  DEBUG_PLATFORM_COLOR: 0x3df7ff,
  DEBUG_SOLID_COLOR: 0xffcc33
};

export const RENDERING = {
  USE_STATIC_ARENA_BUFFER: false,
  BACKGROUND_CHUNK_SIZE: 512,
  CULLING_PADDING: 256,
  PARALLAX: {
    FAR: 0.2,
    MID: 0.5
  }
};

export const LADDER_ZONES = [
  { name: "left_outer_ladder", x: 250, y: 500, width: 140, height: 1010 },
  { name: "right_outer_ladder", x: 3380, y: 500, width: 140, height: 1010 },
  { name: "left_inner_ladder", x: 560, y: 590, width: 120, height: 760 },
  { name: "right_inner_ladder", x: 3160, y: 590, width: 120, height: 760 }
];





export const ARENA_POLYGONS = [
  {
    name: "central_floor_slope_hint",
    points: [
      { x: 0, y: 1500 },
      { x: 3840, y: 1500 },
      { x: 3840, y: 1620 },
      { x: 0, y: 1620 }
    ]
  }
];
