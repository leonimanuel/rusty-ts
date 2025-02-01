-- Insert a sample lesson and get its ID
WITH inserted_lesson AS (
  INSERT INTO public.lessons (title, description)
  VALUES (
    'Introduction to TypeScript',
    'Learn the basics of TypeScript including types, interfaces, and generics.'
  )
  RETURNING id
)
-- Insert a sample video linked to the lesson
INSERT INTO public.videos (lesson_id, url, title, description)
SELECT 
  inserted_lesson.id,
  'https://fcloxteatlyhwpxlsdzz.supabase.co/storage/v1/object/public/lesson-videos/Rusty%20Demo%20A1.mp4',
  'TypeScript Fundamentals',
  'A comprehensive overview of TypeScript fundamentals and basic concepts.'
FROM inserted_lesson; 