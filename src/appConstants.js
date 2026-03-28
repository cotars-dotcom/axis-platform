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
}


export const K = {
  bg:C.offwhite, bg2:C.white, s1:C.white, s2:"#F2F0E6",
  bd:C.border, bd2:C.borderW, teal:C.emerald, amb:C.mustard,
  red:"#E5484D", blue:"#4A9EFF", pur:"#A78BFA", grn:C.emerald,
  gold:"#C68A00", tx:C.text, t2:C.muted, t3:C.hint, wh:C.navy,
  trello:"#0052CC"
}


export const RED = "#E5484D"


export const DISPLAY_MAP = {
  estavel:'Estável', Estavel:'Estável', media:'Média', Media:'Média',
  medio:'Médio', Medio:'Médio', alta:'Alta', baixa:'Baixa',
  queda:'Queda', crescimento:'Crescimento',
}
export function mapDisplay(v) { return (v && DISPLAY_MAP[v]) || v }


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


export const scoreColor = s => s >= 7.5 ? C.emerald : s >= 6 ? C.emerald : s >= 4.5 ? C.mustard : RED
export const scoreLabel = s => s >= 7.5 ? "FORTE" : s >= 6 ? "BOM" : s >= 4.5 ? "MÉDIO" : "FRACO"
export const recColor = r => ({ COMPRAR: C.emerald, AGUARDAR: C.mustard, EVITAR: "#E5484D" })[r] || C.hint
export const ESTRUTURA_MAP = { cpf_unico: 'Pessoa Física (CPF único)', cpf_multiplo: 'Múltiplos CPFs', pj: 'Pessoa Jurídica', judicial: 'Bloqueio Judicial', espolio: 'Espólio', 'espólio': 'Espólio' }
export const LIQUIDEZ_MAP = { alta: 'Alta', media: 'Média', baixa: 'Baixa' }
export const TENDENCIA_MAP = { alta: 'Alta', estavel: 'Estável', queda: 'Queda' }
