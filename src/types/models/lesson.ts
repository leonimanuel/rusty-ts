import { BaseModel, MediaType } from '../common';

export interface Lesson extends BaseModel {
  title: string
  description?: string
  guide_id?: string
  order_index: number
  media_type: MediaType
}

export type LessonInsert = Omit<Lesson, 'id' | 'created_at' | 'updated_at'>
export type LessonUpdate = Partial<LessonInsert> 