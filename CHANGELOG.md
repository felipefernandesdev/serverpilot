# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-07-15

### Added
- **Project Structure**: DDD Hexagonal architecture with Turborepo monorepo
- **Domain Layer**: Entities (User, Account, Package), Value Objects, Ports, Errors
- **ServerHQ API**: NestJS backend with auth, accounts, packages modules
- **SitePanel API**: NestJS backend with auth, file manager modules
- **Admin Frontend**: Next.js + Tailwind CSS with login and dashboard
- **Client Frontend**: Next.js + Tailwind CSS with login, dashboard, file manager
- **Database**: Prisma schema with SQLite (dev) and PostgreSQL (prod)
- **Seed Data**: Admin, reseller, 2 test clients, packages, emails, databases
- **Scripts**: start.sh, stop.sh, reset.sh for easy management
- **Docker**: PostgreSQL, Redis, Mailhog, Adminer containers

### Features
- JWT authentication with refresh tokens
- Account management (CRUD, suspend/unsuspend)
- Package management (hosting plans)
- File manager (list, create, delete, rename)
- Real-time usage stats (disk, bandwidth)

### Login Credentials
- **Admin**: admin@serverpilot.local / admin123
- **Client**: client01 / client123

## [0.2.0] - 2026-07-17

### Added
- **VPS Installer**: `scripts/install-vps.sh` with `--analyze`/`--install` modes, system requirement checks
- **Systemd Services**: 4 unit files for production deployment (server-hq, admin, site-panel, web)
- **Nginx Proxy**: Reverse proxy template with SSL support for 3 subdomains
- **Server Status**: Real endpoint monitoring 8 services via podman + systemctl, CPU from /proc/stat
- **Deploy Docs**: `docs/05-deploy-vps.md` and `docs/06-pos-instalacao.md`
- **Docker Infra**: PowerDNS, MariaDB, Postfix, Dovecot, SnappyMail containers
- **Seed from .env**: Admin user email/password now read from environment variables

### Fixed
- **Prisma Schema**: Provider changed to `postgresql` (was `sqlite` with fragile auto-detect)
- **npm install**: Removed `--omit=dev` — tailwindcss needed for frontend build
- **Systemd Paths**: WorkingDirectory corrected per-app (`/opt/serverpilot/apps/*`)
- **Git Clone**: HTTPS with `GIT_TERMINAL_PROMPT=0` for headless servers
- **Server Status**: `sudo podman` for root containers, `/proc/stat` instead of `podman stats` (killed containers)
- **Seed**: Uses `npx ts-node --transpile-only` instead of `npm run db:seed` (ts-node not in PATH)

### Known Issues
- Private repo clone requires GITHUB_TOKEN env var
- Seed and domain prompts prevent fully headless install
- sudoers for serverpilot user not configured by installer
- System PostgreSQL and container PostgreSQL conflict on port 5432
- JWT_SECRET shared between admin and client APIs (proposed fix in ADR-012)

### Planned
- Email Manager UI
- Database Console UI
- Domain Manager UI
- DNS Template Copy (cPanel-like)
- SSL/TLS Manager
- Backup System
- Metrics Dashboard
