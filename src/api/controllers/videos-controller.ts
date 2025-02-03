import { Request, Response } from 'express'
import { VideoInsert } from '../../types/models/video'
import { supabase } from '../../lib/supabase'
import { SubtitleService } from '../../services/subtitles/subtitle-service'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink, readFile } from 'fs/promises'
import { join } from 'path'
import os from 'os'

const execAsync = promisify(exec)

export class VideosController {
  private subtitleService: SubtitleService

  constructor() {
    this.subtitleService = new SubtitleService({
      apiKey: process.env.OPENAI_API_KEY || ''
    })
  }

  /**
   * Create a new video by uploading an MP4 file with embedded soft subtitles
   */
  create = async (req: Request, res: Response): Promise<Response> => {
    console.log('Starting video creation process...')
    
    const tempDir = os.tmpdir()
    const tempVideoPath = join(tempDir, `temp_${Date.now()}.mp4`)
    const tempAudioPath = join(tempDir, `audio_${Date.now()}.mp3`)
    const tempVttPath = join(tempDir, `temp_${Date.now()}.vtt`)
    const tempSrtPath = join(tempDir, `temp_${Date.now()}.srt`)  // Intermediate SRT
    const outputVideoPath = join(tempDir, `output_${Date.now()}.mp4`)

    console.log('Temporary files:', {
      tempVideoPath,
      tempAudioPath,
      tempVttPath,
      tempSrtPath,
      outputVideoPath
    })

    try {
      if (!req.file) {
        console.log('No video file provided in request')
        return res.status(400).json({
          error: 'No video file provided',
          details: 'Request must include an MP4 file'
        })
      }

      console.log('Saving uploaded file...', { size: req.file.size })
      await writeFile(tempVideoPath, req.file.buffer)
      console.log('File saved successfully')

      console.log('Extracting and compressing audio...')
      await execAsync(
        `ffmpeg -i ${tempVideoPath} -vn -acodec mp3 -ab 64k ${tempAudioPath}`
      )
      console.log('Audio extracted successfully')

      console.log('Generating VTT from audio...')
      const vttData = await this.subtitleService.transcribeToVTT(tempAudioPath)
      await writeFile(tempVttPath, vttData)
      console.log('VTT generated successfully')

      console.log('Converting VTT to SRT...')
      await execAsync(
        `ffmpeg -i ${tempVttPath} ${tempSrtPath}`
      )
      console.log('VTT converted to SRT successfully')

      console.log('Adding subtitles to video...')
      await execAsync(
        `ffmpeg -i ${tempVideoPath} -i ${tempSrtPath} ` +
        `-map 0:v -map 0:a -map 1 ` +
        `-c:v copy -c:a copy ` +
        `-c:s mov_text ` +
        `-metadata:s:s:0 language=eng ` +
        `-metadata:s:s:0 handler="English Subtitles" ` +
        `${outputVideoPath}`
      )
      console.log('Subtitles added successfully')

      console.log('Reading output video...')
      const videoBuffer = await readFile(outputVideoPath)
      console.log('Video read successfully', { size: videoBuffer.length })

      const fileName = `video/${Date.now()}.mp4`
      console.log('Uploading to Supabase storage...', { fileName })
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('lesson-videos')
        .upload(fileName, videoBuffer, {
          contentType: 'video/mp4',
          upsert: true
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw uploadError
      }
      console.log('Upload successful')

      console.log('Getting public URL...')
      const { data: publicUrl } = supabase.storage
        .from('lesson-videos')
        .getPublicUrl(fileName)
      console.log('Public URL generated:', publicUrl.publicUrl)

      const videoData: VideoInsert = {
        url: publicUrl.publicUrl,
        title: req.body.title || null,
        description: req.body.description || null,
      }

      console.log('Video processing completed successfully')
      return res.status(201).json({
        message: 'Video created successfully',
        videoId: publicUrl.publicUrl,
      })
    } catch (error) {
      console.error('Error creating video:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      return res.status(500).json({
        error: 'Failed to create video',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      console.log('Cleaning up temporary files...')
      try {
        await unlink(tempVideoPath)
        await unlink(tempAudioPath)
        await unlink(tempVttPath)
        await unlink(tempSrtPath)
        await unlink(outputVideoPath)
        console.log('Cleanup completed successfully')
      } catch (error) {
        console.error('Error cleaning up temp files:', {
          error,
          message: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
  }
}

export default new VideosController() 