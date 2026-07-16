# ServerPilot — MEMORY

## Sessão: 2026-07-16 (tarde)

### Estado Atual
- **Fase**: 3 (Admin funcional + dark mode)
- **Branch**: `main`
- **Último commit**: `f2bc7b1` — chore: remove .seeded from tracking

### O Que Foi Feito Nesta Sessão
1. **PORT fix**: server-hq → 3001, site-panel → 3002 (scripts explicitos)
2. **Admin sidebar + layout**: navegação lateral com Dashboard, Accounts, Packages
3. **Admin Accounts page**: listagem, busca, criar, suspender/reativar, deletar
4. **Admin Packages page**: grid de cards, criar/editar modal, deletar
5. **Dark mode**: `darkMode: 'class'`, toggle no header/sidebar, sem FOUC
6. **Visual melhorado**: cores consistentes (surface palette), animações, scrollbar customizada

### O Que Foi Feito
1. **Base desbloqueada**:
   - `packageManager` adicionado ao `package.json` root
   - `tsconfig.json` root corrigido (exclui `apps/*`)
   - `tsconfig.json` criado para `apps/server-hq` e `apps/site-panel`
   - `package.json` + `index.ts` barrel exports para pacotes compartilhados
   - Paths wildcard no tsconfig (`@serverpilot/domain/*`)
   - Value objects renomeados (`value` → `_value`)
   - `JwtStrategy` registrado no ServerHQ AuthModule
   - `npm install` + `npx tsc --noEmit` ✅

2. **Email Manager** (SitePanel):
   - `email.service.ts` — CRUD + forwarders + filters com quota check
   - `email.controller.ts` — 12 endpoints REST
   - `dto/` — 4 DTOs com validação
   - `email/page.tsx` — UI completa com modal de detalhes

3. **Database Console** (SitePanel):
   - `database.service.ts` — CRUD + database users com quota check
   - `database.controller.ts` — 7 endpoints REST
   - `database.module.ts` — ativado
   - `databases/page.tsx` — UI completa

4. **Domain Manager** (SitePanel):
   - `domain.service.ts` — CRUD subdomínios com quota check
   - `domain.controller.ts` — 5 endpoints REST
   - `domain.module.ts` — ativado
   - `subdomains/page.tsx` — UI com URL preview

5. **Dashboard** — links para email/databases/subdomains corrigidos

### Testado
- ✅ SitePanel API sobe (36 rotas mapeadas)
- ✅ ServerHQ API sobe (13 rotas mapeadas)
- ✅ Login (client01/client123) retorna JWT
- ✅ GET /api/email retorna 2 contas seeded
- ✅ GET /api/databases retorna 1 DB seeded
- ✅ GET /api/domains retorna 2 subdomínios seeded

### Problemas Conhecidos
- Sem testes (0% cobertura)
- `packages/infra/` vazio
- `packages/shared/` vazio
- Metrics module é shell vazio
- Reseller/Backup não implementados
- `.env` commitado no git (dev apenas)

### Como iniciar
```bash
cd projects/serverpilot
npm run db:seed   # push schema + seed data
npm run dev       # turbo: todos os 4 apps sobem juntos
```

| App | URL | Porta |
|-----|-----|-------|
| Admin (ServerHQ) | http://localhost:3000 | 3000 |
| Admin API | http://localhost:3001/api | 3001 |
| Client API | http://localhost:3002/api | 3002 |
| Client (SitePanel) | http://localhost:3003 | 3003 |

**Credenciais:** admin@serverpilot.local / admin123 (admin) — client01 / client123 (cliente)
