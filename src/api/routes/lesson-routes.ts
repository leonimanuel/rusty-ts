import { Router } from 'express'
import { LessonController } from '../controllers/lesson-controller'

const router = Router({ mergeParams: true })
const lessonController = new LessonController()

router.get('/', lessonController.list)
router.get('/:id', lessonController.get)

export default router