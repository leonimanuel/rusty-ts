import { Router, Request, Response } from 'express'
import { SubtitleController } from '../controllers/subtitle-controller'

const router = Router({ mergeParams: true })  // mergeParams allows access to parent route params
const subtitleController = new SubtitleController()

// POST /api/videos/:videoId/subtitles/transcribe
router.post('/transcribe', async (req: Request, res: Response) => {
  await subtitleController.createFromTranscription(req, res)
})

// POST /api/videos/:videoId/subtitles/translate
router.post('/translate', async (req: Request, res: Response) => {
  await subtitleController.createFromTranslation(req, res)
})

export default router 
