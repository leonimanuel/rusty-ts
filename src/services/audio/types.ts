export interface SpeechmaticsConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface TranslationConfig {
  sourceLanguage: string;
  targetLanguages: string[];
}

export interface TranslationJobResponse {
  id: string;
  status: 'running' | 'done' | 'failed';
  config: {
    type: string;
    transcription_config: {
      operating_point: string;
      language: string;
    };
    translation_config: {
      target_languages: string[];
    };
  };
}

export interface TranslationResult {
  results: {
    channels: Array<{
      alternatives: Array<{
        transcript: string;
        confidence: number;
        translations: Record<string, string>;
      }>;
    }>;
  };
} 