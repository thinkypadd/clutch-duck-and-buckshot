export const STORAGE_KEY = 'clutch_buckshot_save_v3';

// Pure color Nitro boost stages (replaces 1X / 2X / 3X text)
export const NITRO_STAGE_COLORS = ['#3bd156', '#3898ff', '#ff3b30', '#b84dff'];
export const NITRO_STAGE_NAMES = ['GREEN', 'BLUE', 'RED', 'PURPLE'];

export const CARS = {
  junker: {
    id: 'junker',
    name: '74 RUSTBUCKET',
    price: 0,
    tagline: 'Duct-taped primer shitbox. Rattles like sin, paid in full.',
    gimmickName: 'CHOKE SURGE KNOB',
    gimmickDesc: 'Pull choke knob for rich-fuel low-gear torque surge before heat spikes.',
    bodyColor: 0x7a6855,
    trimColor: 0x45352b,
    dashColor: '#26211c',
    hoodColor: '#6b5847',
    baseTopMps: 37.5, // ~112 MPH stock 3-speed
    baseAccel: 12.2,
    baseArmor: 95,
    handling: 1.08,
    ramMult: 0.9,
    gearTiers: [3, 4, 4, 4],
    dualHolster: false,
    offRoadImmune: false,
    purpleNitroCapable: false,
    gimmickType: 'choke',
  },
  coupe: {
    id: 'coupe',
    name: '86 KURUMA COUPE',
    price: 450,
    tagline: 'Lightweight 80s street wedge built for late-braking canyon runs.',
    gimmickName: 'REDLINE V-CAM',
    gimmickDesc: 'Dash V-CAM switch unlocks +18% upper-RPM cam surge near redline.',
    bodyColor: 0xb82925,
    trimColor: 0x20232a,
    dashColor: '#1f232b',
    hoodColor: '#9c221e',
    baseTopMps: 48.5,
    baseAccel: 15.0,
    baseArmor: 110,
    handling: 1.24,
    ramMult: 1.0,
    gearTiers: [4, 5, 6, 6],
    dualHolster: false,
    offRoadImmune: false,
    purpleNitroCapable: false,
    gimmickType: 'vcam',
  },
  buggy: {
    id: 'buggy',
    name: 'BAJA DUNE BUGGY',
    price: 720,
    tagline: 'Open-cage desert tube rail that eats sand flats and vaults wrecks.',
    gimmickName: 'HYDRO-JUMP + SAND SPEC',
    gimmickDesc: 'Zero off-road speed penalty + dash JUMP shocks to hop burning wrecks.',
    bodyColor: 0xd9a126,
    trimColor: 0x242a33,
    dashColor: '#1d2228',
    hoodColor: '#bd8919',
    baseTopMps: 51.5,
    baseAccel: 16.4,
    baseArmor: 98,
    handling: 1.36,
    ramMult: 0.95,
    gearTiers: [4, 5, 6, 6],
    dualHolster: false,
    offRoadImmune: true,
    purpleNitroCapable: false,
    gimmickType: 'hydro_jump',
  },
  muscle: {
    id: 'muscle',
    name: 'V8 INTERCEPTOR',
    price: 980,
    tagline: 'Heavy highway fastback built to sideswipe rivals into scrap.',
    gimmickName: 'BLOWER OVERDRIVE',
    gimmickDesc: 'Center switch engages supercharger (+22% torque & 2.2X ram damage).',
    bodyColor: 0x223d78,
    trimColor: 0xd99b26,
    dashColor: '#23262e',
    hoodColor: '#1d3466',
    baseTopMps: 55.5,
    baseAccel: 17.2,
    baseArmor: 145,
    handling: 1.06,
    ramMult: 2.2,
    gearTiers: [5, 6, 6, 6],
    dualHolster: false,
    offRoadImmune: false,
    purpleNitroCapable: false,
    gimmickType: 'blower',
  },
  truck: {
    id: 'truck',
    name: 'IRON MULE UTE',
    price: 1300,
    tagline: 'Armored wasteland pickup carrying two loaded weapons on the visor.',
    gimmickName: 'DUAL VISOR HOLSTERS',
    gimmickDesc: 'Mounts Primary + Secondary guns on visor for 1-click hot-swapping.',
    bodyColor: 0x4b593c,
    trimColor: 0x9e9583,
    dashColor: '#292722',
    hoodColor: '#3f4d32',
    baseTopMps: 52.0,
    baseAccel: 14.8,
    baseArmor: 190,
    handling: 1.04,
    ramMult: 1.75,
    gearTiers: [5, 6, 6, 6],
    dualHolster: true,
    offRoadImmune: false,
    purpleNitroCapable: false,
    gimmickType: 'dual_gun',
  },
  rotary: {
    id: 'rotary',
    name: '82 ROTARY COUPE',
    price: 1680,
    tagline: 'Screaming 3-rotor street missile spitting unburned fuel fireballs.',
    gimmickName: 'TWIN-PIPE BACKFIRE',
    gimmickDesc: 'Dash igniter blasts a rear exhaust fireball to scorch tailgaters.',
    bodyColor: 0x8c2252,
    trimColor: 0xe6b830,
    dashColor: '#1c1b24',
    hoodColor: '#731a42',
    baseTopMps: 59.5,
    baseAccel: 18.6,
    baseArmor: 118,
    handling: 1.32,
    ramMult: 1.05,
    gearTiers: [5, 6, 7, 7],
    dualHolster: false,
    offRoadImmune: false,
    purpleNitroCapable: false,
    gimmickType: 'backfire',
  },
  rally: {
    id: 'rally',
    name: 'APEX TURBO HATCH',
    price: 2150,
    tagline: 'Group-B widebody terror unlocking the 4th Purple Nitro stage.',
    gimmickName: 'PURPLE NITRO + DRIFT',
    gimmickDesc: 'Unlocks 4th Purple overdrive boost (with Race N2O) + Drift Handbrake.',
    bodyColor: 0xd48a1e,
    trimColor: 0xf4efe6,
    dashColor: '#1a2129',
    hoodColor: '#ba7716',
    baseTopMps: 62.0,
    baseAccel: 19.6,
    baseArmor: 122,
    handling: 1.46,
    ramMult: 1.0,
    gearTiers: [6, 7, 7, 7],
    dualHolster: false,
    offRoadImmune: false,
    purpleNitroCapable: true,
    gimmickType: 'drift_purple',
  },
  hyper: {
    id: 'hyper',
    name: 'VALKYRIE GT-X',
    price: 3100,
    tagline: 'Low-slung twin-turbo prototype with an 8-speed titanium gate.',
    gimmickName: 'ACTIVE AERO WING',
    gimmickDesc: 'Toggle motorized wing between +35% Corner Grip and +12% Slip Speed.',
    bodyColor: 0xc2cad6,
    trimColor: 0x181c24,
    dashColor: '#141922',
    hoodColor: '#9da7b8',
    baseTopMps: 67.5,
    baseAccel: 21.0,
    baseArmor: 138,
    handling: 1.4,
    ramMult: 1.15,
    gearTiers: [6, 7, 8, 8],
    dualHolster: false,
    offRoadImmune: false,
    purpleNitroCapable: false,
    gimmickType: 'active_aero',
  },
};

export const CAR_SLOT_KEYS = [
  'block',
  'intake',
  'cooling',
  'trans',
  'nitro',
  'trunk',
  'armor',
  'bumper',
  'tires',
];

export const CAR_UPGRADES = {
  block: {
    label: 'ENGINE BLOCK',
    shortLabel: 'BLOCK',
    panel: 'hood',
    camFocus: { target: [0, 0.92, -1.32], dist: 2.55, yaw: 2.76, pitch: 0.46 },
    tiers: [
      { name: 'Cast-Iron Stock Block', price: 0, desc: 'Weathered factory block inside engine bay.' },
      { name: 'Red Twin-Cam Inline-6', price: 240, desc: '+11 MPH top speed. Painted red DOHC head.' },
      { name: 'Gold Big-Block V8', price: 540, desc: '+22 MPH & heavy torque. Gold V8 cylinder banks.' },
      { name: 'Billet Race V10 + Headers', price: 920, desc: '+34 MPH & race powerband. Chrome block & headers.' },
    ],
  },
  intake: {
    label: 'FORCED INDUCTION',
    shortLabel: 'INTAKE',
    panel: 'hood',
    camFocus: { target: [0, 1.02, -1.32], dist: 2.5, yaw: -2.76, pitch: 0.42 },
    tiers: [
      { name: 'Factory Airbox', price: 0, desc: 'Standard baffled plastic air cleaner.' },
      { name: 'Cone Pod & Strut Brace', price: 200, desc: '+10% accel. Red high-flow cone & strut bar.' },
      { name: 'Twin Turbos & Intercooler', price: 460, desc: '+22% accel. Twin snails, blue pipes & nose cooler.' },
      { name: 'Chrome Bugcatcher Blower', price: 820, desc: '+36% accel. Protrudes through hood with red valves!' },
    ],
  },
  cooling: {
    label: 'COOLING & ECU',
    shortLabel: 'COOL/ECU',
    panel: 'hood',
    camFocus: { target: [0, 0.88, -1.62], dist: 2.35, yaw: 2.98, pitch: 0.48 },
    tiers: [
      { name: 'Brass Radiator & Lead Cell', price: 0, desc: 'Stock radiator and heavy lead battery.' },
      { name: 'Aluminum Rad & Red Cell', price: 180, desc: '-25% gimmick heat & faster Trunk cooldown.' },
      { name: 'Dual Shroud Fans & Cooler', price: 380, desc: '-42% gimmick heat & sustained high-RPM torque.' },
      { name: 'Race Piggyback ECU + Coils', price: 640, desc: '+15% rev climb, yellow ignition coils & ECU box.' },
    ],
  },
  trans: {
    label: 'GEARBOX & SHIFTER',
    shortLabel: 'GEARBOX',
    panel: 'door',
    camFocus: { target: [-0.08, 0.96, -0.1], dist: 2.3, yaw: -1.12, pitch: 0.28 },
    tiers: [
      { name: 'Factory Iron Stick', price: 0, desc: 'Stock H-pattern gear count and rubber boot.' },
      { name: 'Street Overdrive Box', price: 220, desc: 'Unlocks T1 extra forward gear + alloy knob.' },
      { name: 'Close-Ratio Max-Gear Box', price: 480, desc: 'Unlocks car max gear (4-8 spd) + wider snap.' },
      { name: 'Billet Titanium Pro-Gate', price: 760, desc: 'Gold/titanium gated plate, +handling & top ratio.' },
    ],
  },
  nitro: {
    label: 'NITROUS SYSTEM',
    shortLabel: 'NITRO',
    panel: 'door',
    camFocus: { target: [0.28, 0.92, 0.04], dist: 2.45, yaw: -1.05, pitch: 0.3 },
    tiers: [
      { name: 'Empty Mount (No Nitro)', price: 0, desc: 'No N2O bottle or pull-handle installed.' },
      { name: 'Street N2O Bottle (Green)', price: 220, desc: 'Installs bottle + handle. Unlocks GREEN boost.' },
      { name: 'Purge N2O Kit (Blue)', price: 460, desc: '+30% PSI regen. Unlocks GREEN -> BLUE boost.' },
      { name: 'Twin Race Rig (Red/Purple)', price: 780, desc: '+65% PSI regen. Unlocks RED (+PURPLE on Rally).' },
    ],
  },
  trunk: {
    label: 'TRUNK COUNTERMEASURES',
    shortLabel: 'TRUNK',
    panel: 'trunk',
    camFocus: { target: [0, 0.94, 1.48], dist: 2.65, yaw: 0.28, pitch: 0.42 },
    tiers: [
      { name: 'Empty Trunk (Spare Tire)', price: 0, desc: 'No rear weapon installed. Overhead switch empty.' },
      { name: '55-Gal Oil Slick Sprayer', price: 240, desc: 'Overhead trigger dumps oil to spin out tailgaters.' },
      { name: 'Caltrop Spike Hopper', price: 460, desc: 'Drops sparking spikes (-45% foe speed + 34 dmg).' },
      { name: 'Proximity Mine Dispenser', price: 780, desc: 'Drops blinking red mines (90 explosive blast dmg).' },
      { name: 'Rear Napalm Flame Jet', price: 1150, desc: 'Ignites scorching fire wall (45 hit + 6s burn DoT).' },
    ],
  },
  armor: {
    label: 'CHASSIS & GLASS ARMOR',
    shortLabel: 'ARMOR',
    panel: 'none',
    camFocus: { target: [0, 1.02, 0.0], dist: 4.15, yaw: -2.35, pitch: 0.26 },
    tiers: [
      { name: 'Factory Pillars', price: 0, desc: 'Unarmored cabin glass and doors.' },
      { name: 'Welded Interior Rollcage', price: 220, desc: '+30 Armor HP. Visible steel A-pillar cage.' },
      { name: 'Riveted Door Armor Plates', price: 460, desc: '+62 Armor HP. Bolted steel side door slabs.' },
      { name: 'Ballistic Window Louvers', price: 780, desc: '+100 Armor HP & -38% bullet dmg. Steel window slats.' },
    ],
  },
  bumper: {
    label: 'FRONT BUMPER & PLOW',
    shortLabel: 'BUMPER',
    panel: 'none',
    camFocus: { target: [0, 0.62, -1.95], dist: 2.85, yaw: 2.68, pitch: 0.22 },
    tiers: [
      { name: 'Factory Bumper', price: 0, desc: 'Standard sheet-metal bumper.' },
      { name: 'Tubular Steel Push-Bar', price: 200, desc: '+35% ram damage & softer guardrail impacts.' },
      { name: 'Heavy V-Plow Wedge', price: 450, desc: '+70% ram damage. Angled steel wedge shoves foes.' },
      { name: 'Sawtooth Cattle-Catcher', price: 740, desc: '+115% ram damage. Brutal spiked nose rack.' },
    ],
  },
  tires: {
    label: 'TIRES, RIMS & AERO',
    shortLabel: 'WHEELS/AERO',
    panel: 'none',
    camFocus: { target: [0.35, 0.78, 1.05], dist: 3.35, yaw: 0.88, pitch: 0.25 },
    tiers: [
      { name: 'Factory Steelies', price: 0, desc: 'Narrow commuter rubber and single tailpipe.' },
      { name: 'Rally Knobbies + Side Pipes', price: 190, desc: '-65% off-road slowdown, white rims & side pipes.' },
      { name: 'Gold Slicks + Chin Splitter', price: 420, desc: '+18% cornering grip, gold mesh rims & ducktail.' },
      { name: 'Combat Run-Flats + GT Wing', price: 700, desc: 'All-terrain grip, armored hubs, GT wing & quad pipes.' },
    ],
  },
};

export const GUNS = {
  m1911: {
    id: 'm1911',
    name: 'M1911 .45 PISTOL',
    price: 0,
    tagline: 'Reliable semi-auto starter sidearm with crisp 80m reach.',
    reloadHint: 'Dock -> click DROP MAG -> drag fresh mag in -> rack top slide.',
    capacities: [7, 10, 15],
    auto: false,
    fireInterval: 0.17,
    damageClose: 26,
    damageMid: 21,
    closeRange: 30,
    maxRange: 84,
    spreadBase: 1.25,
    spreadSlope: 0.048,
    splashRadius: 0,
    reloadType: 'mag_slide',
  },
  sawed_off: {
    id: 'sawed_off',
    name: 'SAWED-OFF 12G',
    price: 320,
    tagline: 'Twin-barrel scattergun. Brutal door-to-door close blast & shove.',
    reloadHint: 'Break open -> drag 2 spent hulls out -> drag 2 shells in -> snap shut.',
    capacities: [2, 2, 2],
    auto: false,
    fireInterval: 0.2,
    damageClose: 60,
    damageMid: 34,
    closeRange: 25,
    maxRange: 55,
    spreadBase: 1.9,
    spreadSlope: 0.088,
    splashRadius: 0,
    reloadType: 'break_2',
  },
  revolver: {
    id: 'revolver',
    name: '.357 MAGNUM',
    price: 580,
    tagline: 'Heavy 6-shot hand cannon. Punches armor and shoves cars sideways.',
    reloadHint: 'Dock -> click EJECT rod -> drag rounds (or Speedloader) -> close.',
    capacities: [6, 6, 6],
    auto: false,
    fireInterval: 0.28,
    damageClose: 42,
    damageMid: 36,
    closeRange: 35,
    maxRange: 88,
    spreadBase: 1.28,
    spreadSlope: 0.05,
    splashRadius: 0,
    reloadType: 'cylinder',
  },
  pump_shotgun: {
    id: 'pump_shotgun',
    name: 'TRENCH PUMP 12G',
    price: 780,
    tagline: 'Tube-fed riot 12-gauge. Slam-fire trigger mod turns it wicked.',
    reloadHint: 'Dock -> drag shell packs into bottom tube -> rack wood pump forend.',
    capacities: [5, 7, 8],
    auto: false,
    fireInterval: 0.34,
    damageClose: 52,
    damageMid: 31,
    closeRange: 28,
    maxRange: 62,
    spreadBase: 1.75,
    spreadSlope: 0.078,
    splashRadius: 0,
    reloadType: 'tube_pump',
  },
  smg: {
    id: 'smg',
    name: 'VIPER 9MM SMG',
    price: 950,
    tagline: 'Hold Left-Click full-auto lead hose built for side-window drive-bys.',
    reloadHint: 'Dock -> click DROP MAG -> slam stick/drum mag -> pull top bolt.',
    capacities: [24, 36, 50],
    auto: true,
    fireInterval: 0.09,
    damageClose: 11.5,
    damageMid: 9,
    closeRange: 26,
    maxRange: 68,
    spreadBase: 1.55,
    spreadSlope: 0.068,
    splashRadius: 0,
    reloadType: 'mag_slide',
  },
  lever_rifle: {
    id: 'lever_rifle',
    name: 'MARES LEG .45-70',
    price: 1350,
    tagline: 'Cut-down brass lever rifle. Long-range armor-piercing highway sniper.',
    reloadHint: 'Dock -> push brass cartridges into side gate -> cycle lever loop.',
    capacities: [5, 7, 9],
    auto: false,
    fireInterval: 0.36,
    damageClose: 56,
    damageMid: 50,
    closeRange: 48,
    maxRange: 120,
    spreadBase: 1.05,
    spreadSlope: 0.036,
    splashRadius: 0,
    reloadType: 'lever_gate',
  },
  ak_shorty: {
    id: 'ak_shorty',
    name: 'DRACO 7.62 AK',
    price: 1750,
    tagline: 'Chopped 7.62x39 rifle punch in full-auto. Shreds Syndicate armor.',
    reloadHint: 'Dock -> click DROP MAG -> rock curved/drum mag -> pull bolt handle.',
    capacities: [20, 30, 45],
    auto: true,
    fireInterval: 0.125,
    damageClose: 19,
    damageMid: 16,
    closeRange: 38,
    maxRange: 96,
    spreadBase: 1.38,
    spreadSlope: 0.055,
    splashRadius: 0,
    reloadType: 'mag_slide',
  },
  thumper: {
    id: 'thumper',
    name: 'M79 40MM THUMPER',
    price: 2300,
    tagline: 'Break-action 40mm grenade launcher. Explosive area blast wrecks packs.',
    reloadHint: 'Break open -> pull fat 40mm brass hull -> drop HE shell -> snap shut.',
    capacities: [1, 1, 1],
    auto: false,
    fireInterval: 0.3,
    damageClose: 115,
    damageMid: 105,
    closeRange: 45,
    maxRange: 100,
    spreadBase: 2.1,
    spreadSlope: 0.06,
    splashRadius: 11.5,
    reloadType: 'break_1',
  },
};

export const GUN_SLOT_KEYS = ['barrel', 'loader', 'ammo', 'sight', 'action'];

export const GUN_UPGRADES = {
  barrel: {
    label: 'BARREL & MUZZLE',
    shortLabel: 'BARREL',
    zoomFocus: 'muzzle',
    tiers: [
      { name: 'Factory Barrel', price: 0, desc: 'Standard barrel profile and crown.' },
      { name: 'Extended Heavy Barrel', price: 180, desc: '+14% damage & +12m effective range.' },
      { name: 'Ported Comp / Tight Choke', price: 380, desc: '+26% damage & flatter recoil climb.' },
      { name: 'Suppressor / Spiked Breacher', price: 620, desc: '+38% damage, +22m range & custom muzzle.' },
    ],
  },
  loader: {
    label: 'MAGAZINE & FEED',
    shortLabel: 'MAG/FEED',
    zoomFocus: 'loader',
    tiers: [
      { name: 'Standard Feed', price: 0, desc: 'Factory capacity and loose visor ammo.' },
      { name: 'Extended Mag / Quick-Clips', price: 240, desc: '+Capacity on mag/tube guns; fast brass loops.' },
      { name: 'Drum Mag / 6x Speedloader', price: 520, desc: 'Drum mags, 1-drag .357 Speedloader, fast shell packs!' },
    ],
  },
  ammo: {
    label: 'AMMO PAYLOAD',
    shortLabel: 'AMMO',
    zoomFocus: 'ammo',
    tiers: [
      { name: 'Standard Lead / Ball', price: 0, desc: 'Standard factory lead projectiles.' },
      { name: 'Hollow-Point / 00 Buck', price: 200, desc: '+18% close-range damage & stronger lateral shove.' },
      { name: 'Armor-Piercing Sabot', price: 420, desc: 'Pierces heavy armor (+22% mid dmg & +18m range).' },
      { name: 'Incendiary / Dragons Breath', price: 680, desc: 'Ignites rival cars for 5.5s fire burn DoT!' },
    ],
  },
  sight: {
    label: 'OPTIC & LASER',
    shortLabel: 'SIGHT',
    zoomFocus: 'sight',
    tiers: [
      { name: 'Iron Sights', price: 0, desc: 'Standard factory iron bead.' },
      { name: 'Underbarrel Red Laser', price: 210, desc: 'Visible red laser beam + wider target lock.' },
      { name: 'Holo Reflex Optic', price: 420, desc: 'Framed reflex window + tighter shot grouping.' },
      { name: 'Combat Scope + Green Laser', price: 660, desc: 'Illuminated optic + green laser lock cone.' },
    ],
  },
  action: {
    label: 'GRIP & TRIGGER',
    shortLabel: 'ACTION',
    zoomFocus: 'grip',
    tiers: [
      { name: 'Factory Grip', price: 0, desc: 'Stock wood/polymer grip and trigger.' },
      { name: 'Checkered Recoil Grip', price: 190, desc: '-35% weapon kick & steadier one-hand aim.' },
      { name: 'Hair-Trigger / Slam-Fire', price: 440, desc: '+25% fire rate (enables hold-click Pump Slam-Fire!).' },
    ],
  },
};

export const TRACKS = {
  canyon: {
    id: 'canyon',
    name: 'CANYON CIRCUIT',
    subtitle: '3 LAPS | TECHNICAL DUSK ASPHALT PASS',
    desc: 'Tight elevation chicanes, guardrails, and high-speed tunnel-vision straights.',
    laps: 3,
    rivalCount: 5,
    isOpenWorld: false,
  },
  badlands: {
    id: 'badlands',
    name: 'BADLANDS FLATS (OPEN)',
    subtitle: '3 LAPS | WIDE OPEN DESERT CHECKPOINTS',
    desc: 'No guardrails. Broad salt flats, red-rock mesas, and flanking pack ambushes.',
    laps: 3,
    rivalCount: 6,
    isOpenWorld: true,
  },
};

export const LEAGUES = {
  scrapyard: {
    id: 'scrapyard',
    name: 'SCRAPYARD CUP',
    badge: '3-4 SPD',
    desc: 'Primer beaters and stock street coupes. Ideal for your 3-speed Rustbucket.',
    speedScale: 0.76,
    hpScale: 0.82,
    aggroDamageScale: 0.72,
    firstPrize: 280,
    wreckBounty: 60,
    rosterPool: ['junker', 'coupe', 'buggy'],
  },
  outlaw: {
    id: 'outlaw',
    name: 'STREET OUTLAW',
    badge: '5-6 SPD',
    desc: 'Supercharged highway muscle, armored utes, and screaming rotaries.',
    speedScale: 1.02,
    hpScale: 1.1,
    aggroDamageScale: 1.0,
    firstPrize: 680,
    wreckBounty: 115,
    rosterPool: ['coupe', 'buggy', 'muscle', 'truck', 'rotary'],
  },
  syndicate: {
    id: 'syndicate',
    name: 'SYNDICATE PRO',
    badge: '6-8 SPD',
    desc: 'Armored Group-B turbos and 200+ MPH Valkyrie prototypes firing heavy heat.',
    speedScale: 1.28,
    hpScale: 1.48,
    aggroDamageScale: 1.32,
    firstPrize: 1400,
    wreckBounty: 210,
    rosterPool: ['muscle', 'truck', 'rotary', 'rally', 'hyper'],
  },
};

function makeEmptyCarParts() {
  const obj = {};
  for (const k of CAR_SLOT_KEYS) obj[k] = 0;
  return obj;
}

function makeInitialOwnedCarParts() {
  const obj = {};
  for (const k of CAR_SLOT_KEYS) {
    const arr = Array(CAR_UPGRADES[k].tiers.length).fill(false);
    arr[0] = true; // Stock tier 0 always owned
    obj[k] = arr;
  }
  return obj;
}

function makeEmptyGunParts() {
  const obj = {};
  for (const k of GUN_SLOT_KEYS) obj[k] = 0;
  return obj;
}

function makeInitialOwnedGunParts() {
  const obj = {};
  for (const k of GUN_SLOT_KEYS) {
    const arr = Array(GUN_UPGRADES[k].tiers.length).fill(false);
    arr[0] = true;
    obj[k] = arr;
  }
  return obj;
}

export function createDefaultSave() {
  const carParts = {};
  const ownedCarParts = {};
  for (const cid of Object.keys(CARS)) {
    carParts[cid] = makeEmptyCarParts();
    ownedCarParts[cid] = makeInitialOwnedCarParts();
  }

  const gunParts = {};
  const ownedGunParts = {};
  for (const gid of Object.keys(GUNS)) {
    gunParts[gid] = makeEmptyGunParts();
    ownedGunParts[gid] = makeInitialOwnedGunParts();
  }

  return {
    cash: 0, // Start at $0 cash: race stock first!
    selectedTrack: 'canyon',
    selectedLeague: 'scrapyard',
    selectedCar: 'junker',
    ownedCars: { junker: true }, // Starter 3-speed Rustbucket
    carParts,
    ownedCarParts,
    ownedGuns: { m1911: true }, // Starter M1911 .45 Pistol
    primaryGun: 'm1911',
    secondaryGun: 'sawed_off',
    gunParts,
    ownedGunParts,
    godMode: false,
    totalWins: 0,
    totalWrecks: 0,
  };
}

export function loadSave(storage = globalThis.localStorage) {
  const fresh = createDefaultSave();
  if (!storage) return fresh;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return fresh;
    const parsed = JSON.parse(raw);
    const merged = {
      ...fresh,
      ...parsed,
      ownedCars: { ...fresh.ownedCars, ...(parsed.ownedCars || {}) },
      ownedGuns: { ...fresh.ownedGuns, ...(parsed.ownedGuns || {}) },
      carParts: { ...fresh.carParts },
      ownedCarParts: { ...fresh.ownedCarParts },
      gunParts: { ...fresh.gunParts },
      ownedGunParts: { ...fresh.ownedGunParts },
    };

    for (const cid of Object.keys(CARS)) {
      merged.carParts[cid] = { ...fresh.carParts[cid], ...(parsed.carParts?.[cid] || {}) };
      merged.ownedCarParts[cid] = { ...fresh.ownedCarParts[cid] };
      for (const slot of CAR_SLOT_KEYS) {
        const savedArr = parsed.ownedCarParts?.[cid]?.[slot];
        if (Array.isArray(savedArr)) {
          merged.ownedCarParts[cid][slot] = fresh.ownedCarParts[cid][slot].map(
            (def, idx) => Boolean(def || savedArr[idx])
          );
        }
        // Guarantee currently equipped tier is marked owned
        const eq = merged.carParts[cid][slot] || 0;
        if (merged.ownedCarParts[cid][slot][eq] !== undefined) {
          merged.ownedCarParts[cid][slot][eq] = true;
        }
      }
    }

    for (const gid of Object.keys(GUNS)) {
      merged.gunParts[gid] = { ...fresh.gunParts[gid], ...(parsed.gunParts?.[gid] || {}) };
      merged.ownedGunParts[gid] = { ...fresh.ownedGunParts[gid] };
      for (const slot of GUN_SLOT_KEYS) {
        const savedArr = parsed.ownedGunParts?.[gid]?.[slot];
        if (Array.isArray(savedArr)) {
          merged.ownedGunParts[gid][slot] = fresh.ownedGunParts[gid][slot].map(
            (def, idx) => Boolean(def || savedArr[idx])
          );
        }
        const eq = merged.gunParts[gid][slot] || 0;
        if (merged.ownedGunParts[gid][slot][eq] !== undefined) {
          merged.ownedGunParts[gid][slot][eq] = true;
        }
      }
    }

    if (!CARS[merged.selectedCar] || !merged.ownedCars[merged.selectedCar]) {
      merged.selectedCar = Object.keys(merged.ownedCars).find((k) => merged.ownedCars[k]) || 'junker';
    }
    if (!GUNS[merged.primaryGun] || !merged.ownedGuns[merged.primaryGun]) {
      merged.primaryGun = Object.keys(merged.ownedGuns).find((k) => merged.ownedGuns[k]) || 'm1911';
    }
    if (!TRACKS[merged.selectedTrack]) merged.selectedTrack = 'canyon';
    if (!LEAGUES[merged.selectedLeague]) merged.selectedLeague = 'scrapyard';

    return merged;
  } catch {
    return fresh;
  }
}

export function persistSave(save, storage = globalThis.localStorage) {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // Ignore storage quota errors in restricted browsing
  }
}

export function isCarUpgradeOwned(save, carId, slot, tierIndex) {
  if (tierIndex === 0) return true;
  return Boolean(save.ownedCarParts?.[carId]?.[slot]?.[tierIndex]);
}

export function isGunUpgradeOwned(save, gunId, slot, tierIndex) {
  if (tierIndex === 0) return true;
  return Boolean(save.ownedGunParts?.[gunId]?.[slot]?.[tierIndex]);
}

export function getComputedCarStats(save, carId = save.selectedCar, previewParts = null) {
  const spec = CARS[carId] || CARS.junker;
  const parts = previewParts
    ? { ...(save.carParts[carId] || makeEmptyCarParts()), ...previewParts }
    : { ...(save.carParts[carId] || makeEmptyCarParts()) };

  const maxGears = spec.gearTiers[Math.min(spec.gearTiers.length - 1, parts.trans || 0)];
  const blockBonusMps = [0, 3.8, 7.6, 11.6][parts.block || 0];
  const transBonusMps = [0, 1.8, 3.8, 5.8][parts.trans || 0];
  const aeroBonusMps = [0, 0.8, 1.8, 3.2][parts.tires || 0];
  const topMps = spec.baseTopMps + blockBonusMps + transBonusMps + aeroBonusMps;

  const intakeMult = [1.0, 1.1, 1.22, 1.36][parts.intake || 0];
  const coolingRevMult = [1.0, 1.04, 1.09, 1.15][parts.cooling || 0];
  const accel = spec.baseAccel * intakeMult * coolingRevMult;

  const armorAdd = [0, 30, 62, 100][parts.armor || 0];
  const maxArmor = spec.baseArmor + armorAdd;
  const bulletMitigation = [1.0, 0.92, 0.8, 0.62][parts.armor || 0];

  const tireGripAdd = [0, 0.08, 0.2, 0.32][parts.tires || 0];
  const transGripAdd = (parts.trans || 0) * 0.05;
  const handling = spec.handling + tireGripAdd + transGripAdd;

  const offRoadPenaltyMult = spec.offRoadImmune
    ? 0
    : [1.0, 0.35, 0.6, 0.2][parts.tires || 0];

  const bumperRamMult = [1.0, 1.35, 1.7, 2.15][parts.bumper || 0];
  const ramMult = spec.ramMult * bumperRamMult;

  // Nitro: Tier 0 = 0 stacks (uninstalled!), Tier 1 = 1 (Green), Tier 2 = 2 (Blue), Tier 3 = 3 (Red) or 4 (Purple on Rally!)
  const nitroTier = parts.nitro || 0;
  const maxNitroStacks =
    nitroTier === 0
      ? 0
      : nitroTier === 3 && spec.purpleNitroCapable
      ? 4
      : nitroTier;
  const nitroRegenMult = [0, 1.0, 1.3, 1.65][nitroTier];
  const nitroDurationBonus = nitroTier >= 3 ? 1.1 : 0;

  const heatRateMult = [1.0, 0.75, 0.58, 0.45][parts.cooling || 0];
  const trunkType = ['none', 'oil', 'spikes', 'mine', 'napalm'][parts.trunk || 0];
  const trunkCooldownSec = Math.max(3.0, 6.2 - (parts.cooling || 0) * 0.65);

  return {
    spec,
    parts,
    maxGears,
    topMps,
    topMph: Math.round(topMps * 3.0),
    accel,
    maxArmor,
    bulletMitigation,
    handling,
    offRoadPenaltyMult,
    ramMult,
    maxNitroStacks,
    nitroRegenMult,
    nitroDurationBonus,
    heatRateMult,
    trunkType,
    trunkCooldownSec,
    dualHolster: spec.dualHolster,
  };
}

export function getComputedGunStats(save, gunId, previewParts = null) {
  const spec = GUNS[gunId] || GUNS.m1911;
  const parts = previewParts
    ? { ...(save.gunParts[gunId] || makeEmptyGunParts()), ...previewParts }
    : { ...(save.gunParts[gunId] || makeEmptyGunParts()) };

  const barrelMult = [1.0, 1.14, 1.26, 1.38][parts.barrel || 0];
  const ammoCloseMult = [1.0, 1.18, 1.08, 1.12][parts.ammo || 0];
  const ammoMidMult = [1.0, 1.05, 1.24, 1.12][parts.ammo || 0];

  const loaderIdx = Math.min(spec.capacities.length - 1, parts.loader || 0);
  const capacity = spec.capacities[loaderIdx];

  const actionRateMult = [1.0, 0.94, 0.76][parts.action || 0];
  const recoilMult = [1.0, 0.65, 0.52][parts.action || 0] * (parts.barrel >= 2 ? 0.85 : 1.0);
  const fireInterval = spec.fireInterval * actionRateMult;

  // Trench Pump 12G unlocks hold-click Slam-Fire with Hair-Trigger (action === 2)
  const isAuto = spec.auto || (gunId === 'pump_shotgun' && (parts.action || 0) >= 2);

  const rangeBonus = (parts.barrel || 0) * 7 + (parts.ammo === 2 ? 18 : 0);
  const spreadBonus = [0, 0.35, 0.55, 0.8][parts.sight || 0];

  return {
    spec,
    parts,
    capacity,
    isAuto,
    fireInterval,
    recoilMult,
    damageClose: Math.round(spec.damageClose * barrelMult * ammoCloseMult),
    damageMid: Math.round(spec.damageMid * barrelMult * ammoMidMult),
    closeRange: spec.closeRange + (parts.barrel || 0) * 4,
    maxRange: spec.maxRange + rangeBonus,
    spreadBonus,
    splashRadius:
      spec.splashRadius > 0
        ? spec.splashRadius + (parts.ammo >= 2 ? 3.5 : 0)
        : 0,
    armorPiercing: (parts.ammo || 0) === 2,
    incendiary: (parts.ammo || 0) === 3,
    shoveBonus: (parts.ammo || 0) === 1 ? 1.45 : 1.0,
    hasSpeedloader: gunId === 'revolver' && (parts.loader || 0) >= 2,
    fastPackLoad: (parts.loader || 0) >= 2,
    laserColor:
      (parts.sight || 0) >= 3 ? '#52ff6e' : (parts.sight || 0) === 1 ? '#ff3b30' : null,
  };
}

export function purchaseCar(save, carId) {
  const car = CARS[carId];
  if (!car) return { ok: false, reason: 'Unknown vehicle' };
  if (save.ownedCars[carId]) {
    save.selectedCar = carId;
    return { ok: true, equippedOnly: true };
  }
  if (save.cash < car.price) return { ok: false, reason: 'Insufficient funds' };
  save.cash -= car.price;
  save.ownedCars[carId] = true;
  save.selectedCar = carId;
  return { ok: true, equippedOnly: false };
}

export function getCarTradeInValue(save, carId) {
  const car = CARS[carId];
  if (!car || !save.ownedCars[carId]) return 0;
  let totalInvested = car.price;
  for (const slot of CAR_SLOT_KEYS) {
    const ownedArr = save.ownedCarParts[carId]?.[slot] || [];
    const tiers = CAR_UPGRADES[slot].tiers;
    for (let i = 1; i < tiers.length; i++) {
      if (ownedArr[i]) totalInvested += tiers[i].price;
    }
  }
  return Math.round(totalInvested * 0.7);
}

export function sellCar(save, carId) {
  if (!save.ownedCars[carId]) return { ok: false, reason: 'Not owned' };
  const ownedKeys = Object.keys(save.ownedCars).filter((k) => save.ownedCars[k]);
  if (ownedKeys.length <= 1) {
    return { ok: false, reason: 'Must keep at least one vehicle' };
  }
  const refund = getCarTradeInValue(save, carId);
  save.cash += refund;
  delete save.ownedCars[carId];
  save.carParts[carId] = makeEmptyCarParts();
  save.ownedCarParts[carId] = makeInitialOwnedCarParts();
  if (save.selectedCar === carId) {
    save.selectedCar = Object.keys(save.ownedCars).find((k) => save.ownedCars[k]) || 'junker';
  }
  return { ok: true, refund };
}

export function purchaseCarUpgrade(save, carId, slot, tierIndex) {
  const track = CAR_UPGRADES[slot];
  if (!track || !track.tiers[tierIndex] || !save.ownedCars[carId]) return { ok: false };
  const currentEq = save.carParts[carId][slot] || 0;
  const alreadyOwned = isCarUpgradeOwned(save, carId, slot, tierIndex);

  if (alreadyOwned) {
    save.carParts[carId][slot] = tierIndex;
    return { ok: true, equippedOnly: true, alreadyEquipped: currentEq === tierIndex };
  }

  const tier = track.tiers[tierIndex];
  if (save.cash < tier.price) return { ok: false, reason: 'Insufficient funds' };
  save.cash -= tier.price;
  save.ownedCarParts[carId][slot][tierIndex] = true;
  save.carParts[carId][slot] = tierIndex;
  return { ok: true, equippedOnly: false };
}

export function purchaseGun(save, gunId, slot = 'primary') {
  const gun = GUNS[gunId];
  if (!gun) return { ok: false };
  let boughtNow = false;
  if (!save.ownedGuns[gunId]) {
    if (save.cash < gun.price) return { ok: false, reason: 'Insufficient funds' };
    save.cash -= gun.price;
    save.ownedGuns[gunId] = true;
    boughtNow = true;
  }
  if (slot === 'secondary') {
    save.secondaryGun = gunId;
    if (save.primaryGun === gunId) {
      const other = Object.keys(save.ownedGuns).find((k) => save.ownedGuns[k] && k !== gunId);
      if (other) save.primaryGun = other;
    }
  } else {
    save.primaryGun = gunId;
  }
  return { ok: true, equippedOnly: !boughtNow };
}

export function purchaseGunUpgrade(save, gunId, slot, tierIndex) {
  const track = GUN_UPGRADES[slot];
  if (!track || !track.tiers[tierIndex] || !save.ownedGuns[gunId]) return { ok: false };
  const currentEq = save.gunParts[gunId][slot] || 0;
  const alreadyOwned = isGunUpgradeOwned(save, gunId, slot, tierIndex);

  if (alreadyOwned) {
    save.gunParts[gunId][slot] = tierIndex;
    return { ok: true, equippedOnly: true, alreadyEquipped: currentEq === tierIndex };
  }

  const tier = track.tiers[tierIndex];
  if (save.cash < tier.price) return { ok: false, reason: 'Insufficient funds' };
  save.cash -= tier.price;
  save.ownedGunParts[gunId][slot][tierIndex] = true;
  save.gunParts[gunId][slot] = tierIndex;
  return { ok: true, equippedOnly: false };
}

export function unlockEverythingDev(save) {
  for (const cid of Object.keys(CARS)) {
    save.ownedCars[cid] = true;
    for (const slot of CAR_SLOT_KEYS) {
      save.ownedCarParts[cid][slot] = CAR_UPGRADES[slot].tiers.map(() => true);
    }
  }
  for (const gid of Object.keys(GUNS)) {
    save.ownedGuns[gid] = true;
    for (const slot of GUN_SLOT_KEYS) {
      save.ownedGunParts[gid][slot] = GUN_UPGRADES[slot].tiers.map(() => true);
    }
  }
}
