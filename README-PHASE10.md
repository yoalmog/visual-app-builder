# Phase 10: Production Provider Infrastructure & Verification Guide

This guide provides exact commands for reviewers to verify all 7 production adapters and failure injection behaviors in under 5 minutes.

---

## 1. Quick Start: Launch Real Infrastructure (Docker)

To run the complete production backend stack locally:

```bash
docker compose -f docker-compose.phase10.yml up -d
```

This spins up:
- **PostgreSQL Primary** (`127.0.0.1:5432`): Database `apex_primary`, user `apex`
- **PostgreSQL Read Replica** (`127.0.0.1:5433`): Live WAL streaming replication from Primary
- **Redis 7 Cache** (`127.0.0.1:6379`): Native RESP protocol support with AOF
- **MinIO S3 Object Storage** (`127.0.0.1:9000` API, `9001` Web Console): Bucket `apex-backups`

---

## 2. Run the Phase 10 Production Integration Suite

```bash
npm run test:phase10
```
Or directly via `tsx`:
```bash
npx tsx scripts/run-phase10-suite.ts
```

This verifies all 7 production adapters running against live TCP/HTTP sockets:
1. `PostgresDatabaseScalingProvider`: Queries primary/replica, asserts replication lag measurement, and tests read/write query routing.
2. `RedisCacheProvider`: Real TCP RESP commands (`SET ... EX`, `GET`, tag set invalidation via `SMEMBERS`/`DEL`).
3. `S3BackupProvider`: Streams project snapshot to S3 bucket via HTTP PUT, downloads via GET, and performs AST diff.
4. `MessageBrokerQueueProvider`: Priority queue processing, exponential retry backoff, and DLQ handling.
5. `OidcSSOProvider`: Cryptographic RS256 JWT signature verification and email domain gating.
6. `HttpOAuthProvider`: Exposes real HTTP server on local socket, exercises single-use code burn over HTTP POST `/oauth/token`.
7. `ProxyAdvancedDeploymentEngine`: Runs real Node HTTP reverse proxy, performs 10% -> 30% -> 100% traffic percentage splitting between downstream HTTP servers.

---

## 3. Run the Phase 10 Failure Injection Suite

```bash
npx tsx scripts/run-phase10-failure-injection.ts
```

This breaks the real dependencies and verifies verified graceful degradation:
1. **Postgres Replica Severed**: Kills replica TCP socket -> routes reads to Primary with failover alert; 0 query drops.
2. **Redis Connection Lost**: Severs Redis socket mid-read -> degrades to cache miss/fallback; no unhandled crash.
3. **S3 Credential Expiry**: Injects expired AWS credentials -> HTTP 403 caught, backup marked `failed`, alert logged.
4. **Worker Death Mid-Job**: Kills worker process mid-execution -> heartbeat timeout detects orphan, re-queues job to standby worker.
5. **OIDC Signature Tampering**: Modifies JWT payload without valid RSA private key -> rejects with `ERR_SIGNATURE_INVALID`.
6. **OAuth Replay Attack**: Replays burned single-use authorization code over HTTP -> returns HTTP 400 `invalid_grant`.
7. **Canary 500 Spike**: Canary target returns HTTP 500 -> reverse proxy trips error threshold, auto-rolls back to 0% traffic.

---

## 4. Teardown

```bash
docker compose -f docker-compose.phase10.yml down -v
```
