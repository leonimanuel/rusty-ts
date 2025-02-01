import OpenAI from 'openai';
import { TranslationConfig } from './types';
import axios from 'axios';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createReadStream } from 'fs';
import { Readable } from 'stream';

export interface AudioTranslationConfig {
  targetLanguage: string;
}

export class AudioService {
  private readonly openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required but not provided');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async translateAudioFile(
    sourceAudioUrl: string, 
    config: AudioTranslationConfig
  ): Promise<Buffer> {
    try {
      console.log('Starting audio translation process...');
      console.log('Source URL:', sourceAudioUrl);
      console.log('Target language:', config.targetLanguage);

      // Download the audio file
      console.log('Downloading audio file...');
      const response = await axios.get(sourceAudioUrl, {
        responseType: 'arraybuffer'
      });
      console.log('Audio file downloaded, size:', response.data.length);

      // First transcribe to text
      console.log('Starting transcription...');
      const transcription = await this.openai.audio.transcriptions.create({
        file: new File([response.data], 'audio.wav', { type: 'audio/wav' }),
        model: 'whisper-1',
        language: 'en'  // Source is English
      });

      if (!transcription.text) {
        throw new Error('Transcription failed - no text returned');
      }
      console.log('Transcription received:', transcription.text);

      // Then translate the text
      console.log('Translating text...');
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the following text to ${config.targetLanguage}. Maintain the same tone and style. Only respond with the translation, no explanations.`
          },
          {
            role: 'user',
            content: transcription.text
          }
        ]
      });

      const translatedText = completion.choices[0].message.content;
      if (!translatedText) {
        throw new Error('Translation failed - no text returned');
      }
      console.log('Translation received:', translatedText);

      // Finally convert to speech
      console.log('Converting to speech...');
      const translatedAudio = await this.openai.audio.speech.create({
        model: 'tts-1',
        voice: 'nova',
        input: translatedText
      });

      console.log('Speech generation complete');
      const buffer = Buffer.from(await translatedAudio.arrayBuffer());
      console.log('Created final buffer, size:', buffer.length);

      return buffer;

    } catch (error) {
      console.error('Detailed error in audio translation:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        response: axios.isAxiosError(error) ? error.response?.data : undefined
      });
      throw new Error(
        `Failed to translate audio: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async transcribeAudio(audioUrl: string): Promise<string> {
    // Download the audio file
    const response = await fetch(audioUrl);
    const audioBlob = await response.blob();
    const audioFile = new File([audioBlob], 'audio.mp4', { type: 'audio/mp4' });

    // Transcribe using OpenAI
    const transcription = await this.openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
    });

    return transcription.text;
  }

  private async translateText(text: string, targetLanguage: string): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a professional translator. Translate the following text to ${targetLanguage}. Maintain the same tone and style. Only respond with the translation, no explanations.`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.7,
    });

    return completion.choices[0].message.content || text;
  }

  private async textToSpeech(text: string, language: string, voiceId?: string): Promise<Buffer> {
    type Voice = 'alloy' | 'echo' | 'fable' | 'nova' | 'onyx' | 'shimmer';
    
    // Map language codes to OpenAI voice models
    const voiceMap: Record<string, Voice> = {
      'en': 'alloy',
      'es': 'nova',
      'fr': 'nova',
      'de': 'nova',
      'ja': 'nova',
      // Add more mappings as needed
    };

    const voice: Voice = voiceMap[language] || 'nova';

    const mp3 = await this.openai.audio.speech.create({
      model: 'tts-1',
      voice: voice,
      input: text,
    });

    // Convert the response to a buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());
    return buffer;
  }
} 
