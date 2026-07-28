import { Router } from 'express';
import {
  register,
  login,
  me,
  updateProfile,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  getProfile
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import {
  loginLimiter,
  registerLimiter,
  passwordResetRequestLimiter,
  passwordResetLimiter,
  verificationLimiter
} from '../middleware/rate-limit';
const router = Router();
// Public routes.
//
// Every unauthenticated endpoint here either checks a secret (password, reset
// token, verification token) or sends mail to an address supplied by the caller,
// so each one is rate limited. Limits are per client address; see
// middleware/rate-limit.ts for the reasoning behind each budget.
router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/forgot-password', passwordResetRequestLimiter, forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPassword);
router.post('/verify-email', passwordResetLimiter, verifyEmail);
router.post('/resend-verification', verificationLimiter, resendVerification);
// Protected routes
router.get('/me', authenticate, me);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
export default router;
