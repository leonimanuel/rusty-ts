import { Router, Request, Response } from 'express'
import { SubtitleController } from '../controllers/subtitle-controller'

const router = Router({ mergeParams: true })  // mergeParams allows access to parent route params
const subtitleController = new SubtitleController()

// POST /api/audio-tracks/:audioTrackId/subtitles/transcribe
// Creates subtitles by transcribing the audio track using Whisper
router.post('/transcribe', async (req: Request, res: Response) => {
  await subtitleController.transcribe(req, res)
})

// POST /api/audio-tracks/:audioTrackId/subtitles/translate
// Creates translated subtitles from an existing subtitle
router.post('/translate', async (req: Request, res: Response) => {
  await subtitleController.translate(req, res)
})

export default router 
