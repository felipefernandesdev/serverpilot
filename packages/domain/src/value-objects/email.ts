import { InvalidDomainError } from '../errors';

export class Email {
  private readonly value: string;

  private constructor(email: string) {
    this.value = email.toLowerCase().trim();
  }

  static create(email: string): Email {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new InvalidDomainError(email);
    }
    return new Email(email);
  }

  static fromPersistence(email: string): Email {
    return new Email(email);
  }

  get local(): string {
    return this.value.split('@')[0];
  }

  get domain(): string {
    return this.value.split('@')[1];
  }

  get value(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
