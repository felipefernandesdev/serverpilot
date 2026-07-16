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

## [Unreleased]

### Planned
- Email Manager UI
- Database Console UI
- Domain Manager UI
- DNS Management
- SSL/TLS Manager
- Backup System
- Metrics Dashboard
