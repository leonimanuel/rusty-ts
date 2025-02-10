import { Router } from 'express'
import subtitleRoutes from './subtitle-routes'
import audioTrackRoutes from './audio-track-routes'
import VideosController from '../controllers/videos-controller'
import { requireAuth, requirePermission } from '../middleware/auth'

const router = Router({ mergeParams: true })

// POST /api/companies/:companyId/videos
router.post('/',
  requireAuth,
  requirePermission('create:video'),
  VideosController.create
)

// Mount subtitle routes under videos
router.use('/:videoId/subtitles', subtitleRoutes)

// Mount audio track routes under videos
router.use('/:videoId/audio_track', audioTrackRoutes)

export default router