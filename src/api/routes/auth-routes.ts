import { Router, Request, Response } from 'express';
import { AuthController } from '../controllers/auth-controller';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/signup', async (req: Request, res: Response) => {
  await authController.signUp(req, res);
});

router.post('/signin', async (req: Request, res: Response) => {
  await authController.signIn(req, res);
});

router.post('/reset-password', async (req: Request, res: Response) => {
  await authController.resetPassword(req, res);
});

// Protected routes
const protectedRouter = Router();
router.use('/auth', protectedRouter);
protectedRouter.use(requireAuth);

protectedRouter.post('/signout', async (req: AuthenticatedRequest, res: Response) => {
  await authController.signOut(req, res);
});

protectedRouter.get('/profile', async (req: AuthenticatedRequest, res: Response) => {
  await authController.getProfile(req, res);
});

export default router; 
