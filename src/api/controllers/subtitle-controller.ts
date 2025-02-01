import { Request, Response } from 'express'
import { SubtitleService } from '../../services/subtitles/subtitle-service'
import { SubtitleOptions } from '../../services/subtitles/types'
import { supabase } from '../../lib/supabase'
import { SubtitleInsert } from '../../types/database.types'

export class SubtitleController {
  private subtitleService: SubtitleService

  constructor() {
    this.subtitleService = new SubtitleService({
      apiKey: process.env.ASSEMBLY_AI_API_KEY || ''
    })
  }

  create = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { videoId } = req.params
      const { videoUrl, format = 'srt', charsPerCaption, language = 'en' } = req.body

      if (!videoUrl) {
        return res.status(400).json({ error: 'videoUrl is required in request body' })
      }

      const transcriptId = await this.subtitleService.transcribe(videoUrl)
      const subtitleOptions: SubtitleOptions = {
        format: format as 'srt' | 'vtt',
        charsPerCaption
      }
      const subtitles = await this.subtitleService.getSubtitles(transcriptId, subtitleOptions)

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

  createFromTranscription = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { videoId } = req.params
      const { videoUrl, format = 'srt', charsPerCaption, language = 'en' } = req.body

      if (!videoUrl) {
        return res.status(400).json({ error: 'videoUrl is required in request body' })
      }

      const transcriptId = await this.subtitleService.transcribe(videoUrl)
      const subtitleOptions: SubtitleOptions = {
        format: format as 'srt' | 'vtt',
        charsPerCaption
      }
      const subtitles = await this.subtitleService.getSubtitles(transcriptId, subtitleOptions)

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

  createFromTranslation = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { videoId } = req.params
      const { sourceSubtitleId, targetLanguage } = req.body

      if (!sourceSubtitleId || !targetLanguage) {
        return res.status(400).json({ 
          error: 'sourceSubtitleId and targetLanguage are required in request body' 
        })
      }

      // Get source subtitle
      const { data: sourceSubtitle, error: fetchError } = await supabase
        .from('subtitles')
        .select('srt_data')
        .eq('id', sourceSubtitleId)
        .single()

      if (fetchError || !sourceSubtitle) {
        return res.status(404).json({ 
          error: 'Source subtitle not found',
          details: fetchError?.message 
        })
      }

      // Translate using OpenAI (we'll implement this service next)
      const translatedSrt = await this.subtitleService.translateSubtitles(
        sourceSubtitle.srt_data,
        targetLanguage
      )

      const subtitleData: SubtitleInsert = {
        video_id: videoId,
        language: targetLanguage,
        srt_data: translatedSrt
      }

      const { data: savedSubtitle, error: dbError } = await supabase
        .from('subtitles')
        .insert(subtitleData)
        .select()
        .single()

      if (dbError) {
        console.error('Error saving translated subtitles:', dbError)
        return res.status(500).json({ 
          error: 'Failed to save translated subtitles',
          details: dbError.message
        })
      }

      return res.status(200).json({
        videoId,
        sourceSubtitleId,
        subtitle: savedSubtitle
      })
    } catch (error) {
      console.error('Error translating subtitles:', error)
      return res.status(500).json({ 
        error: 'Failed to translate subtitles',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
} 