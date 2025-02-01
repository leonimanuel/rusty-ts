import { Router } from 'express'
import subtitleRoutes from './subtitle-routes'

const router = Router()

// Mount subtitle routes under videos
router.use('/:videoId/subtitles', subtitleRoutes)

export default router