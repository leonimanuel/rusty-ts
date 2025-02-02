import { Request, Response } from 'express'
import { supabase } from '../../lib/supabase'

export class GuideController {
  async list(req: Request, res: Response) {
    try {
      const { companyId } = req.params

      const { data, error } = await supabase
        .from('guides')
        .select('*, company:companies(*)')
        .eq('company_id', companyId)
        .order('title')

      if (error) throw error

      return res.json(data)
    } catch (error) {
      console.error('Error listing guides:', error)
      return res.status(500).json({ 
        error: 'Failed to list guides',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  async get(req: Request, res: Response) {
    try {
      const { id, companyId } = req.params

      const { data, error } = await supabase
        .from('guides')
        .select('*, company:companies(*), lessons(*)')
        .eq('id', id)
        .eq('company_id', companyId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Guide not found' })
        }
        throw error
      }

      return res.json(data)
    } catch (error) {
      console.error('Error getting guide:', error)
      return res.status(500).json({ 
        error: 'Failed to get guide',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
} 