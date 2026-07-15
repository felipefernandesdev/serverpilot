import { Email } from '../value-objects/email';
import { UserAlreadyExistsError } from '../errors';

export enum UserRole {
  ADMIN = 'admin',
  RESELLER = 'reseller',
  USER = 'user',
}

export interface UserProps {
  id?: string;
  email: Email;
  password: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class User {
  private constructor(private props: UserProps) {}

  static create(props: UserProps): User {
    return new User({
      ...props,
      role: props.role || UserRole.USER,
      isActive: props.isActive !== undefined ? props.isActive : true,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    });
  }

  static fromPersistence(props: UserProps): User {
    return new User(props);
  }

  get id(): string | undefined {
    return this.props.id;
  }

  get email(): Email {
    return this.props.email;
  }

  get password(): string {
    return this.props.password;
  }

  get name(): string {
    return this.props.name;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get lastLoginAt(): Date | undefined {
    return this.props.lastLoginAt;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }

  get isAdmin(): boolean {
    return this.props.role === UserRole.ADMIN;
  }

  get isReseller(): boolean {
    return this.props.role === UserRole.RESELLER;
  }

  get isUser(): boolean {
    return this.props.role === UserRole.USER;
  }

  updateLastLogin(): void {
    this.props.lastLoginAt = new Date();
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

  changeRole(role: UserRole): void {
    this.props.role = role;
    this.props.updatedAt = new Date();
  }

  updatePassword(hashedPassword: string): void {
    this.props.password = hashedPassword;
    this.props.updatedAt = new Date();
  }

  toPersistence(): UserProps {
    return { ...this.props };
  }
}
