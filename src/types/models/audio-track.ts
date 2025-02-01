import { SupportedLanguage } from '../common'

export interface AudioTrack {
  id: string
  video_id: string
  language: SupportedLanguage
  url: string
  created_at: Date
  updated_at: Date
}

export type AudioTrackInsert = Omit<AudioTrack, 'id' | 'created_at' | 'updated_at'>
export type AudioTrackUpdate = Partial<AudioTrackInsert> 