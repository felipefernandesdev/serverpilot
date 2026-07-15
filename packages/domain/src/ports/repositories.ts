import { User } from '../entities/user';
import { Account } from '../entities/account';
import { Package } from '../entities/package';
import { Email } from '../value-objects/email';
import { DomainName } from '../value-objects/domain';
import { Username } from '../value-objects/username';

// ============================================
// User Repository
// ============================================

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  findAll(): Promise<User[]>;
  save(user: User): Promise<User>;
  update(user: User): Promise<User>;
  delete(id: string): Promise<void>;
  existsByEmail(email: Email): Promise<boolean>;
}

// ============================================
// Account Repository
// ============================================

export interface AccountRepository {
  findById(id: string): Promise<Account | null>;
  findByUsername(username: Username): Promise<Account | null>;
  findByDomain(domain: DomainName): Promise<Account | null>;
  findByUserId(userId: string): Promise<Account[]>;
  findAll(): Promise<Account[]>;
  save(account: Account): Promise<Account>;
  update(account: Account): Promise<Account>;
  delete(id: string): Promise<void>;
  existsByUsername(username: Username): Promise<boolean>;
  existsByDomain(domain: DomainName): Promise<boolean>;
  countByUserId(userId: string): Promise<number>;
}

// ============================================
// Package Repository
// ============================================

export interface PackageRepository {
  findById(id: string): Promise<Package | null>;
  findByName(name: string): Promise<Package | null>;
  findAll(): Promise<Package[]>;
  save(pkg: Package): Promise<Package>;
  update(pkg: Package): Promise<Package>;
  delete(id: string): Promise<void>;
  existsByName(name: string): Promise<boolean>;
}
