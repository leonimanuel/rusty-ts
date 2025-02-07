import { Router } from 'express'
import { CompanyController } from '../controllers/company-controller'
import { requireAuth, requirePermission } from '../middleware/auth'
import guideRoutes from './guide-routes'

const router = Router()
const companyController = new CompanyController()

// Public routes (just need authentication)
router.get('/', requireAuth, companyController.list)
router.get('/:id', requireAuth, companyController.get)

// Nest guide routes under companies
router.use('/:companyId/guides', guideRoutes)

export default router 