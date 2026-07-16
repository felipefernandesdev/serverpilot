import { DockerExecService } from './docker-exec.service';

export class MailService {
  constructor(private readonly docker: DockerExecService) {}

  async setupDomain(domain: string): Promise<void> {
    this.docker.exec('postfix', `postconf -e "virtual_mailbox_domains=$\{virtual_mailbox_domains} ${domain}"`);
    this.docker.exec('postfix', 'postfix reload');

    this.docker.exec('dovecot', `mkdir -p /srv/mail/${domain}`);
  }

  async removeDomain(domain: string): Promise<void> {
    this.docker.exec('dovecot', `rm -rf /srv/mail/${domain}`);
    this.docker.exec('postfix', 'postfix reload');
  }

  async setupEmailAccount(email: string, password: string): Promise<void> {
    const [user, domain] = email.split('@');
    this.docker.exec('dovecot',
      `mkdir -p /srv/mail/${domain}/${user}/cur ` +
      `&& mkdir -p /srv/mail/${domain}/${user}/new ` +
      `&& mkdir -p /srv/mail/${domain}/${user}/tmp ` +
      `&& chmod -R 700 /srv/mail/${domain}/${user}`);
  }

  async removeEmailAccount(email: string): Promise<void> {
    const [user, domain] = email.split('@');
    this.docker.exec('dovecot', `rm -rf /srv/mail/${domain}/${user}`);
  }

  getWebmailUrl(): string {
    return 'http://localhost:9001';
  }

  getSmtpCredentials(host: string): { host: string; port: number; encryption: string } {
    return { host, port: 587, encryption: 'STARTTLS' };
  }

  getImapCredentials(host: string): { host: string; port: number; encryption: string } {
    return { host, port: 143, encryption: 'STARTTLS' };
  }
}
