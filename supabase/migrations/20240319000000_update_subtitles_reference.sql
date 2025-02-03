-- First create the new column
ALTER TABLE subtitles 
ADD COLUMN video_id UUID REFERENCES videos(id);

-- Copy data over (assuming there's existing data to migrate)
UPDATE subtitles s
SET video_id = at.video_id
FROM audio_tracks at
WHERE s.audio_track_id = at.id;

-- Make video_id required
ALTER TABLE subtitles
ALTER COLUMN video_id SET NOT NULL;

-- Drop the old foreign key
ALTER TABLE subtitles
DROP COLUMN audio_track_id;

-- Add an index for performance
CREATE INDEX subtitles_video_id_idx ON subtitles(video_id);

-- Add a unique constraint to prevent duplicate language subtitles per video
ALTER TABLE subtitles
ADD CONSTRAINT subtitles_video_id_language_key UNIQUE (video_id, language); 