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
- **Frontend**: Next.js + React
- **Database**: SQLite (dev) + PostgreSQL (prod)
- **ORM**: Prisma
- **Auth**: JWT + Refresh Token
- **Build**: Turborepo

## Project Structure

```
serverpilot/
├── apps/
│   ├── server-hq/          # WHM equivalent (admin)
│   └── site-panel/         # cPanel equivalent (user)
├── packages/
│   ├── domain/             # Entities, value objects, ports
│   ├── use-cases/          # Business logic
│   ├── infra/              # Prisma, external services
│   └── shared/             # Utilities
├── prisma/
│   └── schema.prisma       # Database schema
├── docker/
│   └── docker-compose.yml  # Development environment
└── turbo.json              # Turborepo configuration
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Docker (optional, for database)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/serverpilot.git
cd serverpilot

# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Start development servers
npm run dev
```

### Development

```bash
# Run all apps in development mode
npm run dev

# Run only ServerHQ
npm run dev --workspace=apps/server-hq

# Run only SitePanel
npm run dev --workspace=apps/site-panel

# Database operations
npm run db:studio    # Open Prisma Studio
npm run db:migrate   # Run migrations
npm run db:seed      # Seed database
```

### Testing

```bash
# Run all tests
npm test

# Run tests for specific package
npm test --workspace=packages/domain

# Run tests with coverage
npm test -- --coverage
```

### Building

```bash
# Build all packages
npm run build

# Build specific app
npm run build --workspace=apps/server-hq
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

## API Documentation

### ServerHQ API

```
POST /api/auth/login          - Login
POST /api/auth/refresh        - Refresh token
GET  /api/accounts            - List accounts
POST /api/accounts            - Create account
GET  /api/accounts/:id        - Get account
PUT  /api/accounts/:id        - Update account
DELETE /api/accounts/:id      - Delete account
POST /api/accounts/:id/suspend - Suspend account
POST /api/accounts/:id/unsuspend - Unsuspend account
GET  /api/packages            - List packages
POST /api/packages            - Create package
```

### SitePanel API

```
POST /api/auth/login          - Login
GET  /api/files               - List files
POST /api/files/upload        - Upload file
GET  /api/email               - List email accounts
POST /api/email               - Create email account
GET  /api/databases           - List databases
POST /api/databases           - Create database
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by cPanel/WHM
- Built with NestJS
- Database management with Prisma
- Frontend with Next.js
