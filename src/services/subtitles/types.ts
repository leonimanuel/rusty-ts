export interface TranscriptionConfig {
  apiKey: string;
  language?: string;
  charsPerCaption?: number;
}

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
}

export interface TranscriptionResponse {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  text?: string;
  error?: string;
}

export interface SubtitleOptions {
  format: 'srt' | 'vtt';
  charsPerCaption?: number;
}

export interface UploadResponse {
  upload_url: string;
}

export interface SRTBlock {
  index: number;
  timecode: string;
  text: string;
} 