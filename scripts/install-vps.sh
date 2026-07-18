#!/bin/bash
#==============================================================================
# ServerPilot - VPS Installer
#   Ubuntu 22.04+ / Debian 12+
#   Modos:
#     ./install-vps.sh            → análise + instalação (com confirmação)
#     ./install-vps.sh --analyze  → só análise, não instala
#     ./install-vps.sh --install  → pula análise, só instala
#==============================================================================
set +e
# NOTA: set -e foi removido porque check_cmd/check_pkg retornam 1 para
#       pacotes ausentes, o que abortaria o script prematuramente.
#       Usamos ALL_OK para rastrear falhas manualmente.

# ── Cores ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()   { echo -e "${RED}[ERRO]${NC} $1"; }
header(){ echo -e "\n${BOLD}${CYAN}── $1 ──${NC}"; }
bullet(){ echo -e "  ${CYAN}•${NC} $1"; }

# ── Configurações ──────────────────────────────────────────────────────────
REPO_HTTPS="https://github.com/felipefernandesdev/serverpilot.git"
REPO_URL="$REPO_HTTPS"
REPO_BRANCH="main"
INSTALL_DIR="/opt/serverpilot"
SERVERPILOT_USER="serverpilot"

# Status global
ALL_OK=true
CHECKS=()
INSTALL_STEPS=()
MANUAL_STEPS=()
WARNINGS=()

# ── Utilitários ────────────────────────────────────────────────────────────
check_cmd() {
  if command -v "$1" &>/dev/null; then
    CHECKS+=("${GREEN}INSTALADO${NC}  $1 $($1 --version 2>&1 | head -1 | sed 's/.*/\x1b[90m(&)\x1b[0m/')")
    return 0
  else
    CHECKS+=("${RED}AUSENTE${NC}    $1")
    ALL_OK=false
    return 1
  fi
}

check_pkg() {
  if dpkg -s "$1" &>/dev/null 2>&1; then
    CHECKS+=("${GREEN}INSTALADO${NC}  $1")
    return 0
  else
    CHECKS+=("${RED}AUSENTE${NC}    $1")
    ALL_OK=false
    return 1
  fi
}

check_port() {
  if ss -tlnp 2>/dev/null | grep -q ":$1 "; then
    CHECKS+=("${YELLOW}OCUPADA${NC}   porta $1")
    return 1
  else
    CHECKS+=("${GREEN}LIVRE${NC}     porta $1")
    return 0
  fi
}

check_service() {
  if systemctl is-active --quiet "$1" 2>/dev/null; then
    CHECKS+=("${GREEN}ATIVO${NC}     service $1")
    return 0
  else
    CHECKS+=("${RED}INATIVO${NC}   service $1")
    ALL_OK=false
    return 1
  fi
}

add_step()   { INSTALL_STEPS+=("$1"); }
add_manual() { MANUAL_STEPS+=("$1"); }
add_warn()   { WARNINGS+=("$1"); }

install_pkg() {
  local pkg=$1
  if ! dpkg -s "$pkg" &>/dev/null 2>&1; then
    add_step "apt-get install -y $pkg"
  fi
}

# ── Banner ─────────────────────────────────────────────────────────────────
print_banner() {
  cat << 'EOF'
╔══════════════════════════════════════════════════════════════╗
║                   ServerPilot VPS Installer                  ║
║         Painel de hospedagem web — Ubuntu/Debian             ║
╚══════════════════════════════════════════════════════════════╝
EOF
}

# ═══════════════════════════════════════════════════════════════════════════
# FASE 1 — ANÁLISE
# ═══════════════════════════════════════════════════════════════════════════
run_analysis() {
  header "ANÁLISE DO SISTEMA"

  # ── OS ───────────────────────────────────────────────────────────────────
  bullet "Sistema operacional"
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    CHECKS+=("${GREEN}OK${NC}         $NAME $VERSION_ID")
  else
    CHECKS+=("${RED}DESCONHECIDO${NC}")
    ALL_OK=false
  fi

  # ── Root ─────────────────────────────────────────────────────────────────
  bullet "Permissão root"
  if [ "$EUID" -eq 0 ]; then
    CHECKS+=("${GREEN}OK${NC}         root")
  else
    CHECKS+=("${RED}NECESSÁRIO${NC} execute como root: sudo bash $0")
    ALL_OK=false
  fi

  # ── Memória ──────────────────────────────────────────────────────────────
  bullet "Memória RAM"
  local mem_total=$(awk '/MemTotal/{printf "%d", $2/1024}' /proc/meminfo 2>/dev/null)
  if [ "$mem_total" -ge 1024 ]; then
    CHECKS+=("${GREEN}OK${NC}         ${mem_total}MB (mínimo 1024MB)")
  else
    CHECKS+=("${YELLOW}BAIXA${NC}      ${mem_total}MB (recomendado ≥2048MB)")
    add_warn "Memória baixa (${mem_total}MB). Pode causar lentidão."
  fi

  # ── Disco ────────────────────────────────────────────────────────────────
  bullet "Espaço em disco"
  local disk_free=$(df /opt --output=avail 2>/dev/null | tail -1)
  local disk_total=$(df /opt --output=size 2>/dev/null | tail -1)
  if [ "$disk_free" -ge 5242880 ]; then
    CHECKS+=("${GREEN}OK${NC}         $((disk_free/1024/1024))GB livres (mínimo 5GB)")
  else
    CHECKS+=("${YELLOW}BAIXO${NC}      $((disk_free/1024/1024))GB livres em /opt")
    add_warn "Pouco espaço em disco. ServerPilot precisa de ~5GB para dados."
  fi

  # ── Pacotes do sistema ───────────────────────────────────────────────────
  header "PACOTES DO SISTEMA"
  bullet "Verificando dependências..."
  for pkg in curl wget gnupg ca-certificates nginx ufw podman build-essential git; do
    check_pkg "$pkg"
  done
  # certbot pode vir do snap ou apt
  if command -v certbot &>/dev/null; then
    CHECKS+=("${GREEN}INSTALADO${NC}  certbot")
  elif dpkg -s python3-certbot-nginx &>/dev/null 2>&1; then
    CHECKS+=("${GREEN}INSTALADO${NC}  python3-certbot-nginx")
  else
    CHECKS+=("${RED}AUSENTE${NC}    certbot / python3-certbot-nginx")
    ALL_OK=false
  fi

  # ── Node.js ──────────────────────────────────────────────────────────────
  header "NODE.JS"
  bullet "Node.js 20+"
  if command -v node &>/dev/null; then
    local node_ver=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$node_ver" -ge 20 ]; then
      CHECKS+=("${GREEN}INSTALADO${NC}  Node.js $(node -v)")
    else
      CHECKS+=("${YELLOW}DESATUALIZADO${NC} Node.js $(node -v) — necessário ≥20")
      ALL_OK=false
    fi
  else
    CHECKS+=("${RED}AUSENTE${NC}    Node.js")
    ALL_OK=false
  fi

  # ── PostgreSQL ────────────────────────────────────────────────────────────
  header "POSTGRESQL"
  check_cmd psql
  check_cmd pg_isready
  if command -v psql &>/dev/null; then
    check_service postgresql
  fi

  # ── Redis ────────────────────────────────────────────────────────────────
  header "REDIS"
  check_cmd redis-server
  if command -v redis-server &>/dev/null; then
    check_service redis-server
  fi

  # ── Portas ───────────────────────────────────────────────────────────────
  header "PORTAS"
  bullet "Verificando portas necessárias..."
  check_port 80
  check_port 443
  check_port 5432
  check_port 6379
  check_port 3000
  check_port 3001
  check_port 3002
  check_port 3003
  check_port 8081
  check_port 9001

  # ── Domínios ──────────────────────────────────────────────────────────────
  header "DOMÍNIOS"
  bullet "Resolução DNS"
  for d in "$DOMAIN_ADMIN" "$DOMAIN_PAINEL" "$DOMAIN_WEBMAIL"; do
    local ip
    ip=$(dig +short "$d" 2>/dev/null || host "$d" 2>/dev/null | grep "has address" | awk '{print $4}')
    local my_ip
    my_ip=$(curl -s http://ifconfig.me 2>/dev/null || curl -s http://ipinfo.io/ip 2>/dev/null || echo "")
    if [ -n "$ip" ] && [ -n "$my_ip" ]; then
      if [ "$ip" = "$my_ip" ] || echo "$ip" | grep -q "$my_ip"; then
        CHECKS+=("${GREEN}OK${NC}         $d → $ip")
      else
        CHECKS+=("${YELLOW}OUTRO IP${NC}  $d → $ip (servidor: $my_ip)")
        add_warn "$d aponta para $ip, não para este servidor ($my_ip)"
      fi
    elif [ -n "$ip" ]; then
      CHECKS+=("${YELLOW}NÃO VERIF.${NC} $d → $ip (IP do servidor desconhecido)")
    else
      CHECKS+=("${RED}NÃO RESOLVE${NC} $d")
      add_warn "$d não resolve. SSL vai falhar."
    fi
  done

  # ── Git / Projeto ─────────────────────────────────────────────────────────
  header "REPOSITÓRIO"
  bullet "Acesso ao repositório"
  if [ -d "$INSTALL_DIR/.git" ]; then
    CHECKS+=("${GREEN}EXISTE${NC}    $INSTALL_DIR")
  else
    CHECKS+=("${YELLOW}NOVO${NC}      será clonado em $INSTALL_DIR")
    add_step "git clone $REPO_URL $INSTALL_DIR"
  fi

  # ── Docker/Podman (rootful) ──────────────────────────────────────────────
  header "CONTAINERS (PODMAN)"
  bullet "Podman rootful para portas privilegiadas"
  if podman info 2>/dev/null | grep -q "rootless"; then
    CHECKS+=("${YELLOW}ROOTLESS${NC}  Podman sem root — portas <1024 podem falhar")
    add_warn "Podman está em modo rootless. Use 'podman system migrate' ou execute o script como root."
  else
    CHECKS+=("${GREEN}OK${NC}         Podman rootful")
  fi

  # ── Resumo ───────────────────────────────────────────────────────────────
  echo ""
  header "RESUMO DA ANÁLISE"
  for c in "${CHECKS[@]}"; do
    echo -e "  $c"
  done

  echo ""
  if [ "$ALL_OK" = true ]; then
    ok "Todos os requisitos satisfeitos."
  else
    warn "Alguns requisitos precisam de atenção (veja acima)."
  fi

  if [ ${#INSTALL_STEPS[@]} -gt 0 ]; then
    echo ""
    header "COMANDOS QUE SERÃO EXECUTADOS"
    for s in "${INSTALL_STEPS[@]}"; do
      bullet "$s"
    done
  fi

  if [ ${#WARNINGS[@]} -gt 0 ]; then
    echo ""
    header "ATENÇÃO"
    for w in "${WARNINGS[@]}"; do
      echo -e "  ${YELLOW}⚠${NC} $w"
    done
  fi

  echo ""
  header "CONFIGURAÇÃO MANUAL NECESSÁRIA (APÓS INSTALAÇÃO)"
  add_manual "SnappyMail: acessar https://${DOMAIN_WEBMAIL}/admin/ para configurar IMAP/SMTP"
  add_manual "Stack de email: ver docs/06-pos-instalacao.md para virtual mailboxes em produção"
  for m in "${MANUAL_STEPS[@]}"; do
    bullet "$m"
  done
}

# ═══════════════════════════════════════════════════════════════════════════
# FASE 2 — INSTALAÇÃO
# ═══════════════════════════════════════════════════════════════════════════
run_install() {
  echo ""
  header "INICIANDO INSTALAÇÃO"

  # ── 1. Pacotes do sistema ────────────────────────────────────────────────
  header "1/19 — Pacotes do sistema"
  apt-get update -qq
  apt-get install -y -qq \
    curl wget gnupg ca-certificates \
    nginx ufw certbot python3-certbot-nginx \
    podman build-essential git dnsutils
  ok "Pacotes instalados"

  # ── 2. Node.js 20.x ──────────────────────────────────────────────────────
  header "2/19 — Node.js"
  if ! command -v node &>/dev/null || [ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 20 ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs
  fi
  ok "Node.js $(node -v)"

  # ── 3. PostgreSQL ─────────────────────────────────────────────────────────
  header "3/19 — PostgreSQL"
  if ! command -v psql &>/dev/null; then
    apt-get install -y -qq postgresql postgresql-client
  fi
  systemctl enable --now postgresql 2>/dev/null || true
  ok "PostgreSQL $(psql --version 2>&1 | head -1)"

  # ── 4. Redis ──────────────────────────────────────────────────────────────
  header "4/19 — Redis"
  if ! command -v redis-server &>/dev/null; then
    apt-get install -y -qq redis-server
  fi
  systemctl enable --now redis-server 2>/dev/null || true
  ok "Redis $(redis-server --version 2>&1 | sed 's/.*v=//' | cut -d' ' -f1)"

  # ── 5. Usuário + sudoers ─────────────────────────────────────────────────
  header "5/19 — Usuário system + sudoers"
  if ! id -u "$SERVERPILOT_USER" &>/dev/null; then
    useradd -m -s /bin/bash -d "$INSTALL_DIR" "$SERVERPILOT_USER"
    usermod -aG "$SERVERPILOT_USER" "$SERVERPILOT_USER"
  fi

  # Sudoers NOPASSWD para podman (necessário para server-status e containers)
  local sudoers_file="/etc/sudoers.d/${SERVERPILOT_USER}"
  if [ ! -f "$sudoers_file" ]; then
    echo "${SERVERPILOT_USER} ALL=(ALL) NOPASSWD: /usr/bin/podman, /usr/bin/systemctl, /bin/journalctl" > "$sudoers_file"
    chmod 440 "$sudoers_file"
    ok "Sudoers configurado (podman + systemctl NOPASSWD)"
  fi
  ok "Usuário $SERVERPILOT_USER"

  # ── 6. Clonar projeto ────────────────────────────────────────────────────
  header "6/19 — Clonar projeto"
  if [ -d "$INSTALL_DIR/.git" ]; then
    cd "$INSTALL_DIR"
    git fetch origin
    git checkout "$REPO_BRANCH"
    git pull origin "$REPO_BRANCH"
  else
    if [ -n "$GITHUB_TOKEN" ]; then
      REPO_AUTH="https://${GITHUB_TOKEN}@github.com/felipefernandesdev/serverpilot.git"
      git clone --branch "$REPO_BRANCH" "$REPO_AUTH" "$INSTALL_DIR"
    else
      git clone --branch "$REPO_BRANCH" "$REPO_HTTPS" "$INSTALL_DIR"
    fi
  fi

  if [ ! -d "$INSTALL_DIR/.git" ]; then
    err "Falha ao clonar repositório"
    exit 1
  fi

  chown -R "$SERVERPILOT_USER:" "$INSTALL_DIR"
  cd "$INSTALL_DIR"

  # ── 6b. podman-compose ──────────────────────────────────────────────────
  if ! command -v podman-compose &>/dev/null; then
    info "Instalando podman-compose..."
    pip3 install podman-compose 2>/dev/null || pip install podman-compose 2>/dev/null || \
      warn "podman-compose não instalado — containers Docker não serão iniciados"
  fi

  ok "Projeto em $INSTALL_DIR"

  # ── 7. .env ──────────────────────────────────────────────────────────────
  header "7/19 — .env"
  ADMIN_PASS=""
  if [ ! -f "$INSTALL_DIR/.env" ]; then
    HQ_JWT_SECRET=$(openssl rand -base64 48)
    PANEL_JWT_SECRET=$(openssl rand -base64 48)
    JWT_REFRESH_SECRET=$(openssl rand -base64 48)
    ADMIN_PASS=$(openssl rand -base64 16)
    DB_PASS=$(openssl rand -base64 16)

    cat > "$INSTALL_DIR/.env" << ENVEOF
DATABASE_URL="postgresql://serverpilot:${DB_PASS}@localhost:5432/serverpilot?schema=public"
HQ_JWT_SECRET="${HQ_JWT_SECRET}"
PANEL_JWT_SECRET="${PANEL_JWT_SECRET}"
JWT_EXPIRATION="15m"
JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET}"
JWT_REFRESH_EXPIRATION="7d"
PORT=3001
NODE_ENV=production
ADMIN_EMAIL="${SSL_EMAIL}"
ADMIN_PASSWORD="${ADMIN_PASS}"
PDNS_API_KEY="pdns_$(openssl rand -hex 16)"
LETSENCRYPT_EMAIL="${SSL_EMAIL}"
DNS_NAMESERVERS="ns1.${DOMAIN_ADMIN#admin.},ns2.${DOMAIN_ADMIN#admin.}"
CORS_ORIGIN="https://${DOMAIN_ADMIN},https://${DOMAIN_PAINEL}"
ENVEOF
    chown "$SERVERPILOT_USER:" "$INSTALL_DIR/.env"
    chmod 600 "$INSTALL_DIR/.env"
    ok ".env gerado com senhas aleatórias"
  else
    ADMIN_PASS=$(grep ADMIN_PASSWORD "$INSTALL_DIR/.env" | cut -d= -f2)
    warn ".env já existe — mantido"

    # Sincronizar senha do banco se o .env foi recriado mas DB já existe
    local env_db_pass
    env_db_pass=$(grep DATABASE_URL "$INSTALL_DIR/.env" | sed "s/.*:\(.*\)@.*/\1/")
    local pg_pass
    pg_pass=$(sudo -u postgres psql -tAc "SELECT rolpassword FROM pg_authid WHERE rolname='serverpilot'" 2>/dev/null | head -c 16)
    if [ -n "$env_db_pass" ] && [ -n "$pg_pass" ] && [ "$pg_pass" != "$env_db_pass" ]; then
      sudo -u postgres psql -c "ALTER USER serverpilot WITH PASSWORD '${env_db_pass}';" 2>/dev/null
      ok "Senha PostgreSQL sincronizada com .env"
    fi
  fi

  # ── 8. Banco de dados ────────────────────────────────────────────────────
  header "8/19 — Banco PostgreSQL"
  DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='serverpilot'" 2>/dev/null || echo "0")
  if [ "$DB_EXISTS" != "1" ]; then
    local db_pass
    db_pass=$(grep DATABASE_URL "$INSTALL_DIR/.env" | sed "s/.*:\(.*\)@.*/\1/")
    sudo -u postgres psql -c "CREATE USER serverpilot WITH PASSWORD '${db_pass}';"
    sudo -u postgres psql -c "CREATE DATABASE serverpilot OWNER serverpilot;"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE serverpilot TO serverpilot;"
    ok "Banco + usuário criados"
  else
    ok "Banco já existe"
  fi

  # ── 9. npm install ──────────────────────────────────────────────────────
  header "9/19 — Dependências npm"
  cd "$INSTALL_DIR"
  npm install 2>&1 | tail -3
  ok "Dependências instaladas"

  # ── 10. Prisma ──────────────────────────────────────────────────────────
  header "10/19 — Prisma"
  npx prisma generate 2>/dev/null
  npx prisma db push 2>/dev/null
  ok "Prisma Client + schema aplicado"

  # ── 11. Seed ────────────────────────────────────────────────────────────
  header "11/19 — Seed de dados"
  if [ "$DO_SEED" = false ]; then
    read -rp "  Executar seed com dados de exemplo? (s/N): " DO_SEED_INPUT
    [[ "$DO_SEED_INPUT" =~ ^[Ss]$ ]] && DO_SEED=true
  fi
  if [ "$DO_SEED" = true ]; then
    cd "$INSTALL_DIR"
    npx ts-node --transpile-only prisma/seed.ts 2>&1 | tail -10
    ok "Seed concluído"
  else
    info "Seed pulado"
  fi

  # ── 12. Build frontends ─────────────────────────────────────────────────
  header "12/19 — Build frontends"
  cd "$INSTALL_DIR/apps/admin"
  npx next build 2>&1 | tail -3
  cd "$INSTALL_DIR/apps/web"
  npx next build 2>&1 | tail -3
  cd "$INSTALL_DIR"
  ok "Frontends compilados"

  # ── 13. Systemd ─────────────────────────────────────────────────────────
  header "13/19 — Systemd services"
  for svc in serverpilot-server-hq serverpilot-site-panel serverpilot-admin serverpilot-web; do
    cp "$INSTALL_DIR/deploy/${svc}.service" "/etc/systemd/system/${svc}.service"
    chmod 644 "/etc/systemd/system/${svc}.service"
  done
  systemctl daemon-reload

  for svc in serverpilot-server-hq serverpilot-admin serverpilot-site-panel serverpilot-web; do
    systemctl enable "$svc" 2>/dev/null
    systemctl start "$svc" 2>/dev/null || warn "Falha ao iniciar $svc (journalctl -u $svc -n 20)"
  done
  ok "Services instalados"

  # ── 14. Nginx ────────────────────────────────────────────────────────────
  header "14/19 — Nginx reverse proxy"
  sed "s/admin\.seuservidor\.com/$DOMAIN_ADMIN/g; s/painel\.seuservidor\.com/$DOMAIN_PAINEL/g; s/webmail\.seuservidor\.com/$DOMAIN_WEBMAIL/g" \
    "$INSTALL_DIR/deploy/nginx-serverpilot.conf" > "/etc/nginx/sites-available/serverpilot"

  if [ ! -L "/etc/nginx/sites-enabled/serverpilot" ]; then
    ln -s "/etc/nginx/sites-available/serverpilot" "/etc/nginx/sites-enabled/"
  fi
  rm -f /etc/nginx/sites-enabled/default

  nginx -t && systemctl reload nginx && ok "Nginx OK" || warn "Falha no nginx"

  # ── 15. Firewall ─────────────────────────────────────────────────────────
  header "15/19 — Firewall (UFW)"
  ufw --force reset 2>/dev/null
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow ssh
  ufw allow http
  ufw allow https
  ufw --force enable
  ok "UFW configurado"

  # ── 16. SSL ──────────────────────────────────────────────────────────────
  header "16/19 — SSL Let's Encrypt"
  if command -v certbot &>/dev/null; then
    certbot --nginx -d "$DOMAIN_ADMIN" -d "$DOMAIN_PAINEL" -d "$DOMAIN_WEBMAIL" \
      --non-interactive --agree-tos --email "$SSL_EMAIL" 2>&1 | tail -3 && \
      ok "Certificados gerados" || warn "SSL falhou — rode: certbot --nginx"
  else
    warn "certbot não encontrado. SSL manual: certbot --nginx"
  fi

  # ── 17. Containers ───────────────────────────────────────────────────────
  header "17/19 — Containers de infraestrutura"
  cd "$INSTALL_DIR/docker"
  podman compose up -d 2>&1 | tail -3 || warn "Falha ao subir containers"
  cd "$INSTALL_DIR"

  # ── 17b. PowerDNS schema ────────────────────────────────────────────────
  header "18/19 — PowerDNS schema"
  sleep 3
  podman exec -i serverpilot-postgres psql -U serverpilot -d serverpilot \
    < "$INSTALL_DIR/docker/powerdns/schema.pgsql.sql" 2>/dev/null && \
    ok "Schema criado" || warn "Schema já existe"

  # ── 18. Healthcheck ──────────────────────────────────────────────────────
  header "19/19 — Verificação"
  sleep 8

  ALL_ACTIVE=true
  for svc in serverpilot-server-hq serverpilot-admin serverpilot-site-panel serverpilot-web; do
    if systemctl is-active --quiet "$svc" 2>/dev/null; then
      ok "$svc: ativo"
    else
      warn "$svc: inativo — journalctl -u $svc -n 30"
      ALL_ACTIVE=false
    fi
  done

  ADMIN_PASS=${ADMIN_PASS:-$(grep ADMIN_PASSWORD "$INSTALL_DIR/.env" | cut -d= -f2)}

  # Testar API (admin)
  local _admin_email
  _admin_email=$(grep ADMIN_EMAIL "$INSTALL_DIR/.env" | cut -d= -f2)
  local login_res
  login_res=$(curl -sf http://127.0.0.1:3001/api/auth/login -X POST \
    -H 'Content-Type: application/json' \
    -d '{"email":"'"$_admin_email"'","password":"'"$ADMIN_PASS"'"}' 2>/dev/null) && \
    ok "API Admin (3001) respondendo" || warn "API Admin não respondeu — verifique .env e logs"

  # Testar API (painel)
  local panel_res
  panel_res=$(curl -sf http://127.0.0.1:3002/api/auth/login -X POST \
    -H 'Content-Type: application/json' \
    -d '{"username":"client01","password":"client123"}' 2>/dev/null) && \
    ok "API Painel (3002) respondendo" || warn "API Painel não respondeu"
}

# ═══════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════
print_banner

# ── Parsing de flags ─────────────────────────────────────────────────────────
MODE="${1:-all}"
DO_SEED=false
AUTO_CONFIRM=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain-admin)    DOMAIN_ADMIN="$2";    shift 2 ;;
    --domain-painel)   DOMAIN_PAINEL="$2";   shift 2 ;;
    --domain-webmail)  DOMAIN_WEBMAIL="$2";  shift 2 ;;
    --email)           SSL_EMAIL="$2";       shift 2 ;;
    --seed)            DO_SEED=true;         shift ;;
    --yes|-y)          AUTO_CONFIRM=true;    shift ;;
    --token)           GITHUB_TOKEN="$2";    shift 2 ;;
    --install|--analyze|all) shift ;;
    *)                 shift ;;
  esac
done

# ── Coleta interativa (fallback se flags não foram passadas) ─────────────────
if [ -z "$DOMAIN_ADMIN" ]; then
  read -rp "Domínio do Admin (ex: admin.meuservidor.com): " DOMAIN_ADMIN
fi
if [ -z "$DOMAIN_PAINEL" ]; then
  read -rp "Domínio do Painel (ex: painel.meuservidor.com): " DOMAIN_PAINEL
fi
if [ -z "$DOMAIN_WEBMAIL" ]; then
  read -rp "Domínio do Webmail (ex: webmail.meuservidor.com): " DOMAIN_WEBMAIL
fi
if [ -z "$SSL_EMAIL" ]; then
  read -rp "Email para Let's Encrypt: " SSL_EMAIL
fi

# Análise (sempre, exceto --install)
if [ "$MODE" != "--install" ]; then
  run_analysis
fi

# Só análise?
if [ "$MODE" = "--analyze" ]; then
  echo ""
  info "Modo análise apenas. Nada foi instalado."
  exit 0
fi

# Confirmação (modo all)
if [ "$MODE" != "--install" ] && [ "$AUTO_CONFIRM" = false ]; then
  echo ""
  read -rp "Deseja iniciar a instalação? (s/N): " CONFIRM
  if [[ ! "$CONFIRM" =~ ^[Ss]$ ]]; then
    info "Instalação cancelada."
    exit 0
  fi
elif [ "$MODE" != "--install" ] && [ "$AUTO_CONFIRM" = true ]; then
  info "Modo automático (--yes) — instalando..."
fi

# Instalação
run_install

# ── Resumo Final ──────────────────────────────────────────────────────────
ADMIN_EMAIL_FINAL=$(grep ADMIN_EMAIL "$INSTALL_DIR/.env" | cut -d= -f2)
ADMIN_PASS=${ADMIN_PASS:-$(grep ADMIN_PASSWORD "$INSTALL_DIR/.env" | cut -d= -f2)}
echo ""
cat << RESUME

╔══════════════════════════════════════════════════════════════╗
║                    Instalação Concluída!                     ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  URLs:                                                        ║
║    Admin (ServerHQ): https://${DOMAIN_ADMIN}                  ║
║    Painel (SitePanel): https://${DOMAIN_PAINEL}               ║
║    Webmail:         https://${DOMAIN_WEBMAIL}                 ║
║                                                              ║
║  Credenciais Admin:                                           ║
║    Email: ${ADMIN_EMAIL_FINAL}                               ║
║    Senha: ${ADMIN_PASS}                                       ║
║                                                              ║
║  ⚠ CONFIGURAÇÃO MANUAL NECESSÁRIA:                           ║
║  1. SnappyMail: https://${DOMAIN_WEBMAIL}/admin/              ║
║     Configure IMAP → dovecot :143  |  SMTP → postfix :587    ║
║  2. Email em produção: veja docs/06-pos-instalacao.md         ║
║  3. Altere a senha admin após o primeiro login               ║
║                                                              ║
║  Comandos úteis:                                              ║
║    Logs:    journalctl -u serverpilot-server-hq -f           ║
║    Status:  systemctl status serverpilot-server-hq           ║
║    Atualizar: cd ${INSTALL_DIR} && git pull && npm run build  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
RESUME
