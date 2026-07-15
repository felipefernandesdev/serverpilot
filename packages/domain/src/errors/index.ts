export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

// ============================================
// Account Errors
// ============================================

export class AccountNotFoundError extends DomainError {
  readonly code = 'ACCOUNT_NOT_FOUND';

  constructor(identifier: string) {
    super(`Account not found: ${identifier}`);
  }
}

export class AccountAlreadyExistsError extends DomainError {
  readonly code = 'ACCOUNT_ALREADY_EXISTS';

  constructor(domain: string) {
    super(`Account already exists for domain: ${domain}`);
  }
}

export class AccountSuspendedError extends DomainError {
  readonly code = 'ACCOUNT_SUSPENDED';

  constructor(username: string) {
    super(`Account is suspended: ${username}`);
  }
}

export class AccountQuotaExceededError extends DomainError {
  readonly code = 'ACCOUNT_QUOTA_EXCEEDED';

  constructor(resource: string, limit: number) {
    super(`Account quota exceeded for ${resource}. Limit: ${limit}`);
  }
}

// ============================================
// Authentication Errors
// ============================================

export class InvalidCredentialsError extends DomainError {
  readonly code = 'INVALID_CREDENTIALS';

  constructor() {
    super('Invalid email or password');
  }
}

export class UserNotFoundError extends DomainError {
  readonly code = 'USER_NOT_FOUND';

  constructor(identifier: string) {
    super(`User not found: ${identifier}`);
  }
}

export class UserAlreadyExistsError extends DomainError {
  readonly code = 'USER_ALREADY_EXISTS';

  constructor(email: string) {
    super(`User already exists: ${email}`);
  }
}

export class UnauthorizedError extends DomainError {
  readonly code = 'UNAUTHORIZED';

  constructor(message = 'Unauthorized access') {
    super(message);
  }
}

// ============================================
// Package Errors
// ============================================

export class PackageNotFoundError extends DomainError {
  readonly code = 'PACKAGE_NOT_FOUND';

  constructor(identifier: string) {
    super(`Package not found: ${identifier}`);
  }
}

export class PackageAlreadyExistsError extends DomainError {
  readonly code = 'PACKAGE_ALREADY_EXISTS';

  constructor(name: string) {
    super(`Package already exists: ${name}`);
  }
}

// ============================================
// Email Errors
// ============================================

export class EmailAccountNotFoundError extends DomainError {
  readonly code = 'EMAIL_ACCOUNT_NOT_FOUND';

  constructor(email: string) {
    super(`Email account not found: ${email}`);
  }
}

export class EmailAccountAlreadyExistsError extends DomainError {
  readonly code = 'EMAIL_ACCOUNT_ALREADY_EXISTS';

  constructor(email: string) {
    super(`Email account already exists: ${email}`);
  }
}

export class EmailQuotaExceededError extends DomainError {
  readonly code = 'EMAIL_QUOTA_EXCEEDED';

  constructor(limit: number) {
    super(`Email quota exceeded. Limit: ${limit} accounts`);
  }
}

// ============================================
// Database Errors
// ============================================

export class DatabaseNotFoundError extends DomainError {
  readonly code = 'DATABASE_NOT_FOUND';

  constructor(name: string) {
    super(`Database not found: ${name}`);
  }
}

export class DatabaseAlreadyExistsError extends DomainError {
  readonly code = 'DATABASE_ALREADY_EXISTS';

  constructor(name: string) {
    super(`Database already exists: ${name}`);
  }
}

export class DatabaseQuotaExceededError extends DomainError {
  readonly code = 'DATABASE_QUOTA_EXCEEDED';

  constructor(limit: number) {
    super(`Database quota exceeded. Limit: ${limit} databases`);
  }
}

// ============================================
// Domain Errors
// ============================================

export class DomainNotFoundError extends DomainError {
  readonly code = 'DOMAIN_NOT_FOUND';

  constructor(domain: string) {
    super(`Domain not found: ${domain}`);
  }
}

export class DomainAlreadyExistsError extends DomainError {
  readonly code = 'DOMAIN_ALREADY_EXISTS';

  constructor(domain: string) {
    super(`Domain already exists: ${domain}`);
  }
}

export class InvalidDomainError extends DomainError {
  readonly code = 'INVALID_DOMAIN';

  constructor(domain: string) {
    super(`Invalid domain format: ${domain}`);
  }
}

// ============================================
// SSL Errors
// ============================================

export class CertificateNotFoundError extends DomainError {
  readonly code = 'CERTIFICATE_NOT_FOUND';

  constructor(domain: string) {
    super(`SSL certificate not found for: ${domain}`);
  }
}

export class CertificateGenerationError extends DomainError {
  readonly code = 'CERTIFICATE_GENERATION_ERROR';

  constructor(message: string) {
    super(`Certificate generation failed: ${message}`);
  }
}

// ============================================
// DNS Errors
// ============================================

export class DnsZoneNotFoundError extends DomainError {
  readonly code = 'DNS_ZONE_NOT_FOUND';

  constructor(domain: string) {
    super(`DNS zone not found: ${domain}`);
  }
}

export class DnsZoneAlreadyExistsError extends DomainError {
  readonly code = 'DNS_ZONE_ALREADY_EXISTS';

  constructor(domain: string) {
    super(`DNS zone already exists: ${domain}`);
  }
}

export class InvalidDnsRecordError extends DomainError {
  readonly code = 'INVALID_DNS_RECORD';

  constructor(message: string) {
    super(`Invalid DNS record: ${message}`);
  }
}

// ============================================
// Server Errors
// ============================================

export class ServerCommandError extends DomainError {
  readonly code = 'SERVER_COMMAND_ERROR';

  constructor(command: string, message: string) {
    super(`Server command failed: ${command} - ${message}`);
  }
}

export class ServerConnectionError extends DomainError {
  readonly code = 'SERVER_CONNECTION_ERROR';

  constructor(message: string) {
    super(`Server connection error: ${message}`);
  }
}
