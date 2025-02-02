import { Router } from 'express'
import { GuideController } from '../controllers/guide-controller'
import lessonRoutes from './lesson-routes'

const router = Router({ mergeParams: true })
const guideController = new GuideController()

router.get('/', guideController.list)
router.get('/:id', guideController.get)

// Nest lesson routes under guides
router.use('/:guideId/lessons', lessonRoutes)

export default router 