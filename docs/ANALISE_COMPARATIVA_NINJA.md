# AXIS IP vs Leilão Ninja — Análise Crítica e Roadmap

**Data:** 05/04/2026 | **Imóvel:** BH-004 Triplex Silveira

---

## 1. VALIDAÇÃO DE DIVERGÊNCIAS CRÍTICAS

### 1ª vs 2ª Praça — AXIS CORRETO, NINJA ERRADO
O edital diz textualmente: *"DATA DO LEILÃO: 04/03/2026. Se não for vendido, será realizado o **2º leilão** no dia 08/04/2026"*. A 1ª praça já aconteceu em março e não houve comprador. O AXIS classifica corretamente como 2ª praça. O Ninja erra ao classificar como 1ª praça.

**Peculiaridade:** O lance mínimo é o **mesmo** em ambas as praças (75% da avaliação = R$543.750). O juiz definiu 75% como piso para 1ª E 2ª praça, o que é atípico — normalmente a 2ª praça aceita lances menores. Isso pode ter confundido o Ninja.

**Correção no AXIS:** O campo `num_leilao = 55` é o número sequencial do leiloeiro (55º leilão da agenda dele), NÃO a praça. O AXIS exibe "55º LEILÃO" no header, o que é confuso. Deveria exibir "2ª PRAÇA".

### Valor de Mercado — Ninja com Metodologia Melhor
- AXIS: R$ 821.142 (R$ 3.800/m² × 216m² total)
- Ninja: R$ 787.500 (R$ 4.500/m² × 175m² construída)

O Ninja está conceitualmente mais correto: R$/m² deve usar **área privativa/construída** (175m²), não área total que inclui hall, escadas e circulação. O AXIS superestima levemente o valor de mercado e, consequentemente, o desconto.

### Pagamento Parcelado — AMBOS INCOMPLETOS
O edital permite **pagamento parcelado: 25% de entrada + até 12 parcelas (INPC)**. O AXIS marca "não financiável" (correto — não aceita carta de crédito/FGTS), mas não menciona o parcelamento. O Ninja marca "pagamento à vista" — também incompleto.

### Coproprietário — NENHUM DOS DOIS IDENTIFICOU
O edital intima "Sr. Carlos Antônio Pereira Jorge" como coproprietário/cônjuge. Isso implica que o imóvel pode ter quota-parte de terceiro (art. 843 CPC), com direito à parcela proporcional do produto da venda. Risco não capturado por nenhum sistema.

---

## 2. SCORECARD COMPARATIVO

| Dimensão | AXIS IP | Leilão Ninja | Análise |
|----------|---------|-------------|---------|
| **Dados básicos do imóvel** | 7/10 | 9/10 | Ninja tem área construída, banheiros, elevador, layout por pavimento |
| **Dados do leilão** | 9/10 | 7/10 | AXIS identifica praça corretamente, edifício, matrícula, partes |
| **Análise jurídica** | 8/10 | 7/10 | AXIS quantifica riscos em R$, classifica severidade; Ninja mapeia mais processos |
| **Análise financeira** | 5/10 | 8/10 | Ninja tem breakdown custos, ROI, cenários de saída, investimento total |
| **Análise de mercado** | 4/10 | 8/10 | Ninja tem comparáveis reais, mapa, preditor concorrência, bairro detalhado |
| **Acionabilidade** | 8/10 | 7/10 | AXIS tem síntese executiva direta, alertas com severidade, scores 6D |
| **TOTAL** | **41/60** | **46/60** | Ninja vence em amplitude; AXIS vence em profundidade analítica |

---

## 3. ROADMAP DE MELHORIAS — Priorizado por Impacto

### SPRINT 11 — Quick Wins (1-2 dias cada)

**11.1 — Fix `num_leilao` vs Praça** (CRÍTICO)
- Criar campo `praca` (1 ou 2) separado de `num_leilao`
- Exibir "2ª PRAÇA" no header em vez de "55º LEILÃO"
- Extrair praça automaticamente do edital via regex no agente jurídico

**11.2 — Área Construída como Base de Cálculo**
- Adicionar campo `area_construida_m2` no banco
- Usar `area_construida_m2 || area_privativa_m2` como base para R$/m²
- Corrigir `calcularCustosAquisicao()` e `motorIA.js`

**11.3 — Breakdown de Custos Adicionais**
- Exibir comissão (5%), ITBI (3%), documentação (~5%) separadamente
- Calcular investimento total = lance + custos
- Já temos os percentuais em `constants.js`, falta a UI

**11.4 — Campos Faltantes do Imóvel**
- `banheiros` (já existe no banco, capturar no scrape)
- `elevador` (boolean — impacta liquidez em triplex/cobertura)
- `area_construida_m2` (separada de `area_total_m2`)
- `distribuicao_pavimentos` (text — layout por andar)

### SPRINT 12 — Features Competitivas (3-5 dias cada)

**12.1 — ROI Calculator Automático**
- ROI = (Valor Mercado - Investimento Total) / Investimento Total
- Cenários: sem reforma, reforma básica, reforma completa
- Break-even: lance máximo para ROI mínimo de X%

**12.2 — Preditor de Concorrência**
- Dado lance mínimo e valor de mercado, calcular nº máximo de lances até break-even
- Simular cenário: "Se der lance de R$ X, seu ROI seria Y%"
- Widget interativo com slider

**12.3 — Comparáveis de Mercado**
- Buscar 3-5 imóveis similares no VivaReal/ZAP via API
- Exibir com preço, área, bairro, link
- Calcular R$/m² médio dos comparáveis como referência

**12.4 — Timeline da Matrícula**
- Parsear atos registrais da certidão RGI
- Exibir timeline visual: construção → compra → hipoteca → cancelamento → penhora
- Identificar cadeia dominial completa

### SPRINT 13 — Diferenciação (1-2 semanas)

**13.1 — Mapa de Entorno**
- Integrar Google Places API ou OpenStreetMap
- Exibir metrô, comércio, escolas, hospitais no raio de 1km
- Score de localização baseado em infraestrutura real

**13.2 — Mapeamento Processual Expandido**
- Buscar processos no JusBrasil/TJMG/TRT via API ou scrape
- Qualificar cada processo: tipo, rito, assunto, última movimentação
- Agrupar por vara e estimar risco por processo

**13.3 — Cenários de Saída**
- Venda no mercado (prazo estimado, valor líquido)
- Venda rápida (-10% a -15%, prazo curto)
- Locação (yield, payback, receita mensal)
- Cada cenário com NPV e TIR

**13.4 — Parcelamento como Estratégia**
- Capturar condições de parcelamento do edital (entrada %, nº parcelas, correção)
- Calcular custo financeiro do parcelamento vs à vista
- Simular fluxo de caixa: entrada → parcelas → reforma → aluguel/venda

---

## 4. CORREÇÕES IMEDIATAS NO BH-004

| Item | Valor Atual | Valor Correto | Ação |
|------|------------|---------------|------|
| Praça | "55º LEILÃO" | "2ª PRAÇA" | Criar campo `praca`, extrair do edital |
| Área base R$/m² | 216m² (total) | 175m² (construída) | Adicionar `area_construida_m2` |
| Parcelamento | "Não financiável" | "Parcelável 12x (25% entrada)" | Campo `parcelamento_aceito` |
| Coproprietário | Não identificado | Carlos A. Pereira Jorge | Extrair do edital, campo `coproprietarios` |
| Banheiros | Não informado | 3 | Campo já existe, preencher |
| Elevador | Não informado | Não tem | Adicionar campo `elevador` |

---

## 5. VANTAGENS COMPETITIVAS DO AXIS (manter e reforçar)

O AXIS já supera o Ninja em áreas importantes que devemos **preservar e ampliar**:

1. **Quantificação de riscos em R$** — Nenhum concorrente faz isso. Manter e refinar as estimativas.
2. **Scores multidimensionais 6D** — Permite comparação rápida entre imóveis. Único no mercado.
3. **Identificação de matrícula e partes** — AXIS captura dados que o Ninja marca como "não informado".
4. **Alertas com severidade e prazo** — "Certidão máx. 48h antes" é acionável; Ninja só lista riscos.
5. **Síntese executiva** — Texto direto para decisão de investidor, não apenas dados.
6. **Pipeline de IA em cascata** — Custo ~R$ 0,01 por análise vs serviços que cobram R$ 50-200.
