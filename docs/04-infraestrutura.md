# Infraestrutura do ServerPilot

## Status Atual (Julho 2026)

O projeto é um **protótipo funcional** com UI completa e CRUD em banco de dados, mas **sem gerenciamento real de servidores**. Toda operação que deveria executar comandos no sistema (criar usuário Linux, configurar nginx, provisionar email) está comentada com `TODO`.

### O que é funcional hoje

| Camada | Status | Detalhes |
|--------|--------|----------|
| Autenticação (JWT) | ✅ | Login/logout, refresh token, bcrypt |
| Admin: Contas CRUD | ✅ | Cria/edita/suspende/deleta registros no banco |
| Admin: Pacotes CRUD | ✅ | Planos com limites de recursos |
| Admin: Server Status | ❌ Mock | Dados falsos, sem métrica real |
| Client: File Manager | ✅ | Opera no sistema de arquivos real |
| Client: Editor | ✅ | CodeMirror 6 com syntax highlight |
| Client: Site Preview | ✅ | Serve arquivos via JWT (API, não nginx) |
| Client: Email CRUD | ⚠️ Só banco | Cria contas no DB, sem SMTP/IMAP |
| Client: Database CRUD | ⚠️ Só banco | Cria registros, sem MySQL real |
| Client: Subdomains CRUD | ⚠️ Só banco | Cria registros, sem DNS real |

### O que não existe

- ❌ Servidor web (nginx/Apache) — sites não são servidos de verdade
- ❌ Servidor email (Postfix/Dovecot) — emails não são entregues
- ❌ Servidor DNS (PowerDNS) — domínios não resolvem
- ❌ Database real (MySQL/PostgreSQL para clientes)
- ❌ FTP
- ❌ SSL (LetsEncrypt)
- ❌ Métricas reais
- ❌ Process manager (systemd/supervisor)
- ❌ Instalador de produção
- ❌ Dockerfiles das aplicações
- ❌ CI/CD

---

## Arquitetura Alvo

### Docker como "Servidor Simulado"

Cada serviço de infraestrutura roda em um container Docker. O painel (NestJS) gerencia eles via:

1. **Volumes montados** → escreve/configura arquivos dos serviços
2. **Docker socket** → `docker exec` para reload/restart
3. **APIs HTTP** → serviços como PowerDNS têm API REST nativa

```
┌─────────────────────────────────────────────────────────┐
│                    docker-compose.yml                     │
├────────────┬───────────┬──────────┬──────────┬───────────┤
│  postgres  │   redis   │  nginx   │  postfix │  dovecot  │
│  :5432     │  :6379    │  :80/443 │  :25/587 │  :143/993 │
├────────────┼───────────┼──────────┼──────────┼───────────┤
│  mariadb   │ powerdns  │snappymail│ adminer  │  mailhog  │
│  :3307     │ :53/8081  │  :9001   │  :8080   │  :1025    │
└────────────┴───────────┴──────────┴──────────┴───────────┘
         ▲           ▲           ▲           ▲
         │           │           │           │
    ┌────┴───────────┴───────────┴───────────┴──────────┐
    │              apps/server-hq (NestJS)               │
    │     AccountsService + InfraService (via Docker)    │
    └────────────────────────┬──────────────────────────┘
                             │
    ┌────────────────────────┴──────────────────────────┐
    │              packages/infra/                       │
    │  NginxService  MailService  DnsService  DbService  │
    └────────────────────────────────────────────────────┘
```

### Serviços Docker Detalhados

#### 1. nginx (servidor web + proxy reverso)
- **Imagem:** `nginx:alpine`
- **Portas:** `80:80`, `443:443`
- **Volumes:**
  - `nginx_conf.d:/etc/nginx/conf.d/` — vhosts dos clientes
  - `nginx_html:/var/www/` — document roots
  - `letsencrypt:/etc/letsencrypt/` — SSL
- **Gerenciamento:** NestJS escreve arquivos `.conf` e executa `nginx -s reload`
- **Template de vhost:**
  ```nginx
  server {
      listen 80;
      server_name {{domain}} www.{{domain}};
      root /var/www/{{username}}/public_html;
      index index.html index.htm index.php;
  }
  ```

#### 2. postfix (SMTP)
- **Imagem:** `ubuntu/postfix:latest` ou `richarvey/nginx-php` com postfix
- **Portas:** `25:25`, `587:587`
- **Volumes:**
  - `postfix_config:/etc/postfix/`
  - `postfix_spool:/var/spool/postfix`
- **Banco de dados:** Mapas SQL consultam o banco PostgreSQL compartilhado para domínios virtuais e usuários
- **Entrega:** LMTP para dovecot na porta 24

#### 3. dovecot (IMAP/POP3)
- **Imagem:** `dovecot/dovecot:latest`
- **Portas:** `143:143`, `993:993`
- **Volumes:**
  - `dovecot_config:/etc/dovecot/`
  - `mail_data:/var/mail/` — Maildir de cada cliente
- **Autenticação:** SQL (consulta tabela `email_accounts` do Prisma)
  ```conf
  passdb {
    driver = sql
    args = /etc/dovecot/dovecot-sql.conf.ext
  }
  ```
- **Password scheme:** `BLF-CRYPT` (bcrypt compatível com hash do Prisma)

#### 4. snappymail (webmail)
- **Imagem:** `djmaze/snappymail:latest`
- **Porta:** `9001:80`
- **Volumes:**
  - `snappymail_data:/var/lib/snappymail` — config + dados
- **Configuração:** Auto-config via environment ou admin panel em `/admin/`
- **Conexão:** IMAP para container `dovecot:143`

#### 5. mariadb (banco de dados para clientes)
- **Imagem:** `mariadb:lts`
- **Porta:** `3307:3306` (porta diferente para não conflitar com MySQL local)
- **Volumes:**
  - `mariadb_data:/var/lib/mysql`
- **Gerenciamento:** NestJS executa `mysql -h mariadb -u root -p"$PASS" -e "CREATE DATABASE ..."`

#### 6. powerdns (DNS)
- **Imagem:** `powerdns/pdns-auth-49:latest`
- **Portas:** `53:53/tcp`, `53:53/udp`, `8081:8081` (API)
- **Banco de dados:** PostgreSQL compartilhado
- **API Key:** `PDNS_API_KEY` — NestJS usa para criar/remover zonas e registros
- **API REST:**
  ```bash
  # Criar zona
  curl -X POST http://localhost:8081/api/v1/servers/localhost/zones \
    -H "X-API-Key: $KEY" \
    -d '{"name":"client01.com.","kind":"Native","nameservers":["ns1.serverpilot.local."]}'
  ```

---

## packages/infra/ — Implementação

### Estrutura

```
packages/infra/src/
├── index.ts                    # Barrel export
├── nginx.service.ts            # Gerenciamento de vhosts
├── postfix.service.ts          # Gerenciamento de domínios de email
├── dovecot.service.ts          # Gerenciamento de contas IMAP
├── dns.service.ts              # Gerenciamento de zonas DNS (PowerDNS API)
├── database.service.ts         # Provisionamento de MySQL/MariaDB
└── docker-exec.service.ts      # Utilitário para executar comandos em containers
```

### Interfaces (seguindo o `ServerService` do `use-cases`)

```typescript
export interface ServerService {
  createLinuxUser(username: string, password: string): Promise<void>;
  createDirectory(path: string): Promise<void>;
  createVirtualHost(username: string, domain: string): Promise<void>;
  deleteLinuxUser(username: string): Promise<void>;
  deleteDirectory(path: string): Promise<void>;
  deleteVirtualHost(username: string): Promise<void>;
}
```

### Implementação: DockerExecService

Utilitário central que executa comandos dentro dos containers:

```typescript
class DockerExecService {
  async exec(container: string, cmd: string): Promise<string> {
    const full = `docker exec ${container} sh -c ${escape(cmd)}`;
    const { stdout } = await execAsync(full);
    return stdout;
  }
}
```

### NginxService

```typescript
class NginxService {
  async createVhost(username: string, domain: string): Promise<void> {
    const config = this.renderTemplate(username, domain);
    await fs.writeFile(`/srv/docker/nginx/conf.d/${username}.conf`, config);
    await this.dockerExec.exec('serverpilot-nginx', 'nginx -s reload');
  }
}
```

### MailService (Postfix + Dovecot)

```typescript
class MailService {
  async createMailDomain(domain: string): Promise<void> {
    // 1. Adiciona domínio ao Postfix (virtual_mailbox_domains)
    await this.postfixService.addDomain(domain);
    // 2. Cria diretório Maildir no volume do Dovecot
    await this.dockerExec.exec('serverpilot-dovecot',
      `mkdir -p /var/mail/${domain}`);
    // 3. Recarrega Postfix
    await this.dockerExec.exec('serverpilot-postfix', 'postfix reload');
    // 4. A autenticação das contas de email é feita via SQL
    //    (Dovecot lê da tabela email_accounts do Prisma)
  }
}
```

### DnsService

```typescript
class DnsService {
  private api = 'http://localhost:8081/api/v1/servers/localhost';

  async createZone(domain: string): Promise<void> {
    await fetch(`${this.api}/zones`, {
      method: 'POST',
      headers: { 'X-API-Key': process.env.PDNS_API_KEY },
      body: JSON.stringify({
        name: `${domain}.`,
        kind: 'Native',
        nameservers: ['ns1.serverpilot.local.'],
      }),
    });
  }

  async addRecord(zone: string, name: string, type: string, content: string) {
    await fetch(`${this.api}/zones/${zone}.`, {
      method: 'PATCH',
      headers: { 'X-API-Key': process.env.PDNS_API_KEY },
      body: JSON.stringify({
        rrsets: [{
          name: `${name}.${zone}.`,
          type,
          ttl: 3600,
          records: [{ content, disabled: false }],
        }],
      }),
    });
  }
}
```

## Integração com o Ciclo de Vida da Conta

### Criar Conta (antes vs depois)

```typescript
// ANTES: só banco de dados
async create(dto) {
  const account = await this.prisma.account.create({ ... });
  // TODO: server commands (comentado)
  return account;
}

// DEPOIS: banco + infraestrutura real
async create(dto) {
  const account = await this.prisma.account.create({ ... });

  await Promise.all([
    this.serverService.createLinuxUser(dto.username, dto.password),
    this.serverService.createDirectory(
      path.join(SERVERPILOT_DATA_DIR, dto.username, 'public_html')
    ),
    this.serverService.createVirtualHost(dto.username, dto.domain),
    this.mailService.createMailDomain(dto.domain),
    this.dnsService.createZone(dto.domain),
    this.dnsService.addRecord(dto.domain, 'www', 'A', '127.0.0.1'),
    this.dnsService.addRecord(dto.domain, '@', 'MX', '10 mail.' + dto.domain),
  ]);

  return account;
}
```

### Deletar Conta

```typescript
async remove(id) {
  const account = await this.findById(id);
  await Promise.all([
    this.serverService.deleteVirtualHost(account.username),
    this.serverService.deleteLinuxUser(account.username),
    this.serverService.deleteDirectory(account.documentRoot),
    this.mailService.deleteMailDomain(account.domain),
    this.dnsService.deleteZone(account.domain),
  ]);
  await this.prisma.account.delete({ where: { id } });
}
```

---

## Funcionalidades no Painel do Cliente

### 1. Webmail
- Botão "Webmail" no dashboard + sidebar
- Abre SnappyMail em nova aba (`http://localhost:9001`)
- Cliente loga com as mesmas credenciais de email

### 2. Site URL Real
- Modal "View Site" mostra:
  - "Preview Local" → `/api/site/preview?token=xxx`
  - "Open Domain" → `http://client01.com` (se DNS configurado)

### 3. Gerenciamento de DNS (Admin + Client)
- Página de DNS Zones com registros (A, AAAA, CNAME, MX, TXT)
- CRUD completo via PowerDNS API

### 4. Informações de Database
- Ao criar database, mostra string de conexão real:
  ```
  Host: localhost
  Port: 3307
  Database: client01_wp
  User: client01_user
  Password: ******
  ```

---

## Plano de Implementação

### Fase 1: Infra Docker (dia 1)
- [x] docker-compose.yml base (postgres, redis, mailhog, adminer)
- [ ] Adicionar nginx + mariadb + postfix + dovecot + snappymail + powerdns
- [ ] Scripts de inicialização dos containers
- [ ] Volumes e redes compartilhadas

### Fase 2: packages/infra/ (dia 1-2)
- [ ] DockerExecService — utilitário de execução em containers
- [ ] NginxService — criar/deletar vhosts
- [ ] MailService — domínios Postfix + contas Dovecot
- [ ] DnsService — zonas PowerDNS via API
- [ ] DatabaseService — provisionamento MariaDB

### Fase 3: Ciclo de Vida (dia 2)
- [ ] Integrar ServerService no AccountsService (server-hq)
- [ ] Criar conta → provisionar tudo
- [ ] Deletar conta → limpar tudo
- [ ] Suspender/reativar → nginx disable/enable

### Fase 4: Frontend (dia 2-3)
- [ ] Botão Webmail no dashboard + sidebar
- [ ] Página de DNS management
- [ ] Strings de conexão reais nos databases
- [ ] Indicadores de serviço no server status

### Fase 5: Polish (dia 3)
- [ ] Atualizar seed data para provisionar client01 + client02
- [ ] Testes de fluxo completo
- [ ] Documentação atualizada
- [ ] start.sh atualizado
