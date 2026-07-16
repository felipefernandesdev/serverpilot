# ServerPilot

Modern web hosting control panel - cPanel/WHM alternative built with NestJS, Next.js, and Prisma.

## Features

### ServerHQ (WHM equivalent)
- Account Management (create, edit, suspend hosting accounts)
- Package Builder (hosting plans with resource limits)
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

## Tech Stack

- **Backend**: NestJS with DDD Hexagonal Architecture
- **Frontend**: Next.js + React + Tailwind CSS
- **Database**: SQLite (dev) + PostgreSQL (prod)
- **ORM**: Prisma
- **Auth**: JWT + Refresh Token
- **Build**: Turborepo

## Project Structure

```
serverpilot/
├── apps/
│   ├── admin/               # ServerHQ Frontend (Next.js)
│   ├── web/                 # SitePanel Frontend (Next.js)
│   ├── server-hq/           # ServerHQ API (NestJS)
│   └── site-panel/          # SitePanel API (NestJS)
├── packages/
│   ├── domain/              # Entities, value objects, ports
│   ├── use-cases/           # Business logic
│   ├── infra/               # Prisma, external services
│   └── shared/              # Utilities
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Seed data
├── docker/
│   └── docker-compose.yml   # Development environment
└── scripts/
    ├── start.sh             # Start all services
    ├── stop.sh              # Stop all services
    └── reset.sh             # Reset everything
```

## Quick Start

### Prerequisites

- Node.js 20+
- Podman or Docker

### One-Command Setup

```bash
# Clone the repository
git clone https://github.com/your-username/serverpilot.git
cd serverpilot

# Start everything (containers, deps, database, APIs, frontends)
./scripts/start.sh
```

### Manual Setup

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed database (first time only)
npm run db:seed

# Start services
npm run dev --workspace=apps/server-hq    # API on port 3001
PORT=3002 npm run dev --workspace=apps/site-panel  # API on port 3002
npm run dev --workspace=apps/admin        # Frontend on port 3000
npm run dev --workspace=apps/web          # Frontend on port 3003
```

## Services & Ports

| Service | Port | URL |
|---------|------|-----|
| Admin Frontend | 3000 | http://localhost:3000 |
| ServerHQ API | 3001 | http://localhost:3001/api |
| SitePanel API | 3002 | http://localhost:3002/api |
| Client Frontend | 3003 | http://localhost:3003 |
| Adminer (DB) | 8080 | http://localhost:8080 |
| Mailhog (Email) | 8025 | http://localhost:8025 |

## Login Credentials

### Admin (ServerHQ)
- **URL**: http://localhost:3000
- **Email**: admin@serverpilot.local
- **Password**: admin123

### Client (SitePanel)
- **URL**: http://localhost:3003
- **Username**: client01
- **Password**: client123

## API Documentation

### ServerHQ API

```
POST /api/auth/login          - Login
POST /api/auth/refresh        - Refresh token
POST /api/auth/logout         - Logout
POST /api/auth/me             - Get profile

GET  /api/accounts            - List accounts
POST /api/accounts            - Create account
GET  /api/accounts/:id        - Get account
PUT  /api/accounts/:id        - Update account
DELETE /api/accounts/:id      - Delete account
POST /api/accounts/:id/suspend   - Suspend account
POST /api/accounts/:id/unsuspend - Unsuspend account
GET  /api/accounts/:id/usage     - Get usage stats

GET  /api/packages            - List packages
POST /api/packages            - Create package
GET  /api/packages/:id        - Get package
PUT  /api/packages/:id        - Update package
DELETE /api/packages/:id      - Delete package
```

### SitePanel API

```
POST /api/auth/login          - Login
POST /api/auth/logout         - Logout
POST /api/auth/me             - Get profile

GET  /api/files               - List files
GET  /api/files/content       - Get file content
POST /api/files/mkdir         - Create directory
POST /api/files/write         - Write file
DELETE /api/files             - Delete file
POST /api/files/rename        - Rename file
GET  /api/files/download      - Download file
```

## Scripts

```bash
./scripts/start.sh    # Start all services
./scripts/stop.sh     # Stop all services
./scripts/reset.sh    # Reset everything (with confirmation)
```

## Architecture

### DDD Hexagonal

The project follows Domain-Driven Design with hexagonal architecture:

- **Domain**: Pure business logic, no external dependencies
- **Use Cases**: Application-specific business rules
- **Ports**: Interfaces for external communication
- **Adapters**: Implementations of ports (Prisma, REST, etc.)

### Authentication

- JWT access tokens (15min expiration)
- Refresh tokens (7 days expiration)
- Password hashing with bcrypt

### Database

- **Development**: SQLite (file-based, no setup needed)
- **Production**: PostgreSQL (robust, scalable)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
