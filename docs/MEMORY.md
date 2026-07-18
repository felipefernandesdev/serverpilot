
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
