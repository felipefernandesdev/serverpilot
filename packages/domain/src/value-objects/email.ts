import { InvalidDomainError } from '../errors';

export class Email {
  private readonly _value: string;

  private constructor(email: string) {
    this._value = email.toLowerCase().trim();
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
    return this._value.split('@')[0];
  }

  get domain(): string {
    return this._value.split('@')[1];
  }

  get value(): string {
    return this._value;
  }

  equals(other: Email): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
