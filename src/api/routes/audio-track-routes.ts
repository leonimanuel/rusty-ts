import { Router, Request, Response } from 'express';
import { AudioTrackController } from '../controllers/audio-track-controller';
import subtitleRoutes from './subtitle-routes';

const router = Router({ mergeParams: true });  // Enable access to videoId param
const audioTrackController = new AudioTrackController();

// POST /api/videos/:videoId/audio_track
router.post('/', async (req: Request, res: Response) => {
  await audioTrackController.create(req, res);
});

// Mount subtitle routes
// This will create routes like:
// POST /api/videos/:videoId/audio_track/:audioTrackId/subtitles/transcribe
// POST /api/videos/:videoId/audio_track/:audioTrackId/subtitles/translate
router.use('/:audioTrackId/subtitles', subtitleRoutes);

export default router; 