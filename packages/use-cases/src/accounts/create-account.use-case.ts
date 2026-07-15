import { AccountRepository, PackageRepository } from '@serverpilot/domain/ports/repositories';
import { Account } from '@serverpilot/domain/entities/account';
import { Username } from '@serverpilot/domain/value-objects/username';
import { DomainName } from '@serverpilot/domain/value-objects/domain';
import {
  AccountAlreadyExistsError,
  PackageNotFoundError,
  AccountQuotaExceededError,
} from '@serverpilot/domain/errors';

export interface CreateAccountRequest {
  username: string;
  password: string;
  domain: string;
  packageId: string;
  userId?: string;
}

export interface CreateAccountResponse {
  account: {
    id: string;
    username: string;
    domain: string;
    documentRoot: string;
    packageId: string;
  };
}

export class CreateAccountUseCase {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly packageRepository: PackageRepository,
    private readonly passwordService: PasswordService,
    private readonly serverService: ServerService,
  ) {}

  async execute(request: CreateAccountRequest): Promise<CreateAccountResponse> {
    // Validate and create value objects
    const username = Username.create(request.username);
    const domain = DomainName.create(request.domain);

    // Check if account already exists
    const existingUsername = await this.accountRepository.existsByUsername(username);
    if (existingUsername) {
      throw new AccountAlreadyExistsError(request.username);
    }

    const existingDomain = await this.accountRepository.existsByDomain(domain);
    if (existingDomain) {
      throw new AccountAlreadyExistsError(request.domain);
    }

    // Validate package exists
    const pkg = await this.packageRepository.findById(request.packageId);
    if (!pkg) {
      throw new PackageNotFoundError(request.packageId);
    }

    // Check reseller limits if applicable
    if (request.userId) {
      const accountCount = await this.accountRepository.countByUserId(request.userId);
      // This would check against reseller limits in production
    }

    // Hash password
    const hashedPassword = await this.passwordService.hash(request.password);

    // Create account entity
    const account = Account.create({
      username,
      password: hashedPassword,
      domain,
      userId: request.userId,
      packageId: request.packageId,
    });

    // Save to database
    const savedAccount = await this.accountRepository.save(account);

    // Execute server commands to create the account
    await this.serverService.createLinuxUser(username.value, request.password);
    await this.serverService.createDirectory(`/home/${username.value}/public_html`);
    await this.serverService.createVirtualHost(username.value, domain.value);

    return {
      account: {
        id: savedAccount.id!,
        username: savedAccount.username.value,
        domain: savedAccount.domain.value,
        documentRoot: savedAccount.documentRoot,
        packageId: savedAccount.packageId!,
      },
    };
  }
}

export interface PasswordService {
  hash(password: string): Promise<string>;
  compare(password: string, hashedPassword: string): Promise<boolean>;
}

export interface ServerService {
  createLinuxUser(username: string, password: string): Promise<void>;
  createDirectory(path: string): Promise<void>;
  createVirtualHost(username: string, domain: string): Promise<void>;
  deleteLinuxUser(username: string): Promise<void>;
  deleteDirectory(path: string): Promise<void>;
  deleteVirtualHost(username: string): Promise<void>;
}
