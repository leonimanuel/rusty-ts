import { Lesson, LessonInsert, LessonUpdate } from './models/lesson'
import { Video, VideoInsert, VideoUpdate } from './models/video'
import { Subtitle, SubtitleInsert, SubtitleUpdate } from './models/subtitle'
import { AudioTrack, AudioTrackInsert, AudioTrackUpdate } from './models/audio-track'
import { SupportedLanguage } from './common'

export interface Database {
  public: {
    Tables: {
      lessons: {
        Row: Lesson
        Insert: LessonInsert
        Update: LessonUpdate
      }
      videos: {
        Row: Video
        Insert: VideoInsert
        Update: VideoUpdate
      }
      subtitles: {
        Row: Subtitle
        Insert: SubtitleInsert
        Update: SubtitleUpdate
      }
      audio_tracks: {
        Row: AudioTrack
        Insert: AudioTrackInsert
        Update: AudioTrackUpdate
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      supported_language: SupportedLanguage
    }
  }
}

// Re-export all models and types for convenience
export * from './models/lesson'
export * from './models/video'
export * from './models/subtitle'
export * from './models/audio-track'
export * from './common' 