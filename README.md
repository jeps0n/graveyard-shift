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
- Winning symbols are removed and **cascade**, with new symbols dropping into the vacancies
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

The reel model uses independent weighted symbol distributions for each of the five reels. Wins are evaluated against a fixed 10-payline definition, and cascades are resolved to exhaustion before the final payout is committed.

A large offline simulation was used during development to validate the resulting math profile:

| Metric | Simulated result |
| --- | ---: |
| Base RTP | ~94.8% |
| Overall RTP including After Midnight | **~97.8%** |
| Base win hit frequency | ~24.7% |
| After Midnight trigger rate | ~0.95% |
| Approx. feature frequency | ~1 in 106 spins |
| Spins with at least one additional winning cascade | ~3.9% |

These values are simulation results rather than regulatory claims and can vary slightly between runs.

## Architecture

The project separates game rules, math, presentation, features, and developer tooling rather than placing the full game loop in a single UI file.

```text
src/
├── assets/              # Symbols, cabinet, side artwork
├── after-midnight/      # Feature artwork
├── dev/                 # DEV console, receipt, spin replay
├── features/
│   └── AfterMidnight.ts # Feature outcome math
├── game/
│   ├── Game.ts          # Game orchestration
│   ├── GameStateMachine.ts
│   └── types.ts
├── math/
│   ├── GameMath.ts      # Reel generation, win evaluation, cascades
│   ├── Paylines.ts
│   ├── Paytable.ts
│   └── RNG.ts
├── presentation/
│   ├── GameView.ts
│   ├── ReelView.ts
│   ├── AfterMidnightView.ts
│   └── SymbolPresentation.ts
├── main.ts
└── style.css
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

- **Replay last completed spin**
- **Force After Midnight** on the next live spin
- Toggle **reel coordinates**
- Toggle **winning paylines**
- Detailed **DEV receipt** showing spin/math events

To open DEV mode, **hold `D` and click the right presentation panel**.

The replay path is presentation-only: it replays the captured result rather than consuming a new wager or generating a new live outcome.

## Testing

The project includes **7 Vitest test files** covering core non-visual behavior:

```text
AfterMidnight.test.ts
DevReceipt.test.ts
GameFlow.test.ts
GameMath.test.ts
GameStateMachine.test.ts
RNG.test.ts
SpinReplayController.test.ts
```

The tests focus on the systems where correctness matters most: game math, state transitions, RNG behavior, feature behavior, game flow, replay capture, and developer diagnostics.

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
