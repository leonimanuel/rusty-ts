import axios, { AxiosError } from 'axios';
import OpenAI from 'openai';
import { TranscriptionConfig, TranscriptionResponse, SubtitleOptions, UploadResponse, OpenAIConfig, SRTBlock } from './types';

export class SubtitleService {
  private readonly assemblyAIKey: string;
  private readonly assemblyAIBaseUrl = 'https://api.assemblyai.com/v2';
  private readonly assemblyAIHeaders: Record<string, string>;
  private readonly openai: OpenAI;

  constructor(config: TranscriptionConfig & OpenAIConfig) {
    this.assemblyAIKey = config.apiKey;
    this.assemblyAIHeaders = {
      'Authorization': this.assemblyAIKey,
      'Content-Type': 'application/json',
    };
    this.openai = new OpenAI({
      apiKey: config.apiKey,
    });
  }

  async uploadFile(fileUrl: string): Promise<string> {
    try {
      console.log('Making upload request with headers:', {
        ...this.assemblyAIHeaders,
        'Authorization': '****' + this.assemblyAIHeaders.Authorization.slice(-4)
      });
      
      const response = await axios.post<UploadResponse>(
        `${this.assemblyAIBaseUrl}/upload`,
        { url: fileUrl },
        { headers: this.assemblyAIHeaders }
      );
      return response.data.upload_url;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error('Upload failed with status:', error.response?.status);
        console.error('Error response:', error.response?.data);
        console.error('Request config:', {
          url: error.config?.url,
          method: error.config?.method,
          headers: {
            ...error.config?.headers,
            'Authorization': '****'
          }
        });
      }
      throw error;
    }
  }

  async transcribe(audioUrl: string): Promise<string> {
    try {
      // Start transcription
      const transcriptionResponse = await axios.post<TranscriptionResponse>(
        `${this.assemblyAIBaseUrl}/transcript`,
        { audio_url: audioUrl },
        { headers: this.assemblyAIHeaders }
      );

      const transcriptId = transcriptionResponse.data.id;
      console.log('Transcription started, ID:', transcriptId);
      
      // Poll for completion
      while (true) {
        const status = await this.getTranscriptionStatus(transcriptId);
        console.log('Status:', status.status);
        
        if (status.status === 'completed') {
          return transcriptId;
        }
        
        if (status.status === 'error') {
          throw new Error(`Transcription failed: ${status.error}`);
        }

        // Wait 3 seconds before polling again
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(`API Error: ${error.response?.status} - ${error.response?.statusText}`);
      }
      throw error;
    }
  }

  private async getTranscriptionStatus(transcriptId: string): Promise<TranscriptionResponse> {
    try {
      const response = await axios.get<TranscriptionResponse>(
        `${this.assemblyAIBaseUrl}/transcript/${transcriptId}`,
        { headers: this.assemblyAIHeaders }
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(`Status check failed: ${error.response?.status} - ${error.response?.statusText}`);
      }
      throw error;
    }
  }

  async getSubtitles(transcriptId: string, options: SubtitleOptions): Promise<string> {
    try {
      const params = new URLSearchParams();
      if (options.charsPerCaption) {
        params.append('chars_per_caption', options.charsPerCaption.toString());
      }

      const response = await axios.get(
        `${this.assemblyAIBaseUrl}/transcript/${transcriptId}/${options.format}?${params.toString()}`,
        {
          headers: this.assemblyAIHeaders,
          responseType: 'text'
        }
      );
      
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(`Subtitle generation failed: ${error.response?.status} - ${error.response?.statusText}`);
      }
      throw error;
    }
  }

  private parseSRT(srtContent: string): SRTBlock[] {
    const blocks = srtContent.trim().split('\n\n');
    return blocks.map(block => {
      const [index, timecode, ...textLines] = block.split('\n');
      return {
        index: parseInt(index),
        timecode,
        text: textLines.join(' ')
      };
    });
  }

  private formatSRT(blocks: SRTBlock[]): string {
    return blocks.map(block => 
      `${block.index}\n${block.timecode}\n${block.text}`
    ).join('\n\n');
  }

  async translateSubtitles(srtContent: string, targetLanguage: string): Promise<string> {
    try {
      // Parse SRT into blocks
      const blocks = this.parseSRT(srtContent);
      
      // Translate each block's text
      const translatedBlocks = await Promise.all(
        blocks.map(async block => {
          const prompt = `Translate the following subtitle text to ${targetLanguage}. Maintain the same tone and style, and ensure the translation fits the timing constraints:\n\n${block.text}`;
          
          const completion = await this.openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: 'You are a professional subtitle translator. Provide only the translated text without any explanations or additional content.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
          });

          return {
            ...block,
            text: completion.choices[0].message.content?.trim() || block.text
          };
        })
      );

      // Format back to SRT
      return this.formatSRT(translatedBlocks);
    } catch (error) {
      console.error('Error translating subtitles:', error);
      throw new Error('Failed to translate subtitles');
    }
  }
} 