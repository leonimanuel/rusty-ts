import { Router } from 'express'
import { ProfileController } from '../controllers/profile-controller'

const router = Router()
const profileController = new ProfileController()

// Admin routes
router.get('/', profileController.list)

// User routes
router.get('/:profileId/companies', profileController.listCompanies)

export default router 