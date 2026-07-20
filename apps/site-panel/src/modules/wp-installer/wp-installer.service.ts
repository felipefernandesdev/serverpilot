import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { execSync } from 'child_process';
import { PrismaService } from '../../prisma/prisma.service';
import { DockerExecService, DatabaseProvisioningService } from '@serverpilot/infra';

@Injectable()
export class WpInstallerService {
  private readonly logger = new Logger(WpInstallerService.name);
  private readonly docker: DockerExecService;
  private readonly database: DatabaseProvisioningService;

  constructor(private readonly prisma: PrismaService) {
    this.docker = new DockerExecService();
    this.database = new DatabaseProvisioningService(this.docker);
  }

  async install(accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: { package: true },
    });

    if (!account) {
      throw new ConflictException('Account not found');
    }

    const publicHtml = `/var/www/${account.username}/public_html`;

    const wpExists = await this.checkFileExists(publicHtml, 'wp-config.php');
    if (wpExists) {
      throw new ConflictException('WordPress already installed');
    }

    this.docker.exec('php', `mkdir -p ${publicHtml}`);

    this.logger.log(`Downloading WordPress for ${account.username}...`);
    execSync(
      `curl -sL https://wordpress.org/latest.tar.gz | sudo podman exec -i serverpilot-php tar xz --strip-components=1 -C ${publicHtml}`,
      { stdio: 'pipe', timeout: 60000 },
    );

    this.docker.exec('php', `chmod -R 755 ${publicHtml}`);

    const dbName = `wp_${account.username}`;
    const dbUser = `${account.username}_wp`;
    const dbPass = this.generatePassword();

    this.database.createDatabase(dbName, dbUser, dbPass);

    const siteUrl = `http://${account.domain}`;
    const config = `<?php
define('DB_NAME', '${dbName}');
define('DB_USER', '${dbUser}');
define('DB_PASSWORD', '${dbPass}');
define('DB_HOST', 'mariadb');
define('DB_CHARSET', 'utf8');
define('DB_COLLATE', '');

\$table_prefix = 'wp_';

define('WP_DEBUG', false);
define('WP_AUTO_UPDATE_CORE', true);

if (!defined('ABSPATH')) {
    define('ABSPATH', __DIR__ . '/');
}
require_once ABSPATH . 'wp-settings.php';
`;

    this.docker.writeFile('php', `${publicHtml}/wp-config.php`, config);

    this.logger.log(`Running WordPress installation for ${account.username}...`);
    this.runWpInstall(publicHtml, siteUrl);

    this.logger.log(`WordPress installed for ${account.username} at ${siteUrl}`);

    return {
      success: true,
      siteUrl,
      adminUrl: `${siteUrl}/wp-admin`,
      database: this.database.getConnectionInfo(dbName, dbUser, dbPass),
    };
  }

  private runWpInstall(publicHtml: string, siteUrl: string) {
    try {
      const wpCli = execSync(
        'curl -sL https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar',
        { timeout: 30000, encoding: 'buffer' },
      );
      execSync(
        `sudo podman exec -i serverpilot-php sh -c "cat > /tmp/wp-cli.phar && chmod +x /tmp/wp-cli.phar"`,
        { input: wpCli, timeout: 10000 },
      );
      const result = execSync(
        `sudo podman exec -i serverpilot-php sh -c "cd ${publicHtml} && php -d error_reporting=0 /tmp/wp-cli.phar core install --url='${siteUrl}' --title='${siteUrl.replace(/^https?:\/\//, '')} - WordPress' --admin_user=admin --admin_password=admin123 --admin_email=admin@${siteUrl.replace(/^https?:\/\//, '')} --skip-email --allow-root 2>&1"`,
        { timeout: 60000 },
      );
      this.logger.log(`WP-CLI output: ${result.stdout?.toString().trim()}`);
    } catch (err) {
      this.logger.warn(`WP-CLI install may have failed: ${err.message}`);
    }
  }

  private async checkFileExists(dir: string, filename: string): Promise<boolean> {
    try {
      this.docker.exec('php', `test -f ${dir}/${filename} && echo yes`);
      return true;
    } catch {
      return false;
    }
  }

  private generatePassword(length = 20): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^*()';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }
}
