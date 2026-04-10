# Security Audit

## Scope

This audit covers first-party application code and infrastructure in this repository as inspected on 2026-04-10. It excludes third-party dependency review.

The main live risks are on the server boundary:

- the WebSocket endpoint accepts browser connections from any origin
- inbound WebSocket messages are not validated against the shared protocol schema
- disconnected players can be reattached using only their public display name
- room creation and connection state are unbounded, which leaves the single in-memory server easy to exhaust

One finding from the prior version of this document is no longer applicable: the repository no longer provisions a VM or SSH firewall rules. The current infrastructure uses Lightsail Container Service, and the design docs explicitly note there is no SSH path to manage.

## Findings

### 1. High: Cross-origin WebSocket access is unrestricted

- Affected area: server transport security
- Evidence:
  - `apps/server/src/index.ts:12` enables `cors()` for all HTTP routes with the default permissive behavior.
  - `apps/server/src/index.ts:33-55` upgrades any request to `/ws/:gameId` without checking the request `Origin`.
  - `infra/variables.tf:31-35` defines `cors_origin` as if the server enforces a frontend origin allowlist.
  - `scripts/deploy-server.sh:38-42` injects `CORS_ORIGIN`, but `apps/server/src/index.ts` never reads it.
- Impact:
  - Any third-party website can open a browser WebSocket connection to the game server and act as a client.
  - The documented infrastructure control for `cors_origin` is ineffective, which creates a false sense of protection.
  - This materially widens the abuse surface for griefing, room scraping, and browser-driven spam.
- Recommended fix:
  - Enforce an explicit origin allowlist for both HTTP and WebSocket traffic.
  - Reject WebSocket upgrades when `Origin` does not match the configured frontend origin.
  - Remove or rename `cors_origin` if the application is not going to enforce it.

### 2. High: Inbound WebSocket messages are not validated before dispatch

- Affected area: server input validation
- Evidence:
  - `packages/protocol/src/messages.ts:5-67` defines `clientMessageSchema` with Zod constraints for client messages.
  - `apps/server/src/rooms.ts:197-210` only runs `JSON.parse` and then treats the result as `ClientMessage`.
  - `apps/server/src/rooms.ts:255-393` dereferences `message.payload.*` fields based on the claimed `type` without schema validation first.
- Impact:
  - A malicious client can bypass the shared protocol constraints and send structurally invalid or oversized payloads straight into game logic.
  - That expands the denial-of-service and state-corruption surface beyond the protocol contract the rest of the code assumes.
  - Because invalid messages are not rejected at the boundary, future game logic changes are more likely to accidentally become security bugs.
- Recommended fix:
  - Parse every inbound message with `clientMessageSchema.safeParse(...)` before dispatch.
  - Close the socket or return a bounded protocol error on failed validation.
  - Add negative tests for malformed payloads, missing fields, oversized arrays, and unknown message types.

### 3. Medium: Reconnect authorization is based only on player name

- Affected area: session integrity
- Evidence:
  - `apps/server/src/rooms.ts:222-240` removes a disconnected socket from `room.connections` but deliberately keeps the player in game state.
  - `apps/server/src/rooms.ts:261-267` treats any disconnected player with the same `playerName` as a valid reconnect target.
  - `apps/server/src/rooms.ts:279-287` skips `addPlayer(...)` when that name match is found, effectively handing the new socket the old player identity.
- Impact:
  - Anyone who knows a disconnected player's display name can claim that player's seat and continue as them.
  - This allows score tampering, forced actions, or kick-vote manipulation after a transient disconnect or page refresh race.
  - The risk is practical because player names are visible to all room participants in normal gameplay.
- Recommended fix:
  - Issue an unguessable reconnect token or signed session identifier on join and require it for reassociation.
  - Treat display names as presentation only, not authentication.
  - Add tests for attempted reconnect hijacking by a second client using the same name.

### 4. Medium: Arbitrary room creation and unbounded in-memory state enable denial-of-service

- Affected area: server availability
- Evidence:
  - `apps/server/src/rooms.ts:41` stores all room state in a process-local `Map` with no cap.
  - `apps/server/src/rooms.ts:85-115` creates a room for any unseen `gameId`.
  - `apps/server/src/rooms.ts:183-195` starts a ping interval for every connection before the client has authenticated or joined.
  - `apps/server/src/rooms.ts:161-171` keeps empty rooms alive for five minutes before cleanup.
  - `infra/container-service.tf:19-22` deploys the server as a single `nano` Lightsail container, so there is little headroom for abuse.
- Impact:
  - An attacker can open many unique room IDs or many idle sockets and force the process to retain memory and timers for each.
  - Because all state is single-process and there is no rate limiting, one abusive client can degrade or exhaust the only server instance.
  - This is a realistic availability risk for the current deployment shape.
- Recommended fix:
  - Delay room creation until a validated `join` message succeeds.
  - Add per-IP connection limits, handshake timeouts, and message rate limiting at the edge or application layer.
  - Cap total rooms, total open sockets, and idle unauthenticated connections.

## Hardening Recommendations

- Consider attaching a CloudFront response headers policy for the frontend so HSTS and baseline browser security headers are enforced centrally. The current distribution in `infra/s3-cloudfront.tf:65-124` does not set one.
- Consider running the server container as a non-root user. `apps/server/Dockerfile:1-29` never switches away from the default root user.
- Limit unauthenticated information disclosure from `GET /rooms/:gameId` and `GET /stats` in `apps/server/src/index.ts:17-30` if room existence and occupancy are not meant to be public.
- Consider using cryptographically stronger room identifiers than `Math.random().toString(36).slice(2, 8)` in `apps/web/src/pages/home.tsx:11-15` if room IDs are intended to be hard to guess.
- Add structured logging and abuse metrics so invalid protocol messages, reconnect hijack attempts, and room-creation spikes are visible during operation.

## Verification Notes

- Static inspection was used for the findings above.
- `pnpm --filter @ambotrope/server test` passed on 2026-04-10.
- `terraform -chdir=infra validate` passed on 2026-04-10.
- The previous audit's SSH exposure finding is stale for the current repository state. The current infrastructure uses Lightsail Container Service rather than a VM, and `infra/PLAN.md:27` explicitly documents that there is no SSH path to manage.
