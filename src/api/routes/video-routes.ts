import { Router } from 'express'
import subtitleRoutes from './subtitle-routes'
import audioTrackRoutes from './audio-track-routes'

const router = Router()

// Mount subtitle routes under videos
router.use('/:videoId/subtitles', subtitleRoutes)

// Mount audio track routes under videos
router.use('/:videoId/audio_track', audioTrackRoutes)

export default router