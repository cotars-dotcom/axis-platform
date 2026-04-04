# AXIS — Plano Definitivo de Correções (Sprint 9)

> Gerado em 04/04/2026 · Commit base: cdd2b2d
> Total: 31 itens (8 já corrigidos + 23 pendentes)

## FASE 1 — BUGS FINANCEIROS (impacto em relatórios)

### 1.1 ✅ CORRIGIDO — Links comparáveis VivaReal/ZAP 404
- **Commit:** 4f2c2b3

### 1.2 ✅ CORRIGIDO — Constantes centralizadas (constants.js)
- **Commit:** cdd2b2d

### 1.3 🔴 PENDENTE — PainelRentabilidade cobra 5% comissão para MERCADO DIRETO
- **Arquivo:** PainelRentabilidade.jsx L36-42
- **Bug:** `custoArrematacao()` sempre aplica comissão 5% + advogado 2%
- **Impacto:** ROI, MAO e lucro ERRADOS para imóveis de mercado (CT-003, etc.)
- **Fix:** Usar `CUSTOS_LEILAO`/`CUSTOS_MERCADO` do constants.js baseado em `eMercado`

### 1.4 🔴 PENDENTE — PainelLancamento custos hardcoded (TX object)
- **Arquivo:** PainelLancamento.jsx L15-24
- **Bug:** TX hardcoded sem importar constants.js
- **Fix:** Importar `CUSTOS_LEILAO` do constants.js

### 1.5 🔴 PENDENTE — Detail.jsx custo total inline divergente
- **Arquivo:** Detail.jsx L1821
- **Bug:** Usa `1.035` e `1.105` inline vs cálculo taxa-a-taxa dos painéis
- **Fix:** Usar `calcularCustosAquisicao()` do constants.js

### 1.6 🟡 PENDENTE — ITBI default 2% (leilão) vs 3% real BH
- **Arquivo:** PainelLancamento.jsx L17, Detail.jsx L1824
- **Bug:** ITBI de leilão em BH é 3% desde 2024, não 2%
- **Fix:** constants.js já tem 3%, aplicar via import

### 1.7 🟡 PENDENTE — comissao_leiloeiro_pct do banco não propaga
- **Arquivo:** PainelRentabilidade L37, PainelLancamento L16
- **Bug:** Se edital tem comissão diferente de 5%, o campo do banco existe mas não é lido
- **Fix:** Ler `imovel.comissao_leiloeiro_pct || CUSTOS_LEILAO.comissao_leiloeiro_pct`

## FASE 2 — MOTOR IA / CASCATA

### 2.1 ✅ CORRIGIDO — Modelos Gemini hardcoded (5 arquivos)
- **Commit:** cdd2b2d

### 2.2 ✅ CORRIGIDO — Pesos de score em 4 locais
- **Commit:** cdd2b2d

### 2.3 🟡 PENDENTE — motorAnaliseGemini.js prompt Gemini modelo hardcoded
- **Arquivo:** motorAnaliseGemini.js L269-271
- **Nota:** Este arquivo JÁ tem cascata própria — ok como está

### 2.4 🟡 PENDENTE — Gemini fallback silencioso na reanálise
- **Arquivo:** motorAnaliseGemini.js (fallback imovelContexto)
- **Bug:** Se Gemini falha em reanálise, usa dados anteriores sem alerta visível na UI
- **Fix:** Adicionar badge/toast "[ATENCAO] Reanálise usou dados anteriores"

### 2.5 🟡 PENDENTE — analisadorDocumentos.js CLAUDE_MODEL local
- **Arquivo:** analisadorDocumentos.js L7
- **Fix:** Importar de constants.js

## FASE 3 — ANÁLISE JURÍDICA

### 3.1 🔴 PENDENTE — BH-004 PDFs salvos sem análise
- **Ação:** Usar botão "Analisar com IA" na aba Jurídico
- **Risco:** Se PDFs offline, re-download via Jina falha
- **Fix:** Adicionar suporte a re-análise via texto salvo no banco

### 3.2 🟡 PENDENTE — handleAnalisarDoc falha se PDF offline
- **Arquivo:** AbaJuridicaAgente.jsx L480
- **Fix:** Se `doc.conteudo_texto` existe, usar direto sem re-download

### 3.3 🟡 PENDENTE — analisarPDFBase64Gemini usa Pro (10x custo)
- **Arquivo:** agenteJuridico.js L376
- **Nota:** Já corrigido parcialmente via MODELOS_GEMINI_PRO no documentosPDF.js

### 3.4 🟡 PENDENTE — Prompt jurídico não diferencia mercado/leilão
- **Arquivo:** agenteJuridico.js L276
- **Fix:** Adicionar contexto de tipo de transação no prompt

### 3.5 🔵 PENDENTE — calcularNovoScoreJuridico impacto diluído
- **Arquivo:** agenteJuridico.js L416
- **Bug:** `delta / 10` dilui demais o impacto. Score -15 vira apenas -1.5

## FASE 4 — BANCO / SUPABASE

### 4.1 🟡 PENDENTE — try/catch vazio engolindo erros (15+ locais)
- **Arquivos:** App.jsx, supabase.js, agenteJuridico.js
- **Fix:** Adicionar console.warn mínimo nos catch críticos

### 4.2 🟡 PENDENTE — status_operacional case-sensitive
- **Arquivo:** Detail.jsx L987, supabase.js L181
- **Fix:** Normalizar `.toLowerCase()` antes de comparar

### 4.3 🟡 PENDENTE — tipo_transacao residual sem isMercadoDireto
- **Arquivo:** Detail.jsx L1010
- **Fix:** Usar `!isMercadoDireto(im.fonte_url, im.tipo_transacao)`

### 4.4 🔵 PENDENTE — Console.log em produção (~150 chamadas)
- **Fix:** Criar logger condicional `if (import.meta.env.DEV)`

### 4.5 🔵 PENDENTE — modelos_analise tabela pode estar vazia
- **Arquivo:** analiseLeilao.js L43-51
- **Fix:** Fallback para defaults se tabela vazia

## FASE 5 — RELATÓRIO EXPORTADO

### 5.1 🟡 PENDENTE — ExportarPDF usa custos inline (não centralizados)
- **Arquivo:** ExportarPDF.jsx
- **Fix:** Importar calcularCustosAquisicao do constants.js

### 5.2 🟡 PENDENTE — Cenários de reforma no relatório usam custos diferentes
- **Arquivo:** ExportarPDF.jsx (seção reforma)
- **Bug:** Custos de reforma/ROI podem divergir do que mostra na UI
- **Fix:** Propagar mesmos cálculos do CenariosReforma.jsx

### 5.3 🔵 PENDENTE — ManualAxis desatualizado
- **Arquivo:** ManualAxis.jsx
- **Fix:** Atualizar com Sprint 8/9

## FASE 6 — FEATURES NOVAS (Sprint 9)

### 6.1 🔴 — Verificação automática status pós-leilão
### 6.2 🔴 — Export carteira Excel/PDF
### 6.3 🟡 — Link público de compartilhamento
### 6.4 🟡 — Análise em lote de evento
### 6.5 🔵 — Dashboard custo API agregado mensal
