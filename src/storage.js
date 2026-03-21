// Storage usando localStorage para produção (Vercel)
export const stLoad = async (k) => {
  try {
    const v = localStorage.getItem(k)
    return v ? JSON.parse(v) : null
  } catch { return null }
}

export const stSave = async (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)) } catch {}
}
