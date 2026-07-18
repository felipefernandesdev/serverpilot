
## 2026-07-18 — Sessão 5: PostgreSQL cluster recovery + nginx/SSL skip

### O que foi feito (commit d589f9e)
- **fail() function** mudou de `return 1` para `exit 1` — agora `pg_isready -q || fail "msg"` interrompe o script se PostgreSQL não subir
- **Step 3 PostgreSQL:** detecta `/etc/postgresql/16/main` existe mas `/var/lib/postgresql/16/main` não → `pg_dropcluster` + `pg_createcluster`. Também trata cluster totalmente ausente e cluster parado
- **Step 9 PostgreSQL:** mesma lógica de recovery antes de desistir
- **Nginx (step 15):** pula config se `DOMAIN_ADMIN`/`DOMAIN_PAINEL`/`DOMAIN_WEBMAIL` estiverem vazios (evita `server_name` inválido)
- **SSL (step 17):** pula se domínios vazios
- **reset-vps.sh:** removeu `postgresql-server-16` (pacote inexistente — causava erro no apt), adiciona `rm -rf /etc/postgresql-common`

### Causa raiz
Reset via `rm -rf /var/lib/postgresql` sem `pg_dropcluster` deixava config do cluster intacta mas sem dados. `pg_lsclusters` mostrava cluster existente (status "down"), então `pg_createcluster` nunca era chamado. O `pg_ctlcluster 16 main start` falhava porque o diretório de dados estava vazio.

### Pendências
- DNS admin.agiliza.host, painel.agiliza.host, webmail.agiliza.host → A 51.161.73.164
- Bootstrap get-serverpilot.sh: read com /dev/tty para curl|bash
- podman rootless detection (falso positivo mesmo como root)
- Dual PostgreSQL (container PowerDNS vs sistema)
- server-status uptime
- podman-compose up -d exit 125

## 2026-07-18 — Sessão 4: PostgreSQL fix + Redis wait loop

### O que foi feito
- **PostgreSQL step 3:** removido `2>/dev/null || true` do `systemctl enable --now postgresql` — agora erros aparecem. Adicionado retry loop com `pg_isready` (10s timeout), fallback para `pg_ctlcluster 16 main start` / `service postgresql start`.
- **Redis step 4:** mesma lógica com `redis-cli ping`.
- **Step 9 (banco):** adicionada verificação `pg_isready` antes de executar psql, com tentativa de iniciar PostgreSQL se estiver parado.
- **Commit:** `4ad7309` — *fix: PostgreSQL e Redis — wait loops com pg_isready/redis-cli, sem 2>/dev/null*

### Causa raiz
O `2>/dev/null || true` escondia falha do `systemctl enable --now postgresql`. Após reset (purge + rm -rf `/var/lib/postgresql`), o cluster PostgreSQL não era recriado automaticamente, e o script não detectava que o serviço não subiu.

### Pendências
- Rodar install em VPS limpa (reset fresh) para validar as correções
- Dual PostgreSQL (container PowerDNS vs sistema) — precisa de ADR
- `server-status` uptime (Date() com timestamp systemd)
- `podman-compose up -d` exit 125
- DNS: admin.agiliza.host, painel.agiliza.host, webmail.agiliza.host precisam de registro A → 51.161.73.164 antes do install
