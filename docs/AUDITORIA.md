# Templates de Auditoria — AXIS Platform

Rodar periodicamente com o Code (Claude Code CLI). Cada auditoria é independente — execute na ordem sugerida ou conforme necessidade.

---

## Quando rodar

| Auditoria | Frequência | Gatilho principal |
|-----------|-----------|------------------|
| 1 — IMOVEIS_COLS diff | A cada sprint | Novas colunas no banco ou novos campos na UI |
| 2 — async sem try/catch | A cada sprint | Novos arquivos em `src/lib/` |
| 3 — isMercadoDireto | Ao criar componente financeiro | Novo componente que exibe valores, descontos ou custos |
| 4 — console.log debug | Antes de release | Qualquer merge grande |

---

## Auditoria 1 — IMOVEIS_LIST_COLS vs whitelist de save

**O que detecta:** campos usados na UI que não estão no SELECT (retornam `undefined`), e campos salvos no banco que nunca voltam à UI.

```
Audite src/lib/supabase.js:

1. Extraia EXATAMENTE a string de IMOVEIS_LIST_COLS (o que é lido do banco) — liste campo por campo
2. Encontre a whitelist de save (IMOVEIS_COLS, CAMPOS_SAVE, ou similar) — liste campo por campo
3. Faça o diff:
   a) Campos em LIST_COLS mas NÃO na whitelist — lidos mas nunca salvos (ok se for join/computed)
   b) Campos na whitelist mas NÃO em LIST_COLS — salvos mas nunca retornados (bug silencioso)
4. Grep em src/components/Detail.jsx e src/App.jsx por padrão p\.(\w+) — extraia todos os campos
   acessados via prop p e compare com LIST_COLS. Liste campos usados na UI mas não selecionados.

Retorne listas exatas. Apenas o que está no código, sem suposições.
```

---

## Auditoria 2 — async sem tratamento de erro

**O que detecta:** `fetch()` e `supabase.from()` sem try/catch — causam falha silenciosa em erros de rede ou timeout.

```
Em src/lib/ e src/components/, liste todas as funções async que fazem fetch() ou supabase.from()
sem try/catch ou .catch() adequado.

Critérios:
- fetch() sem try/catch → CRÍTICO
- supabase sem try/catch → CRÍTICO
- await sem tratamento no chamador → MÉDIO
- .then() sem .catch() → MÉDIO
- .catch(() => {}) silencioso (engole erro) → MÉDIO

Foque em: motorIA.js, motorAnaliseGemini.js, scraperImovel.js, buscadorFotos.js,
agenteJuridico.js, agenteReanalise.js, documentosPDF.js.

Para cada achado: arquivo, função, linha aproximada, qual chamada está sem proteção, severidade.
Não liste funções que têm try/catch cobrindo toda a operação.
```

---

## Auditoria 3 — isMercadoDireto propagação

**O que detecta:** componentes financeiros que exibem valores, descontos ou custos sem diferenciar leilão de mercado direto.

```
Mapeie todos os usos de isMercadoDireto() em src/.

1. Onde está definida? O que ela verifica exatamente?
2. Em quais arquivos é importada e usada?
3. Analise os componentes financeiros abaixo — para cada um, diga se chama isMercadoDireto()
   e se os cálculos de valor/desconto/comissão/custo se adaptam ao tipo:
   - PainelRentabilidade.jsx
   - CenariosReforma.jsx
   - CalculadoraROI.jsx
   - PainelLancamento.jsx
   - Detail.jsx (seção ROI/retorno)
   - App.jsx (PropCard — exibição de desconto e valor)

4. Identifique casos onde um componente renderiza valor_minimo, desconto_percentual,
   comissão leiloeiro ou similar SEM verificar o tipo — esses são bugs de cálculo incorreto.

Retorne: definição, mapa de uso, e lista de componentes que deveriam mas não usam isMercadoDireto.
```

---

## Auditoria 4 — console.log de debug em produção

**O que detecta:** logs temporários de desenvolvimento que poluem o console em produção.

```
Varredura completa de console.log/warn/error em src/.

Para cada ocorrência, extraia:
- arquivo, linha, texto resumido
- contexto: está em try/catch? É erro real ou debug temporário?

Categorize:
- REMOVER: debug temporário (valores de variáveis, confirmações de sucesso, fluxo de execução)
- MANTER: erros reais em catch, avisos de fallback importantes para diagnóstico
- REVISAR: ambíguo

Agrupe por arquivo. Foque em: motorIA.js, motorAnaliseGemini.js, buscadorFotos.js,
agenteJuridico.js, supabase.js, Detail.jsx, App.jsx.
```

---

## Auditoria Extra — CAMPOS_PROTEGIDOS

**Quando rodar:** ao adicionar campos jurídicos ou de score novos.

```
Em src/lib/supabase.js, encontre CAMPOS_PROTEGIDOS (ou equivalente).
Compare com os campos recém-adicionados ao IMOVEIS_LIST_COLS.
Identifique campos novos que deveriam estar protegidos contra sobrescrita
(scores, dados jurídicos, campos calculados pela IA).
```
