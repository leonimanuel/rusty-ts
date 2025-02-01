import { Request, Response } from 'express';
import { supabase } from '../../lib/supabase';
import { AudioService } from '../../services/audio/audio-service';

export class AudioTrackController {
  private audioService: AudioService;

  constructor() {
    this.audioService = new AudioService();
  }

  create = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { videoId } = req.params;
      const { language_code } = req.body;

      if (!language_code) {
        return res.status(400).json({ error: 'language_code is required' });
      }

      // Check if audio track already exists
      const { data: existingTrack, error: existingError } = await supabase
        .from('audio_tracks')
        .select('id, url')
        .eq('video_id', videoId)
        .eq('language', language_code)
        .single();

      if (existingError && existingError.code !== 'PGRST116') {  // PGRST116 is "no rows returned"
        throw existingError;
      }

      if (existingTrack) {
        return res.status(200).json({
          id: existingTrack.id,
          url: existingTrack.url
        });
      }

      // Get the English audio track
      const { data: sourceTrack, error: sourceError } = await supabase
        .from('audio_tracks')
        .select('url')
        .eq('video_id', videoId)
        .eq('language', 'en')
        .single();

      if (sourceError || !sourceTrack) {
        return res.status(404).json({ 
          error: 'Source English audio track not found',
          details: sourceError?.message
        });
      }

      // Translate the audio
      const translatedAudio = await this.audioService.translateAudioFile(sourceTrack.url, {
        targetLanguage: language_code
      });

      // Upload the translated audio to Supabase storage
      const fileName = `audio/${videoId}_${language_code}_audio.mp3`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('lesson-videos')
        .upload(fileName, translatedAudio, {
          contentType: 'audio/mp3',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL
      const { data: publicUrl } = supabase.storage
        .from('lesson-videos')
        .getPublicUrl(fileName);

      const newTrackData = {
        video_id: videoId,
        language: language_code,
        url: publicUrl.publicUrl
      };
      
      console.log('Attempting to insert audio track:', newTrackData);

      // Create audio track record
      const { data: audioTrack, error: insertError } = await supabase
        .from('audio_tracks')
        .insert(newTrackData)
        .select('id, url')
        .single();

      if (insertError) {
        console.error('Detailed insert error:', {
          error: insertError,
          errorCode: insertError.code,
          details: insertError.details,
          hint: insertError.hint
        });
        throw insertError;
      }

      console.log('Successfully created audio track:', audioTrack);

      return res.status(201).json({
        id: audioTrack.id,
        url: audioTrack.url
      });
    } catch (error) {
      console.error('Error creating audio track:', error);
      return res.status(500).json({ 
        error: 'Failed to create audio track',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
} 