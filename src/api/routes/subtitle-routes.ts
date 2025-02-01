import { Router, Request, Response } from 'express'
import { VideoController } from '../controllers/video-controller'

const router = Router({ mergeParams: true })  // mergeParams allows access to parent route params
const videoController = new VideoController()

// POST /api/videos/:videoId/subtitles
router.post('/', async (req: Request, res: Response) => {
  await videoController.createSubtitles(req, res)
})

export default router 
