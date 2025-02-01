import { Request, Response } from 'express'
import { SubtitleService } from '../../services/subtitles/subtitle-service'
import { supabase } from '../../lib/supabase'
import { SubtitleInsert } from '../../types/models/subtitle'

export class SubtitleController {
  private subtitleService: SubtitleService

  constructor() {
    this.subtitleService = new SubtitleService({
      apiKey: process.env.OPENAI_API_KEY || ''
    })
  }

  transcribe = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { audioTrackId } = req.params
      const { language = 'en' } = req.body

      // Get the audio track URL
      const { data: audioTrack, error: audioError } = await supabase
        .from('audio_tracks')
        .select('url')
        .eq('id', audioTrackId)
        .single()

      if (audioError || !audioTrack) {
        return res.status(404).json({ 
          error: 'Audio track not found',
          details: audioError?.message 
        })
      }

      // Get SRT directly from Whisper
      const srtData = await this.subtitleService.transcribeToSRT(audioTrack.url)

      const subtitleData: SubtitleInsert = {
        audio_track_id: audioTrackId,
        language,
        srt_data: srtData
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

      return res.status(201).json({
        audioTrackId,
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

  translate = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { audioTrackId } = req.params
      const { targetLanguage } = req.body

      if (!targetLanguage) {
        return res.status(400).json({ 
          error: 'targetLanguage is required in request body' 
        })
      }

      // Get the audio track to find its language
      const { data: audioTrack, error: audioError } = await supabase
        .from('audio_tracks')
        .select('language')
        .eq('id', audioTrackId)
        .single()

      if (audioError || !audioTrack) {
        return res.status(404).json({ 
          error: 'Audio track not found',
          details: audioError?.message 
        })
      }

      // Get source subtitle based on audio track
      const { data: sourceSubtitle, error: fetchError } = await supabase
        .from('subtitles')
        .select('srt_data')
        .eq('audio_track_id', audioTrackId)
        .eq('language', audioTrack.language)
        .single()

      if (fetchError || !sourceSubtitle) {
        return res.status(404).json({ 
          error: `No subtitles found for audio track in language: ${audioTrack.language}`,
          details: fetchError?.message 
        })
      }

      // Translate using OpenAI
      const translatedSrt = await this.subtitleService.translateSubtitles(
        sourceSubtitle.srt_data,
        targetLanguage
      )

      const subtitleData: SubtitleInsert = {
        audio_track_id: audioTrackId,
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

      return res.status(201).json({
        audioTrackId,
        sourceLanguage: audioTrack.language,
        targetLanguage,
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