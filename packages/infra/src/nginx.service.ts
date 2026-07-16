import { DockerExecService } from './docker-exec.service';

const VHOST_TEMPLATE = (domain: string, username: string) => `
server {
    listen 80;
    server_name ${domain} www.${domain};
    root /var/www/${username}/public_html;
    index index.html index.htm index.php;

    access_log /var/log/nginx/${username}_access.log;
    error_log /var/log/nginx/${username}_error.log;

    location / {
        try_files $uri $uri/ =404;
    }

    location ~ \\.php$ {
        fastcgi_pass unix:/var/run/php-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\\.ht {
        deny all;
    }
}
`;

export class NginxService {
  constructor(private readonly docker: DockerExecService) {}

  async createVhost(username: string, domain: string): Promise<void> {
    const config = VHOST_TEMPLATE(domain, username);

    this.docker.writeFile('nginx', `/etc/nginx/conf.d/${username}.conf`, config);
    this.docker.exec('nginx', 'mkdir -p /var/www/' + username + '/public_html');
    this.docker.exec('nginx', 'chmod 755 /var/www/' + username + '/public_html');

    const html = `<html><body><h1>Welcome to ${domain}</h1><p>Site for ${username}.</p></body></html>`;
    this.docker.writeFile('nginx', `/var/www/${username}/public_html/index.html`, html);

    this.docker.exec('nginx', 'nginx -s reload');
  }

  async deleteVhost(username: string): Promise<void> {
    this.docker.rm('nginx', `/etc/nginx/conf.d/${username}.conf`);
    this.docker.rm('nginx', `/var/www/${username}`);
    this.docker.exec('nginx', 'nginx -s reload');
  }

  async disableVhost(username: string): Promise<void> {
    this.docker.exec('nginx',
      `mv /etc/nginx/conf.d/${username}.conf /etc/nginx/conf.d/${username}.conf.disabled || true`);
    this.docker.exec('nginx', 'nginx -s reload');
  }

  async enableVhost(username: string): Promise<void> {
    this.docker.exec('nginx',
      `mv /etc/nginx/conf.d/${username}.conf.disabled /etc/nginx/conf.d/${username}.conf || true`);
    this.docker.exec('nginx', 'nginx -s reload');
  }

  getSiteUrl(domain: string): string {
    return `http://${domain}`;
  }
}
