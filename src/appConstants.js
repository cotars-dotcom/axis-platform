// ═══════════════════════════════════════════════════════════════
// AXIS — Shared Design Tokens, Utilities & Micro-Components
// Extracted from App.jsx to enable code-splitting
// ═══════════════════════════════════════════════════════════════


// AXIS Design Tokens
export const C = {
  navy:"#002B80", navyAlfa:"#002B8010", text:"#1A1A2E", muted:"#666680",
  hint:"#8E8EA0", white:"#FFFFFF", offwhite:"#F8F7F4", surface:"#F4F3EF",
  bg:"#F8F7F4", border:"#D4D4D8", borderW:"#E8E6DF",
  emerald:"#05A86D", emeraldL:"#E6F7F0", mustard:"#D4A017", mustardL:"#FFF8E1",
  navy2:"#001F66", silver:"#C0C0C0",
  red:"#E5484D", redL:"#FCEBEB", teal:"#05A86D", blue:"#4A9EFF",
}


export const K = {
  bg:C.offwhite, bg2:C.white, s1:C.white, s2:"#F2F0E6",
  bd:C.border, bd2:C.borderW, teal:C.emerald, amb:C.mustard,
  red:"#E5484D", blue:"#4A9EFF", pur:"#A78BFA", grn:C.emerald,
  gold:"#C68A00", tx:C.text, t2:C.muted, t3:C.hint, wh:C.navy,
  trello:"#0052CC", border:C.borderW, gpt:"#19C37D", green:C.emerald, warn:C.mustard

}


export const RED = "#E5484D"


export const DISPLAY_MAP = {
  estavel:'Estável', Estavel:'Estável', media:'Média', Media:'Média',
  medio:'Médio', Medio:'Médio', alta:'Alta', baixa:'Baixa',
  queda:'Queda', crescimento:'Crescimento',
}
export function mapDisplay(v) { return (v && (ESTRUTURA_MAP[v] || DISPLAY_MAP[v])) || v }


export function normalizarTextoAlerta(texto) {
  if (!texto) return ''
  let s = texto
  try {
    const decoded = decodeURIComponent(escape(texto))
    if (decoded !== texto) s = decoded
  } catch {
    s = texto
  }
  s = s
    .replace(/[ÃÐÂ°]{3,}[^\s]*/g, '')
    .replace(/ÃÐÂ°[^\s]*/g, '')
    .replace(/ÃÐ\s?/g, '')
    .replace(/^[ÃÐÂ°\s]+/, '')
    .replace(/ÃÂÂ°ÃÂÃÂÃÂÃÂÃÂÃÂÃÂ°/g, '⚠️')
    .replace(/Ã°ÂÃÂÃ°/g, '⚠️')
    .replace(/Ã°Â\S*/g, '')
    .replace(/ÃÂÂ[^\s]*/g, '')
    .replace(/Ã¢ÂÂ[^\s]*/g, '')
    .replace(/Ã[ÂĈ][^\s]{2,8}/g, '')
    .replace(/[\uFFFD\uFFFE\uFFFF]/g, '')
    .replace(/[\uD800-\uDFFF](?![\uD800-\uDFFF])/g, '')
    .replace(/\[CRITICO\]/gi, '[CRÍTICO]')
    .replace(/\[ATENCAO\]/gi, '[ATENÇÃO]')
    .replace(/\[OK\]/gi, '[OK]')
    .replace(/\[INFO\]/gi, '[INFO]')
    .trim()
  return s
}


export const scoreColor = s => s >= 7.5 ? C.emerald : s >= 6.0 ? C.mustard : s >= 4.5 ? '#E06A00' : RED
export const scoreLabel = s => s >= 7.5 ? "FORTE" : s >= 6 ? "BOM" : s >= 4.5 ? "MÉDIO" : "FRACO"
export const recColor = r => ({ COMPRAR: C.emerald, AGUARDAR: C.mustard, EVITAR: "#E5484D" })[r] || C.hint
export const ESTRUTURA_MAP = { cpf_unico: 'Pessoa Física (CPF único)', cpf_multiplo: 'Múltiplos CPFs', pj: 'Pessoa Jurídica', judicial: 'Bloqueio Judicial', espolio: 'Espólio', 'espólio': 'Espólio' }
export const LIQUIDEZ_MAP = { alta: 'Alta', media: 'Média', baixa: 'Baixa' }
export const TENDENCIA_MAP = { alta: 'Alta', estavel: 'Estável', queda: 'Queda' }
export const fmtC = v => v ? 'R$ ' + Number(v).toLocaleString('pt-BR', {minimumFractionDigits:0}) : '—'
export const fmtD = d => d ? new Date(d).toLocaleDateString('pt-BR') : '—'
export const btn = (size='m') => {
  if (size === 'trello') return { padding: '6px 12px', borderRadius: 8, border: '1px solid #0052CC30', background: '#0052CC12', color: '#0052CC', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }
  if (size === 'd') return { padding: '6px 12px', borderRadius: 8, border: '1px solid #E5484D30', background: '#E5484D12', color: '#A32D2D', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }
  return { padding: size==='s' ? '6px 12px' : '8px 18px', borderRadius: 8, border: '1px solid #E8E4DC', background: '#FFFFFF', color: '#0A1628', fontSize: size==='s' ? 12 : 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }
}
export const inp = () => ({ padding: '8px 12px', borderRadius: 8, border: '1px solid #E8E4DC', background: '#FFFFFF', color: '#0A1628', fontSize: 13, outline: 'none', width: '100%' })
export const card = () => ({ background: '#FFFFFF', borderRadius: 12, padding: '16px', border: '1px solid #E8E4DC' })
export const ESTRATEGIA_CONFIG = { flip_rapido: { emoji: '🔄', label: 'Flip Rápido', color: '#05A86D' }, renda_passiva: { emoji: '🏠', label: 'Renda Passiva', color: '#002B80' }, airbnb: { emoji: '🌟', label: 'Airbnb', color: '#E1B31A' }, reforma_revenda: { emoji: '🏗️', label: 'Reforma + Venda', color: '#05A86D' }, locacao_longa: { emoji: '📋', label: 'Locação Longa', color: '#002B80' } }
export const DEMANDA_MAP = { alta: 'Alta', media: 'Média', baixa: 'Baixa' }

// ─── CUSTOS DE TRANSAÇÃO IMOBILIÁRIA (fonte única de verdade) ─────────────────
// Altere AQUI para propagar para todos os painéis automaticamente
export const AXIS_CUSTOS = {
  // Leilão judicial
  comissao_leiloeiro: 0.05,  // 5% — comissão do leiloeiro sobre o lance
  itbi_leilao:        0.03,  // 3% — ITBI BH (municipal); cidades fora de BH usam 2%
  itbi_mercado:       0.03,  // 3% — ITBI para compra de mercado direto
  itbi_outros_mg:     0.02,  // 2% — ITBI demais municípios MG
  doc:                0.005, // 0.5% — escritura/documentação
  adv:                0.02,  // 2% — honorário advocatício (apenas leilão)
  registro:           1500,  // R$1.500 — registro em cartório (fixo)
  // Venda
  corretagem_venda:   0.06,  // 6% — corretagem na revenda
  // Ocupação/Renda
  vacancia_anual:     0.06,  // 6% — vacância estimada ao ano
  manutencao_anual:   0.005, // 0.5% — manutenção sobre custo total ao ano
  // IRPF
  irpf_pct:           0.15,  // 15% — ganho de capital
  isencao_irpf:       440000,// R$440k — teto isenção (único imóvel PF)
}

// Multiplier total para custo estimado (quando custo_total_aquisicao não está salvo)
// leilão: comissao 5% + ITBI 3% + doc 0.5% + adv 2% = 10.5% + R$1.500 fixo
// mercado: ITBI 3% + doc 0.5% = 3.5% + R$1.500 fixo
export const CUSTO_MULT_LEILAO  = AXIS_CUSTOS.comissao_leiloeiro + AXIS_CUSTOS.itbi_leilao + AXIS_CUSTOS.doc + AXIS_CUSTOS.adv  // 0.105
export const CUSTO_MULT_MERCADO = AXIS_CUSTOS.itbi_mercado + AXIS_CUSTOS.doc  // 0.035

// Pesos do score (única fonte de verdade — usada em motorIA.js e motorAnaliseGemini.js)
export const SCORE_PESOS = {
  localizacao: 0.20,
  desconto:    0.18,
  juridico:    0.18,
  ocupacao:    0.15,
  liquidez:    0.15,
  mercado:     0.14,
}
