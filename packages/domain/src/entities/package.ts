import { PackageAlreadyExistsError } from '../errors';

export interface PackageProps {
  id?: string;
  name: string;
  description?: string;
  diskSpace: number;
  bandwidth: number;
  emailAccounts: number;
  databases: number;
  subdomains: number;
  ftpAccounts: number;
  ssl: boolean;
  sshAccess: boolean;
  isActive: boolean;
  createdById?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Package {
  private constructor(private props: PackageProps) {}

  static create(props: {
    name: string;
    description?: string;
    createdById?: string;
  }): Package {
    return new Package({
      name: props.name,
      description: props.description,
      diskSpace: 1024, // 1GB default
      bandwidth: 10240, // 10GB default
      emailAccounts: 10,
      databases: 5,
      subdomains: 10,
      ftpAccounts: 5,
      ssl: true,
      sshAccess: false,
      isActive: true,
      createdById: props.createdById,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPersistence(props: PackageProps): Package {
    return new Package(props);
  }

  get id(): string | undefined {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get diskSpace(): number {
    return this.props.diskSpace;
  }

  get bandwidth(): number {
    return this.props.bandwidth;
  }

  get emailAccounts(): number {
    return this.props.emailAccounts;
  }

  get databases(): number {
    return this.props.databases;
  }

  get subdomains(): number {
    return this.props.subdomains;
  }

  get ftpAccounts(): number {
    return this.props.ftpAccounts;
  }

  get ssl(): boolean {
    return this.props.ssl;
  }

  get sshAccess(): boolean {
    return this.props.sshAccess;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get createdById(): string | undefined {
    return this.props.createdById;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }

  updateLimits(limits: {
    diskSpace?: number;
    bandwidth?: number;
    emailAccounts?: number;
    databases?: number;
    subdomains?: number;
    ftpAccounts?: number;
    ssl?: boolean;
    sshAccess?: boolean;
  }): void {
    if (limits.diskSpace !== undefined) this.props.diskSpace = limits.diskSpace;
    if (limits.bandwidth !== undefined) this.props.bandwidth = limits.bandwidth;
    if (limits.emailAccounts !== undefined) this.props.emailAccounts = limits.emailAccounts;
    if (limits.databases !== undefined) this.props.databases = limits.databases;
    if (limits.subdomains !== undefined) this.props.subdomains = limits.subdomains;
    if (limits.ftpAccounts !== undefined) this.props.ftpAccounts = limits.ftpAccounts;
    if (limits.ssl !== undefined) this.props.ssl = limits.ssl;
    if (limits.sshAccess !== undefined) this.props.sshAccess = limits.sshAccess;
    this.props.updatedAt = new Date();
  }

  updateName(name: string): void {
    this.props.name = name;
    this.props.updatedAt = new Date();
  }

  updateDescription(description: string): void {
    this.props.description = description;
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  toPersistence(): PackageProps {
    return { ...this.props };
  }
}
