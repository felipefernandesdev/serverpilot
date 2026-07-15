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

**Status**: Pending

**Context**: Need modern frontend framework for both ServerHQ and SitePanel.

**Decision**: Use Next.js with React.

**Consequences**:
- ✅ Server-side rendering for performance
- ✅ Large ecosystem and community
- ✅ TypeScript support
- ❌ Additional complexity for simple admin panels
- ❌ Learning curve for App Router
