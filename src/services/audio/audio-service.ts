import OpenAI from 'openai';
import { TranslationConfig } from './types';
import axios from 'axios';
import { writeFileSync, unlinkSync, mkdtempSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';
import { exec } from 'child_process';
import { SubtitleService } from '../subtitles/subtitle-service';

const execAsync = promisify(exec);

export interface AudioTranslationConfig {
  targetLanguage: string;
}

interface SRTBlock {
  index: number;
  timecode: string;
  text: string;
  startTime: number;  // in milliseconds
  endTime: number;    // in milliseconds
  duration: number;   // in milliseconds
}

interface AudioSegment {
  timecode: string;
  audio: Buffer;
  startTime: number;
  endTime: number;
  actualDuration: number;  // in milliseconds
  targetDuration: number;  // in milliseconds
}

export class AudioService {
  private readonly openai: OpenAI;
  private readonly subtitleService: SubtitleService;
  private readonly MAX_SPEED = 2.0;  // ffmpeg atempo filter limit

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required but not provided');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.subtitleService = new SubtitleService({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async translateAudioFromSRT(
    srtData: string,
    config: AudioTranslationConfig
  ): Promise<Buffer> {
    try {
      console.log('Starting SRT-based audio translation process...');
      
      // Use SubtitleService to translate the SRT content
      console.log('Translating subtitles...');
      const translatedSRT = await this.subtitleService.translateSubtitles(
        srtData,
        config.targetLanguage
      );

      // Parse the translated SRT into blocks with timing
      const blocks = this.parseSRTWithTiming(translatedSRT);
      console.log(`Parsed ${blocks.length} translated SRT blocks`);

      // Create temporary directory for audio files
      const tempDir = mkdtempSync(join(tmpdir(), 'audio-'));
      console.log('Created temp directory:', tempDir);

      try {
        // Generate audio for each block and measure durations
        console.log('Generating audio for each block...');
        const audioSegments: AudioSegment[] = await Promise.all(
          blocks.map(async (block, index) => {
            console.log(`\nBlock ${index + 1}:`);
            console.log(`  Text: "${block.text}"`);
            console.log(`  Timecode: ${block.timecode}`);
            console.log(`  Target duration: ${block.duration}ms`);

            const audio = await this.openai.audio.speech.create({
              model: 'tts-1',
              voice: 'nova',
              input: block.text
            });

            const audioBuffer = Buffer.from(await audio.arrayBuffer());
            const segmentPath = join(tempDir, `segment_${index}.mp3`);
            writeFileSync(segmentPath, audioBuffer);

            // Get actual duration using ffmpeg
            const actualDuration = await this.getAudioDuration(segmentPath);
            console.log(`  Actual duration: ${actualDuration}ms`);

            return {
              timecode: block.timecode,
              audio: audioBuffer,
              startTime: block.startTime,
              endTime: block.endTime,
              actualDuration,
              targetDuration: block.duration
            };
          })
        );

        // Create a file list for ffmpeg
        const fileList = audioSegments.map((segment, index) => {
          const segmentPath = join(tempDir, `segment_${index}.mp3`);
          return `file '${segmentPath}'`;
        }).join('\n');

        const fileListPath = join(tempDir, 'files.txt');
        writeFileSync(fileListPath, fileList);

        // Create the final output path
        const outputPath = join(tempDir, 'final_output.mp3');

        // Use ffmpeg to concatenate files
        await new Promise<void>((resolve, reject) => {
          ffmpeg()
            .input(fileListPath)
            .inputOptions(['-f', 'concat', '-safe', '0'])
            .output(outputPath)
            .outputOptions([
              '-c', 'copy',  // Copy audio streams without re-encoding
              '-fflags', '+genpts'  // Generate presentation timestamps
            ])
            .on('end', () => resolve())
            .on('error', (error: Error) => reject(error))
            .run();
        });

        // Read the final file
        return readFileSync(outputPath);

      } finally {
        // Clean up temporary files
        try {
          await execAsync(`rm -rf ${tempDir}`);
          console.log('Cleaned up temp directory');
        } catch (error) {
          console.error('Error cleaning up temp directory:', error);
        }
      }
    } catch (error) {
      console.error('Error in SRT-based audio translation:', error);
      throw new Error(
        `Failed to translate audio from SRT: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async getAudioDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata.format.duration! * 1000); // Convert to milliseconds
      });
    });
  }

  private parseSRTWithTiming(srtContent: string): SRTBlock[] {
    const blocks = srtContent.trim().split('\n\n');
    return blocks.map(block => {
      const [index, timecode, ...textLines] = block.split('\n');
      const [startTime, endTime] = this.parseTimecode(timecode);
      return {
        index: parseInt(index),
        timecode,
        text: textLines.join(' '),
        startTime,
        endTime,
        duration: endTime - startTime
      };
    });
  }

  private parseTimecode(timecode: string): [number, number] {
    const [start, end] = timecode.split(' --> ');
    return [
      this.timeToMilliseconds(start.trim()),
      this.timeToMilliseconds(end.trim())
    ];
  }

  private timeToMilliseconds(timeStr: string): number {
    const [time, ms] = timeStr.split(',');
    const [hours, minutes, seconds] = time.split(':').map(Number);
    return (hours * 3600000) + (minutes * 60000) + (seconds * 1000) + Number(ms);
  }
}