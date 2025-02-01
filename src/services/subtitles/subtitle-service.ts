import axios, { AxiosError } from 'axios';
import { TranscriptionConfig, TranscriptionResponse, SubtitleOptions, UploadResponse } from './types';

export class SubtitleService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.assemblyai.com/v2';
  private readonly headers: Record<string, string>;

  constructor(config: TranscriptionConfig) {
    this.apiKey = config.apiKey;
    this.headers = {
      'Authorization': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  async uploadFile(fileUrl: string): Promise<string> {
    try {
      console.log('Making upload request with headers:', {
        ...this.headers,
        'Authorization': '****' + this.headers.Authorization.slice(-4)
      });
      
      const response = await axios.post<UploadResponse>(
        `${this.baseUrl}/upload`,
        { url: fileUrl },
        { headers: this.headers }
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
        `${this.baseUrl}/transcript`,
        { audio_url: audioUrl },
        { headers: this.headers }
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
        `${this.baseUrl}/transcript/${transcriptId}`,
        { headers: this.headers }
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
        `${this.baseUrl}/transcript/${transcriptId}/${options.format}?${params.toString()}`,
        {
          headers: this.headers,
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
} 