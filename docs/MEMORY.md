
## 2026-07-19 — Sessão 7: PHP-FPM + WordPress funcional + DNS containers corrigido

### O que foi feito

**PHP-FPM container**
- `docker/php/Dockerfile` baseado em `php:8.3-fpm-alpine` com WordPress extensions: mysqli, pdo_mysql, gd (com webp/jpeg), xml, mbstring, zip, curl, exif, intl, bcmath, opcache, imagick
- Runtime libs (`libwebp`, `icu-libs`, `libzip`) instaladas em RUN separado para não serem removidas pelo `apk del --purge` das -dev packages
- Build com `podman build --network host` (DNS do container não funciona durante build)

**Container DNS fix**
- Causa raiz: Alpine usa musl libc, cujo resolver DNS não funciona com aardvark-dns (10.89.0.1). `getent hosts mariadb` retorna vazio, apesar do DNS server estar reachable (`ping 10.89.0.1` funciona, `dig @10.89.0.1 mariadb` do host funciona)
- Solução permanente: `extra_hosts` no `docker-compose.yml` — PHP container mapeia `mariadb`, `postgres`, `redis`, `mailhog` para IPs estáticos via `/etc/hosts`
- Nginx container também mapeia `php` via `extra_hosts`
- `iptables -I FORWARD 1 -s 10.89.0.0/24 -d 10.89.0.0/24 -j ACCEPT` — FORWARD policy DROP bloqueava tráfego entre containers na bridge

**WordPress installer (completo)**
- `apps/site-panel/src/modules/wp-installer/wp-installer.service.ts`:
  1. Download do WordPress: `curl` no host (com DNS) → pipe para `podman exec -i serverpilot-php tar xz`
  2. Database: cria `wp_{username}` no MariaDB via DatabaseProvisioningService
  3. wp-config.php: `DB_HOST=mariadb` (resolve via extra_hosts)
  4. WP-CLI: baixa `wp-cli.phar` do host, pipe para container, executa `wp core install --allow-root` (admin/admin123)
- POST `/api/wp/install/:accountId` funcional com retorno de siteUrl, adminUrl e info da database

**Nginx vhost com PHP-FPM**
- Template alterado: `fastcgi_pass php:9000` (TCP entre containers) ao invés de `unix:/var/run/php-fpm.sock`
- `/etc/hosts` no container nginx precisa ter `php` apontando para o IP do serverpilot-php

**site-panel service fix**
- `.env` global com `PORT=3001` sobrescrevia `Environment=PORT=3002` do service
- Fix: `env PORT=3002` prefixado no ExecStart dentro do arquivo de service

### Causa raiz
- **musl DNS resolver**: Alpine usa musl, cujo `gethostbyname()` não consegue consultar o aardvark-dns em 10.89.0.1. Apenas `/etc/hosts` é confiável para resolução interna. External DNS também falha (`apk add` mostra "DNS: transient error")
- **iptables FORWARD DROP**: UFW define `policy DROP` no FORWARD chain. Containers na bridge 10.89.0.0/24 não conseguiam se comunicar. NETAVARK_FORWARD tem regras de ACCEPT, mas a posição das regras na chain fazia o tráfego cair nos UFW chains antes de chegar no ACCEPT
- **site_data volume mismatch**: `podman run -v site_data:...` cria volume com nome `site_data`, mas `podman-compose` prefixa como `docker_site_data`. PHP container criado manualmente via `podman run` não via os mesmos arquivos que nginx criado via compose
- **GD/intl/zip runtime libs**: `apk del --purge libwebp-dev` remove também `libwebp.so.7` (runtime) porque `libwebp` é dependência. Solução: instalar libs runtime via RUN separado

### Pendências
- [ ] DNS externo do container PHP quebrado (musl + aardvark-dns): impedido `apk add`, `wget`, `curl` dentro do container. Impacto: WordPress updates/plugins não funcionam, WP-CLI no container não baixa nada. `extra_hosts` só resolve nomes internos
- [ ] Solução para DNS externo: subir dnsmasq local (10.89.0.2) ou bind-mount `/etc/resolv.conf` com `8.8.8.8`
- [ ] DNS público (porta 53 bloqueada OVH): PowerDNS em 5354, mas upstream OVH bloqueia pacotes para porta 53
- [ ] Compilação otimizada (tsx ou tsc + paths para dist/)
- [ ] Testes automatizados
- [ ] FTP real (vsftpd container ou SFTP chroot)
- [ ] Backup automático
- [ ] Postgres/Redis containers sem IP na docker_default (criados antes do network existir)

## 2026-07-18 — Sessão 6: Documentação + exclusão segura + fix packages update

### O que foi feito
- **Modal de exclusão reforçado:** substituído `confirm()` por modal que carrega detalhes completos da conta (email, databases, subdomains, FTP, cron, backups) e exige:
  - Checkbox "sem pendências financeiras"
  - Digitar o username para habilitar o botão "Permanently Delete"
- **Packages update fix:** `packages.service.ts:78` passava `data: dto` diretamente — Prisma espera `SSL` (maiúsculo) mas DTO tem `ssl` (minúsculo). Mapeamento explícito corrigido.
- **`docs/04-infraestrutura.md` reescrito:** reflete estado real de produção (containers, services, status real de cada camada)
- **`docs/MEMORY.md`:** adicionada sessão 6

### Causa raiz
- Delete quebrava por FK constraint (`email_accounts_accountId_fkey`) — fix em sessão anterior com cascade `deleteMany`
- Update de packages quebrava por `ssl` vs `SSL` — Prisma é case-sensitive
- Documentação estava desatualizada (marcava como ❌ coisas que já funcionam)

### Pendências
- Let's Encrypt SSL após 19/07: `certbot --nginx -d admin.agiliza.host -d painel.agiliza.host -d webmail.agiliza.host`
- Compilação otimizada (tsx ou tsc com paths para `dist/`)
- Testes automatizados
- FTP real
- Backup automático

## 2026-07-18 — Sessão 5: PostgreSQL cluster recovery + nginx/SSL skip

### O que foi feito (commit d589f9e)
- **fail() function** mudou de `return 1` para `exit 1` — agora `pg_isready -q || fail "msg"` interrompe o script se PostgreSQL não subir
- **Step 3 PostgreSQL:** detecta `/etc/postgresql/16/main` existe mas `/var/lib/postgresql/16/main` não → `pg_dropcluster` + `pg_createcluster`. Também trata cluster totalmente ausente e cluster parado
- **Step 9 PostgreSQL:** mesma lógica de recovery antes de desistir
- **Nginx (step 15):** pula config se `DOMAIN_ADMIN`/`DOMAIN_PAINEL`/`DOMAIN_WEBMAIL` estiverem vazios (evita `server_name` inválido)
- **SSL (step 17):** pula se domínios vazios
- **reset-vps.sh:** removeu `postgresql-server-16` (pacote inexistente — causava erro no apt), adiciona `rm -rf /etc/postgresql-common`

### Causa raiz
Reset via `rm -rf /var/lib/postgresql` sem `pg_dropcluster` deixava config do cluster intacta mas sem dados. `pg_lsclusters` mostrava cluster existente (status "down"), então `pg_createcluster` nunca era chamado. O `pg_ctlcluster 16 main start` falhava porque o diretório de dados estava vazio.

### Pendências
- DNS admin.agiliza.host, painel.agiliza.host, webmail.agiliza.host → A 51.161.73.164
- Bootstrap get-serverpilot.sh: read com /dev/tty para curl|bash
- podman rootless detection (falso positivo mesmo como root)
- Dual PostgreSQL (container PowerDNS vs sistema)
- server-status uptime
- podman-compose up -d exit 125

## 2026-07-18 — Sessão 4: PostgreSQL fix + Redis wait loop

### O que foi feito
- **PostgreSQL step 3:** removido `2>/dev/null || true` do `systemctl enable --now postgresql` — agora erros aparecem. Adicionado retry loop com `pg_isready` (10s timeout), fallback para `pg_ctlcluster 16 main start` / `service postgresql start`.
- **Redis step 4:** mesma lógica com `redis-cli ping`.
- **Step 9 (banco):** adicionada verificação `pg_isready` antes de executar psql, com tentativa de iniciar PostgreSQL se estiver parado.
- **Commit:** `4ad7309` — *fix: PostgreSQL e Redis — wait loops com pg_isready/redis-cli, sem 2>/dev/null*

### Causa raiz
O `2>/dev/null || true` escondia falha do `systemctl enable --now postgresql`. Após reset (purge + rm -rf `/var/lib/postgresql`), o cluster PostgreSQL não era recriado automaticamente, e o script não detectava que o serviço não subiu.

### Pendências
- Rodar install em VPS limpa (reset fresh) para validar as correções
- Dual PostgreSQL (container PowerDNS vs sistema) — precisa de ADR
- `server-status` uptime (Date() com timestamp systemd)
- `podman-compose up -d` exit 125
- DNS: admin.agiliza.host, painel.agiliza.host, webmail.agiliza.host precisam de registro A → 51.161.73.164 antes do install
