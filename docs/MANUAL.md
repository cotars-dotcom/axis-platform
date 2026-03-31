# AXIS Platform — Manual Técnico Completo

**Versão:** 1.0 — 31/03/2026
**Repositório:** github.com/cotars-dotcom/axis-platform (privado)
**Stack:** React 18 + Vite + Supabase JS v2 + Vercel
**Autor:** Gabriel — Construtora Conde de Aguiar / SOMAQ

---

## 1. Visão Geral

O AXIS é uma plataforma de inteligência patrimonial para análise de investimentos imobiliários, focada em leilões judiciais e oportunidades de mercado direto na região de Belo Horizonte e Minas Gerais.

A plataforma recebe uma URL de anúncio (leilão ou portal imobiliário), extrai dados automaticamente via scraping + IA, calcula scores multidimensionais, estima retorno (flip e locação), e gera relatórios exportáveis.

### 1.1 Tipos de Imóvel Suportados

- **Leilão Judicial/Extrajudicial:** Marco Antônio Leiloeiro, Mega Leilões, Zuk, Superbid, Caixa, TJMG, TRT
- **Mercado Direto:** VivaReal, ZAP Imóveis, QuintoAndar, OLX, Loft, 123i, ChavesNaMão, imovelweb

### 1.2 Métricas Principais

- **Score AXIS (0-10):** média ponderada de 6 dimensões (Localização 20%, Desconto 18%, Jurídico 18%, Ocupação 15%, Liquidez 15%, Mercado 14%)
- **MAO (Maximum Allowable Offer):** lance máximo para margem de 20% no flip
- **Yield Bruto:** retorno anual de locação sobre custo total
- **ROI por cenário de reforma:** básica, média e completa (SINAPI-MG 2026)

---

## 2. Arquitetura

### 2.1 Frontend (20.063 linhas)

| Arquivo | Linhas | Função |
|---------|--------|--------|
| App.jsx | 1.702 | Router, estado global, listagem, análise |
| Detail.jsx | 1.801 | Detalhe do imóvel, painéis, exportação |
| PainelRentabilidade.jsx | 410 | Flip vs Locação, cenários de lance |
| PainelLancamento.jsx | 425 | Análise de lançamento/arrematação |
| CenariosReforma.jsx | 290 | 6 escopos SINAPI com custos e ROI |
| CalculadoraROI.jsx | 197 | Calculadora interativa (flip/locação/financiado) |
| CustosReaisEditor.jsx | — | Editor inline de custos reais com badges |
| ExportarPDF.jsx | 580 | Relatório HTML interativo com fotos base64 |
| Dashboard.jsx | 464 | Gráficos e métricas agregadas |
| Tarefas.jsx | 419 | Kanban drag-and-drop com colunas |
| BuscaGPT.jsx | — | Busca inteligente de arremates similares |

### 2.2 Backend / Libs

| Arquivo | Linhas | Função |
|---------|--------|--------|
| motorIA.js | 1.704 | Cascata de motores IA (Gemini → DeepSeek → GPT-4o-mini → Claude) |
| motorAnaliseGemini.js | 821 | Motor Gemini Flash + Google Search Grounding para SPAs |
| supabase.js | 1.196 | CRUD, geração de código AXIS, proteção de campos, whitelist |
| scraperImovel.js | 304 | Jina.ai scraper + regex extractor + SPA detection |
| reformaUnificada.js | 251 | Tabela SINAPI-MG 2026, escopos, fatores |
| detectarFonte.js | — | Classificação automática leilão vs mercado direto |
| documentosPDF.js | 637 | Pipeline de análise de documentos (edital, RGI, débitos) |
| trelloService.js | 599 | Integração Trello (cards, listas, etiquetas) |

### 2.3 Dados Estáticos

| Arquivo | Função |
|---------|--------|
| metricas_bairros_bh.js | 21 bairros BH + 7 zonas + IPEAD classes + dados QuintoAndar/FipeZAP |
| mercado_regional.js | 16 regiões (BH, Nova Lima, Contagem, JF) com preço/m², yield, tendência |
| custos_reforma.js | Classes de reforma SINAPI por padrão de acabamento |
| riscos_juridicos.js | Base de riscos por tipo de processo e modalidade |

### 2.4 Banco de Dados (Supabase PostgreSQL)

**Tabelas principais:**
- `imoveis` — 167+ colunas (dados do imóvel, scores, custos, fotos, comparáveis)
- `mercado_regional` — preço/m² por região, yield, tendência, classe IPEAD
- `profiles` — usuários com roles (admin/user)
- `tarefas` — Kanban de tarefas vinculadas a imóveis
- `api_usage_log` — log de chamadas API (custo por motor)
- `app_settings` — configurações globais
- `user_api_keys` — chaves API por usuário com RLS

---

## 3. Pipeline de Análise

### 3.1 Fluxo Completo

```
URL do imóvel
    ↓
1. detectarTipoTransacao(url)
    → "leilao" ou "mercado_direto"
    ↓
2. scrapeUrlJina(url)
    → texto extraído via Jina.ai (grátis)
    → verificarQualidadeScrape() detecta SPAs
    ↓
3. extrairCamposTexto(texto)
    → regex extrai: preço, área, quartos, vagas, endereço, ocupação
    ↓
4. [Se SPA detectado] chamarGeminiComGrounding(url)
    → Gemini 2.0 Flash + Google Search Retrieval
    → busca dados reais do anúncio na web
    ↓
5. [Normal] chamarGemini(prompt)
    → Cascata: gemini-2.0-flash → 2.0-flash-exp → 1.5-flash → 1.5-pro
    → Retorna JSON com 80+ campos incluindo scores, síntese, comparáveis
    ↓
6. [Fallback] Cascata motorIA.js
    → DeepSeek V3 → GPT-4o-mini → Claude Sonnet → regex_fallback
    ↓
7. validarECorrigirAnalise()
    → Normaliza scores 0-10, corrige outliers, calcula derivados
    ↓
8. calcularScore(pesos)
    → Score AXIS ponderado
    ↓
9. Calibração mercado (metricas_bairros_bh.js)
    → score_mercado calibrado com IPEAD, yield real, tendência
    → fator_homogenizacao calculado por atributos do prédio
    ↓
10. saveImovelCompleto()
     → Validação → Supabase upsert → Proteção de campos
```

### 3.2 Detecção de SPA (Sites React/Next)

Domínios SPA conhecidos: QuintoAndar, Loft, 123i, ChavesNaMão, LugarCerto

**verificarQualidadeScrape()** analisa:
- Indicadores de erro: "404", "page not found", "enable javascript", "captcha"
- Sinais úteis: preço (R$), área (m²), quartos, endereço
- Heurística: SPA domain + <2 sinais úteis = falha

**Quando falha:** usa `chamarGeminiComGrounding()` com `google_search_retrieval` para buscar dados diretamente no Google.

### 3.3 Salvamento com Proteção

O `saveImovelCompleto()` inclui:
- **Whitelist de 167 colunas** — campos fora da lista são descartados
- **Proteção de campos críticos** — scores, preços e títulos não são sobrescritos com null/zero
- **Proteção de identidade** — bairro, cidade, tipo não mudam para valores suspeitos
- **Proteção de degradação** — score_total não pode cair mais de 1.0 pt em reanálise
- **Preservação de fotos/comparáveis** — só sobrescreve se novo tiver mais dados

### 3.4 Validação Pré-Save

Antes de salvar, o app verifica:
- Se tem preço > 0 OU título válido (>5 chars)
- Se não tem → mostra erro claro, não adiciona ao state, não navega
- Se score = 0 → adiciona alerta mas salva (dados podem estar parciais)

---

## 4. Métricas e Dados de Mercado

### 4.1 Fontes

| Fonte | Dados | Período |
|-------|-------|---------|
| QuintoAndar 3T2025 | Preço contrato/anúncio por zona, yield, demanda | Set/2025 |
| FipeZAP fev/2026 | Variação mensal/anual, preço médio por bairro | Fev/2026 |
| IPEAD/UFMG | Classificação socioeconômica dos bairros (4 classes) | Censo 2000 |
| PRODABEL/PBH | Cadastro imobiliário (área, tipo construtivo, zoneamento) | Contínuo |
| SINAPI-MG 2026 | Custos de reforma por m² e classe | Jan/2026 |
| Secovi-MG | Dados complementares de mercado | Jul/2025 |

### 4.2 Referências BH

| Métrica | Valor |
|---------|-------|
| Preço médio venda m² BH | R$ 10.595 |
| Variação 12 meses venda | +8,82% |
| Yield médio BH (anual) | 5,80% |
| Ticket médio BH | R$ 613.344 |
| Preço médio locação m² BH | R$ 48,28 |
| Variação 12 meses locação | +10,52% |
| Rental yield anual BH | 5,16% |

### 4.3 Score AXIS por Bairro

Calculado com: yield × 40% + tendência × 35% + demanda × 25%

Funções exportadas: `calcScoreAxis`, `rankingAxis`, `filtrarBairros`, `melhorCustoBeneficio`, `calcGapPrecoPct`, `getClasseIPEAD`

### 4.4 Homogeneização (NBR 14653 / IBAPE)

Fatores aplicados sobre preço de anúncio:

| Atributo | Impacto Venda | Impacto Aluguel |
|----------|---------------|-----------------|
| Sem elevador | -15% | -15% |
| Sem piscina | -3% | -2% |
| Sem área de lazer | -5% | -4% |
| Sem salão de festas | -3% | -2% |
| Sem vaga | -10% | -12% |
| 2ª vaga | +5% | +4% |
| Mobiliado | — | +15% |
| Semi-mobiliado | — | +8% |

---

## 5. Custos de Reforma (SINAPI-MG 2026)

### 5.1 Custo/m² por Escopo e Classe

| Escopo | A Prime | B Médio-Alto | C Intermediário | D Popular |
|--------|---------|--------------|-----------------|-----------|
| Sem reforma | 0 | 0 | 0 | 0 |
| Refresh de Giro | 420 | 375 | 335 | 280 |
| Leve Funcional | 710 | 645 | 585 | 520 |
| Leve Reforçada | 1.175 | 1.070 | 975 | 870 |
| Média | 1.600 | 1.450 | 1.300 | 1.100 |
| Pesada | 2.500 | 2.200 | 1.900 | 1.600 |

### 5.2 Fatores de Valorização Pós-Reforma

| Escopo | Fator | Liquidez Bonus | Prazo Obra (meses) |
|--------|-------|----------------|---------------------|
| Sem reforma | 1,00 | 0% | 0 |
| Refresh de Giro | 1,04 | +5% | 0,5 |
| Leve Funcional | 1,08 | +12% | 1,5 |
| Leve Reforçada | 1,12 | +18% | 2,5 |
| Média | 1,18 | +25% | 4 |
| Pesada | 1,28 | +20% | 7 |

### 5.3 Context Centralizado (useReforma)

O hook `useReforma.jsx` sincroniza o cenário de reforma selecionado entre PainelRentabilidade, PainelLancamento e CenariosReforma via React Context (`ReformaProvider`).

Fonte de verdade: banco de dados (custo_reforma_basica/media/completa) → fallback SINAPI.

---

## 6. Mercado Direto vs Leilão

### 6.1 Diferenças no App

| Aspecto | Leilão | Mercado Direto |
|---------|--------|----------------|
| Base aquisição | valor_minimo (lance) | preco_pedido |
| Comissão leiloeiro | 5% | 0% |
| Honorário advogado | 2% | 0% |
| ITBI | 2-3% | 3% |
| Prazo liberação | Variável (judicial) | 0 meses |
| Badge | 🔨 LEILÃO (1º/2º) | 🏠 MERCADO |
| Cenários lance | Piso/Esperado/Competitivo | Preço pedido/-5%/-10%/-15% |
| Labels | "Lance mínimo" | "Preço pedido" / "Preço aquisição" |

### 6.2 Detecção Automática

`detectarFonte.js` classifica pela URL:
- Domínios de leilão: marcoantonioleiloeiro, leilaovip, zuk, superbid, caixa...
- Domínios de mercado: vivareal, zapimoveis, quintoandar, olx, loft...
- Heurísticas: palavras "leilão/lote" vs "venda/compra"

---

## 7. Exportação de Relatórios

### 7.1 Formato HTML Interativo

- **Com JavaScript (browser):** abas clicáveis (Resumo, Reforma, Detalhe, Comparáveis)
- **Sem JavaScript (WhatsApp):** flat mode com seções separadas por dividers azuis
- **Fotos:** convertidas para base64 data URI via `imageUrlToBase64()` com fallback proxy wsrv.nl
- **Galeria:** foto principal + até 4 fotos extras em strip horizontal

### 7.2 Conteúdo do Relatório

- Header com foto, título, código AXIS, score, badges
- Valores: preço/mercado/aluguel
- Score por dimensão com barras visuais
- Resumo financeiro (custos + retorno)
- Síntese executiva + alertas
- Atributos do prédio
- 3 cenários de reforma com ROI
- Tabela de aluguel estimado por cenário (sem reforma/básica/média/completa com yield)
- Ficha técnica + jurídico
- Comparáveis com links
- Dados AXIS do bairro (quando disponível)

---

## 8. Código AXIS (Identificação)

### 8.1 Formato

`PREFIXO-NNN` (sequencial global)

| Cidade | Prefixo |
|--------|---------|
| Belo Horizonte | BH |
| Contagem | CT |
| Betim | BT |
| Juiz de Fora | JF |
| Nova Lima | NL |
| Ribeirão das Neves | RN |
| Santa Luzia | SL |
| Sabará | SB |
| Outras MG | MG |

### 8.2 Geração

`gerarAxisId(cidade)` busca todos os códigos existentes no banco, extrai o maior número final via regex, e incrementa.

---

## 9. Integrações

### 9.1 Supabase (PostgreSQL)

- Auth com JWT
- RLS desabilitado (tabela imoveis)
- Tabelas: imoveis, mercado_regional, profiles, tarefas, api_usage_log, app_settings
- Views: vw_axis_ranking_yield, vw_axis_score_patrimonial, vw_axis_preco_gap

### 9.2 Trello

- Cards automáticos com etiquetas coloridas por recomendação
- Sincronização de status

### 9.3 APIs de IA

| Motor | Custo | Uso |
|-------|-------|-----|
| Gemini 2.0 Flash | ~R$ 0,03 | Motor principal (análise + fotos) |
| Gemini + Grounding | ~R$ 0,05 | SPAs (busca na web via Google) |
| DeepSeek V3 | ~R$ 0,08 | Fallback 1 |
| GPT-4o-mini | ~R$ 0,10 | Fallback 2 (BuscaGPT) |
| Claude Sonnet | ~R$ 0,40 | Fallback 3 (último recurso) |

### 9.4 Jina.ai (Scraping)

Gratuito, sem chave. Formatos: markdown, HTML, text. Timeout: 25s.

---

## 10. Deploy e Infraestrutura

- **Hosting:** Vercel (deploy automático via push no main)
- **Banco:** Supabase (us-west-2, PostgreSQL 17.6)
- **Domínio:** configurado via Vercel
- **Build:** Vite ~21s

---

## 11. Histórico de Sprints (Mar/2026)

### Sprint 1-3 (21-27 Mar)
- Setup inicial: Supabase + Auth + motorIA cascata
- metricas_bairros_bh.js com dados QuintoAndar/FipeZAP/IPEAD
- Dashboard, Tarefas Kanban, PainelLeilao
- Gemini Vision (detecção de atributos visuais)

### Sprint 4 (28-30 Mar)
- useReforma.jsx — Context centralizado
- reformaUnificada.js — SINAPI fonte única
- Homogeneização por atributos (elevador, piscina, vagas)
- CustosReaisEditor inline com badges REAL/ESTIMADO
- ExportarPDF — relatório interativo HTML
- GPT-4o-mini na cascata IA
- Fotos VivaReal/ZAP via Jina HTML

### Sprint 5 (31 Mar)
- Mercado direto: preco_pedido como base, labels adaptados, sem comissão leiloeiro
- SPA Detection + Gemini Google Search Grounding (QuintoAndar funciona)
- Validação pré-save + Supabase-first save (elimina imóveis fantasma)
- Código AXIS sequencial fix (bug do formato com ano)
- Card redesign: código topo esquerdo, cidade topo direito
- Export WhatsApp: flat mode sem JS + fotos base64 embutidas
- Desconto e MAO Flip calculam on-the-fly quando null
- Galeria de fotos no relatório exportado
- Aluguel "/mês" corrigido

---

## 12. Próximos Passos

- [ ] Tabela `analise_log` no Supabase para rastrear tentativas
- [ ] Alertas push para oportunidades score > 7.5
- [ ] Comparação automática entre mercado direto vs leilão para mesma tipologia
- [ ] Integração WhatsApp Business para envio de relatórios
- [ ] App mobile nativo (React Native ou PWA)
- [ ] Score de bairro dinâmico com dados em tempo real
