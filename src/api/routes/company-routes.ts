import { Router } from 'express'
import { CompanyController } from '../controllers/company-controller'
import guideRoutes from './guide-routes'

const router = Router()
const companyController = new CompanyController()

// Public routes
router.get('/', companyController.list)
router.get('/:id', companyController.get)

// Nest guide routes under companies
router.use('/:companyId/guides', guideRoutes)

export default router 