# AXIS IP — Sprint 14 · Prompt de Continuação
**Data:** 07/04/2026 · **Commit:** `44ba543` · **Build:** ✅ limpo

---

## PROJETO
Plataforma de inteligência imobiliária para análise de imóveis em leilão judicial e mercado direto na RMBH.
- **Repo:** `cotars-dotcom/axis-platform` · **Branch:** `main`
- **Produção:** https://axisip.vercel.app
- **Supabase:** projeto `vovkfhyjjoruiljfjrxy`
- **Vercel:** team `team_UJugYFpSSuKLZOw0OeBTOuBt` · project `prj_PmBnpJako14yeGFZRcNZ5PWvOHiM`
- **Stack:** React 18 + Vite + Supabase + Vercel
- **Cascata IA:** Gemini 2.5 Flash → DeepSeek V3 → GPT-4o-mini → Claude Sonnet
- **Scraper:** Jina.ai (gratuito) + extrator nativo suporteLeiloes + bypass Cloudflare (X-Wait-For-Selector)

---

## ESTADO DO PORTFÓLIO (Supabase auditado 07/04)

| Código | Bairro | Score | Rec. | Tipo | Praça | Lance | Mercado | Desc. | Status |
|--------|--------|-------|------|------|-------|-------|---------|-------|--------|
| BH-002 | Dona Clara | 7.09 | AGUARDAR | leilão | 1ª | R$371k | R$584k | 36% | analisado |
| BH-004 | Silveira | 5.97 | COMPRAR | leilão | 2ª | R$544k | R$821k | 34% | analisado |
| BH-006 | Silveira | 5.03 | AGUARDAR | mercado | — | — | R$270k | — | analisado |
| MG-007 | Buritis | — | — | leilão | 1ª | R$360k | R$420k | 14% | **PENDENTE** |
| CT-001 | Europa | 7.70 | COMPRAR | leilão | — | — | — | — | arquivado |
| CT-003 | Conquista | 4.62 | AGUARDAR | mercado | — | R$235k | R$224k | — | analisado |
| CT-005 | — | 4.98 | EVITAR | mercado | — | — | R$145k | — | arquivado |

---

## O QUE FOI ENTREGUE NESTA SESSÃO (07/04 — 2 commits)

### Commit `a19ac0b` — Fix Cloudflare Scraper
- `CLOUDFLARE_DOMAINS` list para alexandrepedrosaleiloeiro.com.br
- `X-Wait-For-Selector` header no Jina pra esperar renderização
- Detecção dinâmica de "just a moment" + retry automático
- Fallback Google Cache como última tentativa
- Timeout 50s pra sites Cloudflare

### Commit `44ba543` — Sprint 13 Features
- **supabase.js:** 26 dead functions removidas (-256 linhas) + 3 campos no IMOVEIS_LIST_COLS (`parcelamento_detalhes`, `coproprietarios`, `distribuicao_pavimentos`)
- **ComparaveisComFiltros.jsx (NOVO):** filtros tipo/quartos/preço, ordenação 4 modos, stats média
- **CalculadoraROI.jsx:** guard `precoAquisicao <= 0` → mensagem em vez de ROI 16820%
- **CenariosReforma.jsx:** oculta painel inteiro quando `semDados` (era opacity 0.3 com ROI 429% visível)
- **ManualAxis.jsx:** aba ❓ FAQ com 9 Q&A em acordeão animado
- **Detail.jsx:** integra ComparaveisComFiltros nos 2 pontos de renderização

### Supabase — Dados corrigidos
- BH-006: `preco_pedido` 0→null, `custo_reforma_calculado` 0→null, `comissao_leiloeiro_pct` null, avaliação/mínimo/praça→null, banheiros 0→2
- CT-003/CT-005: comissão leiloeiro→null (mercado direto), praca→null
- MG-007: populado com dados do screenshot (2q Buritis R$360k desocupado) + mercado (R$420k, R$7.635/m²)

---

## SPRINT 14 — TAREFAS

### P0 — Bugs
1. **MG-007 sem score:** Rodar Reanalisar (Gemini) no MG-007 pra gerar score, comparáveis e análise completa. Dados base já estão no banco.
2. **BH-002 "Invalid Date"** nos cards da lista — `data_leilao` está OK no banco (`"2026-04-08"`). Pode ser race condition no parse ou o imóvel não está nos resultados da query. Verificar `new Date(p.data_leilao+'T12:00')` no App.jsx.
3. **Countdown nos cards** — existe no Dashboard/Controle de Leilões e no botão flutuante do Detail, mas NÃO nos cards da lista de imóveis. Adicionar badge D-N nos cards.

### P1 — Features visuais (branch Claude Code anterior perdida — reimplementar)
4. **Sidebar 64px** com ícones Lucide + tooltip nativo `title` (App.jsx, sidebar 200px→64px, esconder texto, só ícones)
5. **Score ring animado** — `requestAnimationFrame` com cubic ease-out 800ms, 0→score. Usar em App.jsx (cards) e Detail.jsx (header).
6. **Mapa locais próximos** — novo `MapaLocaisProximos.jsx`:
   - Leaflet + Overpass API
   - 11 categorias: Transporte, Supermercado, Farmácia, Hospital, Escola, Universidade, Shopping, Parque, Banco, Academia, Restaurante
   - Raio 500m/1km/2km selecionável
   - Marcadores coloridos por categoria + contadores
   - Integrar em Detail.jsx quando `coordenadas_lat`/`coordenadas_lng` disponíveis (atualmente só BH-004 tem)
7. **Anotações privadas** — textarea no Detail.jsx com `localStorage` por imóvel (`axis_nota_{id}`), auto-save `onBlur` + botão manual, aviso de privacidade
8. **Foto principal 300px** — Detail.jsx, atualmente `height: 220px` → mínimo `300px`, `maxHeight: 480px`
9. **Glossário acordeão** — ManualAxis.jsx, aba Glossário: cada item colapsável individualmente em vez de todos expandidos

### P2 — Melhorias
10. **Score ring estático no Dashboard** — gauge donut presente mas sem animação CSS
11. **Badge de praça explícita** no header Detail — código prioriza `praca` sobre `num_leilao` mas audit Chrome viu "55º LEILÃO" (cache?). Verificar.

---

## CONVENÇÕES
- Commits em português, prefixo semântico (feat/fix/docs)
- `git config user.email "axis@cotars.com" && git config user.name "AXIS Bot"`
- Build (`npx vite build`) sempre antes de push
- Custos → importar de `src/lib/constants.js`, NUNCA hardcoded
- Modelos → `MODELOS_GEMINI` / `CLAUDE_MODEL` de constants.js
- Responder sempre em português

## ARQUITETURA (arquivos grandes)
| Arquivo | Linhas | Função |
|---------|--------|--------|
| App.jsx | 1954 | Router, sidebar, lista, análise em lote |
| Detail.jsx | 1691 | Detalhe do imóvel, abas, similares |
| motorIA.js | 1712 | Motor de análise Gemini (cascata 4 camadas) |
| supabase.js | 1111 | Queries Supabase (recém limpo -256 linhas) |
| ManualAxis.jsx | 991 | Manual interativo 10 abas |
| scraperImovel.js | 566 | Scraper Jina + Cloudflare bypass |
| Dashboard.jsx | 502 | Dashboard, pós-leilão, controle leilões |

## BRANCHES MORTAS (podem ser deletadas)
- `origin/claude/audit-axis-implementation-6Iyyj`
- `origin/claude/audit-hardcoded-costs-YcgsX`
- `origin/claude/fix-double-penalties-HveXF`
- `origin/claude/fix-login-encoding-KgdZ4`
- `origin/claude/implement-todo-item-KIIlh`
- `origin/claude/sprint8-alertas-comparacao`
