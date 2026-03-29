/**
 * AXIS — Busca de Arremates Históricos via ChatGPT
 * Pesquisa preços reais de arrematação em leilões similares
 * para calibrar o score e estimar MAO com mais precisão.
 * Custo: ~R$0,05 por busca (GPT-4o-mini)
 */

const PROMPT_BUSCA_ARREMATES = (imovel) => `Você é um especialista em leilões imobiliários no Brasil.

IMÓVEL ANALISADO:
- Tipo: ${imovel.tipo || 'Apartamento'}
- Bairro/Cidade: ${imovel.bairro || ''} / ${imovel.cidade || 'Belo Horizonte'}
- Área: ${imovel.area_m2 || '?'}m²
- Quartos: ${imovel.quartos || '?'}
- Vagas: ${imovel.vagas || '?'}
- Avaliação judicial: R$ ${imovel.valor_avaliacao?.toLocaleString('pt-BR') || '?'}
- Lance mínimo: R$ ${imovel.valor_minimo?.toLocaleString('pt-BR') || '?'}
- Modalidade: ${imovel.modalidade_leilao || 'judicial'}

Pesquise arremates reais de imóveis similares em leilões judiciais em BH/MG nos últimos 12 meses.
Considere: mesmo tipo, mesma faixa de área (±20%), mesmo bairro ou região, mesma modalidade.

Retorne APENAS JSON válido:
{
  "arremates": [
    {
      "descricao": "Apto 3Q 2V Buritis 95m²",
      "valor_avaliacao": 500000,
      "valor_arrematado": 320000,
      "pct_avaliacao": 64.0,
      "bairro": "Buritis",
      "data": "2025-11",
      "modalidade": "judicial_tjmg",
      "fonte": "string — leiloeiro ou portal"
    }
  ],
  "media_pct_avaliacao": 62.5,
  "mediana_pct_avaliacao": 61.0,
  "faixa_pct": "55-70%",
  "n_amostras": 3,
  "observacoes": "string — contexto do mercado de leilões no bairro",
  "mao_sugerido": 0,
  "mao_base": "string — explicação do cálculo"
}`

export async function buscarArrematesSimilares(imovel, openaiKey, geminiKey = null) {
  if (!openaiKey && !geminiKey) return null

  // Tentar GPT-4o-mini primeiro (mais barato)
  if (openaiKey) {
    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: PROMPT_BUSCA_ARREMATES(imovel) }],
          temperature: 0.2,
          max_tokens: 1500,
        }),
        signal: AbortSignal.timeout(40000)
      })
      if (!r.ok) throw new Error(`OpenAI ${r.status}`)
      const data = await r.json()
      const txt = data.choices?.[0]?.message?.content || ''
      const match = txt.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/)
      if (!match) throw new Error('JSON inválido')
      const resultado = JSON.parse(match[0])
      resultado._modelo = 'gpt-4o-mini'
      resultado._custo_estimado_brl = 0.05
      return resultado
    } catch(e) {
      console.warn('[AXIS arremates] GPT-4o-mini:', e.message)
    }
  }

  // Fallback para Gemini
  if (geminiKey) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: PROMPT_BUSCA_ARREMATES(imovel) }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 1500 }
          }),
          signal: AbortSignal.timeout(40000)
        }
      )
      if (!r.ok) throw new Error(`Gemini ${r.status}`)
      const data = await r.json()
      const txt = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const match = txt.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/)
      if (!match) throw new Error('JSON inválido')
      const resultado = JSON.parse(match[0])
      resultado._modelo = 'gemini-2.0-flash'
      resultado._custo_estimado_brl = 0.03
      return resultado
    } catch(e) {
      console.warn('[AXIS arremates] Gemini:', e.message)
    }
  }

  return null
}

// Salvar arrremate no banco para calibração futura
export async function salvarArremateHistorico(imovelId, dadosArrematacao) {
  try {
    const { supabase } = await import('./supabase.js')
    const { error } = await supabase.from('arremates_historico').insert({
      imovel_id: imovelId,
      valor_avaliacao: dadosArrematacao.valor_avaliacao,
      valor_arrematado: dadosArrematacao.valor_arrematado,
      pct_avaliacao: dadosArrematacao.pct_avaliacao,
      bairro: dadosArrematacao.bairro,
      tipo: dadosArrematacao.tipo,
      modalidade: dadosArrematacao.modalidade,
      data_arrematacao: dadosArrematacao.data,
      fonte: dadosArrematacao.fonte || 'busca_gpt',
    })
    if (error) console.warn('[AXIS] salvarArrematacao:', error.message)
  } catch(e) { console.warn('[AXIS] salvarArremateHistorico:', e.message) }
}
