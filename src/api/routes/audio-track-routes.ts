import { Router, Request, Response } from 'express';
import { AudioTrackController } from '../controllers/audio-track-controller';

const router = Router({ mergeParams: true });  // mergeParams allows access to videoId param
const audioTrackController = new AudioTrackController();

// POST /api/videos/:videoId/audio_track
router.post('/', async (req: Request, res: Response) => {
  await audioTrackController.create(req, res);
});

export default router; 