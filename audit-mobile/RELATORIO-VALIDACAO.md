# Relatório de Validação Pós-Sprint M1–M4

**Data:** 2026-06-30  
**Branch:** `claude/mobile-grid-responsive-xrygfb`  
**HEAD:** `3245c83` (fix(mobile/M4): touch targets e font sizes)  
**Método:** Playwright + HTML isolado (sem auth Supabase) — 6 viewports

---

## Matriz de Resultados

| Sprint | Fix | 390px | 430px | 520px | 640L | 768px | 1280px |
|--------|-----|:-----:|:-----:|:-----:|:----:|:-----:|:------:|
| M1a | KPI grid 3→2→1 col | ✅ 1 | ✅ 1 | ✅ 1 | ✅ 1 | ✅ 2 | ✅ 3 |
| M1b | PropCard grid auto→1 | ✅ 1 | ✅ 1 | ✅ 1 | ✅ 1 | ✅ 2 | ✅ 4 |
| M1c | Charts 2→1 col @480 | ✅ 1 | ✅ 1 | ✅ 2 | ✅ 2 | ✅ 2 | ✅ 2 |
| M2 | Table overflowX:auto | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| M3 | Modal maxH:90vh scroll | ✅ | ✅ | ✅ | ✅ 351px | ✅ | ✅ |
| M4b | Font sizes ≥9-10px | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| M4a | Touch targets ≥32px | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| — | Sem overflow horizontal | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## M1 — Grid Fixes ✅ CONFIRMADO

**Breakpoints aplicados corretamente em todos os viewports.**

| Grid | Regra | Resultado medido |
|------|-------|-----------------|
| KPI | 3-col > 2-col@900 > 1-col@640 | 390/430/520/640L = 1 · 768 = 2 · 1280 = 3 ✓ |
| PropCard | auto-fill minmax(300) > 1-col@640 | 390–640L = 1 · 768 = 2 · 1280 = 4 ✓ |
| Charts | 2-col > 1-col@480 | 390/430 = 1 · 520+ = 2 ✓ |

Sem overflow horizontal em nenhum viewport (`body.scrollWidth == innerWidth` em todos).

---

## M2 — Tabela CenariosReforma ✅ CONFIRMADO

`<div style={{overflowX:'auto'}}>` wrapper adicionado em `CenariosReforma.jsx:472`.

Computed style verificado: `overflowX: auto` em todos os viewports.  
Tabela com 7 colunas (Item/Un/Qtd/R$/un/Subtotal/Fonte/Obs) —
`scrollWidth > clientWidth` em 390px; scroll horizontal disponível sem corte.

---

## M3 — ApiKeyModal Scroll ✅ CONFIRMADO

`maxHeight:"90vh"` + `overflowY:"auto"` adicionados em `App.jsx:524`.

| Viewport | maxHeight calculado | overflowY |
|----------|--------------------:|-----------|
| 390×844 portrait | 759.6px (= 0.9×844) | auto |
| 640×390 landscape | **351px (= 0.9×390)** | auto |
| 768×1024 iPad | 921.6px | auto |

Caso crítico landscape (390px height) confirmado: o modal scrollará antes de
sair do viewport.

---

## M4b — Font Sizes ✅ CONFIRMADO

| Elemento | Antes | Depois | Medido |
|----------|------:|-------:|-------:|
| AxisLogo tagline (`App.jsx:66`) | 8.5px | 10px | **10px** ✓ |
| Badge "2ª PRAÇA" (`Dashboard.jsx:98`) | 8px | 9px | **9px** ✓ |
| Badge "🏠 MERCADO" (`Dashboard.jsx:99`) | 8px | 9px | **9px** ✓ |
| Label "/100" abaixo ScoreRing (`Dashboard.jsx:155`) | 8px | 10px | **10px** ✓ |

---

## M4a — Touch Targets ⚠️ PARCIALMENTE CORRETO

### O que foi corrigido

`btn('s')` global em `appConstants.js:83`: padding `6px 12px` → `10px 14px`.  
Isso beneficia **qualquer chamada `btn('s')` sem override local** — modais, Detail actions, close buttons, etc.

### Onde o override local anula o fix

Os 4 botões da barra de filtros Lista (`App.jsx:1429–1451`) fazem `{...btn("s"), padding:'8px 12px/14px', border:...}`, o que **sobrescreve** o padding do btn global.

| Botão | Padding M4 | Border | Altura medida | vs antes | vs 44px |
|-------|-----------|--------|:-------------:|:--------:|:-------:|
| Urgentes | `8px 12px` | 1px solid | **32px** | +10px | -12px |
| Selecionar | `8px 12px` | 1px solid | **32px** | +10px | -12px |
| Analisar Docs | `8px 14px` | none | **30px** | +8px | -14px |
| Comparar | `8px 14px` | none | **30px** | +8px | -14px |
| "completar dados" | `6px 12px` | 1px solid | **26px** | +8px | -18px |

> **Nota CSS:** Urgentes/Selecionar são 2px mais altos que Analisar/Comparar porque têm
> `border: 1px solid` — com box-sizing:border-box o border está dentro do box, mas o
> navegador inclui a borda no offsetHeight final. É comportamento correto, não bug.

### Item não auditado em M4 (lacuna)

`CustosReaisEditor.jsx:118`: `padding: '5px 12px'` — **não tocado em M4**, permanece em ~22px.

### Conclusão M4a

Todos os targets **melhoraram** (nenhuma regressão). Nenhum atingiu o mínimo Apple HIG de 44px.  
Os botões da barra Lista são componentes de densidade alta (toolbar) — atingir 44px
exigiria redesenho da barra. Decisão de prioridade cabe ao produto.

---

## Regressões

**Nenhuma detectada.** Os 4 commits M1–M4 não introduziram:

- Overflow horizontal novo
- Quebra de grid em viewport onde funcionava antes
- Modal sem scroll que antes scrollava
- Font size que regrediu

---

## Resumo Executivo

| Sprint | Status | Observação |
|--------|--------|-----------|
| M1 — Grids KPI / PropCard / Charts | ✅ **APROVADO** | Todos os 3 breakpoints corretos |
| M2 — Tabela orçamento CenariosReforma | ✅ **APROVADO** | overflowX:auto funcional |
| M3 — ApiKeyModal landscape scroll | ✅ **APROVADO** | maxHeight 90vh confirmado |
| M4b — Font sizes | ✅ **APROVADO** | 9–10px em todos viewports |
| M4a — Touch targets | ⚠️ **PARCIAL** | Melhora real (+8–10px), não atinge 44px; override local nas 4 chips de Lista; `CustosReaisEditor.jsx:118` em aberto |

**Pendências para próximo ciclo (opcional):**
1. Lista chips toolbar: avaliar se 32px é aceitável para contexto desktop-first ou subir para 40px
2. `CustosReaisEditor.jsx:118`: `padding:'5px 12px'` → `'8px 12px'`
