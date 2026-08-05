import type { VercelRequest, VercelResponse } from '@vercel/node'
import categories from '../../data/categories.json'

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
  return res.status(200).json({ data: categories, total: categories.length })
}
