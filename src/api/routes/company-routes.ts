import { Router } from 'express'
import { CompanyController } from '../controllers/company-controller'
import guideRoutes from './guide-routes'
import videoRoutes from './video-routes'

const router = Router()
const companyController = new CompanyController()

// List and view companies
router.get('/', companyController.list)
router.get('/:id', companyController.get)

// Nest guide routes under companies
router.use('/:companyId/guides', guideRoutes)
router.use('/:companyId/videos', videoRoutes)

export default router 