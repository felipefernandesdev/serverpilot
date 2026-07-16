import { InvalidDomainError } from '../errors';

export class DomainName {
  private readonly _value: string;

  private constructor(domain: string) {
    this._value = domain.toLowerCase().trim();
  }

  static create(domain: string): DomainName {
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(domain)) {
      throw new InvalidDomainError(domain);
    }
    return new DomainName(domain);
  }

  static fromPersistence(domain: string): DomainName {
    return new DomainName(domain);
  }

  get root(): string {
    const parts = this._value.split('.');
    return parts[parts.length - 1];
  }

  get subdomain(): string | null {
    const parts = this._value.split('.');
    if (parts.length <= 2) return null;
    return parts.slice(0, -2).join('.');
  }

  get value(): string {
    return this._value;
  }

  equals(other: DomainName): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
