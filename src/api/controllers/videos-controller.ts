import { Request, Response } from 'express'
import { MediaInsert } from '../../types/models/media'
import { LessonMediaInsert } from '../../types/models/lesson-media'
import { supabase } from '../../lib/supabase'
import { SubtitleService } from '../../services/subtitles/subtitle-service'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink, readFile } from 'fs/promises'
import { join } from 'path'
import os from 'os'
import { SupportedLanguage } from '../../types/common'
import { SubtitleInsert } from '../../types/models/subtitle'
import { AudioService } from '../../services/audio/audio-service'
import { AuthenticatedRequest } from '../middleware/auth'
import axios from 'axios'

const execAsync = promisify(exec)

type ISO6392Code = 'eng' | 'spa' | 'fra' | 'deu' | 'ita' | 'por' | 'rus' | 'zho' | 'jpn' | 'kor'

const getISO6392Code = (iso6391: SupportedLanguage): ISO6392Code => {
  const mapping: Record<SupportedLanguage, ISO6392Code> = {
    en: 'eng',
    es: 'spa',
    fr: 'fra',
    de: 'deu',
    it: 'ita',
    pt: 'por',
    ru: 'rus',
    zh: 'zho',
    ja: 'jpn',
    ko: 'kor'
  }
  return mapping[iso6391]
}

export class VideosController {
  private subtitleService: SubtitleService
  private audioService: AudioService

  constructor() {
    this.subtitleService = new SubtitleService({
      apiKey: process.env.OPENAI_API_KEY || ''
    })
    this.audioService = new AudioService()
  }

  /**
   * Create a new video by uploading an MP4 file with embedded soft subtitles
   */
  create = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    console.log('Starting video creation process...')

    const { url } = req.body
    if (!url) {
      return res.status(400).json({
        error: 'No video URL provided',
        details: 'Request must include a video URL'
      })
    }

    const languages = (req.body.languages || []) as SupportedLanguage[]
    const lessonId = req.body.lessonId
    console.log('Requested languages:', languages)

    const tempDir = os.tmpdir()
    const tempVideoPath = join(tempDir, `temp_${Date.now()}.mp4`)
    const tempAudioPath = join(tempDir, `audio_${Date.now()}.mp3`)
    const tempVttPath = join(tempDir, `temp_${Date.now()}.vtt`)
    const tempSrtPath = join(tempDir, `temp_${Date.now()}.srt`)
    const translatedSrtPaths: string[] = []
    const outputVideoPath = join(tempDir, `output_${Date.now()}.mp4`)

    try {
      // Download video from URL
      console.log('Downloading video from URL...')
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'arraybuffer'
      })

      await writeFile(tempVideoPath, response.data)
      console.log('Video downloaded successfully')

      console.log('Extracting and compressing audio...')
      await execAsync(
        `ffmpeg -i ${tempVideoPath} -vn -acodec mp3 -ab 64k ${tempAudioPath}`
      )
      console.log('Audio extracted successfully')

      console.log('Generating English VTT from audio...')
      const vttData = await this.subtitleService.transcribeToVTT(tempAudioPath)
      await writeFile(tempVttPath, vttData)
      console.log('English VTT generated successfully')

      console.log('Converting English VTT to SRT...')
      await execAsync(
        `ffmpeg -i ${tempVttPath} ${tempSrtPath}`
      )
      console.log('English VTT converted to SRT successfully')

      // Upload English VTT file
      console.log('Uploading English VTT file...')
      const englishVttBuffer = await readFile(tempVttPath)
      const englishVttFileName = `subtitles/${Date.now()}_eng.vtt`
      
      const { data: englishVttData, error: englishVttError } = await supabase.storage
        .from('lesson-videos')
        .upload(englishVttFileName, englishVttBuffer, {
          contentType: 'text/vtt',
          upsert: true
        })

      if (englishVttError) {
        console.error('Error uploading English VTT:', englishVttError)
        throw englishVttError
      }

      const { data: englishVttUrl } = supabase.storage
        .from('lesson-videos')
        .getPublicUrl(englishVttFileName)

      console.log('English VTT uploaded successfully:', englishVttUrl.publicUrl)

      // Generate and upload translated subtitles
      const translatedVttUrls: Record<string, string> = {}
      const translatedSubtitles: Array<{language: SupportedLanguage, srt_data: string}> = []
      
      if (languages.length > 0) {
        console.log('Starting subtitle translations...')
        const englishSrtContent = await readFile(tempSrtPath, 'utf-8')

        for (const lang of languages) {
          console.log(`Translating subtitles to ${lang}...`)
          const translatedSrt = await this.subtitleService.translateSubtitles(englishSrtContent, lang)
          const translatedSrtPath = join(tempDir, `temp_${Date.now()}_${lang}.srt`)
          await writeFile(translatedSrtPath, translatedSrt)
          translatedSrtPaths.push(translatedSrtPath)

          // Store translated subtitle data for audio generation
          translatedSubtitles.push({
            language: lang,
            srt_data: translatedSrt
          })

          // Convert SRT to VTT and upload
          const translatedVttPath = join(tempDir, `temp_${Date.now()}_${lang}.vtt`)
          await execAsync(`ffmpeg -i ${translatedSrtPath} ${translatedVttPath}`)
          
          const translatedVttBuffer = await readFile(translatedVttPath)
          const translatedVttFileName = `subtitles/${Date.now()}_${lang}.vtt`

          const { error: translatedVttError } = await supabase.storage
            .from('lesson-videos')
            .upload(translatedVttFileName, translatedVttBuffer, {
              contentType: 'text/vtt',
              upsert: true
            })

          if (translatedVttError) {
            console.error(`Error uploading ${lang} VTT:`, translatedVttError)
            throw translatedVttError
          }

          const { data: translatedVttUrl } = supabase.storage
            .from('lesson-videos')
            .getPublicUrl(translatedVttFileName)

          translatedVttUrls[lang] = translatedVttUrl.publicUrl
          console.log(`${lang} VTT uploaded successfully:`, translatedVttUrl.publicUrl)

          // Clean up temporary VTT file
          await unlink(translatedVttPath)
        }
        console.log('All translations completed and uploaded')
      }

      // Generate audio tracks from translated subtitles
      console.log('Generating audio tracks...')
      const audioFiles = await Promise.all(
        translatedSubtitles.map(async ({ language, srt_data }) => {
          console.log(`Generating audio for ${language}...`)
          const audioBuffer = await this.audioService.generateAudioFromVTT(
            srt_data,
            { targetLanguage: language }
          )

          // Save audio temporarily
          const audioPath = join(tempDir, `audio_${language}.mp3`)
          await writeFile(audioPath, audioBuffer)
          return { lang: language, path: audioPath }
        })
      )

      const getLanguageTitle = (code: SupportedLanguage): string => {
        const titles: Record<SupportedLanguage, string> = {
          en: 'English',
          es: 'Spanish',
          fr: 'French',
          de: 'German',
          it: 'Italian',
          pt: 'Portuguese',
          ru: 'Russian',
          zh: 'Chinese',
          ja: 'Japanese',
          ko: 'Korean'
        }
        return titles[code]
      }

      // Construct ffmpeg command with all subtitle and audio tracks
      console.log('Adding all tracks to video...')
      const inputFiles = [
        `-i "${tempVideoPath}"`,
        `-i "${tempSrtPath}"`, // English subtitles
        ...translatedSrtPaths.map(path => `-i "${path}"`), // Translated subtitles
        ...audioFiles.map(({path}) => `-i "${path}"`) // Audio tracks
      ].join(' ')

      const mappings = [
        `-map 0:v`, // video stream
        `-map 0:a`, // original audio stream
        `-map 1`, // English subtitles
        ...translatedSrtPaths.map((_, index) => `-map ${index + 2}`), // translated subtitles
        ...audioFiles.map((_, index) => 
          `-map ${index + 2 + translatedSrtPaths.length}`) // audio tracks
      ].join(' ')

      // Metadata for subtitle and audio streams
      const metadata = [
        // English subtitles (first subtitle stream)
        `-disposition:s:0 default`,
        `-metadata:s:s:0 language=${getISO6392Code('en')}`,
        `-metadata:s:s:0 handler_name="English"`,
        // Original audio (first audio stream)
        `-metadata:s:a:0 language=${getISO6392Code('en')}`,
        `-metadata:s:a:0 handler_name="Original Audio"`,
        // Additional languages
        ...languages.map((lang, index) => {
          const title = getLanguageTitle(lang)
          return [
            // Subtitle metadata (subsequent subtitle streams)
            `-disposition:s:${index + 1} 0`,
            `-metadata:s:s:${index + 1} language=${getISO6392Code(lang)}`,
            `-metadata:s:s:${index + 1} handler_name="${title} Subtitles"`,
            // Audio track metadata (subsequent audio streams)
            `-metadata:s:a:${index + 1} language=${getISO6392Code(lang)}`,
            `-metadata:s:a:${index + 1} handler_name="${title} Audio"`
          ].join(' ')
        })
      ].join(' ')

      const ffmpegCommand = `ffmpeg ${[
        inputFiles,
        mappings,
        `-c:v copy`,
        `-c:a aac`, // Convert audio to AAC for better compatibility
        `-c:s mov_text`,
        metadata,
        `-movflags +faststart`,  // Optimize for streaming
        `"${outputVideoPath}"`
      ].join(' ')}`

      await execAsync(ffmpegCommand)
      console.log('All tracks added successfully')

      // Clean up audio files
      for (const {path} of audioFiles) {
        await unlink(path)
      }

      // Verify subtitle tracks with ffprobe
      console.log('Verifying subtitle tracks...')
      const { stdout: probeOutput } = await execAsync(
        `ffprobe -v quiet -print_format json -show_streams -show_format "${outputVideoPath}"`
      )
      
      const probeData = JSON.parse(probeOutput)
      const subtitleStreams = probeData.streams.filter((s: any) => s.codec_type === 'subtitle')
      
      console.log('Detected subtitle tracks:', subtitleStreams.map((s: any) => ({
        index: s.index,
        codec: s.codec_name,
        language: s.tags?.language,
        handler: s.tags?.handler_name,
        title: s.tags?.title
      })))

      // console.log('Reading output video...')
      const videoBuffer = await readFile(outputVideoPath)
      // console.log('Video read successfully', { size: videoBuffer.length })

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

      // Create video record in database
      console.log('Creating video record...')
      const videoData: MediaInsert = {
        url: publicUrl.publicUrl,
        type: 'video',
      }

      const { data: savedMedia, error: mediaError } = await supabase
        .from('medias')
        .insert(videoData)
        .select()
        .single()

      if (mediaError) {
        console.error('Error creating media record:', mediaError)
        throw mediaError
      }

      // Create lesson_media record if lessonId is provided
      if (lessonId) {
        console.log('Creating lesson_media record...')
        const lessonMediaData: LessonMediaInsert = {
          lesson_id: lessonId,
          media_id: savedMedia.id,
          order_index: 0
        }

        const { error: lessonMediaError } = await supabase
          .from('lesson_medias')
          .insert(lessonMediaData)

        if (lessonMediaError) {
          console.error('Error creating lesson_media record:', lessonMediaError)
          throw lessonMediaError
        }

        console.log('Lesson_media record created successfully')
      }

      // Create subtitle records
      console.log('Creating subtitle records...')
      
      // Create English subtitle record
      const englishSubtitleData: SubtitleInsert = {
        media_id: savedMedia.id,
        language: 'en',
        srt_data: vttData,
        url: englishVttUrl.publicUrl
      }

      const { error: englishSubtitleError } = await supabase
        .from('subtitles')
        .insert(englishSubtitleData)

      if (englishSubtitleError) {
        console.error('Error creating English subtitle record:', englishSubtitleError)
        throw englishSubtitleError
      }

      // Create translated subtitle records
      const translatedSubtitlesInsert = await Promise.all(
        languages.map(async (lang) => {
          const subtitleData: SubtitleInsert = {
            media_id: savedMedia.id,
            language: lang,
            srt_data: await readFile(translatedSrtPaths.find(p => p.includes(lang)) || '', 'utf-8'),
            url: translatedVttUrls[lang]
          }

          const { error: subtitleError } = await supabase
            .from('subtitles')
            .insert(subtitleData)

          if (subtitleError) {
            console.error(`Error creating ${lang} subtitle record:`, subtitleError)
            throw subtitleError
          }

          return subtitleData
        })
      )

      console.log('All subtitle records created successfully')

      return res.status(201).json({
        message: 'Video created successfully',
        url: publicUrl.publicUrl,
        // media: savedMedia
        // subtitles: {
          // en: englishSubtitleData,
      //     ...Object.fromEntries(translatedSubtitles.map(s => [s.language, s]))
      //   },
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
        for (const path of translatedSrtPaths) {
          await unlink(path)
        }
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