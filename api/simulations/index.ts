import type { VercelRequest, VercelResponse } from '@vercel/node'
import simulations from '../../data/simulations.json'

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { categoriaId, q, estado } = req.query

  let result = [...simulations]

  if (categoriaId && typeof categoriaId === 'string') {
    result = result.filter(s => s.categoriaId === categoriaId)
  }

  if (estado && typeof estado === 'string') {
    result = result.filter(s => s.estado === estado)
  }

  if (q && typeof q === 'string') {
    const query = q.toLowerCase()
    result = result.filter(
      s =>
        s.titulo.toLowerCase().includes(query) ||
        s.descripcionCorta.toLowerCase().includes(query) ||
        s.etiquetas.some(tag => tag.toLowerCase().includes(query))
    )
  }

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate')
  return res.status(200).json({ data: result, total: result.length })
}
