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
- **Infrastructure**: Terraform (AWS — S3/CloudFront, Lightsail, Route 53)

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

2. **Docker auth with GHCR**:
   ```bash
   gh auth refresh -h github.com -s write:packages
   pnpm docker:login
   ```

3. **Terraform setup**:
   ```bash
   cd infra/
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars as needed
   terraform init
   ```

### Infrastructure setup (one-time)

1. **Stand up resources** (domain disabled first):
   ```bash
   cd infra/
   terraform apply
   ```

2. **Point your domain's nameservers to Route 53**:
   ```bash
   terraform output nameservers
   ```
   Copy those nameservers to your domain registrar's DNS settings. Wait for propagation.

3. **Enable domain**:
   ```bash
   # Set domain_enabled = true in terraform.tfvars
   terraform apply
   ```
   This creates the ACM certificate, DNS records, and CloudFront aliases. ACM validation takes a few minutes; CloudFront distribution takes 5-15 minutes.

### Deploying

```bash
pnpm deploy:server   # Build + push Docker image, restart server
pnpm deploy:web      # Build frontend, sync to S3, invalidate CloudFront
```

### Server access

```bash
pnpm ssh                           # SSH into the Lightsail instance
pnpm ssh -- "docker logs ambotrope"  # Run a command remotely
```

## All pnpm Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev:server` | Start server in dev mode (tsx watch) |
| `pnpm dev:web` | Start frontend dev server (Vite) |
| `pnpm test` | Run all tests across all packages |
| `pnpm deploy:web` | Build and deploy frontend to S3/CloudFront |
| `pnpm deploy:server` | Build, push, and deploy server to Lightsail |
| `pnpm ssh` | SSH into the Lightsail instance |
| `pnpm docker:login` | Auth Docker with GHCR via gh CLI |
