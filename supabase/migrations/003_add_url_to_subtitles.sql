-- Add URL column to subtitles table
ALTER TABLE subtitles
ADD COLUMN url VARCHAR(2048);
