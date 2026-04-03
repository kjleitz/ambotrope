# Ambotrope Infrastructure Plan

## Overview

AWS infrastructure for a multiplayer WebSocket game. The server holds persistent connections and in-memory game state. Single Lightsail instance for the server, S3 + CloudFront for the frontend.

Reference: `/Users/keegan/Development/sixteenthirtyseven/infra/` — we reuse the S3 + CloudFront frontend pattern directly. The server layer is simpler: a bare Lightsail instance running Docker instead of Lightsail Container Service or ECS.

## Architecture

```
                    ┌─────────────────────────────────────┐
                    │           Route 53 DNS               │
                    │  ambotrope.com → CloudFront (web)    │
                    │  api.ambotrope.com → Lightsail (srv) │
                    └──────┬──────────────────┬────────────┘
                           │                  │
              ┌────────────▼──┐    ┌──────────▼──────────┐
              │  CloudFront   │    │  Lightsail Instance  │
              │  (frontend)   │    │  (game server)       │
              │               │    │                      │
              │  S3 origin    │    │  Docker + systemd    │
              └───────────────┘    │  port 3000 direct    │
                                   └─────────────────────┘
```

## Why a bare Lightsail instance?

The game server holds WebSocket connections with in-memory room state. Traffic hits the process directly — no intermediary proxy with opaque timeout behavior. You control keepalives, idle timeouts, and connection limits yourself.

Alternatives considered:

- **Lightsail Container Service** ($7/mo) — has a managed proxy between the internet and your container. WebSocket upgrade works, but you can't configure idle timeouts or sticky sessions. Probably fine for short game sessions, but less control.
- **ECS Fargate + ALB** (~$27/mo) — full control, configurable ALB, sticky sessions, rolling deploys. The ALB alone is $16/mo. Overkill for a single-instance game server.
- **Lightsail instance** (~$5/mo) — direct traffic, full control, cheapest. Deploy is just image push + managed restart. The tradeoff is a brief blip on redeploy (process restart), which is fine for occasional deploys of a game with short sessions.

## Components

### 1. Frontend: S3 + CloudFront (same as sixteenthirtyseven)

Carries over 1:1 from the reference project.

- **S3 bucket** — hosts the Vite build output
- **CloudFront distribution** — HTTPS, caching, SPA routing (403/404 → index.html)
- **Origin Access Control** — bucket is private, only CloudFront reads it

Files to create (adapt from reference):
- `s3-cloudfront.tf` — bucket, OAC, distribution, bucket policy

### 2. Server: Lightsail Instance

A single Lightsail instance running Docker. The game server runs as a systemd service.

Resources:
- **Lightsail instance** — `nano_3_0` ($5/mo: 512MB RAM, 2 vCPU burst, 1TB transfer)
- **Lightsail static IP** — stable IP for DNS
- **Lightsail firewall** — allow 80/443 inbound, no direct SSH exposure

The instance runs:
- Docker with the game server image
- Caddy (or nginx) as a reverse proxy for TLS termination + Let's Encrypt auto-renewal
- systemd units for both

Files to create:
- `lightsail.tf` — instance, static IP, firewall rules
- `templates/cloud-init.yaml` — user data script to install Docker + Caddy + pull image on first boot

Server config:
- Port 3000 (internal, behind Caddy)
- Caddy reverse proxies `api.ambotrope.com` → `localhost:3000` with automatic HTTPS
- Environment: `NODE_ENV=production`, `CORS_ORIGIN=https://ambotrope.com`

### 3. DNS: Route 53 (same pattern as sixteenthirtyseven)

- **Hosted zone** for `ambotrope.com`
- **ACM certificate** (wildcard `*.ambotrope.com` in us-east-1 for CloudFront)
- **A/AAAA records:**
  - `ambotrope.com` → CloudFront (frontend)
  - `www.ambotrope.com` → CloudFront (frontend)
  - `api.ambotrope.com` → Lightsail static IP
- Apex → www redirect via CloudFront function (same as reference)

Note: TLS for `api.ambotrope.com` is handled by Caddy on the instance (Let's Encrypt), not ACM. ACM is only for CloudFront.

Files to create (adapt from reference):
- `dns.tf` — hosted zone, ACM cert + validation, A/AAAA records

### 4. Shared / Config

Files to create (adapt from reference):
- `main.tf` — terraform block, providers (aws, aws.us_east_1)
- `variables.tf` — project_name, aws_region, domain_name, domain_enabled, instance bundle
- `outputs.tf` — web_url, api_url, bucket name, CF distribution ID, instance IP, nameservers
- `terraform.tfvars.example` — template for local config

### 5. What we DON'T need (vs. sixteenthirtyseven)

- **No database** — game state is in-memory, rooms are ephemeral
- **No secrets.tf** — no DB passwords, no JWT secrets, no OAuth
- **No ip-allowlist.tf** — public game (add later if needed)
- **No google_client_id** — no auth
- **No ALB** — Caddy handles TLS directly on the instance
- **No ECR** — image can be built on the instance or pulled from GitHub Container Registry

## Terraform File List

```
infra/
  main.tf                    # terraform block, providers
  variables.tf               # input variables
  outputs.tf                 # output values
  dns.tf                     # Route 53, ACM, DNS records
  s3-cloudfront.tf           # S3 bucket, CloudFront for frontend
  lightsail.tf               # instance, static IP, firewall
  templates/cloud-init.yaml  # instance bootstrap (Docker + Caddy)
  terraform.tfvars.example   # config template
```

## Variables

| Variable | Default | Description |
|---|---|---|
| `aws_region` | `us-east-1` | AWS region |
| `project_name` | `ambotrope` | Resource naming prefix |
| `environment` | `production` | Environment tag |
| `domain_name` | `ambotrope.com` | Root domain |
| `domain_enabled` | `false` | Enable after buying domain + pointing nameservers |
| `instance_bundle_id` | `nano_3_0` | Lightsail instance size ($5/mo) |
| `instance_blueprint_id` | `ubuntu_24_04` | Lightsail OS image |
## Deployment Scripts

### `scripts/deploy-web.sh`
1. `pnpm --filter @ambotrope/web build`
2. `aws s3 sync apps/web/dist/ s3://$BUCKET --delete`
3. `aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"`

### `scripts/deploy-server.sh`
1. `docker build -t ambotrope-server apps/server/`
2. Push to GitHub Container Registry (or build on the instance directly)
3. Use AWS Systems Manager Run Command to `docker pull` and restart the systemd service

## Estimated Costs

- **Lightsail instance** (nano): $5/mo (includes 1TB transfer)
- **Lightsail static IP**: free (when attached to an instance)
- **S3 + CloudFront**: <$1/mo
- **Route 53**: $0.50/mo
- **Total**: ~$6.50/mo

## Future Considerations

- **Upgrading the instance**: If $5/mo nano isn't enough, bump to `micro_3_0` ($10/mo, 1GB RAM) or `small_3_0` ($20/mo, 2GB RAM). One Terraform variable change.
- **Horizontal scaling**: If one instance isn't enough, the path is: add a second instance + ALB + Redis (ElastiCache) for cross-instance room state. The game logic (pure functions) doesn't change — only the room management layer needs a pub/sub bus.
- **Zero-downtime deploys**: If the restart blip matters, switch to blue-green with two containers on the same instance (stop old after new is healthy). Or move to ECS Fargate + ALB at that point.
- **Monitoring**: Lightsail has built-in CPU/network metrics. Add a `/health` endpoint check via Route 53 health checks or an external uptime monitor.
