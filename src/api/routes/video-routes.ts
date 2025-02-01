import { Router, Request, Response } from 'express'
import { VideoController } from '../controllers/video-controller'

const router = Router()
const videoController = new VideoController()

// POST /api/videos/:videoId/subtitles
router.post('/:videoId/subtitles', async (req: Request, res: Response) => {
  await videoController.createSubtitles(req, res)
})

export default router