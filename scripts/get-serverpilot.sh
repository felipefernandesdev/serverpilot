#!/usr/bin/env bash
#==============================================================================
# ServerPilot — Bootstrap Installer
#   Uso: curl -sSL https://git.io/serverpilot | bash
#==============================================================================
set -e

BOLD='\033[1m'; NC='\033[0m'

echo ""
echo " ╔══════════════════════════════════════════════════════════════╗"
echo " ║              ServerPilot — Bootstrap Installer              ║"
echo " ╚══════════════════════════════════════════════════════════════╝"
echo ""

# ── Auto-detecção ─────────────────────────────────────────────────────────
IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "")
HOSTNAME=$(hostname -f 2>/dev/null || hostname 2>/dev/null || echo "serverpilot.local")
BASE_DOMAIN="${HOSTNAME#*.}"
[ -z "$BASE_DOMAIN" ] && BASE_DOMAIN="$IP"

# ── Coleta de domínios ─────────────────────────────────────────────────────
echo -e "${BOLD}Domínios detectados:${NC}"
echo "  IP do servidor: $IP"
echo "  Hostname:       $HOSTNAME"
echo ""

DEFAULT_ADMIN="admin.${BASE_DOMAIN}"
DEFAULT_PAINEL="painel.${BASE_DOMAIN}"
DEFAULT_WEBMAIL="webmail.${BASE_DOMAIN}"

read -rp "Domínio do Admin [${DEFAULT_ADMIN}]: " input
DOMAIN_ADMIN="${input:-$DEFAULT_ADMIN}"

read -rp "Domínio do Painel [${DEFAULT_PAINEL}]: " input
DOMAIN_PAINEL="${input:-$DEFAULT_PAINEL}"

read -rp "Domínio do Webmail [${DEFAULT_WEBMAIL}]: " input
DOMAIN_WEBMAIL="${input:-$DEFAULT_WEBMAIL}"

read -rp "Email para Let's Encrypt: " SSL_EMAIL
while [ -z "$SSL_EMAIL" ]; do
  read -rp "Email para Let's Encrypt (obrigatório): " SSL_EMAIL
done

# ── Confirmação ────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}Resumo:${NC}"
echo "  Admin:   https://${DOMAIN_ADMIN}"
echo "  Painel:  https://${DOMAIN_PAINEL}"
echo "  Webmail: https://${DOMAIN_WEBMAIL}"
echo "  Email:   ${SSL_EMAIL}"
echo ""
read -rp "Confirmar instalação? (s/N): " CONFIRM
[[ ! "$CONFIRM" =~ ^[Ss]$ ]] && echo "Cancelado." && exit 0

# ── Instalação ─────────────────────────────────────────────────────────────
INSTALLER_URL="https://raw.githubusercontent.com/felipefernandesdev/serverpilot/main/scripts/install-vps.sh"

bash <(curl -sL "$INSTALLER_URL") \
  --domain-admin "$DOMAIN_ADMIN" \
  --domain-painel "$DOMAIN_PAINEL" \
  --domain-webmail "$DOMAIN_WEBMAIL" \
  --email "$SSL_EMAIL" \
  --seed --yes
