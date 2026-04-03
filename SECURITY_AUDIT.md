# Security Audit

## Executive Summary

This audit covers the first-party application code and infrastructure in this repository. The highest-risk issues are on the server boundary: the WebSocket endpoint accepts connections from any origin, inbound messages are not validated against the shared Zod protocol schema, and the server creates in-memory room state for arbitrary game IDs without any rate limiting or resource caps. On the infrastructure side, the default Terraform configuration exposes SSH to the entire internet.

## Findings

### 1. High: Cross-origin WebSocket access is unrestricted

- Affected area: server transport security
- Evidence:
  - `apps/server/src/index.ts:12` enables `cors()` with default permissive behavior for all HTTP routes.
  - `apps/server/src/index.ts:33-55` upgrades any request to `/ws/:gameId` without checking the request `Origin`.
  - `infra/templates/cloud-init.yaml:14-16` sets `CORS_ORIGIN`, but the application never reads it.
  - `infra/variables.tf:72-75` describes `cors_origin` as the allowed origin, which does not match runtime behavior.
- Impact:
  - Any website can open a browser WebSocket connection to the game server and interact with public rooms from a victim browser.
  - Because there is no origin gate on the WebSocket handshake, the deployment-level `cors_origin` control is ineffective.
  - This expands the attack surface for griefing, room scraping, and browser-driven abuse from third-party origins.
- Recommended fix:
  - Enforce an explicit allowlist for HTTP origins and WebSocket `Origin` headers based on configuration.
  - Reject WebSocket upgrades when `Origin` does not match the expected frontend origin.
  - Remove or rename `cors_origin` if it is not enforced, so infrastructure does not imply a protection that is absent.

### 2. High: Inbound WebSocket messages are not validated before use

- Affected area: server input validation
- Evidence:
  - `packages/protocol/src/messages.ts:5-41` defines `clientMessageSchema` with Zod validation rules.
  - `apps/server/src/rooms.ts:139-152` only calls `JSON.parse` and then forwards the result as `ClientMessage` without schema validation.
  - `apps/server/src/rooms.ts:192-277` dereferences `message.payload.*` fields based on the claimed `type`.
- Impact:
  - A malicious client can send structurally invalid messages that bypass all protocol constraints enforced in shared types.
  - This allows invalid names, malformed payloads, and oversized arrays/strings to reach game logic that was written under trusted-type assumptions.
  - The immediate result is a larger denial-of-service and state-corruption surface than intended by the protocol package.
- Recommended fix:
  - Parse every inbound message with `clientMessageSchema.safeParse(...)` before dispatch.
  - Treat failed validation as a protocol error and close the connection or emit a bounded error response.
  - Add negative tests for malformed payloads, missing fields, oversized values, and unknown message types.

### 3. Medium: Arbitrary room creation and unbounded in-memory state enable easy denial-of-service

- Affected area: server availability
- Evidence:
  - `apps/server/src/index.ts:33-41` calls `handleConnection(gameId, ws)` on every WebSocket open.
  - `apps/server/src/rooms.ts:67-97` creates a room for any previously unseen `gameId`.
  - `apps/server/src/rooms.ts:110-120` keeps empty rooms around for five minutes before cleanup.
  - `apps/server/src/rooms.ts:32` stores all room state in a process-local `Map` with no size limit.
- Impact:
  - An attacker can create large numbers of unique room IDs or idle connections and force the process to retain memory for each room.
  - Because there is no authentication, connection throttling, message throttling, or room cap, abuse can come from any public client.
  - This is a realistic resource-exhaustion path for a small single-instance deployment.
- Recommended fix:
  - Delay room creation until a validated `join` message is received.
  - Add per-IP connection limits, handshake timeouts, and request rate limiting at the proxy or application layer.
  - Cap total rooms, per-room connections, and idle unauthenticated sockets.

### 4. Medium: Terraform defaults expose SSH to the entire internet

- Affected area: infrastructure network access
- Evidence:
  - `infra/variables.tf:55-59` sets `ssh_allowed_cidrs` to `["0.0.0.0/0"]`.
  - `infra/lightsail.tf:40-45` applies that value directly to public TCP port 22.
  - `infra/terraform.tfvars.example:12-14` repeats the world-open default and only warns to tighten it later.
- Impact:
  - A new deployment is internet-reachable over SSH unless the operator remembers to override the default.
  - This increases the likelihood of password-spraying, credential-stuffing, and SSH key abuse attempts against the host.
  - Unsafe defaults are especially risky in infrastructure because they propagate into new environments unchanged.
- Recommended fix:
  - Make `ssh_allowed_cidrs` a required variable or default it to a trusted admin/VPN CIDR, not `0.0.0.0/0`.
  - Document a secure bootstrap path for operators without a static IP.
  - Consider disabling direct SSH entirely in favor of a managed access path if possible.

## Hardening Recommendations

- Limit unauthenticated information disclosure from `GET /rooms/:gameId` and `GET /stats` if room existence and occupancy should not be public.
- Add structured logging and connection-level abuse metrics so origin failures, invalid protocol messages, and room-creation spikes are visible.
- Consider using cryptographically stronger room identifiers than `Math.random().toString(36).slice(2, 8)` in `apps/web/src/pages/home.tsx:9-12` if room IDs are expected to be hard to guess.

## Verification Notes

- Static inspection was used for the findings above.
- `pnpm --filter @ambotrope/server test` currently fails in the existing suite at `apps/server/src/__tests__/rooms.test.ts:300`, where `selectedWords` is asserted as `["Maraca"]` but the current implementation returns `[]`. That failure appears pre-existing and was treated as a verification limitation, not as a security finding.
