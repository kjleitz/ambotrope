# Ambotrope

Multiplayer browser game where players see a shared hex grid with procedurally generated cloud-like blobs, secretly select tiles, and give word hints to help teammates avoid collisions.

## Tech Stack

- **Monorepo**: pnpm workspaces
- **Language**: TypeScript (ESM throughout)
- **Server**: Hono + WebSocket (planned)
- **Validation**: Zod
- **Frontend**: React + Vite + Tailwind CSS (planned)
- **Tests**: Vitest
- **TS Runtime**: tsx (no build step — TypeScript runs directly via tsx)
- **Infrastructure**: Terraform (AWS) (planned)

## Project Structure

```
packages/
  grid/      — Hex grid logic (honeycomb-grid wrapper)
  noise/     — Procedural noise generation (modular noise + bias)
  game/      — Core game state machine, rules, word list, scoring
  protocol/  — Shared client/server message types + Zod schemas
apps/
  server/    — Hono HTTP + WebSocket game server (planned)
  web/       — React frontend (planned)
infra/       — Terraform (planned)
```

## Key Patterns

- All game logic is pure functions (no I/O). State in, state out.
- Noise generation is modular: swappable `NoiseGenerator` and `BiasFunction` implementations.
- Workspace packages import each other via `workspace:*` protocol.
- All changes must include tests. Run `pnpm test` to verify.

## Tracking Work

- If you notice a bug or broken behavior but can't or don't want to fix it now, file a GitHub issue.
- Same for feature requests — create an issue so it doesn't get lost.

## Commands

- `pnpm test` — run all tests across all packages
- `pnpm test --filter @ambotrope/grid` — test a single package
