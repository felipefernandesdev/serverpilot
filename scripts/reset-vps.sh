#!/bin/bash

# ServerPilot VPS — Reset completo (nuclear)
# Remove tudo que o install-vps.sh criou, restaurando o sistema ao estado
# anterior à instalação. Dados de outros serviços (ex: outros sites nginx)
# NÃO são afetados.
#
# Uso: curl -fsSL https://raw.githubusercontent.com/felipefernandesdev/serverpilot/main/scripts/reset-vps.sh | bash
#   ou: bash scripts/reset-vps.sh [--force]

FORCE=false
for arg in "$@"; do
  [ "$arg" = "--force" ] || [ "$arg" = "-f" ] || [ "$arg" = "--yes" ] || [ "$arg" = "-y" ] && FORCE=true
done

if [ "$(id -u)" -ne 0 ]; then
  echo "ERRO: Execute como root (sudo ou su -)"
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     SERVERPILOT — RESET COMPLETO DA VPS                    ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Isso vai REMOVER:                                         ║"
echo "║    • Todos os services serverpilot-*                       ║"
echo "║    • Containers Podman + volumes                           ║"
echo "║    • Config do nginx (serverpilot)                         ║"
echo "║    • Certificados SSL (Let's Encrypt)                      ║"
echo "║    • Banco PostgreSQL + usuário serverpilot                ║"
echo "║    • Diretório /opt/serverpilot                            ║"
echo "║    • Usuário serverpilot                                   ║"
echo "║    • Regras UFW (reset)                                    ║"
echo "║                                                             ║"
echo "║  Pacotes instalados PODEM ser removidos (nginx, postgres,  ║"
echo "║  podman, nodejs, redis, certbot, ufw, etc).               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

if [ "$FORCE" = true ]; then
  echo "  ▶ Modo forçado — pulando confirmação"
else
  CONFIRM=""
  if [ -t 0 ]; then
    read -p "Digite 'RESET' para confirmar: " CONFIRM
  elif [ -c /dev/tty ]; then
    read -p "Digite 'RESET' para confirmar: " CONFIRM </dev/tty
  fi
  if [ "$CONFIRM" != "RESET" ]; then
    echo "Cancelado."
    echo ""
    echo "Para executar sem confirmação: curl ... | bash -s -- --force"
    exit 1
  fi
fi

echo ""
echo "▶ Limpando ServerPilot..."

# ── 1. Stop + disable systemd services ────────────────────────────────
echo "  ■ Services systemd..."
for svc in serverpilot-server-hq serverpilot-admin serverpilot-site-panel serverpilot-web; do
  systemctl stop "$svc" 2>/dev/null || true
  systemctl disable "$svc" 2>/dev/null || true
done
rm -f /etc/systemd/system/serverpilot-*.service
systemctl daemon-reload

# ── 2. Podman containers + compose ────────────────────────────────────
echo "  ■ Containers Podman..."
if command -v podman &>/dev/null; then
  if [ -f /opt/serverpilot/docker/docker-compose.yml ]; then
    cd /opt/serverpilot/docker && podman compose down -v 2>/dev/null || true
  fi
  podman system prune -af 2>/dev/null || true
  podman volume prune -af 2>/dev/null || true
fi

# ── 3. Nginx config ──────────────────────────────────────────────────
echo "  ■ Nginx..."
rm -f /etc/nginx/sites-enabled/serverpilot
rm -f /etc/nginx/sites-available/serverpilot
if command -v nginx &>/dev/null; then
  nginx -t 2>/dev/null && systemctl reload nginx 2>/dev/null || true
fi

# ── 4. Sudoers ───────────────────────────────────────────────────────
echo "  ■ Sudoers..."
rm -f /etc/sudoers.d/serverpilot

# ── 5. SSL / Certbot ─────────────────────────────────────────────────
echo "  ■ SSL..."
if command -v certbot &>/dev/null; then
  for cert in /etc/letsencrypt/live/*/; do
    [ -d "$cert" ] && certbot delete --cert-name "$(basename "$cert")" 2>/dev/null || true
  done
fi
rm -rf /etc/letsencrypt

# ── 6. PostgreSQL DB ─────────────────────────────────────────────────
echo "  ■ PostgreSQL..."
if command -v psql &>/dev/null; then
  sudo -u postgres psql -c "DROP DATABASE IF EXISTS serverpilot;" 2>/dev/null || true
  sudo -u postgres psql -c "DROP USER IF EXISTS serverpilot;" 2>/dev/null || true
  # Remove database criada pelo schema PowerDNS (via container)
  sudo -u postgres psql -c "DROP DATABASE IF EXISTS powerdns;" 2>/dev/null || true
  sudo -u postgres psql -c "DROP USER IF EXISTS pdns;" 2>/dev/null || true
fi
systemctl stop postgresql 2>/dev/null || true

# ── 7. Redis ─────────────────────────────────────────────────────────
echo "  ■ Redis..."
systemctl stop redis-server 2>/dev/null || true
rm -f /etc/redis/redis.conf.bak 2>/dev/null || true

# ── 8. Sistema user ──────────────────────────────────────────────────
echo "  ■ Usuário system..."
userdel -r serverpilot 2>/dev/null || true

# ── 9. Diretório de instalação ───────────────────────────────────────
echo "  ■ /opt/serverpilot..."
rm -rf /opt/serverpilot

# ── 10. .env residuais ────────────────────────────────────────────────
echo "  ■ .env residuais..."
find /etc /opt /root /home -name '.env' -path '*serverpilot*' -delete 2>/dev/null || true

# ── 11. UFW ──────────────────────────────────────────────────────────
echo "  ■ UFW..."
if command -v ufw &>/dev/null; then
  ufw --force reset 2>/dev/null || true
  ufw --force disable 2>/dev/null || true
fi

# ── 12. Pacotes ──────────────────────────────────────────────────────
echo "  ■ Pacotes (removendo)..."
apt-get remove --purge -y \
  nginx \
  ufw \
  certbot \
  python3-certbot-nginx \
  postgresql \
  postgresql-16 \
  postgresql-client \
  postgresql-client-16 \
  postgresql-server-16 \
  postgresql-contrib-16 \
  libpq-dev \
  redis-server \
  nodejs \
  podman \
  build-essential \
  dnsutils \
  python3-pip \
  2>&1 || true
rm -rf /var/lib/postgresql /etc/postgresql
apt-get autoremove --purge -y 2>&1 || true
apt-get clean 2>&1 || true

# ── 13. Limpeza final ────────────────────────────────────────────────
echo "  ■ Cache npm + .npm..."
rm -rf /root/.npm /root/.cache 2>/dev/null || true

echo ""
echo "✔ Reset completo. VPS limpa e pronta para nova instalação."
echo "  Execute: curl -fsSL https://raw.githubusercontent.com/felipefernandesdev/serverpilot/main/scripts/get-serverpilot.sh | bash"
echo ""
