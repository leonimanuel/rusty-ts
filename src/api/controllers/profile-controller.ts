import { Request, Response } from 'express'
import { supabase } from '../../lib/supabase'

export class ProfileController {
  async list(_req: Request, res: Response) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          created_at,
          updated_at
        `)
        .order('first_name')

      if (error) throw error

      return res.json(data)
    } catch (error) {
      console.error('Error listing profiles:', error)
      return res.status(500).json({ 
        error: 'Failed to list profiles',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  async listCompanies(req: Request, res: Response) {
    try {
      const { profileId } = req.params

      const { data, error } = await supabase
        .from('user_companies')
        .select('company:companies(*)')
        .eq('user_id', profileId)
        .order('company(name)')

      if (error) throw error

      // Transform the data to return just the companies
      const companies = data.map(item => item.company)

      return res.json(companies)
    } catch (error) {
      console.error('Error listing profile companies:', error)
      return res.status(500).json({ 
        error: 'Failed to list profile companies',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
} 