export const STORAGE_KEY = 'clutch_buckshot_save_v2';

export const CARS = {
  coupe: {
    id: 'coupe',
    name: '86 KURUMA COUPE',
    price: 0,
    tagline: 'Balanced 80s street wedge with forgiving 6-speed gearing.',
    gimmickName: 'SHIFT-LIGHT CLUSTER',
    gimmickDesc: 'Balanced powerband across all 6 gears with low-drag aero.',
    bodyColor: 0xb82925,
    trimColor: 0x20232a,
    dashColor: '#1f232b',
    hoodColor: '#9c221e',
    baseTopMps: 54, // ~162 MPH stock
    baseAccel: 15.5,
    baseArmor: 105,
    handling: 1.18,
    ramMult: 1.0,
    maxNitroStacks: 3,
    dualHolster: false,
    gimmickType: 'shift_light',
  },
  muscle: {
    id: 'muscle',
    name: 'V8 INTERCEPTOR',
    price: 650,
    tagline: 'Heavy highway muscle built to sideswipe rivals into scrap.',
    gimmickName: 'BLOWER OVERDRIVE SWITCH',
    gimmickDesc: 'Center dash switch engages supercharger (+20% torque & 2.2X ram damage).',
    bodyColor: 0x223d78,
    trimColor: 0xd99b26,
    dashColor: '#23262e',
    hoodColor: '#1d3466',
    baseTopMps: 58, // ~174 MPH stock
    baseAccel: 17.0,
    baseArmor: 140,
    handling: 1.04,
    ramMult: 2.2,
    maxNitroStacks: 3,
    dualHolster: false,
    gimmickType: 'blower',
  },
  rally: {
    id: 'rally',
    name: 'APEX TURBO HATCH',
    price: 850,
    tagline: 'Lightweight box-flare rally terror with 4X nitro capacity.',
    gimmickName: '4X NITRO + DRIFT LEVER',
    gimmickDesc: 'Stacks up to 4X Nitro boost and has a hydraulic Drift Handbrake lever.',
    bodyColor: 0xd48a1e,
    trimColor: 0xf4efe6,
    dashColor: '#1a2129',
    hoodColor: '#ba7716',
    baseTopMps: 56,
    baseAccel: 18.2,
    baseArmor: 90,
    handling: 1.42,
    ramMult: 0.85,
    maxNitroStacks: 4,
    dualHolster: false,
    gimmickType: 'drift_4x',
  },
  truck: {
    id: 'truck',
    name: 'IRON MULE UTE',
    price: 1100,
    tagline: 'Armored wasteland pickup carrying two loaded guns at once.',
    gimmickName: 'DUAL VISOR HOLSTERS',
    gimmickDesc: 'Mounts Primary + Secondary guns on the visor for instant hot-swapping.',
    bodyColor: 0x4b593c,
    trimColor: 0x9e9583,
    dashColor: '#292722',
    hoodColor: '#3f4d32',
    baseTopMps: 51,
    baseAccel: 14.2,
    baseArmor: 185,
    handling: 1.02,
    ramMult: 1.65,
    maxNitroStacks: 3,
    dualHolster: true,
    gimmickType: 'dual_gun',
  },
};

export const CAR_UPGRADES = {
  engine: {
    label: 'INTAKE & ENGINE',
    tiers: [
      { name: 'Stock Intake', price: 0, desc: 'Factory manifold under flat hood.' },
      { name: 'Twin-Carb Hood Scoop', price: 220, desc: '+10 MPH top speed. Visible hood scoop.' },
      { name: 'Chrome Bugcatcher Blower', price: 480, desc: '+22 MPH & +25% torque. Protrudes through hood!' },
    ],
  },
  armor: {
    label: 'CHASSIS & GLASS ARMOR',
    tiers: [
      { name: 'Factory Pillars', price: 0, desc: 'Unarmored cabin glass and bumper.' },
      { name: 'Welded Rollcage & Bullbar', price: 240, desc: '+35 Armor & ram guard. Visible A-pillar rollcage.' },
      { name: 'Ballistic Window Louvers', price: 520, desc: '+75 Armor. Riveted steel slats on windshield & doors.' },
    ],
  },
  trans: {
    label: 'GEARBOX & SHIFTER',
    tiers: [
      { name: 'Iron Stick Shift', price: 0, desc: 'Standard rubber-boot 6-speed H-gate.' },
      { name: 'Short-Throw Rally Gate', price: 200, desc: 'Wider shift snap-zones, alloy knob, +handling.' },
      { name: 'Billet Titanium H-Gate', price: 420, desc: 'Machined gated plate, gold knob & aero wing.' },
    ],
  },
  nitro: {
    label: 'NITROUS SYSTEM',
    tiers: [
      { name: 'Single Painted Bottle', price: 0, desc: 'Standard passenger N2O tank.' },
      { name: 'High-Flow Purge Bottle', price: 230, desc: '+30% faster PSI regen. Anodized crimson bottle.' },
      { name: 'Twin Braided Race Rig', price: 490, desc: '+65% PSI regen & longer boost. Twin gold bottles!' },
    ],
  },
};

export const GUNS = {
  sawed_off: {
    id: 'sawed_off',
    name: 'SAWED-OFF 12G',
    price: 0,
    tagline: 'Twin-barrel scattergun. Devastating door-to-door close blast.',
    reloadHint: 'Break open on visor -> drag spent hulls out -> drag fresh shells in -> snap shut.',
    capacity: 2,
    auto: false,
    fireInterval: 0.2,
    damageClose: 58,
    damageMid: 34,
    closeRange: 25,
    maxRange: 54,
    spreadBase: 1.9,
    spreadSlope: 0.088,
    reloadType: 'break_2',
  },
  m1911: {
    id: 'm1911',
    name: 'M1911 .45 PISTOL',
    price: 300,
    tagline: 'Crisp semi-auto sidearm with 80m reach and quick mag swaps.',
    reloadHint: 'Dock on visor -> click mag release -> drag fresh mag in -> rack top slide.',
    capacity: 7,
    auto: false,
    fireInterval: 0.17,
    damageClose: 25,
    damageMid: 21,
    closeRange: 30,
    maxRange: 82,
    spreadBase: 1.25,
    spreadSlope: 0.048,
    reloadType: 'mag_slide',
  },
  revolver: {
    id: 'revolver',
    name: '.357 MAGNUM',
    price: 550,
    tagline: 'Heavy 6-gun cannon. Punches armor and shoves rival cars sideways.',
    reloadHint: 'Dock on visor -> click ejector rod -> drag rounds (or speedloader) in -> close.',
    capacity: 6,
    auto: false,
    fireInterval: 0.3,
    damageClose: 40,
    damageMid: 34,
    closeRange: 34,
    maxRange: 85,
    spreadBase: 1.3,
    spreadSlope: 0.052,
    reloadType: 'cylinder',
  },
  smg: {
    id: 'smg',
    name: 'VIPER 9MM SMG',
    price: 800,
    tagline: 'Hold Left-Click full-auto lead hose built for side-window drive-bys.',
    reloadHint: 'Dock on visor -> drop empty stick mag -> slam fresh mag -> pull bolt.',
    capacity: 24,
    auto: true,
    fireInterval: 0.092,
    damageClose: 11,
    damageMid: 8.5,
    closeRange: 26,
    maxRange: 66,
    spreadBase: 1.55,
    spreadSlope: 0.068,
    reloadType: 'mag_slide',
  },
};

export const GUN_UPGRADES = {
  barrel: {
    label: 'BARREL & MUZZLE',
    tiers: [
      { name: 'Factory Barrel', price: 0, desc: 'Standard barrel length and muzzle.' },
      { name: 'Ported / Heavy Barrel', price: 180, desc: '+18% damage & +12m effective range. Visible muzzle mod.' },
      { name: 'Competition Muzzle / Suppressor', price: 380, desc: '+32% damage & reduced recoil. Full custom barrel.' },
    ],
  },
  loader: {
    label: 'MAGAZINE & AMMO',
    tiers: [
      { name: 'Standard Load', price: 0, desc: 'Factory capacity / loose ammo loops.' },
      { name: 'Extended Mag / Speedloader', price: 240, desc: '+Capacity on Mag guns, 1-drag Speedloader on .357, Magnum 12G brass!' },
    ],
  },
  sight: {
    label: 'OPTIC & TARGETING',
    tiers: [
      { name: 'Iron Bead', price: 0, desc: 'Standard iron sights.' },
      { name: 'Laser / Reflex Sight', price: 220, desc: 'Visible optic or laser module + wider target lock cone.' },
    ],
  },
};

export const TRACKS = {
  canyon: {
    id: 'canyon',
    name: 'CANYON CIRCUIT',
    subtitle: '3 LAPS | TECHNICAL ASPHALT PASS | 6 RACERS',
    desc: 'Tight elevation chicanes, guardrails, and high-speed straights.',
    laps: 3,
    rivalCount: 5,
    firstPrize: 450,
    wreckBounty: 80,
    isOpenWorld: false,
  },
  badlands: {
    id: 'badlands',
    name: 'BADLANDS FLATS (OPEN)',
    subtitle: '3 LAPS | WIDE OPEN DESERT CHECKPOINTS | 7 RACERS',
    desc: 'No guardrails. Broad salt flats, red-rock arches, and flanking pack ambushes.',
    laps: 3,
    rivalCount: 6,
    firstPrize: 650,
    wreckBounty: 100,
    isOpenWorld: true,
  },
};

export function createDefaultSave() {
  return {
    cash: 350,
    selectedTrack: 'canyon',
    selectedCar: 'coupe',
    ownedCars: { coupe: true },
    carParts: {
      coupe: { engine: 0, armor: 0, trans: 0, nitro: 0 },
      muscle: { engine: 0, armor: 0, trans: 0, nitro: 0 },
      rally: { engine: 0, armor: 0, trans: 0, nitro: 0 },
      truck: { engine: 0, armor: 0, trans: 0, nitro: 0 },
    },
    ownedGuns: { sawed_off: true },
    primaryGun: 'sawed_off',
    secondaryGun: 'm1911',
    gunParts: {
      sawed_off: { barrel: 0, loader: 0, sight: 0 },
      m1911: { barrel: 0, loader: 0, sight: 0 },
      revolver: { barrel: 0, loader: 0, sight: 0 },
      smg: { barrel: 0, loader: 0, sight: 0 },
    },
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
    return {
      ...fresh,
      ...parsed,
      ownedCars: { ...fresh.ownedCars, ...(parsed.ownedCars || {}) },
      carParts: {
        coupe: { ...fresh.carParts.coupe, ...(parsed.carParts?.coupe || {}) },
        muscle: { ...fresh.carParts.muscle, ...(parsed.carParts?.muscle || {}) },
        rally: { ...fresh.carParts.rally, ...(parsed.carParts?.rally || {}) },
        truck: { ...fresh.carParts.truck, ...(parsed.carParts?.truck || {}) },
      },
      ownedGuns: { ...fresh.ownedGuns, ...(parsed.ownedGuns || {}) },
      gunParts: {
        sawed_off: { ...fresh.gunParts.sawed_off, ...(parsed.gunParts?.sawed_off || {}) },
        m1911: { ...fresh.gunParts.m1911, ...(parsed.gunParts?.m1911 || {}) },
        revolver: { ...fresh.gunParts.revolver, ...(parsed.gunParts?.revolver || {}) },
        smg: { ...fresh.gunParts.smg, ...(parsed.gunParts?.smg || {}) },
      },
    };
  } catch {
    return fresh;
  }
}

export function persistSave(save, storage = globalThis.localStorage) {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // Ignore quota errors in private browsing
  }
}

export function getComputedCarStats(save, carId = save.selectedCar) {
  const spec = CARS[carId] || CARS.coupe;
  const parts = save.carParts[carId] || { engine: 0, armor: 0, trans: 0, nitro: 0 };
  const topMps = spec.baseTopMps + parts.engine * 3.8 + parts.trans * 1.6;
  const accel = spec.baseAccel * (1 + parts.engine * 0.12);
  const maxArmor = spec.baseArmor + (parts.armor === 1 ? 35 : parts.armor === 2 ? 75 : 0);
  const handling = spec.handling + parts.trans * 0.1;
  const nitroRegenMult = 1 + (parts.nitro === 1 ? 0.3 : parts.nitro === 2 ? 0.65 : 0);
  const nitroDurationBonus = parts.nitro === 2 ? 1.1 : 0;
  return {
    spec,
    parts,
    topMps,
    topMph: Math.round(topMps * 3.0),
    accel,
    maxArmor,
    handling,
    ramMult: spec.ramMult + parts.armor * 0.2,
    maxNitroStacks: spec.maxNitroStacks,
    nitroRegenMult,
    nitroDurationBonus,
    dualHolster: spec.dualHolster,
  };
}

export function getComputedGunStats(save, gunId) {
  const spec = GUNS[gunId] || GUNS.sawed_off;
  const parts = save.gunParts[gunId] || { barrel: 0, loader: 0, sight: 0 };
  const dmgMult =
    (1 + (parts.barrel === 1 ? 0.18 : parts.barrel === 2 ? 0.32 : 0)) *
    (gunId === 'sawed_off' && parts.loader > 0 ? 1.18 : 1);
  let capacity = spec.capacity;
  if (parts.loader > 0) {
    if (gunId === 'm1911') capacity = 10;
    else if (gunId === 'smg') capacity = 36;
  }
  return {
    spec,
    parts,
    capacity,
    damageClose: Math.round(spec.damageClose * dmgMult),
    damageMid: Math.round(spec.damageMid * dmgMult),
    closeRange: spec.closeRange + parts.barrel * 5,
    maxRange: spec.maxRange + parts.barrel * 8,
    spreadBonus: parts.sight > 0 ? 0.45 : 0,
    hasSpeedloader: gunId === 'revolver' && parts.loader > 0,
    hasLaser: parts.sight > 0,
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

export function purchaseCarUpgrade(save, carId, slot, tierIndex) {
  const track = CAR_UPGRADES[slot];
  if (!track || !track.tiers[tierIndex]) return { ok: false };
  if (!save.ownedCars[carId]) return { ok: false };
  const current = save.carParts[carId][slot] || 0;
  if (current === tierIndex) return { ok: true, already: true };
  const tier = track.tiers[tierIndex];
  // Allow equipping already-paid lower tiers for free or paying difference/price for higher tier
  if (tierIndex > current) {
    if (save.cash < tier.price) return { ok: false, reason: 'Insufficient funds' };
    save.cash -= tier.price;
  }
  save.carParts[carId][slot] = tierIndex;
  return { ok: true };
}

export function purchaseGun(save, gunId, slot = 'primary') {
  const gun = GUNS[gunId];
  if (!gun) return { ok: false };
  if (!save.ownedGuns[gunId]) {
    if (save.cash < gun.price) return { ok: false, reason: 'Insufficient funds' };
    save.cash -= gun.price;
    save.ownedGuns[gunId] = true;
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
  return { ok: true };
}

export function purchaseGunUpgrade(save, gunId, slot, tierIndex) {
  const track = GUN_UPGRADES[slot];
  if (!track || !track.tiers[tierIndex] || !save.ownedGuns[gunId]) return { ok: false };
  const current = save.gunParts[gunId][slot] || 0;
  if (current === tierIndex) return { ok: true, already: true };
  const tier = track.tiers[tierIndex];
  if (tierIndex > current) {
    if (save.cash < tier.price) return { ok: false, reason: 'Insufficient funds' };
    save.cash -= tier.price;
  }
  save.gunParts[gunId][slot] = tierIndex;
  return { ok: true };
}
