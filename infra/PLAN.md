# Ambotrope Infrastructure Plan

## Overview

AWS infrastructure for a multiplayer WebSocket game. The server holds persistent connections and in-memory game state. Lightsail Container Service for the server, S3 + CloudFront for the frontend.

## Architecture

```
                    ┌───────────────────────────────────────────┐
                    │              Route 53 DNS                  │
                    │  ambotrope.com → CloudFront (web)          │
                    │  api.ambotrope.com → Lightsail CS (server) │
                    └──────┬──────────────────────┬─────────────┘
                           │                      │
              ┌────────────▼──┐    ┌──────────────▼─────────────┐
              │  CloudFront   │    │  Lightsail Container Service│
              │  (frontend)   │    │  (game server)              │
              │               │    │                             │
              │  S3 origin    │    │  Docker container, managed  │
              └───────────────┘    │  TLS, health checks         │
                                   └────────────────────────────┘
```

## Why Lightsail Container Service?

The game server holds WebSocket connections with in-memory room state. Lightsail Container Service runs the Docker container with managed TLS and health checks. No VM to manage, no SSH, no Caddy, no systemd.

Previous approaches:
- **Lightsail VM** ($10/mo) — generated 15 pain points from managing a raw VM
- **App Runner** (~$7/mo) — its envoy proxy blocks standard WebSocket upgrades (HTTP/1.1 Upgrade → 403 Forbidden)

Lightsail Container Service ($7/mo) handles WebSocket connections through its proxy and avoids both problems.

## Components

### 1. Frontend: S3 + CloudFront

- **S3 bucket** — hosts the Vite build output
- **CloudFront distribution** — HTTPS, caching, SPA routing (403/404 → index.html)
- **Origin Access Control** — bucket is private, only CloudFront reads it

### 2. Server: Lightsail Container Service

- **Container service** — nano power (0.25 vCPU, 512MB), scale 1
- **Lightsail certificate** — TLS for `api.ambotrope.com`
- **Built-in image storage** — images pushed via `aws lightsail push-container-image`
- **Health checks** — HTTP GET `/health` every 10s

Deploy flow: build image → push to Lightsail → create deployment.

### 3. DNS: Route 53

- **Hosted zone** for `ambotrope.com`
- **ACM certificate** (wildcard `*.ambotrope.com` in us-east-1 for CloudFront)
- **DNS records:**
  - `ambotrope.com` → CloudFront (frontend)
  - `www.ambotrope.com` → CloudFront (frontend)
  - `api.ambotrope.com` → Lightsail Container Service (CNAME)
- Apex → www redirect via CloudFront function

TLS for `api.ambotrope.com` is handled by Lightsail's managed certificate.

## Terraform File List

```
infra/
  main.tf                    # terraform block, providers
  variables.tf               # input variables
  outputs.tf                 # output values
  dns.tf                     # Route 53, ACM, DNS records
  s3-cloudfront.tf           # S3 bucket, CloudFront for frontend
  container-service.tf       # Lightsail certificate + container service
  terraform.tfvars.example   # config template
```

## Variables

| Variable | Default | Description |
|---|---|---|
| `aws_region` | `us-east-1` | AWS region |
| `project_name` | `ambotrope` | Resource naming prefix |
| `environment` | `production` | Environment tag |
| `domain_name` | `ambotrope.com` | Root domain |
| `server_port` | `3000` | Container port |
| `cors_origin` | `https://www.ambotrope.com` | CORS origin |

## Deployment Scripts

### `scripts/deploy-web.sh`
1. `pnpm --filter @ambotrope/web build`
2. `aws s3 sync apps/web/dist/ s3://$BUCKET --delete`
3. `aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"`

### `scripts/deploy-server.sh`
1. `docker build --platform linux/amd64` the server image
2. `aws lightsail push-container-image` to Lightsail
3. `aws lightsail create-container-service-deployment` to activate

## Estimated Costs

- **Lightsail Container Service** (nano): $7/mo
- **S3 + CloudFront**: <$1/mo
- **Route 53**: $0.50/mo
- **Total**: ~$8/mo

## Future Considerations

- **Scaling up**: Increase container service power with a Terraform variable change.
- **Horizontal scaling**: Increase `scale` count. For shared game state across instances, add Redis (ElastiCache) as a pub/sub bus.
- **CI/CD**: Add GitHub Actions to build and push images on merge to main.
- **Monitoring**: Add Route 53 health checks or an external uptime monitor on `/health`.
