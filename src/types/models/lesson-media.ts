import { BaseModel, MediaType } from '../common'

export interface LessonMedia extends BaseModel {
  lesson_id: string
  media_id: string
  order_index: number
}

export type LessonMediaInsert = Omit<LessonMedia, 'id' | 'created_at' | 'updated_at'>
export type LessonMediaUpdate = Partial<LessonMediaInsert> 