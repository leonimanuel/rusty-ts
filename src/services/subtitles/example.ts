import { AssemblyAI } from 'assemblyai';
import { config } from 'dotenv';

// Load environment variables
config();

async function generateSubtitles(videoUrl: string) {
  try {
    const apiKey = process.env.ASSEMBLY_AI_API_KEY;
    if (!apiKey) {
      throw new Error('ASSEMBLY_AI_API_KEY is not set in environment variables');
    }
    
    const client = new AssemblyAI({
      apiKey
    });

    // Start transcription
    console.log('Processing video:', videoUrl);
    const transcript = await client.transcripts.transcribe({
      audio: videoUrl,
      speaker_labels: true
    });

    if (transcript.status === 'error') {
      throw new Error(`Transcription failed: ${transcript.error}`);
    }

    // Get subtitles in both formats
    console.log('\nGenerating subtitles...');
    const srtSubtitles = await client.transcripts.subtitles(transcript.id);
    const vttSubtitles = await client.transcripts.subtitles(transcript.id);

    // Show preview
    console.log('\nTranscript Preview:');
    console.log('------------------');
    console.log(transcript.text?.slice(0, 150) + '...');

    if (transcript.utterances) {
      console.log('\nSpeaker Segments:');
      console.log('----------------');
      for (const utterance of transcript.utterances.slice(0, 3)) {
        console.log(`Speaker ${utterance.speaker}: ${utterance.text}`);
      }
    }

    console.log('\nSRT Preview:');
    console.log('------------');
    console.log(srtSubtitles.split('\n').slice(0, 5).join('\n'));
    
    console.log('\nVTT Preview:');
    console.log('------------');
    console.log(vttSubtitles.split('\n').slice(0, 5).join('\n'));

    return {
      transcript: transcript.text,
      utterances: transcript.utterances,
      srt: srtSubtitles,
      vtt: vttSubtitles,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('\nError:', error.message);
    } else {
      console.error('\nUnknown error occurred');
    }
    throw error;
  }
}

// Run the example
const videoUrl = process.env.TEST_VIDEO_URL;
if (!videoUrl) {
  console.error('Please set TEST_VIDEO_URL in your environment variables');
  process.exit(1);
}

generateSubtitles(videoUrl)
  .then(() => console.log('\nDone! ✨'))
  .catch(() => process.exit(1)); 