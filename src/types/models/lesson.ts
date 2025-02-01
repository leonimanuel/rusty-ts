export interface Lesson {
  id: string
  title: string
  description: string | null
  created_at: Date
  updated_at: Date
}

export type LessonInsert = Omit<Lesson, 'id' | 'created_at' | 'updated_at'>
export type LessonUpdate = Partial<LessonInsert> 