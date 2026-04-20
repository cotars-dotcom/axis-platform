/**
 * AXIS — Healthcheck Semanal
 * 
 * Vercel Cron Function — executa toda segunda-feira às 8h BRT
 * Verifica: imóveis com leilão próximo, banco, dados desatualizados
 * 
 * vercel.json: "crons": [{"path": "/api/healthcheck", "schedule": "0 11 * * 1"}]
 * (11h UTC = 8h BRT)
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

export default async function handler(req, res) {
  // Verificar autenticação (Vercel passa header Authorization em cron calls)
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Em produção cron calls têm o secret automaticamente — aceitar se sem auth (dev)
    if (process.env.NODE_ENV === 'production' && !process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

  const report = {
    timestamp: new Date().toISOString(),
    alertas: [],
    status: 'ok',
  }

  try {
    // 1. Buscar imóveis ativos com leilão próximo
    const r = await fetch(`${SUPABASE_URL}/rest/v1/imoveis?status=eq.analisado&select=codigo_axis,bairro,data_leilao,data_leilao_2,valor_minimo,mao_flip,recomendacao,confidence_score`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      }
    })
    const imoveis = await r.json()

    const hoje = Date.now()
    for (const im of (imoveis || [])) {
      const diasP = (d) => d ? Math.ceil((new Date(d + 'T12:00') - hoje) / 86400000) : null
      const dias1 = diasP(im.data_leilao)
      const dias2 = diasP(im.data_leilao_2)

      if (dias1 !== null && dias1 >= 0 && dias1 <= 7) {
        report.alertas.push({
          tipo: 'URGENTE',
          codigo: im.codigo_axis,
          msg: `Leilão em ${dias1} dias — ${im.bairro} · R$${Math.round(im.valor_minimo || 0).toLocaleString('pt-BR')}`,
        })
        report.status = 'alerta'
      }
      if (dias2 !== null && dias2 >= 0 && dias2 <= 7) {
        report.alertas.push({
          tipo: 'URGENTE',
          codigo: im.codigo_axis,
          msg: `2ª PRAÇA em ${dias2} dias — ${im.bairro}`,
        })
        report.status = 'alerta'
      }
      if (im.mao_flip && im.valor_minimo && im.valor_minimo > im.mao_flip) {
        report.alertas.push({
          tipo: 'AVISO',
          codigo: im.codigo_axis,
          msg: `Lance acima do MAO flip — verificar viabilidade`,
        })
      }
      if ((im.confidence_score || 0) < 40) {
        report.alertas.push({
          tipo: 'DADOS',
          codigo: im.codigo_axis,
          msg: `Confiança baixa (${im.confidence_score}%) — enriquecer dados`,
        })
      }
    }

    // 2. Log no Supabase
    if (report.alertas.length > 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/sprint_24_changelog`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          sprint: 'CRON_HEALTHCHECK',
          tabela: 'imoveis',
          operacao: 'healthcheck',
          descricao: `Alertas: ${report.alertas.length} | Status: ${report.status}`,
          dados_antes: null,
          dados_depois: report,
        })
      })
    }

    res.status(200).json(report)

  } catch (e) {
    res.status(500).json({ error: e.message, timestamp: new Date().toISOString() })
  }
}
