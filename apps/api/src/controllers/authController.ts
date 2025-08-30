import { Request, Response } from 'express';
import { userService } from '../services/userService';
import { authService } from '../services/authService';
import { validatePasswordStrength, verifyPassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { verifyRefreshToken } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth';
import { AuthError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.substring(7);
      userService.blacklistToken(token);
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, username, password, firstName, lastName } = req.body;
    
    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new ValidationError('Weak password', passwordValidation.errors);
    }
    
    // Create user
    const user = await userService.createUser({
      email,
      username,
      password,
      firstName,
      lastName,
    });
    
    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });
    
    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
    });
    
    res.status(201).json({
      user,
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(error.statusCode).json({ error: error.message, details: error.errors });
    }
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    logger.info('Login attempt', { email });

    // Find user
    const user = await userService.findByEmail(email);
    if (!user) {
      throw new AuthError('Invalid credentials');
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AuthError('Invalid credentials');
    }
    
    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });
    
    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
    });
    
    const { passwordHash, ...userWithoutPassword } = user;
    
    res.json({
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};
export const refreshToken = async (req: Request, res: Response) => {
      try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
          throw new AuthError('Refresh token required', 400);
        }
        
        try {
          const payload = verifyRefreshToken(refreshToken);
          const user = await userService.findById(payload.userId);
          
          if (!user) {
            throw new AuthError('User not found');
          }
          
          const newAccessToken = generateAccessToken({
            userId: user.id,
            email: user.email,
          });
          
          const newRefreshToken = generateRefreshToken({
            userId: user.id,
            email: user.email,
          });
          
          res.json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          });
        } catch (error) {
          throw new AuthError('Invalid refresh token');
        }
      } catch (error: any) {
        if (error instanceof AuthError) {
          return res.status(error.statusCode).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
      }
    };

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    await authService.requestPasswordReset(email);
    
    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    
    await authService.resetPassword(token, newPassword);
    
    res.json({ message: 'Password reset successful' });
  } catch (error: any) {
    if (error.message === 'Invalid or expired reset token') {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === 'Weak password') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    await authService.verifyEmail(token);
    
    res.json({ message: 'Email verified successfully' });
  } catch (error: any) {
    if (error.message === 'Invalid or expired verification token') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};