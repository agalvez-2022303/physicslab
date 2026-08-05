import type { VercelRequest, VercelResponse } from '@vercel/node'
import fs from 'fs'
import path from 'path'

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { slug } = req.query

  try {
    const filePath = path.join(process.cwd(), 'data', 'content', `${slug}.json`)
    const raw = fs.readFileSync(filePath, 'utf-8')
    const content = JSON.parse(raw)

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
    return res.status(200).json({ data: content })
  } catch {
    return res.status(404).json({ error: 'Contenido no encontrado' })
  }
}
