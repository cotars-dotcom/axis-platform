import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) console.warn('Variáveis Supabase não configuradas')

export const supabase = createClient(SUPABASE_URL||'https://placeholder.supabase.co',SUPABASE_ANON_KEY||'placeholder')

export async function signIn(email,password){const{data,error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;return data}

export async function signOut(){const{error}=await supabase.auth.signOut();if(error)throw error}

export async function getProfile(userId){const{data,error}=await supabase.from('profiles').select('*').eq('id',userId).single();if(error)throw error;return data}

export async function getImoveis(){const{data,error}=await supabase.from('imoveis').select('*').order('criado_em',{ascending:false});if(error)throw error;return data||[]}

export async function saveImovel(imovel,userId){const{data,error}=await supabase.from('imoveis').upsert({...imovel,criado_por:userId,atualizado_em:new Date().toISOString()}).select().single();if(error)throw error;return data}

export async function deleteImovel(id){const{error}=await supabase.from('imoveis').delete().eq('id',id);if(error)throw error}

export async function updateImovelStatus(id,status){const{error}=await supabase.from('imoveis').update({status,atualizado_em:new Date().toISOString()}).eq('id',id);if(error)throw error}

export async function getParametros(){const{data,error}=await supabase.from('parametros_score').select('*').eq('ativo',true).order('ordem');if(error)throw error;return data||[]}

export async function saveParametro(param){const{data,error}=await supabase.from('parametros_score').upsert(param).select().single();if(error)throw error;return data}

export async function getCriterios(){const{data,error}=await supabase.from('criterios_avaliacao').select('*').eq('ativo',true).order('categoria');if(error)throw error;return data||[]}

export async function saveCriterio(criterio){const{data,error}=await supabase.from('criterios_avaliacao').upsert(criterio).select().single();if(error)throw error;return data}

export async function getAvaliacoes(imovelId){const{data,error}=await supabase.from('avaliacoes_imovel').select('*,criterio:criterios_avaliacao(*),avaliador:profiles(nome)').eq('imovel_id',imovelId);if(error)throw error;return data||[]}

export async function saveAvaliacao(av){const{data,error}=await supabase.from('avaliacoes_imovel').upsert(av).select().single();if(error)throw error;return data}

export async function getTarefas(userId,role){let q=supabase.from('tarefas').select('*,atribuido:profiles!tarefas_atribuido_para_fkey(nome),criador:profiles!tarefas_criado_por_fkey(nome)').order('criado_em',{ascending:false});if(role!=='admin')q=q.or('atribuido_para.eq.'+userId+',criado_por.eq.'+userId);const{data,error}=await q;if(error)throw error;return data||[]}

export async function saveTarefa(t){const{data,error}=await supabase.from('tarefas').upsert({...t,atualizado_em:new Date().toISOString()}).select().single();if(error)throw error;return data}

export async function updateTarefaStatus(id,status){const{error}=await supabase.from('tarefas').update({status,atualizado_em:new Date().toISOString()}).eq('id',id);if(error)throw error}

export async function getObservacoes(imovelId){const{data,error}=await supabase.from('observacoes').select('*,autor:profiles(nome)').eq('imovel_id',imovelId).order('criado_em',{ascending:false});if(error)throw error;return data||[]}

export async function saveObservacao(obs){const{data,error}=await supabase.from('observacoes').insert(obs).select().single();if(error)throw error;return data}

export async function getAllProfiles(){const{data,error}=await supabase.from('profiles').select('*').order('criado_em');if(error)throw error;return data||[]}

export async function updateProfile(id,updates){const{error}=await supabase.from('profiles').update(updates).eq('id',id);if(error)throw error}

export async function getAtividades(){const{data,error}=await supabase.from('atividades').select('*,usuario:profiles(nome)').order('criado_em',{ascending:false}).limit(200);if(error)throw error;return data||[]}
