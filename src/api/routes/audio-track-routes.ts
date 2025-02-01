import { Router, Request, Response } from 'express';
import { AudioTrackController } from '../controllers/audio-track-controller';
import subtitleRoutes from './subtitle-routes';

const router = Router();  // No need for mergeParams anymore
const audioTrackController = new AudioTrackController();

// POST /api/audio-tracks
router.post('/', async (req: Request, res: Response) => {
  await audioTrackController.create(req, res);
});

// Mount subtitle routes
// This will create routes like:
// POST /api/audio-tracks/:audioTrackId/subtitles/transcribe
// POST /api/audio-tracks/:audioTrackId/subtitles/translate
router.use('/:audioTrackId/subtitles', subtitleRoutes);

export default router; 