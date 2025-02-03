import { SupportedLanguage } from '../common'

export interface Subtitle {
  id: string
  video_id: string
  language: SupportedLanguage
  srt_data: string
  created_at: Date
  updated_at: Date
}

export type SubtitleInsert = Omit<Subtitle, 'id' | 'created_at' | 'updated_at'>
export type SubtitleUpdate = Partial<SubtitleInsert> 