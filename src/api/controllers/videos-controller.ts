import { Request, Response } from 'express'
import { VideoInsert } from '../../types/models/video'
import { supabase } from '../../lib/supabase'

export class VideosController {
  /**
   * Create a new video by uploading an MP4 file
   */
  create = async (req: Request, res: Response): Promise<Response> => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No video file provided',
          details: 'Request must include an MP4 file'
        })
      }

      // Upload the video to Supabase storage
      const fileName = `video/${Date.now()}.mp4`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('lesson-videos')
        .upload(fileName, req.file.buffer, {
          contentType: 'video/mp4',
          upsert: true
        })

      if (uploadError) {
        throw uploadError
      }

      // Get the public URL
      const { data: publicUrl } = supabase.storage
        .from('lesson-videos')
        .getPublicUrl(fileName)

      const videoData: VideoInsert = {
        url: publicUrl.publicUrl,
        title: req.body.title || null,
        description: req.body.description || null,
      }

      console.log('Attempting to insert video:', videoData)

      const { data: savedVideo, error: dbError } = await supabase
        .from('videos')
        .insert(videoData)
        .select()
        .single()

      if (dbError) {
        console.error('Detailed insert error:', {
          error: dbError,
          errorCode: dbError.code,
          details: dbError.details,
          hint: dbError.hint
        })
        throw dbError
      }

      console.log('Successfully created video:', savedVideo)

      return res.status(201).json(savedVideo)
    } catch (error) {
      console.error('Error creating video:', error)
      return res.status(500).json({
        error: 'Failed to create video',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}

export default new VideosController() 