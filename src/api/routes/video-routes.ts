import { Router } from 'express'
import multer from 'multer'
import subtitleRoutes from './subtitle-routes'
import audioTrackRoutes from './audio-track-routes'
import videosController from '../controllers/videos-controller'

const router = Router()

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (_, file, cb) => {
    if (file.mimetype === 'video/mp4') {
      cb(null, true)
    } else {
      cb(new Error('Only MP4 files are allowed'))
    }
  }
})

// Create new video with file upload
router.post('/', upload.single('video'), videosController.create)

// Mount subtitle routes under videos
router.use('/:videoId/subtitles', subtitleRoutes)

// Mount audio track routes under videos
router.use('/:videoId/audio_track', audioTrackRoutes)

export default router