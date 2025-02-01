import { Request, Response } from 'express'
import { SubtitleService } from '../../services/subtitles/subtitle-service'
import { SubtitleOptions } from '../../services/subtitles/types'
import { supabase } from '../../lib/supabase'
import { SubtitleInsert } from '../../types/database.types'

export class VideoController {
  private subtitleService: SubtitleService

  constructor() {
    // Initialize the subtitle service with API key from environment variables
    this.subtitleService = new SubtitleService({
      apiKey: process.env.ASSEMBLY_AI_API_KEY || ''
    })
  }

  createSubtitles = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { videoId } = req.params
      const { videoUrl, format = 'srt', charsPerCaption, language = 'en' } = req.body

      if (!videoUrl) {
        return res.status(400).json({ error: 'videoUrl is required in request body' })
      }

      // Start transcription directly with the provided URL
      const transcriptId = await this.subtitleService.transcribe(videoUrl)

      // Get subtitles in requested format
      const subtitleOptions: SubtitleOptions = {
        format: format as 'srt' | 'vtt',
        charsPerCaption
      }
      const subtitles = await this.subtitleService.getSubtitles(transcriptId, subtitleOptions)

      // Save subtitles to database
      const subtitleData: SubtitleInsert = {
        video_id: videoId,
        language,
        srt_data: subtitles
      }

      const { data: savedSubtitle, error: dbError } = await supabase
        .from('subtitles')
        .insert(subtitleData)
        .select()
        .single()

      if (dbError) {
        console.error('Error saving subtitles to database:', dbError)
        return res.status(500).json({ 
          error: 'Failed to save subtitles to database',
          details: dbError.message
        })
      }

      return res.status(200).json({
        videoId,
        transcriptId,
        subtitle: savedSubtitle
      })
    } catch (error) {
      console.error('Error creating subtitles:', error)
      return res.status(500).json({ 
        error: 'Failed to create subtitles',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
} 