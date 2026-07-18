# ServerPilot — MEMORY

## Sessão: 2026-07-16 (tarde/noite)

### Estado Atual
- **Fase**: 3 (Admin funcional + infra provisionando + detail tabs)
- **Branch**: `main`
- **Último commit**: `c3793ea` — feat: admin account detail with tabs

### Estrutura de Apps (NÃO CONFUNDIR)

| Diretório | Nome no package.json | Função | Porta |
|-----------|---------------------|--------|-------|
| `apps/admin/` | `@serverpilot/admin` | **ServerHQ Admin** (WHM — admin) | 3000 |
| `apps/web/` | `@serverpilot/web` | **SitePanel** (cPanel — cliente) | **3003** |
| `apps/server-hq/` | `@serverpilot/server-hq` | API do Admin | 3001 |
| `apps/site-panel/` | `@serverpilot/site-panel` | API do Cliente | 3002 |

**IMPORTANTE:** `apps/web/` é o frontend do CLIENTE (SitePanel), não o admin. O admin fica em `apps/admin/`.

### O Que Foi Feito Nesta Sessão

**Correções de infraestrutura (Docker + provisionamento):**

1. **Docker compose — todas as imagens corrigidas para rootless podman:**
   - Postfix: `ubuntu/postfix` → `catatnight/postfix` (inacessível)
   - Dovecot: removidos 10-mail.conf, 10-master.conf, dovecot-sql.conf.ext (formato Dovecot 2.3); adicionados `auth-sql.conf.ext` com `sql_driver=pgsql` root-level + `local.conf` com `mail_driver`/`mail_path`
   - PowerDNS: env-var config ignorado pela imagem → montado `pdns.conf` com porta interna 5300 + API habilitada + schema SQL
   - SnappyMail: porta interna é 8888, não 80 (corrigido `ports: 9001:8888`)
   - SELinux: volumes bind mount com flag `:Z`

2. **`packages/infra/src/docker-exec.service.ts` — writeFile via pipe:**
   - Heredoc `<< 'EOF'` não funcionava dentro de `podman exec sh -c "..."` porque `\n` virava literal dentro de `JSON.stringify`
   - Solução: `execSync` com `input` piped via `-i` flag → `cat > ${path}` recebe stdin

3. **`packages/infra/src/dns.service.ts` — URL relativa sem leading `/`:**
   - `new URL('/zones', baseComTrailingSlash)` produzia `http://.../zones` (perdia o path `/api/v1/servers/localhost`)
   - Solução: remover `/` dos paths → `new URL('zones', base)` resolve corretamente

4. **`packages/infra/src/nginx.service.ts` — escape de `$` no template literal:**
   - `$uri`, `$document_root`, `$fastcgi_script_name` eram interpretados como variáveis JS
   - Solução: `\${uri}`, `\$document_root`, `\$fastcgi_script_name`

5. **DTO validation:**
   - `CreateAccountDto` e `UpdateAccountDto`: `@IsUUID()` → `@IsString()`, `@IsEmail()` → `@Matches()` (para aceitar CUIDs e domínios)

### Containers Docker rodando (10/10)
- postgres, redis, mailhog, adminer, nginx, mariadb, postfix, dovecot, snappymail, powerdns
- Todos saudáveis por horas

### Provisionamento verificado
- ✅ Nginx vhost criado com conteúdo válido + document root + reload
- ✅ Zona DNS criada no PowerDNS com registros A, MX
- ✅ SnappyMail acessível em http://localhost:9001

### Problemas Conhecidos
- SnappyMail: precisa configurar admin (`/admin`) e criar domínio manualmente
- Postfix/Dovecot/SnappyMail stack não verificada end-to-end
- Sem testes (0% cobertura)

### Como iniciar
```bash
cd projects/serverpilot
npm run db:seed       # push schema + seed data
npm run dev           # turbo: sobe server-hq + site-panel
# Frontends precisam ser iniciados separadamente:
cd apps/admin && npx next dev -p 3000
cd apps/web && npx next dev -p 3003

# Infraestrutura Docker:
cd docker && podman compose up -d
```

### URLs e Credenciais

| Interface | URL | Usuário | Senha |
|-----------|-----|---------|-------|
| ServerHQ Admin | http://localhost:3000 | admin@serverpilot.local | admin123 |
| SitePanel (cliente) | http://localhost:3003 | client01 | client123 |
| API Admin | http://localhost:3001 | (JWT via /api/auth/login) | — |
| API Cliente | http://localhost:3002 | (JWT via /api/auth/login) | — |
| SnappyMail | http://localhost:9001 | (criar email account) | — |
| MailHog (SMTP debug) | http://localhost:8025 | — | — |
| Adminer (DB) | http://localhost:8080 | postgres/postgres | serverpilot |
| PowerDNS API | http://localhost:8081 | X-API-Key: pdns_api_key_dev | — |
| Nginx (sites) | http://localhost:8082 | — | — |

## Sessão Extra: Correções e Melhorias

### Bugs Corrigidos
1. **writeFile** (`docker-exec.service.ts`): heredoc `<< 'EOF'` com `\n` não virava newline dentro de `podman exec sh -c "..."` porque `JSON.stringify` convertia `\n` para literal. **Solução:** pipe via stdin com `execSync({ input })`.
2. **DnsService URL** (`dns.service.ts`): `new URL('/zones', baseComTrailingSlash)` com path iniciando em `/` substituía o path inteiro da base (ex: `/api/v1/servers/localhost` → `/zones`). **Solução:** remover `/` dos paths → `new URL('zones', base)`.
3. **Nginx template** (`nginx.service.ts`): `$uri`, `$document_root`, `$fastcgi_script_name` eram interpretados como variáveis JS no template literal. **Solução:** `\${uri}`, `\$document_root`.
4. **SnappyMail port** (`docker-compose.yml`): mapeado `9001:80` mas nginx interno escuta `8888`. **Solução:** `9001:8888`.
5. **DTO validation** (`create-account.dto.ts`, `update-account.dto.ts`): `@IsUUID()` e `@IsEmail()` quebravam com CUIDs/domínios. **Solução:** `@IsString()`, `@Matches()`.

### Funcionalidades Implementadas
1. **Subdomain provisioning** (`domain.service.ts`): ao criar subdomínio via SitePanel, cria automaticamente DNS A record + nginx vhost + diretório. Ao remover, limpa DNS + vhost.
2. **DNS + nginx retroativos** para seed data: criadas zonas DNS e vhosts nginx para `client01.com` e `client02.com` (incluindo subdomínios `blog`, `api`).
3. **Email create com domínio preenchido** (`email/page.tsx`): campo dividido `[user] @ [dominio]`, domínio vem do `localStorage('account')` e é read-only.
4. **Email edit quota/password** (`email/page.tsx`): botão "Edit Settings" no modal de detalhe, altera quota e/ou senha via `PUT /api/email/:id`.
5. **Admin detail com abas** (`accounts/page.tsx`): modal redesenhado com Overview (métricas + contadores), Email, Databases, Subdomains, DNS (PowerDNS).
6. **Endpoint `GET /accounts/:id/dns`**: server-hq consulta PowerDNS via `DnsService.listRecords()`.
7. **Scripts atualizados**: `start.sh` (init PDNS schema, provision seed, healthcheck), `stop.sh` (kills next dev + containers), `reset.sh` (clean all).

### Commits
| Hash | Mensagem |
|------|----------|
| `b22c01f` | fix: infra provisioning and doc clarification |
| `1e2ba66` | feat: subdomain provisioning with DNS + nginx |
| `293f1b4` | feat: pre-fill domain in email create form + edit quota/password |
| `9375e3c` | chore: update start/stop/reset scripts |
| `c3793ea` | feat: admin account detail with tabs |
| `e9a124d` | feat: add real server status endpoint with container monitoring |
| `3d4a2cf` | fix: improve start/stop scripts |
| `f652c97` | feat: add VPS installer, systemd services, and nginx proxy config |

## Sessão: 2026-07-17 (tarde)

### O Que Foi Feito

1. **Server Status real** — criado `ServerStatusService` em `packages/infra/` que consulta containers via podman + recursos do host via `/proc`. Endpoint `GET /api/server-status` no server-hq. Frontend atualizado de mock para API real. 8 serviços monitorados com status/versão/uptime.
2. **Correção start/stop scripts** — `start.sh`: pre-pull de imagens, `set +e`, provisioning com `ts-node`. `stop.sh`: usa `podman stop/rm` direto. `docker-compose.yml`: removido `depends_on` do postfix (causava travamento no podman-compose).
3. **VPS Installer** — `scripts/install-vps.sh`: instalação automatizada para Ubuntu/Debian com Node.js 20+, Podman, Nginx, PostgreSQL, Redis, systemd services, firewall, Let's Encrypt SSL, containers de infra.
4. **Deploy files** — `deploy/`: 4 systemd service files + nginx reverse proxy template com SSL.
5. **Documentação** — `docs/05-deploy-vps.md`: guia de instalação rápida e manual.

### Commits
| Hash | Mensagem |
|------|----------|
| `e9a124d` | feat: add real server status endpoint with container monitoring |
| `3d4a2cf` | fix: improve start/stop scripts |
| `f652c97` | feat: add VPS installer, systemd services, and nginx proxy config |
| `d9e26e8` | docs: add post-installation guide with SnappyMail and email stack setup |
| `(próximo)` | refactor: install-vps.sh with --analyze/--install modes, system checks |

## Sessão: 2026-07-17 (noite)

### O Que Foi Feito

1. **VPS Installer refatorado** — agora com dois modos:
   - `--analyze`: verifica requisitos (OS, memória, disco, pacotes, portas, domínios) sem instalar
   - `--install`: só instala (pula análise)
   - `./install-vps.sh` (padrão): análise + confirmação + instalação
2. **Análise completa** — verifica: Node ≥20, PostgreSQL, Redis, Podman rootful, portas livres, resolução DNS, espaço em disco, memória RAM
3. **Documentação pós-instalação** — `docs/06-pos-instalacao.md` com passo a passo do SnappyMail, stack de email, backup, checklist

### Commits
| Hash | Mensagem |
|------|----------|
| `d9e26e8` | docs: add post-installation guide with SnappyMail and email stack setup |
| `(próximo)` | refactor: install-vps.sh with --analyze/--install modes, system checks |

## Sessão: 2026-07-17 (noite) — Deploy VPS + Correções

### Estado Atual
- **Fase**: 4 (Deploy VPS funcional + instalador corrigido)
- **Branch**: `main`
- **Último commit**: `7b4cb6a`
- **VPS**: `51.161.73.164` (agiliza.host, Ubuntu 24.04, 4GB RAM)

### O Que Foi Feito

**Deploy VPS (agiliza.host):**
1. Instalação completa via `install-vps.sh` — clone, npm, prisma, seed, build, systemd, nginx, SSL, containers
2. DNS propagado (`admin.agiliza.host`, `painel.agiliza.host`, `webmail.agiliza.host` → 51.161.73.164)
3. SSL Let's Encrypt emitido com sucesso
4. 10 containers Podman rodando (nginx, mariadb, postfix, dovecot, snappymail, powerdns, adminer, mailhog, postgres, redis)
5. 4 systemd services ativos (server-hq, admin, site-panel, web)
6. Nginx configurado com reverse proxy + default server block (IP → redirect admin.agiliza.host)

**Correções no instalador (8 commits):**
1. **Git clone**: HTTPS com `GIT_TERMINAL_PROMPT=0` (repo público). Para repo privado, precisa de token.
2. **npm install**: Removeu `--omit=dev` — tailwindcss e outras devDeps são necessárias pro build.
3. **Prisma schema**: Provider fixado como `postgresql` (era `sqlite` com auto-detect frágil).
4. **Seed**: Agora lê `ADMIN_EMAIL`/`ADMIN_PASSWORD` do `.env` em vez de valores hardcoded.
5. **Systemd**: WorkingDirectory corrigido para cada app (`/opt/serverpilot/apps/admin`, etc.).
6. **Healthcheck**: Usa `ADMIN_EMAIL` do `.env` em vez de concatenar `admin@${DOMAIN_ADMIN}`.
7. **podman-compose**: Instalação automática via apt (quando disponível).
8. **Nginx template**: Adicionado `default_server` block para IP direto.

**Server Status — correções:**
1. `sudo podman` em vez de `podman` — o serviço roda como `serverpilot`, containers são root.
2. CPU lida de `/proc/stat` em vez de `podman stats` — stats matava containers!
3. Fallback para `systemctl is-active` quando container não encontrado (PostgreSQL e Redis rodam como serviço do sistema, não container).

### Problemas Conhecidos (pós-deploy)
1. **Repo privado**: Instalador precisa de `GITHUB_TOKEN` env var para clonar.
2. **Seed requer stdin**: Sem flag `--seed` o seed é pulado → sem admin → healthcheck falha.
3. **Domínios perguntados sempre**: Sem flag `--domains` o script não roda headless.
4. **Sudoers serverpilot**: Não configurado automaticamente pelo instalador (server-status precisa).
5. **Dual PostgreSQL**: Sistema e container competem pela porta 5432 — PowerDNS schema falha.
6. **JWT_SECRET compartilhado**: Admin e cliente usam mesma chave JWT — separação necessária.
7. **Server-status mostra uptime incorreto** para serviços systemd (formato de data não parseado).

### Commits desta sessão

| Hash | Mensagem |
|------|----------|
| `2e6b844` | fix: VPS installer fixes - git clone without prompts, prisma postgresql provider auto-detection, podman-compose auto-install, systemd WorkingDirectory per-app |
| `3cc4397` | fix: install-vps - remove --omit=dev (blocks tailwindcss build), move prisma provider fix after .env, use npx ts-node for seed |
| `8c8add8` | fix: schema.prisma provider default postgresql (remove fragile auto-detect) |
| `8581bf6` | feat: seed reads ADMIN_EMAIL/ADMIN_PASSWORD from env |
| `1b09810` | fix: installer healthcheck and summary use ADMIN_EMAIL from .env |
| `d18cd71` | fix: use sudo podman in ServerStatusService (serverpilot user lacks root container access) |
| `9b1ccb5` | fix: replace podman stats with /proc/stat CPU reading (podman stats was killing containers) |
| `7b4cb6a` | fix: server-status fallback to systemctl when container not found (postgresql, redis host services) |

### Gate
- typecheck: ✅ (sem erros)
- lint: ⚠️ falha pré-existente (ESLint não configurado em server-hq)
- test: ⚠️ falha pré-existente (site-panel sem testes implementados)
- build: ✅ (turbo build passa)

## Sessão: 2026-07-18 — Melhorias no Instalador + JWT Isolation + DNS Template Copy

### Estado Atual
- **Fase**: 5 (Instalador zero-touch + ADR-012 + deploy testado)
- **Branch**: `main`
- **Último commit**: `3aca229`
- **VPS**: `51.161.73.164` (agiliza.host, Ubuntu 24.04, 4GB RAM)

### O Que Foi Feito

**1. Instalador zero-touch (`scripts/install-vps.sh`):**
- Flags CLI: `--domain-admin`, `--domain-painel`, `--domain-webmail`, `--email`, `--seed`, `--yes`, `--token`
- `--seed`: seed não-interativo (sem stdin)
- `--yes`/`-y`: auto-confirma instalação
- `--token`: suporte a GITHUB_TOKEN para repo privado
- Sudoers NOPASSWD para `podman`, `systemctl`, `journalctl`
- `chown -R serverpilot:` após clone
- Ordem corrigida: clone (step 5) → useradd sem `-m` (step 6)
- DB sync: senha PostgreSQL sempre atualizada após geração do .env
- DB_PASS e ADMIN_PASS: `openssl rand -hex 16` (URL-safe, sem chars especiais)
- `python3-pip` adicionado aos pacotes do sistema
- `pip3 install podman-compose --break-system-packages` (Ubuntu 24.04 PEP 668)
- Prisma e seed com exit code checks (sem `2>/dev/null` silencioso)
- Healthcheck: 4 serviços + API admin + API painel
- UFW sem expor porta 5432 pública
- Banner ASCII art com blocos Unicode + créditos

**2. JWT Isolation (ADR-012):**
- `HQ_JWT_SECRET` → usado pelo admin API (ServerHQ)
- `PANEL_JWT_SECRET` → usado pelo client API (SitePanel)
- `audience: 'hq'` / `audience: 'panel'` nas claims JWT
- Fallback para `JWT_SECRET` antigo (compatibilidade dev)
- `.env.example` atualizado com ambas as variáveis

**3. DNS Template Copy:**
- `DnsService.copyZoneFromDomain(source, target)`: copia registros não-padrão de uma zona para outra
- `POST /dns/copy` no SitePanel (body: `{ sourceDomain, targetDomain }`)
- `templateDomain` opcional no `CreateAccountDto` do ServerHQ
- `provisionInfrastructure` usa `copyZoneFromDomain` quando template informado
- `DnsService` lê `PDNS_API_KEY` e `PDNS_API_URL` de env vars

**4. Problemas encontrados no deploy:**
| Problema | Causa | Fix |
|----------|-------|-----|
| Clone falha | `useradd -m` cria `/opt/serverpilot` com skel antes do clone | Clone antes do user, sem `-m` |
| Seed/Prisma fail | `openssl rand -base64` gera `/` e `+` na URL do PostgreSQL | `openssl rand -hex 16` |
| podman-compose ausente | pip bloqueado no Ubuntu 24.04 (PEP 668) | `--break-system-packages` + `python3-pip` |
| Erro silenciado | `2>/dev/null` no prisma escondia falhas | Removido |
| DB sync falho | Comparava hash `rolpassword` com senha texto | Agora sempre roda ALTER USER |

### Commits desta sessão

| Hash | Mensagem |
|------|----------|
| `cca0425` | feat: zero-touch install, JWT isolation (ADR-012), DNS template copy |
| `5344f5a` | fix: clone before user creation to avoid non-empty dir conflict |
| `68b97fc` | fix: remove 2>/dev/null from git clone to expose real error |
| `0b24d48` | fix: DB_PASS hex (URL-safe), python3-pip, podman-compose, prisma/seed error checks |
| `03cd677` | fix: ADMIN_PASS hex, DB sync always runs, remove stray fi |
| `4e96570` | feat: ASCII art banner with block characters |
| `242d838` | fix: correct ASCII art banner (SERVERPILOT in big font) |
| `572083a` | fix: block-character banner as requested |
| `1db2c76` | fix: uniform 2-space indent on all banner lines |
| `0610980` | fix: clean SERVERPILOT banner with figlet big font |
| `3aca229` | feat: block-character banner with credits |

### Próximos Passos
1. Testar instalação completa do zero no VPS (comando reset + install --seed --yes)
2. Configurar SnappyMail admin manualmente
3. Implementar virtual mailboxes em produção
4. Corrigir dual PostgreSQL (sistema vs container)
5. Adicionar testes
