# AXIS IP — Prompt para Claude Code

## Setup Inicial
```bash
git clone https://github.com/cotars-dotcom/axis-platform.git
cd axis-platform
npm install
```

## Contexto
AXIS IP é uma plataforma React 18 + Vite + Supabase para análise de imóveis em leilão judicial na RMBH. Deploy automático no Vercel via push no `main`.

## Infraestrutura
- **Supabase:** `vovkfhyjjoruiljfjrxy` (tabelas: imoveis, documentos_juridicos, timeline_matricula, shared_links, profiles, agent_cache, agent_logs)
- **Vercel:** team `team_UJugYFpSSuKLZOw0OeBTOuBt` | project `prj_PmBnpJako14yeGFZRcNZ5PWvOHiM`
- **Produção:** https://axisip.vercel.app
- **Git user:** `AXIS Bot <axis@cotars.com>`

## Estrutura do Código (arquivos-chave)
```
src/
├── App.jsx                    # PropCard, Dashboard, Sidebar, routing
├── appConstants.js            # C, K, card(), btn() — design tokens
├── components/
│   ├── Detail.jsx             # Página de detalhe do imóvel (~1700 linhas)
│   ├── Dashboard.jsx          # Grid de cards + PainelPosLeilao
│   ├── PainelInvestimento.jsx # Breakdown, ROI, cenários, preditor (Sprint 11)
│   ├── TimelineMatricula.jsx  # Timeline de atos registrais (Sprint 12)
│   ├── PainelLancamento.jsx   # Lances e praças
│   ├── PainelRentabilidade.jsx
│   ├── CenariosReforma.jsx    # Reforma SINAPI
│   ├── CalculadoraROI.jsx
│   ├── CustosReaisEditor.jsx
│   ├── AbaJuridicaAgente.jsx  # Aba jurídica com análise IA
│   ├── ExportarPDF.jsx        # Export HTML/PDF/compartilhar
│   └── SharedViewer.jsx       # Viewer público via token
├── lib/
│   ├── constants.js           # CUSTOS_LEILAO, MODELOS_GEMINI, calcularBreakdownFinanceiro, calcularROI, calcularPreditorConcorrencia
│   ├── supabase.js            # IMOVEIS_COLS, saveImovelCompleto, getImoveis, etc.
│   ├── motorIA.js             # Pipeline de análise: scrape→Gemini→parse→save
│   ├── motorAnaliseGemini.js  # Cascata Gemini com grounding
│   ├── agenteJuridico.js      # Análise jurídica de editais/matrículas
│   ├── scraperImovel.js       # Scrape via Jina.ai
│   ├── documentosPDF.js       # Download/processamento de PDFs
│   ├── detectarFonte.js       # isMercadoDireto()
│   └── reformaUnificada.js    # SINAPI-MG 2026
```

## Convenções
- Commits: `feat(sprintN):`, `fix:`, `fix(P0):`, `docs:`, `refactor:`
- Git config: `git config user.name "AXIS Bot" && git config user.email "axis@cotars.com"`
- Build: `npx vite build` (deve passar sem erros)
- Push: `git push origin main` (deploy automático Vercel)
- Idioma: português brasileiro (código em inglês, mensagens em pt-BR)
- Formatting: inline styles (não usa CSS modules), emojis nos labels

## Modelos IA Ativos
```javascript
MODELOS_GEMINI = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash']
MODELOS_GEMINI_PRO = ['gemini-2.5-pro', 'gemini-2.5-flash']
CLAUDE_MODEL = 'claude-sonnet-4-20250514'
```

## Bugs Conhecidos (já corrigidos — NÃO reintroduzir)
1. Hooks ANTES de conditional returns (React Error #310)
2. CUSTOS_LEILAO usa % inteiro (5.0 = 5%), precisa /100 na fórmula
3. ROI precisa de guard: `if(!investimentoTotal || investimentoTotal<=0)` retorna invalido
4. Score 0 deve mostrar "N/A", não "0.0 FRACO"
5. Gemini 1.5 modelos retornam 404 (desligados)
6. Jina.ai: usar `X-Return-Format: 'markdown'` (nunca 'text' — perde acentos)
7. data_leilao: parse com `split('-')` + `new Date(y, m-1, d)` (nunca `new Date('YYYY-MM-DD')` direto — timezone bug)

## Tarefas Pendentes (Sprint 13)

### P1 — Alta prioridade
1. **Comparáveis de mercado com filtros**: buscar imóveis similares no ZAP/VivaReal, tabela filtrável
2. **Dead code cleanup**: 20 funções mortas em supabase.js (~400 linhas)

### P2 — Média prioridade  
3. **Sidebar ícones vertical**: converter sidebar 200px texto → 64px ícones com tooltips
4. **Mapa locais próximos**: Leaflet + Overpass API, 11 categorias, raio configurável
5. **Score AXIS gauge redesign**: donut animado como o IPL do Ninja

### P3 — Baixa prioridade
6. **FAQ acordeão animado**: substituir lista por acordeões com CSS max-height
7. **Anotações privadas por imóvel**: textarea persistido no Supabase
8. **Foto do imóvel maior**: 200px → 300px com carrossel

## Auditoria Rápida (rodar antes de qualquer mudança)
```bash
# Verificar se builda
npx vite build

# Verificar modelos Gemini (não deve ter 1.5 em uso)
grep -rn "gemini-1.5" src/lib/ --include="*.js"

# Verificar hooks (nenhum hook após conditional return)
grep -n "return.*<\|return null" src/App.jsx | head -5

# Dead code check
grep -n "^export.*function" src/lib/supabase.js | wc -l

# Verificar NaN/Infinity guards
grep -n "NaN\|Infinity\|isNaN\|isFinite" src/lib/constants.js
```

## Como Testar
1. `npx vite build` — deve compilar sem erros
2. `npx vite dev` — abrir localhost:5173
3. Login: verificar com credenciais Supabase
4. Navegar: Dashboard → clicar BH-004 → verificar PainelInvestimento, Timeline, cards
5. Verificar console: zero erros React, zero NaN/undefined
