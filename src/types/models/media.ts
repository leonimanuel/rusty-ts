import { MediaType } from "../common"

export interface Media {
  id: string
  url: string
  type: MediaType
  created_at: Date
  updated_at: Date
}

export type MediaInsert = Omit<Media, 'id' | 'created_at' | 'updated_at'>
export type MediaUpdate = Partial<MediaInsert> 