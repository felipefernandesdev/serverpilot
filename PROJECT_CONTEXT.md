# ServerPilot - Project Context

## Overview
ServerPilot is a modern web hosting control panel inspired by cPanel/WHM, providing server management and site administration capabilities.

## Architecture
- **Backend**: NestJS with DDD Hexagonal Architecture
- **Frontend**: Next.js + React
- **Database**: SQLite (dev) + PostgreSQL (prod)
- **ORM**: Prisma

## Modules
### ServerHQ (WHM equivalent)
- Account Management (create, edit, suspend hosting accounts)
- Package Builder (hosting plans with limits)
- Backup System (snapshots, restoration)
- DNS Management (zones, records)
- SSL/TLS Manager (certificates, AutoSSL)
- Reseller/Partner management

### SitePanel (cPanel equivalent)
- File Manager (web-based file operations)
- Email Manager (accounts, filters, forwarders)
- Database Console (MySQL/PostgreSQL)
- Domain Manager (domains, subdomains, redirects)
- Metrics Dashboard (access statistics, logs)
- Task Scheduler (cron jobs)

## Naming Convention
- ServerHQ = WHM (admin interface)
- SitePanel = cPanel (user interface)
- Avoids trademark issues while maintaining clarity

## Tech Stack
- TypeScript strict mode (no `any`, no `ts-ignore`)
- Class tokens for DI (never string tokens)
- Domain-Driven Design with hexagonal architecture
- TDD with fakes (not mocks)
- Conventional Commits
