import { DomainName } from '../value-objects/domain';
import { Username } from '../value-objects/username';
import { AccountSuspendedError, AccountQuotaExceededError } from '../errors';

export interface AccountLimits {
  diskSpace: number; // MB
  bandwidth: number; // MB
  emailAccounts: number;
  databases: number;
  subdomains: number;
  ftpAccounts: number;
  ssl: boolean;
  sshAccess: boolean;
}

export interface AccountProps {
  id?: string;
  username: Username;
  password: string;
  domain: DomainName;
  documentRoot: string;
  ipAddress?: string;
  isActive: boolean;
  suspendedAt?: Date;
  suspendReason?: string;
  diskUsed: number;
  bandwidthUsed: number;
  lastLoginAt?: Date;
  userId?: string;
  packageId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Account {
  private constructor(private props: AccountProps) {}

  static create(props: {
    username: Username;
    password: string;
    domain: DomainName;
    userId?: string;
    packageId?: string;
  }): Account {
    const documentRoot = `/home/${props.username}/public_html`;

    return new Account({
      username: props.username,
      password: props.password,
      domain: props.domain,
      documentRoot,
      isActive: true,
      diskUsed: 0,
      bandwidthUsed: 0,
      userId: props.userId,
      packageId: props.packageId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPersistence(props: AccountProps): Account {
    return new Account(props);
  }

  get id(): string | undefined {
    return this.props.id;
  }

  get username(): Username {
    return this.props.username;
  }

  get password(): string {
    return this.props.password;
  }

  get domain(): DomainName {
    return this.props.domain;
  }

  get documentRoot(): string {
    return this.props.documentRoot;
  }

  get ipAddress(): string | undefined {
    return this.props.ipAddress;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get suspendedAt(): Date | undefined {
    return this.props.suspendedAt;
  }

  get suspendReason(): string | undefined {
    return this.props.suspendReason;
  }

  get diskUsed(): number {
    return this.props.diskUsed;
  }

  get bandwidthUsed(): number {
    return this.props.bandwidthUsed;
  }

  get lastLoginAt(): Date | undefined {
    return this.props.lastLoginAt;
  }

  get userId(): string | undefined {
    return this.props.userId;
  }

  get packageId(): string | undefined {
    return this.props.packageId;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }

  get isSuspended(): boolean {
    return this.props.suspendedAt !== undefined;
  }

  suspend(reason: string): void {
    if (this.isSuspended) {
      throw new AccountSuspendedError(this.props.username.value);
    }
    this.props.suspendedAt = new Date();
    this.props.suspendReason = reason;
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  unsuspend(): void {
    this.props.suspendedAt = undefined;
    this.props.suspendReason = undefined;
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  updateDiskUsage(used: number, limit: number): void {
    if (used > limit) {
      throw new AccountQuotaExceededError('disk', limit);
    }
    this.props.diskUsed = used;
    this.props.updatedAt = new Date();
  }

  updateBandwidthUsage(used: number, limit: number): void {
    if (used > limit) {
      throw new AccountQuotaExceededError('bandwidth', limit);
    }
    this.props.bandwidthUsed = used;
    this.props.updatedAt = new Date();
  }

  updateLastLogin(): void {
    this.props.lastLoginAt = new Date();
    this.props.updatedAt = new Date();
  }

  updateIpAddress(ip: string): void {
    this.props.ipAddress = ip;
    this.props.updatedAt = new Date();
  }

  updatePackage(packageId: string): void {
    this.props.packageId = packageId;
    this.props.updatedAt = new Date();
  }

  toPersistence(): AccountProps {
    return { ...this.props };
  }
}
