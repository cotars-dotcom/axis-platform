# AXIS IP — Prompt de Continuação Sprint 15 (09/04/2026)

## PROJETO
Plataforma de inteligência imobiliária para análise de imóveis em leilão judicial e mercado direto na RMBH.
- **Repo:** `cotars-dotcom/axis-platform` · **Branch:** `main` · **Commit:** `cf02398`
- **Produção:** https://axisip.vercel.app
- **Supabase:** projeto `vovkfhyjjoruiljfjrxy`
- **Vercel:** team `team_UJugYFpSSuKLZOw0OeBTOuBt` · project `prj_PmBnpJako14yeGFZRcNZ5PWvOHiM`
- **Stack:** React 18 + Vite + Supabase + Vercel
- **Cascata IA:** Gemini 2.5 Flash → DeepSeek V3 → GPT-4o-mini → Claude Sonnet

---

## SESSÃO ANTERIOR (08/04) — MG-007 Auditoria Completa

### Commits pushados:
| Hash | Descrição |
|------|-----------|
| `4b40505` | fix: galeria thumbnails + tela preta ao scrollar (onError innerHTML→React state, crossOrigin removido, hero height:auto) |
| `cf02398` | fix: relatório PDF — endereço completo, responsabilidade legível, obs jurídicas |

### Supabase — MG-007 correção completa:
- Endereço corrigido: Av. Protásio de Oliveira Pena, 105, Apto 303 — Buritis
- Área: 78→69.39m² (IPTU oficial), Avaliação: 450k→360k, Suítes: 0→1
- 8 fotos reais CDN CloudFront, geocoding -19.9725/-43.9670
- 2 docs jurídicos (edital 17.243 chars + matrícula OCR 11.973 chars)
- Edital: proc 5067894-90.2023.8.13.0024, 2 penhoras R$88.621, sub-rogação, à vista
- Matrícula OCR: cadeia Construforte→Apil→Gustavo→Thais+Gabriel→Maria Luisa (R$208k/2011)
- Score: 5.72→6.17 (jurídico 3.0→5.5 pós-OCR), recomendação EVITAR→AGUARDAR
- Financeiros: mercado R$448k, pm2 R$6.454, aluguel R$3.000, yield 10%

### Diagnósticos cruzados (3 fontes):
- Claude Code: build OK, código compatível, responsabilidade_debitos='sub_rogado' match Detail.jsx
- Claude Chrome: app renderiza correto, galeria e scroll bugs corrigidos
- Claude Chat: mercado R$420-460k, 1ª praça 5/10, 2ª praça 9/10, teto R$240k

### Auditoria cruzada Motor × Gemini × Banco × Relatório:
- Custos aquisição R$399.300 = exato (motor vs cálculo manual)
- Score 6.17 = exato (6D ponderado)
- Yield 10% = exato
- Diferença valor mercado: R$7.615 (1.7%) — aceitável

---

## PORTFÓLIO ATUALIZADO (08/04)

| Código | Bairro | Score | Rec. | Status | Próxima ação |
|--------|--------|-------|------|--------|--------------|
| BH-002 | Dona Clara | 7.09 | AGUARDAR | pós-leilão 08/04 | Verificar resultado |
| MG-007 | Buritis | 6.17 | AGUARDAR | D-28 (06/05) | Monitorar, lance 2ª praça ≤R$240k |
| BH-004 | Silveira | 5.97 | COMPRAR | pós-leilão 08/04 | Verificar resultado |
| BH-006 | Silveira | 5.03 | AGUARDAR | mercado direto | — |
| CT-003 | Conquista | 4.62 | AGUARDAR | mercado direto | — |

---

## SPRINT 15 — 3 FRENTES PRIORITÁRIAS

### FRENTE 1: RELATÓRIO PDF PROFISSIONAL (P0)
**Problema:** O ExportarPDF.jsx atual gera HTML simples (560KB) que abre no browser. Não é PDF real. Layout é básico, informações incompletas, não apresentável para envio profissional.

**Requisitos:**
1. Gerar PDF REAL (não HTML) — usar `reportlab` (Python server-side) ou puppeteer/html-to-pdf
2. Layout A4 landscape ou portrait profissional:
   - **Capa:** Logo AXIS, título imóvel, foto principal, score, recomendação, data
   - **Página 2 — Resumo:** valores (lance, mercado, aluguel), scores 6D com barras visuais, badges, síntese
   - **Página 3 — Investimento:** custos de aquisição breakdown, cenários de reforma (SINAPI) com ROI por cenário, holding cost, simulador de lance
   - **Página 4 — Jurídico:** processo, matrícula (cadeia dominial), ônus, sub-rogação, responsabilidade débitos, obs jurídicas completas
   - **Página 5 — Mercado:** comparáveis, preço/m², aluguel por cenário de reforma, yield, tendência
   - **Página 6 — Fotos:** galeria 2×4 ou 3×3 com todas as fotos
   - **Rodapé:** "AXIS IP · {codigo} · {data} · Gerado automaticamente — não constitui parecer jurídico"
3. Otimizado para WhatsApp (tamanho <5MB, preview funcional)
4. Custos dinâmicos: receber cenário de reforma escolhido pelo usuário e usar no cálculo de ROI/investimento total

**Dados do edital que devem aparecer no relatório MG-007:**
- Pagamento exclusivamente à vista (cláusula 8)
- Comissão 5% (cláusula 13)
- Débitos IPTU: sub-rogam (Art. 130 CTN)
- Débitos condomínio: sub-rogam (Art. 908 §1º CPC)
- 2 penhoras (R$88.621): R-15 Aluguel Vitrini + R-16 Condomínio
- Cadeia dominial: 5 proprietários, matrícula regular
- Holding cost estimado: R$750/mês (condo R$550 + IPTU ~R$200)

**Referência de custos para ROI completo:**
```
CUSTO AQUISIÇÃO:
  Lance: R$ 360.000
  Comissão 5%: R$ 18.000
  ITBI 3%: R$ 10.800
  Advogado 2%: R$ 7.200
  Doc 0.5%: R$ 1.800
  Registro: R$ 1.500
  Subtotal: R$ 399.300

CUSTO PÓS-AQUISIÇÃO (variável por cenário):
  Reforma básica: R$ 23.246 | Média: R$ 67.655 | Completa: R$ 131.841
  Holding cost (5 meses): R$ 3.750 (condo R$550 + IPTU ~R$200/mês)

CUSTO TOTAL (básica): R$ 399.300 + 23.246 + 3.750 = R$ 426.296
CUSTO TOTAL (média): R$ 399.300 + 67.655 + 3.750 = R$ 470.705
CUSTO TOTAL (completa): R$ 399.300 + 131.841 + 3.750 = R$ 534.891

RETORNO (venda):
  Corretagem 6%: sobre preço de venda
  IRPF 15%: sobre ganho de capital (se > R$ 440k isenção)
```

### FRENTE 2: HOLDING COST NO MOTOR (P1)
**Problema:** `calcularCustosAquisicao` não inclui holding cost (condomínio + IPTU durante meses parados). Isso infla artificialmente o ROI.

**Implementar em constants.js:**
```javascript
export function calcularCustoTotal(precoBase, isMercado, reforma = 0, holdingMeses = 5, condoMensal = 0, iptuMensal = 0) {
  const aquisicao = calcularCustosAquisicao(precoBase, isMercado)
  const holding = holdingMeses * (condoMensal + iptuMensal)
  return {
    ...aquisicao,
    reforma,
    holding,
    holdingMeses,
    totalCompleto: aquisicao.total + reforma + holding,
  }
}
```

Usar `p.condominio_mensal` do banco. IPTU estimar como ~35% do condomínio (regra geral BH).

### FRENTE 3: LAYOUT MOBILE (P1)
**Bugs visíveis nas screenshots do celular (iPhone):**

1. **Dashboard — texto quebrado:** "OPO RTU NID ADE S ATIV AS" — o card de "Oportunidades Ativas" está com width muito estreito, quebrando cada sílaba
2. **Detail — menu Relatório sai da tela:** o dropdown (Compartilhar, Baixar Relatório, Imprimir/PDF, JSON, Calendário) aparece cortado à esquerda, texto truncado
3. **Detail — Hdr botões:** já fixado parcialmente (isPhone passado ao Hdr), mas precisa: botões empilhados em 2 linhas no mobile, não em row overflow
4. **Simulador de lance:** valor "R$ 445..." cortado no mobile (tela 375px), precisa quebrar ou diminuir font
5. **Cenários de saída:** texto "Venda rápida (-10%)" com ROI "-25.8%" — layout funciona mas fica apertado

**Arquivos a modificar:**
- `App.jsx` → Dashboard cards (Oportunidades Ativas, Score Médio)
- `Detail.jsx` → Hdr (botões mobile), menu Relatório posição, hero foto
- `PainelLancamento.jsx` → simulador slider, cenários de saída
- `MobileNav.jsx` → já funciona bem

---

## CONVENÇÕES
- Commits em português, prefixo semântico (feat/fix/docs)
- `git config user.email "axis@cotars.com" && git config user.name "AXIS Bot"`
- Build (`npx vite build`) sempre antes de push
- Custos → importar de `src/lib/constants.js`, NUNCA hardcoded
- **select('*')** no Supabase, NUNCA listar colunas
- Responder sempre em português
- PDF → usar skill `/mnt/skills/public/pdf/SKILL.md` para geração com reportlab

---

## LIÇÕES DA SESSÃO 08/04
1. **Gemini não preenche campos financeiros** — valor_mercado, preco_m2_mercado, aluguel ficaram null. O motor precisa de fallback que calcule esses campos se Gemini não retornar.
2. **responsabilidade_debitos** — código espera 'sub_rogado'|'arrematante'|'exonerado' exatamente. Banco tinha 'sub_rogacao_preco' que não matchava.
3. **innerHTML no onError** destrói DOM React — usar estado.
4. **crossOrigin="anonymous"** causa CORS com CDNs de leiloeiros.
5. **Hero image height:100%** + minHeight confunde GPU compositor → usar height:auto.
6. **Holding cost** não está no motor — infla ROI artificialmente.
