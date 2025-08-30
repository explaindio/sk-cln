import { Router } from 'express';
import { register, login, refreshToken, logout, requestPasswordReset, resetPassword, verifyEmail } from '../controllers/authController';
import { validateRegister, validateLogin, validatePasswordResetRequest, validatePasswordReset, validateEmailVerification } from '../middleware/validation';
import { authLimiter } from '../middleware/rateLimiter';
import { authenticate } from '../middleware/auth';

const router: Router = Router();

router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.post('/refresh', refreshToken);
router.post('/logout', authenticate, logout);
router.post('/request-password-reset', validatePasswordResetRequest, requestPasswordReset);
router.post('/reset-password', validatePasswordReset, resetPassword);
router.post('/verify-email', validateEmailVerification, verifyEmail);

export default router;