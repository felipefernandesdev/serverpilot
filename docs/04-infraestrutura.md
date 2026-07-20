# Infraestrutura do ServerPilot

## Status Atual (Julho 2026 — Produção)

O projeto está rodando em **produção** na VPS `51.161.73.164` (Ubuntu 24.04, 4 GB RAM, 40 GB SSD). Todos os containers de infraestrutura e os services web estão operacionais.

### O que está funcional

| Camada | Status | Detalhes |
|--------|--------|----------|
| Autenticação (JWT) | ✅ | Login/logout, refresh token, bcrypt |
| Admin: Contas CRUD | ✅ | Cria/edita/suspende/deleta com cascade total |
| Admin: Pacotes CRUD | ✅ | Planos com limites de recursos |
| Admin: Server Status | ✅ | Dados reais (df -BG) com cache de 30s |
| PowerDNS (DNS) | ✅ | API funcional, zonas criadas/removidas via NestJS |
| Nginx (vhosts clientes) | ✅ | Container nginx + vhosts automáticos por conta |
| Postfix (SMTP) | ✅ | Container rodando, domínios virtuais |
| Dovecot (IMAP/POP3) | ✅ | Container rodando, contas via SQL |
| SnappyMail (Webmail) | ✅ | Container rodando, setup já configurado |
| PostgreSQL (compartilhado) | ✅ | Cluster 16 rodando, PowerDNS + App no mesmo banco |
| Redis (cache/sessão) | ✅ | Container rodando |
| MariaDB (clientes) | ✅ | Container rodando (porta 3307) |
| Adminer (DB admin) | ✅ | Container rodando (porta 8082) |
| SitePanel (cliente) | ✅ | Painel do cliente funcional |
| Criação automática de conta | ✅ | Nginx vhost + DNS zone + site index criados |
| Exclusão com cascade | ✅ | Deleta email, database, subdomain, FTP, cron, backup |
| File Manager | ✅ | Opera no sistema de arquivos real via container |
| Editor de arquivos | ✅ | CodeMirror 6 |
| Site Preview | ✅ | Serve arquivos via JWT |
| SSL (auto-assinado) | ✅ | Cert auto-assinado (Let's Encrypt em 19/07) |

### O que não existe / Pendente

| Item | Status | Motivo |
|------|--------|--------|
| Let's Encrypt SSL | ⏳ 19/07 | Rate limit: "5 certificates already issued in 168h" |
| Compilação otimizada | ⚠️ ts-node | tsx falha com experimentalDecorators, tsc não resolve paths |
| FTP real | ❌ | Apenas registro no banco |
| Métricas de uso real | ⚠️ Parcial | Disk real, bandwidth é mock |
| Backup automático | ❌ | Apenas registro no banco |

---

## Arquitetura Atual

### Visão Geral

```
Internet
    │
    ├── admin.agiliza.host ──► Nginx (host) ──► :3000 (Next.js admin)
    │                                   └──► /api/ → :3001 (NestJS server-hq)
    │
    ├── painel.agiliza.host ──► Nginx (host) ──► :3002 (Next.js site-panel)
    │                                   └──► /api/ → :3001 (NestJS server-hq)
    │
    └── webmail.agiliza.host ──► Nginx (host) ──► :9001 (SnappyMail container)
```

### Containers Podman (docker-compose)

```
CONTAINER ID  IMAGE                          PORTS                    NAMES
f8a22c7b83f5  docker.io/library/mariadb:lts  0.0.0.0:3307->3306/tcp  serverpilot-mariadb
84fea1e72c0c  powerdns/pdns-auth-49:latest   0.0.0.0:53->53/tcp       serverpilot-powerdns
                                            0.0.0.0:53->53/udp
                                            0.0.0.0:8081->8081/tcp
15d373e35b31  myguard-dockerized-postfix     0.0.0.0:25->25/tcp       serverpilot-postfix
b344bbf5989d  myguard-dockerized-dovecot     0.0.0.0:143->143/tcp     serverpilot-dovecot
                                            0.0.0.0:993->993/tcp
a577a8c55e8f  snappymail/snappymail:latest   0.0.0.0:9001->80/tcp     serverpilot-snappymail
2d6bb4f16433  adminer:latest                 0.0.0.0:8082->8080/tcp   serverpilot-adminer
d0f39fbdde2e  redis:7-alpine                 0.0.0.0:6379->6379/tcp   serverpilot-redis
b66512c1369b  nginx:alpine                   0.0.0.0:8080->80/tcp     serverpilot-nginx
```

### Services Systemd

| Service | Porta | Tech | Usuário |
|---------|-------|------|---------|
| `serverpilot-server-hq` | 3001 | NestJS (ts-node) | serverpilot |
| `serverpilot-admin` | 3000 | Next.js | serverpilot |
| `serverpilot-site-panel` | 3002 | Next.js | serverpilot |
| `podman-compose@docker` | — | Podman Compose | serverpilot |

### Fluxo de Criação de Conta

```
POST /api/accounts → AccountsService.create()
  ├── 1. Cria registro no PostgreSQL (Prisma)
  ├── 2. Cria vhost no nginx (sudo podman exec nginx)
  │     └── server_name client01.com www.client01.com
  │     └── proxy_pass para container nginx:80
  ├── 3. Cria DNS zone no PowerDNS via API
  │     └── A, MX, www, NS, SOA records
  ├── 4. Cria site index.html
  └── 5. Cria diretório do usuário
```

### Fluxo de Exclusão de Conta

```
DELETE /api/accounts/:id → AccountsService.remove()
  ├── 1. Deleta email_accounts (cascade)
  ├── 2. Deleta databases (cascade)
  ├── 3. Deleta database_users (cascade)
  ├── 4. Deleta subdomains (cascade)
  ├── 5. Deleta ftp_accounts (cascade)
  ├── 6. Deleta cron_jobs (cascade)
  ├── 7. Deleta backups (cascade)
  ├── 8. Deleta DNS zone via PowerDNS API
  ├── 9. Deleta nginx vhost
  └── 10. Deleta account (Prisma)
```

---

## Estrutura de Diretórios

```
/opt/serverpilot/
├── apps/
│   ├── admin/             # Next.js — painel admin (porta 3000)
│   ├── server-hq/         # NestJS — API principal (porta 3001)
│   ├── site-panel/        # Next.js — painel cliente (porta 3002)
│   └── web/               # Site institucional
├── packages/
│   └── infra/             # Biblioteca de serviços de infraestrutura
│       ├── nginx.service.ts
│       ├── mail.service.ts
│       ├── dns.service.ts
│       ├── database.service.ts
│       ├── docker-exec.service.ts
│       └── server-status.service.ts
├── docker/
│   ├── docker-compose.yml
│   ├── nginx/             # Configs dos vhosts
│   ├── postfix/           # Config do Postfix
│   ├── dovecot/           # Config do Dovecot
│   └── powerdns/          # Config do PowerDNS
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── scripts/
    ├── install-vps.sh
    └── reset-vps.sh
```

---

## Configurações Críticas

### PowerDNS → PostgreSQL

- **Conexão:** direta via IP `10.89.0.1` (interface podman1)
- **API:** `http://localhost:8081/api/v1/servers/localhost`
- **Key:** `pdns_6a4846c74734397849c2ea85f2c89a5d`
- **A records:** usam `SERVER_PUBLIC_IP` env var (51.161.73.164)

### Nginx Externo (host)

- **SSL:** auto-assinado em `/etc/nginx/ssl/serverpilot.{crt,key}`
- **Catch-all:** `server_name _ default_server` → proxy para `127.0.0.1:8082`
- **Proxy API:** `/api/` → `127.0.0.1:3001`
- **Proxy Admin:** `/` → `127.0.0.1:3000`
- **Proxy Painel:** `/` → `127.0.0.1:3002`
- **Proxy Webmail:** `/` → `127.0.0.1:9001`

### DockerExecService

- Service roda como `serverpilot` (não root)
- Precisa de `sudo podman` para comandos em containers
- Sudoers: `serverpilot ALL=(ALL) NOPASSWD: /usr/bin/podman`

### Cache de Server Status

- Implementado em `packages/infra/src/server-status.service.ts`
- Cache de 30s usando `Map` simples
- Reduz resposta de ~20s para ~0.012s

---

## Dados de Acesso

| Sistema | URL | Login |
|---------|-----|-------|
| Admin | `https://admin.agiliza.host` | `admin@agiliza.host` / `admin123` |
| Painel Cliente | `https://painel.agiliza.host` | `client01` / `client123` |
| Webmail | `https://webmail.agiliza.host` | Conta de email criada no admin |
| Adminer | `http://51.161.73.164:8082` | `serverpilot` / senha no `.env` |
| PowerDNS API | `http://51.161.73.164:8081` | Key: `pdns_6a4846c74734397849c2ea85f2c89a5d` |

---

## Plano de Implementação

### Fase 1: Infra Docker (dia 1) — ✅ Completo
- [x] docker-compose.yml base (postgres, redis, mailhog, adminer)
- [x] Adicionar nginx + mariadb + postfix + dovecot + snappymail + powerdns
- [x] Scripts de inicialização dos containers
- [x] Volumes e redes compartilhadas

### Fase 2: packages/infra/ (dia 1-2) — ✅ Completo
- [x] DockerExecService — utilitário de execução em containers
- [x] NginxService — criar/deletar vhosts
- [x] MailService — domínios Postfix + contas Dovecot
- [x] DnsService — zonas PowerDNS via API
- [x] DatabaseService — provisionamento MariaDB

### Fase 3: Ciclo de Vida (dia 2) — ✅ Completo
- [x] Integrar ServerService no AccountsService (server-hq)
- [x] Criar conta → provisionar tudo
- [x] Deletar conta → limpar tudo (cascade)
- [x] Suspender/reativar → nginx disable/enable

### Fase 4: Frontend (dia 2-3) — ✅ Completo
- [x] Botão Webmail no dashboard + sidebar
- [x] Página de DNS management
- [x] Strings de conexão reais nos databases
- [x] Indicadores de serviço no server status (disk real)

### Fase 5: Polish (dia 3)
- [x] Atualizar seed data para provisionar client01 + client02
- [x] Testes de fluxo completo
- [x] Documentação atualizada
- [ ] Compilação otimizada (tsx ou tsc + paths para dist/)
- [ ] Let's Encrypt SSL automático (certbot)
- [ ] Testes automatizados
