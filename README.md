# Ambotrope

Multiplayer browser game where players see a shared hex grid with procedurally generated ink blots, secretly select tiles, and give word hints to help teammates avoid collisions.

## Tech Stack

- **Monorepo**: pnpm workspaces
- **Language**: TypeScript (ESM throughout)
- **Server**: Hono + WebSocket
- **Validation**: Zod
- **Frontend**: React + Vite + Tailwind CSS
- **Tests**: Vitest + Playwright
- **TS Runtime**: tsx (no build step)
- **Infrastructure**: Terraform (AWS — S3/CloudFront, Lightsail Container Service, Route 53)

## Project Structure

```
packages/
  grid/        — Hex grid logic (honeycomb-grid wrapper)
  noise/       — Procedural noise generation (modular noise + bias)
  game/        — Core game state machine, rules, word list, scoring
  protocol/    — Shared client/server message types + Zod schemas
apps/
  server/      — Hono HTTP + WebSocket game server
  web/         — React frontend
infra/         — Terraform configuration
scripts/       — Deploy and utility scripts
```

## Development

```bash
pnpm install
pnpm dev:server    # Start game server (localhost:3000)
pnpm dev:web       # Start frontend dev server (localhost:5173)
pnpm test          # Run all tests
```

## Deployment

### Prerequisites (one-time)

1. **AWS CLI** configured:
   ```bash
   aws configure
   # Region: us-east-1
   ```

2. **Docker** installed (for building server images).

3. **Terraform setup**:
   ```bash
   cd infra/
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars as needed
   terraform init
   ```

### Infrastructure setup (one-time)

1. **Stand up resources**:
   ```bash
   cd infra/
   terraform apply
   ```

2. **Point your domain's nameservers to Route 53**:
   ```bash
   terraform output nameservers
   ```
   Copy those nameservers to your domain registrar's DNS settings. Wait for propagation.

3. **Push the initial server image**:
   ```bash
   pnpm deploy:server
   ```

### Deploying

```bash
pnpm run deploy:all   # Deploy server + web (no pager)
pnpm deploy:server    # Build, push to Lightsail, create deployment
pnpm deploy:web       # Build frontend, sync to S3, invalidate CloudFront
```

## All pnpm Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev:server` | Start server in dev mode (tsx watch) |
| `pnpm dev:web` | Start frontend dev server (Vite) |
| `pnpm test` | Run all tests across all packages |
| `pnpm run deploy:all` | Deploy server + web (no pager) |
| `pnpm deploy:web` | Build and deploy frontend to S3/CloudFront |
| `pnpm deploy:server` | Build, push image to Lightsail, create deployment |
