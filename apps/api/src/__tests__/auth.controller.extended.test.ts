import request from 'supertest';
import app from '../index';
import { authService } from '../services/authService';

jest.mock('../services/authService');

describe('Auth Controller Extended', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/request-password-reset', () => {
    it('should request password reset', async () => {
      (authService.requestPasswordReset as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/auth/request-password-reset')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Password reset email sent' });
      expect(authService.requestPasswordReset).toHaveBeenCalledWith('test@example.com');
    });

    it('should handle errors', async () => {
      (authService.requestPasswordReset as jest.Mock).mockRejectedValue(new Error('Internal server error'));

      const res = await request(app)
        .post('/api/auth/request-password-reset')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Internal server error' });
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      (authService.resetPassword as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'valid_token', newPassword: 'NewPassword123!' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Password reset successful' });
      expect(authService.resetPassword).toHaveBeenCalledWith('valid_token', 'NewPassword123!');
    });

    it('should handle invalid token error', async () => {
      (authService.resetPassword as jest.Mock).mockRejectedValue(new Error('Invalid or expired reset token'));

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'invalid_token', newPassword: 'NewPassword123!' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid or expired reset token' });
    });

    it('should handle weak password error', async () => {
      (authService.resetPassword as jest.Mock).mockRejectedValue(new Error('Weak password'));

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'valid_token', newPassword: 'weak' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Weak password' });
    });
  });

  describe('POST /api/auth/verify-email', () => {
    it('should verify email with valid token', async () => {
      (authService.verifyEmail as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'valid_token' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Email verified successfully' });
      expect(authService.verifyEmail).toHaveBeenCalledWith('valid_token');
    });

    it('should handle invalid token error', async () => {
      (authService.verifyEmail as jest.Mock).mockRejectedValue(new Error('Invalid or expired verification token'));

      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid_token' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid or expired verification token' });
    });
  });
});