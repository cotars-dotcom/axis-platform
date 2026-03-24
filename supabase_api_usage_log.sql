-- ================================================================
-- AXIS — Log de uso de API por chamada
-- ================================================================

CREATE TABLE IF NOT EXISTS public.api_usage_log (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id),
  tipo             TEXT NOT NULL,
  -- tipos: 'analise_principal' | 'fotos' | 'mercado_chatgpt' | 'busca_gpt' | 'reanalise'
  modelo           TEXT,
  -- ex: 'claude-sonnet-4-20250514' | 'claude-haiku-4-5-20251001' | 'gpt-4o'
  tokens_input     INTEGER DEFAULT 0,
  tokens_output    INTEGER DEFAULT 0,
  custo_usd        NUMERIC(10,6) DEFAULT 0,
  imovel_id        TEXT,
  imovel_titulo    TEXT,
  modo_teste       BOOLEAN DEFAULT false,
  sucesso          BOOLEAN DEFAULT true,
  criado_em        TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: admin vê tudo, usuário vê só os próprios
ALTER TABLE public.api_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "log_leitura_admin"
  ON public.api_usage_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin')
    OR auth.uid() = user_id
  );

CREATE POLICY "log_insert_proprio"
  ON public.api_usage_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- View agregada por dia
CREATE OR REPLACE VIEW public.vw_custo_api_diario AS
SELECT
  date_trunc('day', criado_em) AS dia,
  tipo,
  modelo,
  COUNT(*) AS chamadas,
  SUM(tokens_input) AS total_input,
  SUM(tokens_output) AS total_output,
  SUM(custo_usd) AS custo_total_usd,
  SUM(custo_usd) * 5.80 AS custo_total_brl
FROM public.api_usage_log
WHERE modo_teste = false
GROUP BY 1, 2, 3
ORDER BY 1 DESC;
