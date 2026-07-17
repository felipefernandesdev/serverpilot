# Deploy em VPS — ServerPilot

## Pré-requisitos

- Ubuntu 22.04+ ou Debian 12+
- Domínios apontados para o IP da VPS (A records):
  - `admin.seuservidor.com` → ServerHQ
  - `painel.seuservidor.com` → SitePanel
  - `webmail.seuservidor.com` → SnappyMail
- Acesso root à VPS

## Instalação Rápida

```bash
# Como root
bash <(curl -fsSL https://raw.githubusercontent.com/felipefernandesdev/serverpilot/main/scripts/install-vps.sh)
```

O instalador faz tudo automaticamente:
1. Instala Node.js 20+, Podman, Nginx, PostgreSQL, Redis, Certbot
2. Cria usuário `serverpilot`
3. Clona o repositório em `/opt/serverpilot`
4. Gera `.env` com senhas aleatórias
5. Configura banco de dados PostgreSQL
6. Instala dependências e faz build
7. Cria systemd services para cada app
8. Configura Nginx como reverse proxy (HTTP →每家 porta interna)
9. Configura firewall (UFW)
10. Gera certificados SSL via Let's Encrypt
11. Sobe containers de infraestrutura (nginx, mariadb, postfix, etc.)

## Instalação Manual

### 1. Dependências

```bash
apt update && apt install -y curl gnupg ca-certificates nginx ufw certbot python3-certbot-nginx podman build-essential git

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# PostgreSQL + Redis
apt install -y postgresql postgresql-client redis-server
systemctl enable --now postgresql redis-server
```

### 2. Clonar e configurar

```bash
git clone https://github.com/felipefernandesdev/serverpilot.git /opt/serverpilot
cd /opt/serverpilot

# Criar usuário dedicado
useradd -m -s /bin/bash -d /opt/serverpilot serverpilot

# Gerar .env
cp .env.example .env
# Editar .env com senhas fortes
nano .env
```

### 3. Banco de dados

```bash
sudo -u postgres psql -c "CREATE USER serverpilot WITH PASSWORD '$(grep DATABASE_URL .env | sed 's/.*:\(.*\)@.*/\1/')';"
sudo -u postgres psql -c "CREATE DATABASE serverpilot OWNER serverpilot;"
```

### 4. Dependências npm + Build

```bash
npm install
npx prisma generate
npx prisma db push
npm run db:seed          # dados de exemplo

# Build dos frontends Next.js
cd apps/admin && npx next build && cd ../..
cd apps/web && npx next build && cd ../..
```

### 5. Systemd services

```bash
for svc in deploy/serverpilot-*.service; do
  cp "$svc" /etc/systemd/system/
done
systemctl daemon-reload

for svc in serverpilot-server-hq serverpilot-admin serverpilot-site-panel serverpilot-web; do
  systemctl enable --now "$svc"
done
```

### 6. Nginx Reverse Proxy

```bash
cp deploy/nginx-serverpilot.conf /etc/nginx/sites-available/serverpilot
# Editar domínios
nano /etc/nginx/sites-available/serverpilot
ln -s /etc/nginx/sites-available/serverpilot /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

### 7. SSL

```bash
certbot --nginx -d admin.seuservidor.com -d painel.seuservidor.com -d webmail.seuservidor.com
```

### 8. Infraestrutura (containers)

```bash
cd /opt/serverpilot/docker
podman compose up -d
```

### 9. Firewall

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw enable
```

## Arquitetura de Produção

```
                       Internet
                          │
                    ┌─────┴─────┐
                    │   Nginx    │  :80 / :443  ← Let's Encrypt
                    │  (proxy)   │
                    └─────┬─────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
    ┌─────┴─────┐   ┌────┴────┐   ┌──────┴──────┐
    │  :3000     │   │ :3003   │   │  :9001      │
    │  Admin     │   │ Painel  │   │ SnappyMail  │
    │  (Next.js) │   │(Next.js)│   │ (Container) │
    └─────┬─────┘   └────┬────┘   └─────────────┘
          │               │
    ┌─────┴─────┐   ┌────┴────┐
    │  :3001     │   │ :3002   │
    │ server-hq  │   │site-panel
    │ (NestJS)   │   │(NestJS) │
    └─────┬─────┘   └────┬────┘
          │               │
    ┌─────┴───────────────┴─────┐
    │      PostgreSQL + Redis    │
    └────────────────────────────┘
```

## Comandos Úteis

```bash
# Logs
journalctl -u serverpilot-server-hq -f
journalctl -u serverpilot-admin -f

# Status
systemctl status serverpilot-server-hq
systemctl status serverpilot-admin

# Reiniciar serviço
systemctl restart serverpilot-server-hq

# Atualizar código
cd /opt/serverpilot
git pull
npm install
npx prisma generate
cd apps/admin && npx next build && cd ../..
cd apps/web && npx next build && cd ../..
systemctl restart serverpilot-server-hq serverpilot-site-panel serverpilot-admin serverpilot-web
```

## Pós-instalação

Após a instalação, alguns serviços exigem configuração manual:

1. **SnappyMail** — acessar `https://webmail.seuservidor.com/` e configurar admin + IMAP/SMTP
2. **Stack de email** — Postfix atual é um relay simples; para produção com entrega real, ver `docs/06-pos-instalacao.md`
3. **Testar tudo** — ver checklist em `docs/06-pos-instalacao.md#6-checklist-pós-instalação`

## Troubleshooting

### API não sobe
```bash
journalctl -u serverpilot-server-hq -n 50 --no-pager
# Verificar .env
# Verificar PostgreSQL: systemctl status postgresql
```

### Porta 3000 já em uso
```bash
ss -tlnp | grep 3000
# Mata processo: kill -9 <PID>
```

### SSL expirou
```bash
certbot renew --nginx
```

### Containers não sobem
```bash
cd /opt/serverpilot/docker
podman compose logs
podman compose up -d
```
