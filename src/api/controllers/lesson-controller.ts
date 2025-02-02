import { Request, Response } from 'express'
import { supabase } from '../../lib/supabase'

interface CreateLessonDTO {
    title: string;
    description?: string;
    guideId: string;
    orderIndex?: number;
    videoIds?: string[]; // New field for video associations
}

export class LessonController {
  async list(req: Request, res: Response) {
    try {
      const { guideId } = req.params

      const { data, error } = await supabase
        .from('lessons')
        .select('*, guide:guides(*)')
        .eq('guide_id', guideId)
        .order('order_index')

      if (error) throw error

      return res.json(data)
    } catch (error) {
      console.error('Error listing lessons:', error)
      return res.status(500).json({ 
        error: 'Failed to list lessons',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  async get(req: Request, res: Response) {
    try {
      const { id } = req.params

      const { data, error } = await supabase
        .from('lessons')
        .select(`
          *,
          guide_id,
          lesson_videos (
            id,
            order_index,
            videos:videos(
              id,
              url,
              audio_tracks(
                id,
                url,
                language
              )
            )
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Lesson not found' })
        }
        throw error
      }

      return res.json(data)
    } catch (error) {
      console.error('Error getting lesson:', error)
      return res.status(500).json({ 
        error: 'Failed to get lesson',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  async createLesson(dto: CreateLessonDTO) {
    const { title, description, guideId, orderIndex, videoIds } = dto;

    // Start a Supabase transaction
    const { data: lesson, error: lessonError } = await supabase
        .from('lessons')
        .insert({
            title,
            description,
            guide_id: guideId,
            order_index: orderIndex || 0,
        })
        .select()
        .single();

    if (lessonError) throw lessonError;

    // If videoIds are provided, create the associations
    if (videoIds && videoIds.length > 0) {
        const lessonVideos = videoIds.map((videoId, index) => ({
            lesson_id: lesson.id,
            video_id: videoId,
            order_index: index,
        }));

        const { error: associationError } = await supabase
            .from('lesson_videos')
            .insert(lessonVideos);

        if (associationError) throw associationError;
    }

    return lesson;
  }

  async getLessonWithVideos(lessonId: string) {
    const { data: lesson, error: lessonError } = await supabase
        .from('lessons')
        .select(`
            *,
            lesson_videos (
                video_id,
                order_index,
                videos (*)
            )
        `)
        .eq('id', lessonId)
        .single();

    if (lessonError) throw lessonError;
    return lesson;
  }

  async updateLesson(lessonId: string, dto: Partial<CreateLessonDTO>) {
    const { videoIds, ...lessonData } = dto;

    // Update lesson data
    const { data: lesson, error: lessonError } = await supabase
        .from('lessons')
        .update(lessonData)
        .eq('id', lessonId)
        .select()
        .single();

    if (lessonError) throw lessonError;

    // If videoIds are provided, update the associations
    if (videoIds !== undefined) {
        // First, remove existing associations
        const { error: deleteError } = await supabase
            .from('lesson_videos')
            .delete()
            .eq('lesson_id', lessonId);

        if (deleteError) throw deleteError;

        // Then, create new associations
        if (videoIds.length > 0) {
            const lessonVideos = videoIds.map((videoId, index) => ({
                lesson_id: lessonId,
                video_id: videoId,
                order_index: index,
            }));

            const { error: associationError } = await supabase
                .from('lesson_videos')
                .insert(lessonVideos);

            if (associationError) throw associationError;
        }
    }

    return lesson;
  }
} 