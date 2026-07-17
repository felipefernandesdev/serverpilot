#!/bin/bash
#==============================================================================
# ServerPilot - VPS Installer
#   Ubuntu 22.04+ / Debian 12+
#   Instala: Node.js 20+, Podman, Nginx, PostgreSQL, Redis, Let's Encrypt
#   Configura: systemd services, firewall, reverse proxy, SSL
#==============================================================================
set -euo pipefail

# ── Cores ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'
info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()   { echo -e "${RED}[ERRO]${NC} $1"; }

# ── Configurações (editáveis) ─────────────────────────────────────────────
REPO_URL="git@github.com:felipefernandesdev/serverpilot.git"
REPO_BRANCH="main"
INSTALL_DIR="/opt/serverpilot"
SERVERPILOT_USER="serverpilot"
SERVERPILOT_GROUP="serverpilot"
DOMAIN_ADMIN=""    # ex: admin.meuservidor.com
DOMAIN_PAINEL=""   # ex: painel.meuservidor.com
DOMAIN_WEBMAIL=""  # ex: webmail.meuservidor.com
SSL_EMAIL=""       # ex: admin@meuservidor.com

# ── Verificação de root ───────────────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
  err "Execute como root: sudo bash scripts/install-vps.sh"
  exit 1
fi

# ── Banner ────────────────────────────────────────────────────────────────
cat << 'EOF'
╔══════════════════════════════════════════════════════════════╗
║                   ServerPilot VPS Installer                  ║
║         Painel de hospedagem web — Ubuntu/Debian             ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo ""

# ── Coleta de variáveis ──────────────────────────────────────────────────
read -rp "Domínio do Admin (ex: admin.meuservidor.com): " DOMAIN_ADMIN
read -rp "Domínio do Painel (ex: painel.meuservidor.com): " DOMAIN_PAINEL
read -rp "Domínio do Webmail (ex: webmail.meuservidor.com): " DOMAIN_WEBMAIL
read -rp "Email para Let's Encrypt: " SSL_EMAIL

# ── 1. System packages ─────────────────────────────────────────────────---
info "Instalando pacotes do sistema..."
apt-get update -qq
apt-get install -y -qq \
  curl wget gnupg ca-certificates \
  nginx ufw certbot python3-certbot-nginx \
  podman build-essential git
ok "Pacotes instalados"

# ── 2. Node.js 20.x ──────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  info "Instalando Node.js 20.x..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi
ok "Node.js $(node -v) / npm $(npm -v)"

# ── 3. PostgreSQL ─────────────────────────────────────────────────────────
if ! command -v psql &>/dev/null; then
  info "Instalando PostgreSQL..."
  apt-get install -y -qq postgresql postgresql-client
  systemctl enable --now postgresql
fi
ok "PostgreSQL $(psql --version 2>&1 | head -1)"

# ── 4. Redis ──────────────────────────────────────────────────────────────
if ! command -v redis-server &>/dev/null; then
  info "Instalando Redis..."
  apt-get install -y -qq redis-server
  systemctl enable --now redis-server
fi
ok "Redis $(redis-server --version 2>&1 | head -1)"

# ── 5. Usuário system ────────────────────────────────────────────────────
if ! id -u "$SERVERPILOT_USER" &>/dev/null; then
  info "Criando usuário $SERVERPILOT_USER..."
  useradd -m -s /bin/bash -d "$INSTALL_DIR" "$SERVERPILOT_USER"
  usermod -aG "$SERVERPILOT_USER" "$SERVERPILOT_USER"
fi
ok "Usuário $SERVERPILOT_USER"

# ── 6. Clonar / sincronizar projeto ─────────────────────────────────────
if [ -d "$INSTALL_DIR/.git" ]; then
  info "Projeto já existe, atualizando..."
  cd "$INSTALL_DIR"
  git fetch origin
  git checkout "$REPO_BRANCH"
  git pull origin "$REPO_BRANCH"
else
  info "Clonando repositório..."
  # Tenta SSH, depois fallback HTTPS
  git clone --branch "$REPO_BRANCH" "$REPO_URL" "$INSTALL_DIR" 2>/dev/null || \
  git clone --branch "$REPO_BRANCH" "https://github.com/felipefernandesdev/serverpilot.git" "$INSTALL_DIR"
fi
cd "$INSTALL_DIR"
ok "Projeto sincronizado"

# ── 7. .env ──────────────────────────────────────────────────────────────
if [ ! -f "$INSTALL_DIR/.env" ]; then
  info "Gerando .env com senhas aleatórias..."
  JWT_SECRET=$(openssl rand -base64 48)
  JWT_REFRESH_SECRET=$(openssl rand -base64 48)
  ADMIN_PASS=$(openssl rand -base64 16)
  DB_PASS=$(openssl rand -base64 16)

  cat > "$INSTALL_DIR/.env" << ENVEOF
# Database (PostgreSQL local)
DATABASE_URL="postgresql://serverpilot:${DB_PASS}@localhost:5432/serverpilot?schema=public"

# JWT
JWT_SECRET="${JWT_SECRET}"
JWT_EXPIRATION="15m"
JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET}"
JWT_REFRESH_EXPIRATION="7d"

# Server
PORT=3001
NODE_ENV=production

# ServerPilot Admin
ADMIN_EMAIL="admin@${DOMAIN_ADMIN}"
ADMIN_PASSWORD="${ADMIN_PASS}"

# PowerDNS
PDNS_API_KEY="pdns_$(openssl rand -hex 16)"

# SSL
LETSENCRYPT_EMAIL="${SSL_EMAIL}"

# DNS
DNS_NAMESERVERS="ns1.${DOMAIN_ADMIN#admin.},ns2.${DOMAIN_ADMIN#admin.}"

# CORS
CORS_ORIGIN="https://${DOMAIN_ADMIN},https://${DOMAIN_PAINEL}"
ENVEOF

  chown "$SERVERPILOT_USER:" "$INSTALL_DIR/.env"
  chmod 600 "$INSTALL_DIR/.env"
  ok ".env gerado"
else
  warn ".env já existe, mantendo atual"
fi

# ── 8. Banco de dados PostgreSQL ─────────────────────────────────────────
info "Configurando PostgreSQL..."
DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='serverpilot'" 2>/dev/null || echo "0")
if [ "$DB_EXISTS" != "1" ]; then
  source "$INSTALL_DIR/.env"
  DB_PASS_EXTRACTED=$(grep DATABASE_URL "$INSTALL_DIR/.env" | sed "s/.*:\(.*\)@.*/\1/")

  sudo -u postgres psql -c "CREATE USER serverpilot WITH PASSWORD '${DB_PASS_EXTRACTED}';" 2>/dev/null
  sudo -u postgres psql -c "CREATE DATABASE serverpilot OWNER serverpilot;" 2>/dev/null
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE serverpilot TO serverpilot;" 2>/dev/null
  ok "Banco de dados criado"
else
  ok "Banco de dados já existe"
fi

# ── 9. Instalar dependências npm ─────────────────────────────────────────
info "Instalando dependências npm..."
cd "$INSTALL_DIR"
npm install --omit=dev 2>&1 | tail -5
ok "Dependências instaladas"

# ── 10. Gerar Prisma Client ──────────────────────────────────────────────
info "Gerando Prisma Client..."
npx prisma generate 2>/dev/null
npx prisma db push 2>/dev/null
ok "Prisma Client gerado + schema aplicado"

# ── 11. Seed (opcional, pergunta) ────────────────────────────────────────
read -rp "Executar seed de dados? (s/N): " DO_SEED
if [[ "$DO_SEED" =~ ^[Ss]$ ]]; then
  info "Executando seed..."
  npm run db:seed 2>&1 | tail -10
  ok "Seed concluído"
fi

# ── 12. Build frontends ──────────────────────────────────────────────────
info "Fazendo build dos frontends Next.js..."
cd "$INSTALL_DIR/apps/admin"
npx next build 2>&1 | tail -5
cd "$INSTALL_DIR/apps/web"
npx next build 2>&1 | tail -5
cd "$INSTALL_DIR"
ok "Frontends compilados"

# ── 13. Systemd services ─────────────────────────────────────────────────
info "Instalando systemd services..."
for svc in serverpilot-server-hq serverpilot-site-panel serverpilot-admin serverpilot-web; do
  cp "$INSTALL_DIR/deploy/${svc}.service" "/etc/systemd/system/${svc}.service"
  chmod 644 "/etc/systemd/system/${svc}.service"
done
systemctl daemon-reload

# Ativar e iniciar
for svc in serverpilot-server-hq serverpilot-admin serverpilot-site-panel serverpilot-web; do
  systemctl enable "$svc"
  systemctl start "$svc" || warn "Falha ao iniciar $svc — verifique: journalctl -u $svc -n 20"
done
ok "Systemd services ativos"

# ── 14. Nginx reverse proxy ──────────────────────────────────────────────
info "Configurando Nginx..."
# Substituir placeholders no template
sed "s/admin\.seuservidor\.com/$DOMAIN_ADMIN/g; s/painel\.seuservidor\.com/$DOMAIN_PAINEL/g; s/webmail\.seuservidor\.com/$DOMAIN_WEBMAIL/g" \
  "$INSTALL_DIR/deploy/nginx-serverpilot.conf" > "/etc/nginx/sites-available/serverpilot"

if [ ! -L "/etc/nginx/sites-enabled/serverpilot" ]; then
  ln -s "/etc/nginx/sites-available/serverpilot" "/etc/nginx/sites-enabled/"
fi
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx
ok "Nginx configurado"

# ── 15. Firewall ──────────────────────────────────────────────────────────
info "Configurando firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw allow 5432/tcp comment 'PostgreSQL'
ufw --force enable
ok "Firewall configurado"

# ── 16. SSL Let's Encrypt ────────────────────────────────────────────────
info "Solicitando certificados SSL..."
certbot --nginx -d "$DOMAIN_ADMIN" -d "$DOMAIN_PAINEL" -d "$DOMAIN_WEBMAIL" \
  --non-interactive --agree-tos --email "$SSL_EMAIL" || warn "SSL falhou — rode manualmente: certbot --nginx"
ok "SSL configurado"

# ── 17. Containers Docker/Podman (infra dos clients) ─────────────────────
info "Subindo containers de infraestrutura..."
cd "$INSTALL_DIR/docker"
podman compose up -d 2>&1 || warn "Falha ao subir containers — rode manualmente: cd $INSTALL_DIR/docker && podman compose up -d"
cd "$INSTALL_DIR"
ok "Containers iniciados"

# ── 17b. Inicializar PowerDNS schema ─────────────────────────────────────
info "Inicializando PowerDNS schema..."
podman exec -i serverpilot-postgres psql -U serverpilot -d serverpilot < "$INSTALL_DIR/docker/powerdns/schema.pgsql.sql" 2>/dev/null && \
  ok "PowerDNS schema criado" || warn "PowerDNS schema já existe"

# ── 18. Healthcheck ───────────────────────────────────────────────────────
info "Verificando serviços..."
sleep 5
for svc in serverpilot-server-hq serverpilot-admin; do
  if systemctl is-active --quiet "$svc"; then
    ok "$svc: ativo"
  else
    warn "$svc: inativo — journalctl -u $svc -n 30"
  fi
done

# Testar API
curl -sf http://127.0.0.1:3001/api/auth/login -X POST \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@'"$DOMAIN_ADMIN"'","password":"'"$ADMIN_PASS"'"}' > /dev/null \
  && ok "API respondendo" || warn "API não respondeu"

# ── 19. Resumo ────────────────────────────────────────────────────────────
ADMIN_PASS=${ADMIN_PASS:-$(grep ADMIN_PASSWORD "$INSTALL_DIR/.env" | cut -d= -f2)}

cat << RESUME

╔══════════════════════════════════════════════════════════════╗
║                    Instalação Concluída!                     ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  URLs:                                                        ║
║    Admin (ServerHQ): https://${DOMAIN_ADMIN}                  ║
║    Painel (SitePanel): https://${DOMAIN_PAINEL}               ║
║    Webmail: https://${DOMAIN_WEBMAIL}                         ║
║                                                              ║
║  Credenciais Admin:                                           ║
║    Email:    admin@${DOMAIN_ADMIN}                            ║
║    Senha:    ${ADMIN_PASS}                                    ║
║                                                              ║
║  Comandos úteis:                                              ║
║    Ver logs: journalctl -u serverpilot-server-hq -f          ║
║    Reiniciar: systemctl restart serverpilot-server-hq        ║
║    Atualizar: cd ${INSTALL_DIR} && git pull && npm run build  ║
║                                                              ║
║  Aviso: A senha admin foi salva em .env. Altere após login.  ║
║                                                              ║
║  ⚠ CONFIGURAÇÃO MANUAL NECESSÁRIA:                           ║
║  SnappyMail (webmail) requer setup via navegador:            ║
║  1. Acesse https://${DOMAIN_WEBMAIL}                         ║
║  2. Sera redirecionado para /admin/ — configure IMAP/SMTP    ║
║  3. IMAP: dovecot :143 | SMTP: postfix :587                  ║
║                                                              ║
║  Stack de email (Postfix+Dovecot) tem limitações:            ║
║  - Em dev: email vai para MailHog (localhost:8025)           ║
║  - Em producao: precisa configurar virtual mailboxes no      ║
║    Postfix com PostgreSQL (veja docs/06-pos-instalacao.md)    ║
║                                                              ║
║  Guia completo: cat docs/06-pos-instalacao.md                ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
RESUME
