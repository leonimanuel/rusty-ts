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

      if (!videoId) {
        return res.status(400).json({ error: 'videoId is required in URL parameters' });
      }

      if (!language_code) {
        return res.status(400).json({ error: 'language_code is required in request body' });
      }

      // Verify video exists
      const { data: video, error: videoError } = await supabase
        .from('videos')
        .select('id')
        .eq('id', videoId)
        .single();

      if (videoError || !video) {
        return res.status(404).json({ 
          error: 'Video not found',
          details: videoError?.message 
        });
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

      // Get the English audio track and its subtitles
      const { data: sourceTrack, error: sourceError } = await supabase
        .from('audio_tracks')
        .select('id, url')
        .eq('video_id', videoId)
        .eq('language', 'en')
        .single();

      if (sourceError || !sourceTrack) {
        return res.status(404).json({ 
          error: 'Source English audio track not found',
          details: sourceError?.message
        });
      }

      // Get the English subtitles for this audio track
      const { data: sourceSubtitles, error: subtitleError } = await supabase
        .from('subtitles')
        .select('srt_data')
        .eq('audio_track_id', sourceTrack.id)
        .eq('language', 'en')
        .single();

      if (subtitleError || !sourceSubtitles) {
        // Fall back to the old method if no subtitles exist
        console.log('No subtitles found, falling back to direct audio translation');
        return this.createFromAudio(req, res);
      }

      // Translate the audio using SRT data
      const translatedAudio = await this.audioService.generateAudioFromVTT(
        sourceSubtitles.srt_data,
        { targetLanguage: language_code }
      );

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
        // id: audioTrack.id,
        // url: audioTrack.url
      });
    } catch (error) {
      console.error('Error creating audio track:', error);
      return res.status(500).json({ 
        error: 'Failed to create audio track',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Fallback method using direct audio translation
  private createFromAudio = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { videoId } = req.params;
      const { language_code } = req.body;

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

      // Translate the audio directly
      const translatedAudio = await this.audioService.generateAudioFromVTT(sourceTrack.url, {
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

      // Create audio track record
      const { data: audioTrack, error: insertError } = await supabase
        .from('audio_tracks')
        .insert(newTrackData)
        .select('id, url')
        .single();

      if (insertError) {
        throw insertError;
      }

      return res.status(201).json({
        id: audioTrack.id,
        url: audioTrack.url
      });
    } catch (error) {
      console.error('Error in fallback audio creation:', error);
      return res.status(500).json({ 
        error: 'Failed to create audio track using fallback method',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
} 