import request from 'supertest';
import app from '../index';
import { userService } from '../services/userService';

jest.mock('../services/userService');

describe('User Controller Extended', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
  };

  const mockToken = 'mock-jwt-token';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/users/me/change-password', () => {
    it('should change password successfully', async () => {
      (userService.changePassword as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/users/me/change-password')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ currentPassword: 'OldPassword123!', newPassword: 'NewPassword123!' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Password changed successfully' });
      expect(userService.changePassword).toHaveBeenCalledWith('1', 'OldPassword123!', 'NewPassword123!');
    });

    it('should handle missing passwords', async () => {
      const res = await request(app)
        .post('/api/users/me/change-password')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ currentPassword: 'OldPassword123!' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Current password and new password are required' });
    });

    it('should handle weak new password', async () => {
      const res = await request(app)
        .post('/api/users/me/change-password')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ currentPassword: 'OldPassword123!', newPassword: 'weak' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'New password must be at least 8 characters' });
    });

    it('should handle user not found error', async () => {
      (userService.changePassword as jest.Mock).mockRejectedValue(new Error('User not found'));

      const res = await request(app)
        .post('/api/users/me/change-password')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ currentPassword: 'OldPassword123!', newPassword: 'NewPassword123!' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'User not found' });
    });

    it('should handle incorrect current password', async () => {
      (userService.changePassword as jest.Mock).mockRejectedValue(new Error('Current password is incorrect'));

      const res = await request(app)
        .post('/api/users/me/change-password')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ currentPassword: 'WrongPassword', newPassword: 'NewPassword123!' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Current password is incorrect' });
    });
  });
});