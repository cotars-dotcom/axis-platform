
// ─── Detecção de tipo de transação por URL ────────────────────────────────
// Classifica automaticamente se a URL é de leilão ou compra de mercado

const DOMINIOS_LEILAO = [
  'marcoantonioleiloeiro', 'leilaovip', 'sold.com.br', 'superbid',
  'zuk.com.br', 'leiloeiro.com.br', 'bid.auction', 'arrematei.com',
  'leilaooficial', 'realtime.com.br', 'saraivaleiloes', 'suporteleiloes',
  'leilao.com.br', 'greatbid', 'biancaleiloes', 'mattosleiloes',
  'leilaonet', 'tradeinbrazil', 'caixaleiloes', 'caixa.gov.br/leilao',
]

const DOMINIOS_MERCADO = [
  'vivareal.com.br', 'zapimoveis.com.br', 'zap.com.br',
  'olx.com.br', 'quintoandar.com.br', '123i.com.br',
  'chavesnamao.com.br', 'imovelweb.com.br', 'lugarescerto.com',
  'mgf.com.br', 'loft.com.br', 'navent.com', 'mercadolivre.com.br',
]

export function detectarTipoTransacao(url) {
  if (!url) return 'leilao' // default: leilão
  const u = url.toLowerCase()
  
  if (DOMINIOS_LEILAO.some(d => u.includes(d))) return 'leilao'
  if (DOMINIOS_MERCADO.some(d => u.includes(d))) return 'mercado_direto'
  
  // Heurísticas adicionais
  if (u.includes('leilao') || u.includes('lote') || u.includes('arrematacao')) return 'leilao'
  if (u.includes('venda') || u.includes('compra') || u.includes('imovel/')) return 'mercado_direto'
  
  return 'leilao' // default: leilão
}

export function isLeilao(url, tipoTransacao) {
  if (tipoTransacao) return tipoTransacao === 'leilao'
  return detectarTipoTransacao(url) === 'leilao'
}

export function isMercadoDireto(url, tipoTransacao) {
  return !isLeilao(url, tipoTransacao)
}
