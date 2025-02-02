import { Request, Response } from 'express'
import { supabase } from '../../lib/supabase'

export class CompanyController {
  async list(_req: Request, res: Response) {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name')

      if (error) throw error

      return res.json(data)
    } catch (error) {
      console.error('Error listing companies:', error)
      return res.status(500).json({ 
        error: 'Failed to list companies',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  async get(req: Request, res: Response) {
    try {
      const { id } = req.params

      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Company not found' })
        }
        throw error
      }

      return res.json(data)
    } catch (error) {
      console.error('Error getting company:', error)
      return res.status(500).json({ 
        error: 'Failed to get company',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
} 