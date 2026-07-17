# Pós-instalação — Configurações Manuais

O instalador VPS (`scripts/install-vps.sh`) automatiza toda a infraestrutura, mas alguns serviços exigem configuração manual única.

## 1. SnappyMail (Webmail)

O SnappyMail exige configuração inicial via navegador na primeira execução.

### Passo a passo

1. Acesse `https://webmail.seuservidor.com/` (ou `http://localhost:9001` em dev)
2. Você será redirecionado para `/admin/` — setup inicial
3. Defina uma **senha de admin** (guarde em cofre)
4. Na tela de configuração de domínio:
   - **IMAP:** `dovecot` (ou IP do host) — porta `143` — sem SSL — `NORMAL` auth
   - **SMTP:** `postfix` (ou IP do host) — porta `587` — sem SSL — `NORMAL` auth
   - **SMTP auth:** habilitado (mesmo usuário/senha do IMAP)
5. Salve e pronto

> **Nota:** Em produção com SSL, use porta `993` (IMAPS) e `587` com STARTTLS.

### Testar webmail

1. Crie uma conta de email no Admin: `http://admin.seuservidor.com/` > Account > Email tab > Add Email
2. Acesse `https://webmail.seuservidor.com/` e faça login com `email@dominio` e a senha definida no admin

---

## 2. Stack de Email (Postfix + Dovecot)

### Arquitetura Atual

```
                     ┌──────────┐
  Cliente Email ────►│ Postfix  │──(SMTP)──► MailHog (dev)
  (porta 25/587)     └────┬─────┘           ┌──────────┐
                          │ (LMTP)          │ MailHog  │
                          ▼                 │ Web UI   │
                     ┌──────────┐           │ :8025    │
  Cliente IMAP ────►│ Dovecot  │           └──────────┘
  (porta 143/993)    └──────────┘
```

### Em desenvolvimento (local)

- Todo email enviado via Postfix é capturado pelo **MailHog** (porta `:8025` — UI web)
- Nenhum email é entregue de verdade — ideal para dev/test
- Dovecot serve IMAP para contas criadas via admin, mas sem entrega real de email

### Em produção (VPS)

Para entrega real de email, é necessário:

#### a) Postfix + PostgreSQL (virtual mailboxes)

O container `catatnight/postfix` atual é um relay simples. Para produção com domínios virtuais:

1. Substituir a imagem Postfix por uma com suporte a SQL, ou configurar o container com volumes de config:
   ```yaml
   postfix:
     image: docker.io/catatnight/postfix:latest
     volumes:
       - ./postfix/sql-virtual.cf:/etc/postfix/sql-virtual.cf:ro
       - ./postfix/main.cf:/etc/postfix/main.cf:ro
   ```

2. Criar `postfix/sql-virtual.cf` apontando para o PostgreSQL:
   ```
   user = serverpilot
   password = (senha do .env)
   dbname = serverpilot
   query = SELECT domain FROM accounts WHERE domain='%s' AND is_active=true
   hosts = host.containers.internal
   ```

3. Configurar `main.cf` com:
   ```
   virtual_mailbox_domains = pgsql:/etc/postfix/sql-domains.cf
   virtual_mailbox_maps = pgsql:/etc/postfix/sql-mailboxes.cf
   virtual_transport = lmtp:dovecot:24
   ```

#### b) Dovecot + LMTP

O Dovecot já está configurado com SQL auth (arquivos em `docker/dovecot/`). Para receber entrega via LMTP:

1. Adicionar `protocol lmtp` ao `local.conf`:
   ```
   protocol lmtp {
     mail_driver = maildir
     mail_path = /srv/mail/%{user|domain}/%{user|username}
   }
   ```

2. Expor porta LMTP no container (24):
   ```yaml
   dovecot:
     ports:
       - '24:24'  # LMTP
   ```

#### c) Esquema de senha (bcrypt)

O Prisma armazena hashes bcrypt (`$2b$...`). O Dovecot com `BLF-CRYPT` lê diretamente da tabela `email_accounts.password`. Ambos são compatíveis.

#### d) Teste de envio

```bash
# Via container Postfix
podman exec serverpilot-postfix sendmail test@example.com <<< "Subject: Test
From: user@seudominio.com
To: test@example.com

Corpo do email"
```

Verificar entrega no MailHog: http://localhost:8025

---

## 3. DNS (PowerDNS)

O instalador já cria as zonas DNS no PowerDNS via API. Verificar:

```bash
# Listar zonas
curl -s http://localhost:8081/api/v1/servers/localhost/zones \
  -H "X-API-Key: $(grep PDNS_API_KEY /opt/serverpilot/.env | cut -d= -f2)"
```

Se as zonas não foram criadas (erro no provisionamento):
```bash
cd /opt/serverpilot
npx ts-node -r tsconfig-paths/register -e "
const { DnsService } = require('@serverpilot/infra');
const d = new DnsService();
d.createZone('admin.seudominio.com').then(console.log).catch(console.error);
"
```

---

## 4. Verificação de Saúde

### Testar API Admin
```bash
curl -s https://admin.seuservidor.com/api/server-status \
  -H "Authorization: Bearer $(curl -s https://admin.seuservidor.com/api/auth/login -X POST \
    -H 'Content-Type: application/json' \
    -d '{"email":"admin@admin.seuservidor.com","password":"<senha>"}' | \
    python3 -c 'import sys,json; print(json.load(sys.stdin)[\"accessToken\"])')"
```

### Verificar containers
```bash
podman ps
```

### Verificar logs
```bash
journalctl -u serverpilot-server-hq -n 30 --no-pager
journalctl -u serverpilot-admin -n 30 --no-pager
```

---

## 5. Backup

### Banco de dados
```bash
pg_dump -U serverpilot serverpilot > /backup/serverpilot-$(date +%Y%m%d).sql
```

### Arquivos dos clientes
```bash
tar czf /backup/serverpilot-data-$(date +%Y%m%d).tar.gz \
  /opt/serverpilot/data \
  /opt/serverpilot/docker/volumes
```

### Cron de backup sugerido
```bash
# /etc/cron.d/serverpilot-backup
0 3 * * * root pg_dump -U serverpilot serverpilot > /backup/daily/serverpilot-$(date +\%Y\%m\%d).sql && find /backup/daily -mtime +30 -delete
```

---

## 6. Checklist Pós-instalação

- [ ] Acessar Admin e fazer login
- [ ] Acessar Server Status e verificar serviços online
- [ ] Configurar SnappyMail admin
- [ ] Criar conta de email de teste
- [ ] Testar webmail (login no SnappyMail)
- [ ] Verificar DNS (PowerDNS API)
- [ ] Configurar SSL se falhou no instalador: `certbot --nginx`
- [ ] Alterar senha do admin
- [ ] Configurar backups
- [ ] Testar backup/restore
