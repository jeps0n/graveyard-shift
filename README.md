# GRAVEYARD SHIFT

**A browser-based 5×3 slot game built with TypeScript, PixiJS, GSAP, and Vite.**

[**▶ PLAY DEMO**](https://jeps0n.github.io/graveyard-shift/) **·** [**View Source**](https://github.com/jeps0n/graveyard-shift)

GRAVEYARD SHIFT is a portfolio game set at **The Dead End**, a 24-hour truck stop / diner / casino where the night crew is a little less alive than usual. The project combines classic slot mechanics with clean game-flow architecture, inspectable math, responsive presentation, and a custom one-spin multiplier feature.

## Gameplay

- **5 reels × 3 rows**
- **10 fixed paylines**
- Left-to-right **3+ symbol** wins
- **Marge Wild** substitutes for regular paying symbols
- **Midnight Scatter** triggers the feature with 3+ Scatters
- Winning symbols are removed, surviving symbols fall, and new symbols refill the grid
- Cascades continue until no new line win remains
- Player-controlled wager with quick bet controls

### After Midnight

Landing **3+ Midnight Scatters** triggers **After Midnight**.

The player chooses one of three mystery items to reveal a **×2, ×5, or ×10** multiplier. That multiplier is stored for the **next spin only** and applies to the complete payout from that spin, including any cascade wins.

Multiplier weighting:

| Multiplier | Probability |
| ---: | ---: |
| ×2 | 50% |
| ×5 | 35% |
| ×10 | 15% |

## Game Math

The game uses independent weighted symbol distributions across five reels, with probabilities derived from integer reel weights. Wins are evaluated across 10 fixed paylines, cascades resolve until no further wins remain, and After Midnight multipliers apply to the following spin.

The finalized math configuration (**`GS-0169-FFC9-46C5`**) was analyzed through seeded Monte Carlo simulations using a dedicated analyzer that measures RTP, win frequency, symbol distributions, and bonus performance.

### Finalized simulation results

Results from **5,000,000 simulated spins** across **five fixed seeds** (1,000,000 spins each):

| Metric | Simulated result |
| --- | ---: |
| **Total RTP** | **95.04%** |
| Initial win RTP | 73.74% |
| Cascade RTP | 10.30% |
| After Midnight multiplier RTP contribution | 10.99% |
| Overall win hit rate | 20.03% (≈1 in 5 spins) |
| After Midnight trigger rate | 4.02% (≈1 in 25 spins) |

Results are based on 5,000,000 seeded Monte Carlo simulations and represent estimated performance for the configured game.

### Run the math analyzer

```bash
npm run analyze:math
```

The analyzer uses reproducible seeds to measure RTP, win frequency, symbol distributions, and bonus performance. Its configuration is maintained separately in `scripts/reel-analyzer/`.

## Architecture

The project separates game rules, math, presentation, features, and developer tooling rather than placing the full game loop in a single UI file.
```text
scripts/
└── reel-analyzer/             # Seeded Monte Carlo simulation and reports
src/
├── assets/
│   ├── after-midnight/        # Feature artwork
│   ├── cabinet/               # Cabinet artwork
│   └── symbols/               # Reel symbol artwork
├── dev/
│   ├── DebugSpinSnapshots.ts   # Recorded spin phase snapshots
│   ├── SpinReplayController.ts # Replay captured outcomes
│   ├── DevModeController.ts
│   └── DevReceipt.ts
├── features/
│   └── AfterMidnight.ts        # Feature outcome math
├── game/
│   ├── Game.ts                 # Game orchestration
│   ├── GameStateMachine.ts
│   └── types.ts
├── math/
│   ├── GameMath.ts             # Reel generation, win evaluation, cascades
│   ├── Paylines.ts
│   ├── Paytable.ts             # Production symbol payouts
│   ├── ReelWeights.ts          # Production reel distributions
│   └── RNG.ts
├── presentation/
│   ├── GameView.ts
│   ├── ReelView.ts
│   ├── ReelTileFactory.ts      # Reel symbol tile creation
│   ├── PaylineRenderer.ts      # Payline rendering
│   ├── DebugSpinInspector.ts   # Snapshot navigation controls
│   ├── BettingControls.ts      # Wager interactions
│   ├── GameHud.ts              # Balance and win display
│   ├── AfterMidnightView.ts
│   └── SymbolPresentation.ts
├── main.ts
└── style.css

tests/                         # Vitest game, math, and presentation tests
```

The game flow uses an explicit state machine:
```text
IDLE
  ↓
SPINNING
  ↓
EVALUATING
  ├──→ IDLE
  └──→ WIN_PRESENTATION
             ↓
          CASCADING
             ↓
          EVALUATING
```

Math code also produces trace data for RNG draws, payline evaluations, symbol removal, collapse, and refill operations. This keeps diagnostic information available without coupling the math engine to the presentation layer.

## Developer Mode

The project includes an internal developer view for inspecting and reproducing game behavior.

DEV tools include:

- **Spin Snapshot Navigation** — step through Pre-Spin Grid, Initial Grid, each Cascade, and Final Grid
- **Replay last completed spin** — replay captured outcomes without generating new results, deducting another wager, or changing the balance
- **Trigger After Midnight** on the next live spin
- Toggle **reel coordinates**
- Toggle **winning paylines**
- Detailed **DEV receipt** showing spin/math events

To open DEV mode, **hold `D` and click the right presentation panel**.

## Testing

The project includes Vitest coverage for game math, state transitions, wager handling, After Midnight, replay consistency, snapshot navigation, developer diagnostics, and presentation behavior. Tests cover both core logic and selected PixiJS/GSAP interactions.

Run the suite with:
```bash
npx vitest run
```

Run coverage with:
```bash
npx vitest run --coverage
```

## Tech Stack

- **TypeScript**
- **PixiJS 8** — rendering and reel presentation
- **GSAP 3** — spin, cascade, win, and feature animation
- **Vite** — development/build tooling
- **Vitest** — automated tests
- **GitHub Pages** — deployment

## Run Locally

Requires Node.js and npm.
```bash
git clone https://github.com/jeps0n/graveyard-shift.git
cd graveyard-shift
npm install
npm run dev
```

Production build:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Project Goals

GRAVEYARD SHIFT was built as a focused game-development portfolio project. The goal was not to reproduce a production gambling product, but to demonstrate:

- a complete playable game loop
- separation of math, game state, features, and presentation
- weighted reel generation and fixed-payline evaluation
- wild, scatter, cascade, and one-spin multiplier mechanics
- inspectable/replayable developer tooling
- automated validation of core logic
- responsive browser presentation with original themed artwork

The result is intentionally small enough to understand end-to-end while still exposing the engineering decisions behind the game.

---

**GRAVEYARD SHIFT** — *Another night at The Dead End.*
