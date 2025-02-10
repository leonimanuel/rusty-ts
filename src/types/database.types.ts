import { Lesson, LessonInsert, LessonUpdate } from './models/lesson'
import { Media, MediaInsert, MediaUpdate } from './models/media'
import { LessonMedia, LessonMediaInsert, LessonMediaUpdate } from './models/lesson-media'
import { Subtitle, SubtitleInsert, SubtitleUpdate } from './models/subtitle'
import { AudioTrack, AudioTrackInsert, AudioTrackUpdate } from './models/audio-track'
import { SupportedLanguage, MediaType } from './common'

export interface Database {
  public: {
    Tables: {
      lessons: {
        Row: Lesson
        Insert: LessonInsert
        Update: LessonUpdate
      }
      lesson_medias: {
        Row: LessonMedia
        Insert: LessonMediaInsert
        Update: LessonMediaUpdate
      }
      videos: {
        Row: Media
        Insert: MediaInsert
        Update: MediaUpdate
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
      media_type: MediaType
    }
  }
}

// Re-export all models and types for convenience
export * from './models/lesson'
export * from './models/lesson-media'
export * from './models/media'
export * from './models/subtitle'
export * from './models/audio-track'
export * from './common' 