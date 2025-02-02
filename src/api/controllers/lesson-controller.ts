import { Request, Response } from 'express'
import { supabase } from '../../lib/supabase'

export class LessonController {
  async list(req: Request, res: Response) {
    try {
      const { guideId } = req.params

      const { data, error } = await supabase
        .from('lessons')
        .select('*, guide:guides(*)')
        .eq('guide_id', guideId)
        .order('order_index')

      if (error) throw error

      return res.json(data)
    } catch (error) {
      console.error('Error listing lessons:', error)
      return res.status(500).json({ 
        error: 'Failed to list lessons',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  async get(req: Request, res: Response) {
    try {
      const { id, guideId } = req.params

      const { data, error } = await supabase
        .from('lessons')
        .select('*, guide:guides(*), video:videos(*)')
        .eq('id', id)
        .eq('guide_id', guideId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Lesson not found' })
        }
        throw error
      }

      return res.json(data)
    } catch (error) {
      console.error('Error getting lesson:', error)
      return res.status(500).json({ 
        error: 'Failed to get lesson',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
} 