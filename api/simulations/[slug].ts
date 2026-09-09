import type { VercelRequest, VercelResponse } from '@vercel/node'
import simulations from '../../data/simulations.json'

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { slug } = req.query
  const simulation = simulations.find(s => s.slug === slug)

  if (!simulation) {
    return res.status(404).json({ error: 'Simulación no encontrada' })
  }

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
  return res.status(200).json({ data: simulation })
}
