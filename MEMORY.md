# ServerPilot — MEMORY

## Sessão: 2026-07-16

### Estado Atual
- **Fase**: 3 (Admin funcional + dark mode) / Infra Docker provisionando
- **Branch**: `main`
- **Último commit**: `db06d32` — fix: docker infra configs and PowerDNS DnsService

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
- Server Status page ainda mock
- Postfix/Dovecot/SnappyMail stack não verificada end-to-end
- Sem VPS deployment (rootful compose, TLS, systemd)
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
