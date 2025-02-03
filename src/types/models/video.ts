export interface Video {
  id: string
  url: string
  title: string | null
  description: string | null
  created_at: Date
  updated_at: Date
}

export type VideoInsert = Omit<Video, 'id' | 'created_at' | 'updated_at'>
export type VideoUpdate = Partial<VideoInsert> 