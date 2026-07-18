# Guia de Instalação — ServerPilot

## Índice

1. [Pré-requisitos](#1-pré-requisitos)
2. [DNS](#2-dns)
3. [Instalação Rápida (1 comando)](#3-instalação-rápida-1-comando)
4. [Flags Disponíveis](#4-flags-disponíveis)
5. [Passo a Passo](#5-passo-a-passo)
6. [Acessando o Painel](#6-acessando-o-painel)
7. [Comandos de Gerenciamento](#7-comandos-de-gerenciamento)
8. [Atualização](#8-atualização)
9. [Reset (Limpar VPS)](#9-reset-limpar-vps)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Pré-requisitos

| Requisito | Mínimo | Recomendado |
|-----------|--------|-------------|
| SO | Ubuntu 22.04 / Debian 12 | Ubuntu 24.04 |
| RAM | 1 GB | 2 GB+ |
| Disco | 10 GB | 20 GB+ |
| Acesso | root (sudo) | root |
| Domínios | 3 subdomínios com A record | DNS já propagado |

---

## 2. DNS

Crie 3 registros A apontando para o IP da VPS:

```
admin.seuservidor.com   A → SEU_IP
painel.seuservidor.com  A → SEU_IP
webmail.seuservidor.com A → SEU_IP
```

> ⚠️ Aguarde a propagação (1-30 min) antes de instalar. SSL falha se o DNS não resolver.

**Verificar propagação:**

```bash
dig +short admin.seuservidor.com
# → deve mostrar o IP da VPS
```

---

## 3. Instalação Rápida (1 comando)

```bash
# Acesse a VPS como root
ssh root@SEU_IP

# Execute o bootstrap (modo interativo)
curl -fsSL https://raw.githubusercontent.com/felipefernandesdev/serverpilot/main/scripts/get-serverpilot.sh | bash
```

### Modo automático (sem perguntas)

```bash
curl -fsSL https://raw.githubusercontent.com/felipefernandesdev/serverpilot/main/scripts/get-serverpilot.sh | bash -s -- --yes
```

O bootstrap detecta o IP e hostname, sugere domínios `admin.seuhost.com`, `painel.seuhost.com`, `webmail.seuhost.com` e instala tudo automaticamente com `--seed --yes`.

### Chamar o instalador diretamente

```bash
# Análise apenas (não instala)
bash <(curl -fsSL https://raw.githubusercontent.com/felipefernandesdev/serverpilot/main/scripts/install-vps.sh) --analyze

# Instalação direta
bash <(curl -fsSL https://raw.githubusercontent.com/felipefernandesdev/serverpilot/main/scripts/install-vps.sh) \
  --domain-admin admin.seuservidor.com \
  --domain-painel painel.seuservidor.com \
  --domain-webmail webmail.seuservidor.com \
  --email admin@seuservidor.com \
  --seed --yes
```

---

## 4. Flags Disponíveis

### Bootstrap (`get-serverpilot.sh`)

| Flag | Efeito |
|------|--------|
| `--yes`, `-y`, `--force`, `-f` | Pula confirmações, usa defaults |

### Instalador (`install-vps.sh`)

| Flag | Efeito |
|------|--------|
| `--domain-admin` | Domínio do admin (ex: admin.meuservidor.com) |
| `--domain-painel` | Domínio do painel de cliente |
| `--domain-webmail` | Domínio do webmail |
| `--email` | Email para Let's Encrypt |
| `--seed` | Executa seed com dados de exemplo |
| `--yes`, `-y` | Confirma automaticamente |
| `--token` | GITHUB_TOKEN para repo privado |
| `--analyze` | Só analisa o sistema, não instala |
| `--install` | Pula análise, só instala |

### Reset (`reset-vps.sh`)

| Flag | Efeito |
|------|--------|
| `--force`, `-f`, `--yes`, `-y` | Pula confirmação |

---

## 5. Passo a Passo

O instalador executa 20 etapas:

| Step | O que faz |
|------|-----------|
| 1 | Instala nginx, ufw, podman, certbot, build-essential, python3-pip |
| 2 | Instala Node.js 20.x via Nodesource |
| 3 | Instala/ativa PostgreSQL, cria cluster se necessário |
| 4 | Instala/ativa Redis |
| 5 | Clona repositório em `/opt/serverpilot` |
| 6 | Cria usuário `serverpilot` + sudoers NOPASSWD |
| 7 | Instala podman-compose via pip |
| 8 | Gera `.env` com senhas aleatórias |
| 9 | Cria banco PostgreSQL + usuário `serverpilot` |
| 10 | `npm install` |
| 11 | `prisma generate` + `prisma db push` |
| 12 | Seed (dados de exemplo) |
| 13 | Build frontends Next.js |
| 14 | Cria systemd services |
| 15 | Configura nginx reverse proxy |
| 16 | Configura UFW (22, 80, 443) |
| 17 | Gera SSL via Let's Encrypt |
| 18 | Sobe containers (SnappyMail, PowerDNS) |
| 19 | Aplica schema PowerDNS no PostgreSQL |
| 20 | Verifica status + APIs |

---

## 6. Acessando o Painel

Após a instalação, as URLs e credenciais aparecem no banner final. Exemplo:

```
Admin (ServerHQ):  https://admin.seuservidor.com
Painel (SitePanel): https://painel.seuservidor.com
Webmail:           https://webmail.seuservidor.com

Admin:
  Email:    admin@seuservidor.com
  Senha:    d76e70a395418317deacdacb6ea85b7a

Cliente Teste:
  Usuário:  client01
  Senha:    client123
```

> Guarde a senha admin — ela só aparece uma vez no final da instalação.

### Login direto via API

```bash
# Admin API (porta 3001)
curl -X POST http://admin.seuservidor.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@seuservidor.com","password":"SUA_SENHA"}'

# Painel API (porta 3002)
curl -X POST http://painel.seuservidor.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"client01","password":"client123"}'
```

---

## 7. Comandos de Gerenciamento

### Serviços

```bash
# Status
systemctl status serverpilot-server-hq    # API Admin
systemctl status serverpilot-site-panel   # API Painel
systemctl status serverpilot-admin        # Frontend Admin
systemctl status serverpilot-web          # Frontend Painel
systemctl status postgresql               # Banco
systemctl status redis-server             # Cache
systemctl status nginx                    # Proxy

# Logs (tempo real)
journalctl -u serverpilot-server-hq -f
journalctl -u serverpilot-site-panel -f
journalctl -u serverpilot-admin -f
journalctl -u serverpilot-web -f
journalctl -u nginx -f

# Últimos logs
journalctl -u serverpilot-server-hq -n 50 --no-pager

# Reiniciar
systemctl restart serverpilot-server-hq
systemctl restart serverpilot-site-panel

# Parar/Iniciar
systemctl stop serverpilot-server-hq
systemctl start serverpilot-server-hq
```

### Containers

```bash
cd /opt/serverpilot/docker

# Status
podman ps -a

# Logs
podman logs serverpilot-snappymail
podman logs serverpilot-powerdns

# Reiniciar
podman compose restart

# Parar tudo
podman compose down

# Subir tudo
podman compose up -d
```

### Banco de Dados

```bash
# Acessar PostgreSQL
sudo -u postgres psql -d serverpilot

# Listar tabelas
sudo -u postgres psql -d serverpilot -c "\dt"

# Backup
sudo -u postgres pg_dump -d serverpilot > /root/backup-$(date +%Y%m%d).sql

# Restore
sudo -u postgres psql -d serverpilot < /root/backup.sql

# Redis
redis-cli ping  # testar conexão
redis-cli info  # estatísticas
```

---

## 8. Atualização

```bash
cd /opt/serverpilot
git pull
npm install
npx prisma generate
npx prisma db push            # se houver migration nova
cd apps/admin && npx next build && cd ../..
cd apps/web && npx next build && cd ../..
systemctl restart serverpilot-server-hq serverpilot-site-panel serverpilot-admin serverpilot-web
```

### Atualizar certificado SSL

```bash
certbot renew --nginx
```

---

## 9. Reset (Limpar VPS)

Remove tudo que foi instalado (nginx, postgresql, nodejs, podman, etc).

```bash
# Com confirmação
curl -fsSL https://raw.githubusercontent.com/felipefernandesdev/serverpilot/main/scripts/reset-vps.sh | bash

# Automático (sem confirmação)
curl -fsSL https://raw.githubusercontent.com/felipefernandesdev/serverpilot/main/scripts/reset-vps.sh | bash -s -- --force
```

O que é removido:
- Services systemd (`serverpilot-*`)
- Containers Podman + volumes
- Config nginx (serverpilot)
- Certificados SSL
- PostgreSQL + banco + usuário
- `/opt/serverpilot`
- Usuário `serverpilot`
- Regras UFW
- Pacotes (nginx, postgresql, redis, nodejs, podman, certbot, etc)

---

## 10. Troubleshooting

### PostgreSQL não inicia

```bash
# Verificar status
systemctl status postgresql
pg_isready

# Cluster ausente ou corrompido
pg_lsclusters
pg_dropcluster 16 main --stop
pg_createcluster 16 main --start
systemctl start postgresql
```

### API não responde

```bash
# Verificar logs
journalctl -u serverpilot-server-hq -n 30 --no-pager

# Verificar se a porta está ouvindo
ss -tlnp | grep 3001

# Verificar .env
cat /opt/serverpilot/.env | grep -v PASSWORD

# Testar conexão local
curl -v http://localhost:3001/api/server-status
```

### Nginx com erro

```bash
# Testar configuração
nginx -t

# Ver erro específico
journalctl -u nginx -n 20 --no-pager

# Logs de acesso
tail -f /var/log/nginx/access.log

# Logs de erro
tail -f /var/log/nginx/error.log
```

### SSL / Certbot rate limit

```
Mensagem: "too many certificates (5) already issued"
Solução: aguardar 24h para o rate limit resetar
```

Enquanto isso, use certificado auto-assinado:

```bash
mkdir -p /etc/nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/serverpilot.key \
  -out /etc/nginx/ssl/serverpilot.crt \
  -subj "/CN=admin.seuservidor.com"
```

Depois edite `/etc/nginx/sites-available/serverpilot` e adicione `listen 443 ssl` + caminho dos certificados. Depois:

```bash
nginx -t && systemctl reload nginx
```

### Podman compose exit 125

```bash
# Containers podem ter subido mesmo com erro
podman ps -a

# Logs do compose
podman compose logs

# Tentar subir manualmente
podman compose up -d --force-recreate
```

### Porta ocupada

```bash
# Descobrir quem está na porta
ss -tlnp | grep 3000

# Matar processo
kill -9 <PID>
```

### Esqueceu a senha admin

```bash
# Conectar no banco e resetar
sudo -u postgres psql -d serverpilot \
  -c "UPDATE users SET password_hash='\$2b\$10\$...' WHERE email='admin@seuservidor.com';"
```

Ou re-executar o seed (recria admin com nova senha):

```bash
cd /opt/serverpilot
ADMIN_EMAIL=admin@seuservidor.com npx ts-node --transpile-only prisma/seed.ts
```

### Reconfigurar domínios depois da instalação

```bash
# Editar nginx
nano /etc/nginx/sites-available/serverpilot
nginx -t && systemctl reload nginx

# Atualizar .env
nano /opt/serverpilot/.env
# Editar DOMAIN_ADMIN, DOMAIN_PAINEL, DOMAIN_WEBMAIL, CORS_ORIGIN

# Re-emitir SSL
certbot --nginx -d NOVO_DOMINIO

# Reiniciar APIs
systemctl restart serverpilot-server-hq serverpilot-site-panel
```
