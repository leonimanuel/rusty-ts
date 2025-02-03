import { OpenAI } from 'openai';
import { OpenAIConfig, SRTBlock } from './types';
import { readFile } from 'fs/promises';

export class SubtitleService {
  private readonly openai: OpenAI;

  constructor(config: OpenAIConfig) {
    this.openai = new OpenAI({
      apiKey: config.apiKey,
    });
  }

  async transcribeToVTT(input: string | File): Promise<string> {
    try {
      let file: File
      
      if (typeof input === 'string') {
        if (input.startsWith('http')) {
          // Handle URL
          const response = await fetch(input)
          const audioBlob = await response.blob()
          file = new File([audioBlob], 'audio.mp3', { type: 'audio/mpeg' })
        } else {
          // Handle file path
          const buffer = await readFile(input)
          file = new File([buffer], 'audio.mp3', { type: 'audio/mpeg' })
        }
      } else {
        file = input
      }

      const transcription = await this.openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        response_format: 'vtt'
      })

      return transcription as unknown as string
    } catch (error) {
      console.error('Error transcribing audio:', error)
      throw new Error('Failed to transcribe audio')
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