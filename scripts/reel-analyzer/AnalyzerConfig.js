const UPPERCASE = [
  0x47486813, // MARGE
  0xAFAC1823, // BARKLEY
  0xF9C7C754, // ZED
  0x2C5FBC64, // GARY
  0x35EBD2CE, // VICTOR
];

const PASCAL = [
  0x9D8EB9D3, // Marge
  0xDEFDFBE3, // Barkley
  0x1A161894, // Zed
  0xAE9C6784, // Gary
  0x0539B8AE, // Victor
];

const LOWERCASE = [
  0xCB943733, // marge
  0x71A84943, // barkley
  0xB78B80F4, // zed
  0x2E6E8864, // gary
  0x92E72D8E, // victor
];

// Active seed set — change this line to switch variants.

export const REEL_WEIGHTS = {
  coffee:  [190, 189, 188, 185, 185],
  burger:  [156, 154, 156, 155, 155],
  gas:     [133, 133, 133, 132, 133],
  chip:    [111, 111, 110, 110, 109],
  dice:    [96, 97, 97, 95, 95],
  zed:     [71, 72, 71, 72, 71],
  gary:    [64, 64, 64, 64, 63],
  barkley: [57, 57, 58, 57, 57],
  victor:  [51, 50, 50, 51, 51],
  marge:   [22, 24, 25, 29, 29],
  scatter: [49, 49, 48, 50, 52],
  };

export const PAYTABLE = {
  coffee: { label: "COFFEE", payoutMultipliers: { 3: 1, 4: 2, 5: 4 } },
  burger: { label: "BURGER", payoutMultipliers: { 3: 1.5, 4: 3, 5: 6 } },
  gas: { label: "GAS", payoutMultipliers: { 3: 2, 4: 4, 5: 8 } },
  chip: { label: "CHIP", payoutMultipliers: { 3: 3, 4: 6, 5: 12 } },
  dice: { label: "DICE", payoutMultipliers: { 3: 4, 4: 8, 5: 16 } },
  zed: { label: "ZED", payoutMultipliers: { 3: 7.5, 4: 15, 5: 30 } },
  gary: { label: "GARY", payoutMultipliers: { 3: 8.5, 4: 17, 5: 34 } },
  barkley: { label: "BARKLEY", payoutMultipliers: { 3: 10, 4: 20, 5: 40 } },
  victor: { label: "VICTOR", payoutMultipliers: { 3: 12, 4: 24, 5: 48 } },
  marge: { label: "MARGE", payoutMultipliers: { 3: 25, 4: 50, 5: 100 } },
  scatter: { label: "MIDNIGHT", payoutMultipliers: { 3: 0, 4: 0, 5: 0 } },
  };

/** All analyzer-owned settings. Production game rules stay in src/. */
// Locked candidate: GS-0169-FFC9-46C5
export const ANALYZER_CONFIG = {
  spinsPerSeed: 1_000_000,
  expectedSeeds: 5,
  warmupSpins: 10_000,
  progressInterval: 100_000,
  maxCascadeSteps: 10_000,
  previewSpins: 25,
  progressBarWidth: 20,
  activeSeedSet: 'LOWERCASE',
  seedSets: { UPPERCASE, PASCAL, LOWERCASE },
  lowSymbols: ['coffee', 'burger', 'gas', 'chip', 'dice'],
  highSymbols: ['zed', 'gary', 'barkley', 'victor'],
};
