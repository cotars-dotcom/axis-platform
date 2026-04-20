/**
 * AXIS — Gráfico de Tendência 12m
 * 
 * Sparkline SVG para visualizar a tendência de preço/m² de um bairro.
 * Usa tendencia_12m e preco_contrato_m2 para estimar série sintética.
 * 
 * Props:
 *   tendencia_12m — variação % em 12 meses (ex: 8.5)
 *   precoAtual — preço/m² atual (ex: 7500)
 *   label — nome do bairro
 *   width / height — dimensões
 */

export default function GraficoTendencia({
  tendencia_12m = 0,
  precoAtual = 0,
  label = '',
  width = 120,
  height = 40,
}) {
  if (!precoAtual) return null

  // Gerar série sintética de 12 pontos (mensal) com crescimento linear + ruído pequeno
  const meses = 12
  const variacaoMensal = tendencia_12m / meses / 100  // variação % por mês
  const precoInicio = precoAtual / (1 + tendencia_12m / 100)

  const pontos = Array.from({ length: meses + 1 }, (_, i) => {
    // Crescimento base + micro-variação determinística (evitar Math.random — consistente)
    const micro = Math.sin(i * 1.7) * 0.003  // ±0.3% oscilação
    return precoInicio * (1 + variacaoMensal * i + micro)
  })

  const min = Math.min(...pontos)
  const max = Math.max(...pontos)
  const range = max - min || 1

  // Normalizar para SVG
  const px = (i) => (i / meses) * (width - 4) + 2
  const py = (v) => height - 4 - ((v - min) / range) * (height - 8)

  const pathD = pontos.map((v, i) => `${i === 0 ? 'M' : 'L'} ${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join(' ')
  const areaD = `${pathD} L ${px(meses).toFixed(1)} ${height} L ${px(0).toFixed(1)} ${height} Z`

  const cor = tendencia_12m > 5 ? '#059669' : tendencia_12m > 0 ? '#D97706' : '#DC2626'
  const seta = tendencia_12m > 0 ? '↑' : tendencia_12m < 0 ? '↓' : '→'

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Área preenchida */}
        <path d={areaD} fill={`${cor}15`} />
        {/* Linha */}
        <path d={pathD} fill="none" stroke={cor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        {/* Ponto atual */}
        <circle cx={px(meses)} cy={py(pontos[meses])} r={2.5} fill={cor} />
      </svg>
      <div style={{ fontSize: 9, fontWeight: 700, color: cor }}>
        {seta} {Math.abs(tendencia_12m).toFixed(1)}% em 12m
      </div>
    </div>
  )
}
