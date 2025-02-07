import { Router } from 'express'
import { LessonController } from '../controllers/lesson-controller'
import { requireAuth, requirePermission } from '../middleware/auth'

const router = Router({ mergeParams: true })
const lessonController = new LessonController()

// All routes require authentication
router.use(requireAuth)

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