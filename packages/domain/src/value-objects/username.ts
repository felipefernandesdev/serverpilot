import { InvalidDomainError } from '../errors';

export class Username {
  private readonly _value: string;

  private constructor(username: string) {
    this._value = username.toLowerCase().trim();
  }

  static create(username: string): Username {
    // Linux username rules: lowercase, alphanumeric, underscore, hyphen
    // Must start with letter or underscore
    const usernameRegex = /^[a-z_][a-z0-9_-]{0,30}$/;
    if (!usernameRegex.test(username)) {
      throw new InvalidDomainError(`Invalid username: ${username}`);
    }
    return new Username(username);
  }

  static fromPersistence(username: string): Username {
    return new Username(username);
  }

  get value(): string {
    return this._value;
  }

  equals(other: Username): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
