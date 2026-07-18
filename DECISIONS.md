# ServerPilot - Architecture Decision Records

## ADR-001: Use NestJS for Backend

**Date**: 2024-01-XX

**Status**: Accepted

**Context**: Need a robust, scalable backend framework for the hosting control panel.

**Decision**: Use NestJS with TypeScript.

**Consequences**:
- ✅ Strong TypeScript support with decorators
- ✅ Built-in dependency injection
- ✅ Modular architecture aligns with DDD
- ✅ Excellent documentation and community
- ❌ Steeper learning curve than Express
- ❌ More boilerplate code

## ADR-002: DDD Hexagonal Architecture

**Date**: 2024-01-XX

**Status**: Accepted

**Context**: Need clean separation between business logic and infrastructure.

**Decision**: Implement Domain-Driven Design with hexagonal architecture.

**Consequences**:
- ✅ Business logic is isolated and testable
- ✅ Infrastructure can be swapped without changing domain
- ✅ Clear boundaries between layers
- ❌ More files and folders
- ❌ Requires discipline to maintain boundaries

## ADR-003: Prisma as ORM

**Date**: 2024-01-XX

**Status**: Accepted

**Context**: Need type-safe database access with good DX.

**Decision**: Use Prisma as the ORM.

**Consequences**:
- ✅ Excellent TypeScript integration
- ✅ Auto-generated types from schema
- ✅ Good migration system
- ✅ Works with SQLite and PostgreSQL
- ❌ Adds build step for client generation
- ❌ Less control over raw SQL

## ADR-004: SQLite for Development, PostgreSQL for Production

**Date**: 2024-01-XX

**Status**: Accepted

**Context**: Need fast development setup without external dependencies.

**Decision**: Use SQLite in development, PostgreSQL in production.

**Consequences**:
- ✅ Zero-config database for development
- ✅ Same schema works for both
- ✅ Easy onboarding for new developers
- ❌ Some PostgreSQL features not available in SQLite
- ❌ Need to test with PostgreSQL before production

## ADR-005: JWT + Refresh Token Authentication

**Date**: 2024-01-XX

**Status**: Accepted

**Context**: Need secure, stateless authentication.

**Decision**: Implement JWT access tokens with refresh tokens.

**Consequences**:
- ✅ Stateless authentication
- ✅ Scalable across multiple servers
- ✅ Short-lived access tokens for security
- ❌ Need to handle token refresh on client
- ❌ Cannot revoke access tokens immediately

## ADR-006: Turborepo for Monorepo

**Date**: 2024-01-XX

**Status**: Accepted

**Context**: Need efficient monorepo management with multiple apps.

**Decision**: Use Turborepo for build orchestration.

**Consequences**:
- ✅ Fast builds with caching
- ✅ Parallel task execution
- ✅ Works with npm workspaces
- ❌ Additional dependency
- ❌ Learning curve for configuration

## ADR-007: Next.js for Frontend

**Date**: 2024-01-XX

**Status**: Accepted

**Context**: Need modern frontend framework for both ServerHQ and SitePanel.

**Decision**: Use Next.js with React.

**Consequences**:
- ✅ Server-side rendering for performance
- ✅ Large ecosystem and community
- ✅ TypeScript support
- ❌ Additional complexity for simple admin panels
- ❌ Learning curve for App Router

## ADR-008: PostgreSQL as Default Prisma Provider

**Date**: 2026-07-17

**Status**: Accepted

**Context**: The Prisma schema had `provider = "sqlite"` for dev convenience, but production always uses PostgreSQL. The auto-detection logic (grep DATABASE_URL to detect postgresql) was fragile and broke on the first install attempt.

**Decision**: Change the schema provider to `postgresql` permanently. Devs who want SQLite change it manually.

**Consequences**:
- ✅ Schema always matches production
- ✅ No auto-detection logic needed in installer
- ✅ No runtime provider mismatch errors
- ❌ Dev setup requires PostgreSQL running

## ADR-009: Standalone Shell Script for VPS Install

**Date**: 2026-07-17

**Status**: Accepted

**Context**: Need a way to install ServerPilot on a fresh Ubuntu VPS without config management tools (Ansible, Puppet).

**Decision**: Single `install-vps.sh` script uploaded via `scp` and run as root. Two modes: `--analyze` (check only) and `--install` (execute). Domains collected interactively.

**Consequences**:
- ✅ Zero dependencies — only bash + apt
- ✅ Easy to audit and modify
- ✅ Works without git on the target machine
- ❌ No idempotency — re-running can conflict
- ❌ Interative prompts prevent fully headless install
- ❌ Private repo needs SSH key or token workaround

## ADR-010: Podman (rootful) over Docker for Containers

**Date**: 2026-07-17

**Status**: Accepted

**Context**: Need container runtime for infrastructure services (PowerDNS, Postfix, Dovecot, SnappyMail, MariaDB). Ubuntu 24.04 ships Podman by default via apt.

**Decision**: Use Podman in rootful mode (since script runs as root). Use `podman compose` (built-in in Podman 4.x) instead of docker-compose.

**Consequences**:
- ✅ No Docker repository needed — apt install podman
- ✅ Daemonless architecture
- ✅ Built-in compose support in Podman 4+
- ❌ Podman-specific behavior (rootless vs rootful, SELinux :Z labels)
- ❌ `podman stats` can kill containers (known bug) — use /proc/stat instead

## ADR-011: Monitoring Containers via System Services + Podman

**Date**: 2026-07-17

**Status**: Accepted

**Context**: ServerStatus module needs to report if infrastructure containers are running. The NestJS API runs as `serverpilot` user, but containers are started as root.

**Decision**: Use `sudo podman inspect` for container status + `systemctl is-active` as fallback for host services. Grant `serverpilot` user NOPASSWD sudo for `/usr/bin/podman`. CPU stats from `/proc/stat` (avoid `podman stats` which kills containers).

**Consequences**:
- ✅ Accurate status reporting for all 8 services
- ✅ Fallback covers host-level postgresql/redis
- ❌ Requires sudoers configuration
- ❌ Systemd uptime format not parsed correctly by JS Date

## ADR-012: Separate JWT Secrets for Admin and Client APIs

**Date**: 2026-07-17

**Status**: Proposed

**Context**: Both ServerHQ (admin) and SitePanel (client) APIs use the same `JWT_SECRET` from `.env`. While localStorage is isolated per subdomain, a token from one API can be cryptographically verified by the other.

**Decision**: Split into `HQ_JWT_SECRET` / `PANEL_JWT_SECRET` and `HQ_JWT_REFRESH_SECRET` / `PANEL_JWT_REFRESH_SECRET`. Add `audience` claim (`server-hq` / `site-panel`) during token signing and validate in each JwtStrategy.

**Consequences**:
- ✅ Cryptographic isolation between admin and client APIs
- ✅ Following security best practice
- ✅ Backward compatible — old tokens rejected (good)
- ❌ Token invalidation on deploy — all sessions logged out
- ❌ Env var changes needed in .env.example, installer, systemd
