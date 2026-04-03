# Security Audit

## Executive Summary

This audit covers the first-party application code and infrastructure in this repository. The highest-risk issues are on the server boundary: the WebSocket endpoint accepts connections from any origin, inbound messages are not validated against the shared Zod protocol schema, and the server creates in-memory room state for arbitrary game IDs without any rate limiting or resource caps. The prior SSH-exposure finding has been remediated on this branch by removing public port 22 access and replacing SSH-driven deploy control with AWS Systems Manager.

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

### 4. Resolved on this branch: direct SSH exposure has been removed

- Affected area: infrastructure network access
- Evidence:
  - `infra/lightsail.tf` no longer provisions a Lightsail key pair or opens public TCP port 22.
  - `infra/variables.tf` and `infra/terraform.tfvars.example` no longer declare SSH access variables.
  - `scripts/deploy-server.sh` now deploys through AWS Systems Manager Run Command instead of `ssh`.
- Impact:
  - New deployments no longer expose the host to opportunistic SSH scanning or rely on interactive shell access for routine rollout.
  - The operational control plane now matches the intended non-SSH security posture.
- Recommended fix:
  - Keep SSH disabled unless a new, explicitly approved access model requires it.
  - Use AWS Systems Manager for deploy-time command execution and future host administration.
  - Avoid reintroducing SSH-only operational dependencies in scripts or docs.

## Hardening Recommendations

- Limit unauthenticated information disclosure from `GET /rooms/:gameId` and `GET /stats` if room existence and occupancy should not be public.
- Add structured logging and connection-level abuse metrics so origin failures, invalid protocol messages, and room-creation spikes are visible.
- Consider using cryptographically stronger room identifiers than `Math.random().toString(36).slice(2, 8)` in `apps/web/src/pages/home.tsx:9-12` if room IDs are expected to be hard to guess.

## Verification Notes

- Static inspection was used for the findings above.
- `pnpm --filter @ambotrope/server test` currently fails in the existing suite at `apps/server/src/__tests__/rooms.test.ts:300`, where `selectedWords` is asserted as `["Maraca"]` but the current implementation returns `[]`. That failure appears pre-existing and was treated as a verification limitation, not as a security finding.
