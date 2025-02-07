import { Router } from 'express'
import { LessonController } from '../controllers/lesson-controller'
import { requirePermission } from '../middleware/auth'

const router = Router({ mergeParams: true })
const lessonController = new LessonController()

// List lessons requires view permission
router.get('/', 
  requirePermission('view:lesson'),
  lessonController.list
)

router.get('/:id', 
  requirePermission('view:lesson'),
  lessonController.get
)

export default router