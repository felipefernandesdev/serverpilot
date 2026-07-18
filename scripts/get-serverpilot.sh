#!/usr/bin/env bash
#==============================================================================
# ServerPilot — Bootstrap Installer
#   Uso: curl -sSL https://git.io/serverpilot | bash
#   Uso: curl ... | bash -s -- --yes  (auto, pula confirmação)
#==============================================================================
set -e

BOLD='\033[1m'; NC='\033[0m'

# ── Flags ─────────────────────────────────────────────────────────────────
AUTO=false
for arg in "$@"; do
  [ "$arg" = "--yes" ] || [ "$arg" = "-y" ] || [ "$arg" = "--force" ] || [ "$arg" = "-f" ] && AUTO=true
done

# ── Leitura interativa (funciona com curl | bash) ─────────────────────────
read_input() {
  local prompt="$1" var="$2" default="$3"
  local val=""
  if [ -c /dev/tty ]; then
    read -rp "$prompt" val </dev/tty
  else
    read -rp "$prompt" val
  fi
  printf -v "$var" "%s" "${val:-$default}"
}

# ── Banner ────────────────────────────────────────────────────────────────
echo ""
echo " ╔══════════════════════════════════════════════════════════════╗"
echo " ║              ServerPilot — Bootstrap Installer              ║"
echo " ╚══════════════════════════════════════════════════════════════╝"
echo ""

# ── Auto-detecção ─────────────────────────────────────────────────────────
IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "")
HOSTNAME=$(hostname -f 2>/dev/null || hostname 2>/dev/null || echo "serverpilot.local")

# Extrai domínio base: se hostname é agiliza.host, base = agiliza.host
# se hostname é vps1.agiliza.host, base = agiliza.host
if [[ "$HOSTNAME" == *.*.* ]]; then
  BASE_DOMAIN="${HOSTNAME#*.}"
else
  BASE_DOMAIN="$HOSTNAME"
fi
[ -z "$BASE_DOMAIN" ] && BASE_DOMAIN="$IP"

echo -e "${BOLD}Domínios detectados:${NC}"
echo "  IP do servidor: $IP"
echo "  Hostname:       $HOSTNAME"
echo ""

# ── Coleta de domínios ─────────────────────────────────────────────────────
if [ "$AUTO" = true ]; then
  DOMAIN_ADMIN="admin.${BASE_DOMAIN}"
  DOMAIN_PAINEL="painel.${BASE_DOMAIN}"
  DOMAIN_WEBMAIL="webmail.${BASE_DOMAIN}"
  SSL_EMAIL="admin@${BASE_DOMAIN}"
else
  read_input "Domínio do Admin [admin.${BASE_DOMAIN}]: " DOMAIN_ADMIN "admin.${BASE_DOMAIN}"
  read_input "Domínio do Painel [painel.${BASE_DOMAIN}]: " DOMAIN_PAINEL "painel.${BASE_DOMAIN}"
  read_input "Domínio do Webmail [webmail.${BASE_DOMAIN}]: " DOMAIN_WEBMAIL "webmail.${BASE_DOMAIN}"
  read_input "Email para Let's Encrypt: " SSL_EMAIL ""
  while [ -z "$SSL_EMAIL" ]; do
    read_input "Email para Let's Encrypt (obrigatório): " SSL_EMAIL ""
  done
fi

# ── Confirmação ────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}Resumo:${NC}"
echo "  Admin:   https://${DOMAIN_ADMIN}"
echo "  Painel:  https://${DOMAIN_PAINEL}"
echo "  Webmail: https://${DOMAIN_WEBMAIL}"
echo "  Email:   ${SSL_EMAIL}"
echo ""

if [ "$AUTO" = false ]; then
  CONFIRM=""
  if [ -c /dev/tty ]; then
    read -rp "Confirmar instalação? (s/N): " CONFIRM </dev/tty
  else
    read -rp "Confirmar instalação? (s/N): " CONFIRM
  fi
  [[ ! "$CONFIRM" =~ ^[Ss]$ ]] && echo "Cancelado." && exit 0
fi

# ── Instalação ─────────────────────────────────────────────────────────────
INSTALLER_URL="https://raw.githubusercontent.com/felipefernandesdev/serverpilot/main/scripts/install-vps.sh"

bash <(curl -sL "$INSTALLER_URL") \
  --domain-admin "$DOMAIN_ADMIN" \
  --domain-painel "$DOMAIN_PAINEL" \
  --domain-webmail "$DOMAIN_WEBMAIL" \
  --email "$SSL_EMAIL" \
  --seed --yes
