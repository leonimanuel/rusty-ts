-- Remove the existing lesson_id foreign key from videos
ALTER TABLE videos DROP CONSTRAINT videos_lesson_id_fkey;
ALTER TABLE videos DROP COLUMN lesson_id;

-- Create lesson_videos junction table
CREATE TABLE lesson_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lesson_id, video_id)
);

-- Add updated_at trigger
CREATE TRIGGER update_lesson_videos_updated_at
    BEFORE UPDATE ON lesson_videos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();