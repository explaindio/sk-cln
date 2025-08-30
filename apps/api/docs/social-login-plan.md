# Social Login Implementation Plan

## Overview
This document outlines the plan for implementing social login functionality for Google and Facebook in the Skool Clone application.

## Requirements
1. Users should be able to register/login using their Google or Facebook accounts
2. Existing users should be able to link their social accounts to their existing profile
3. New users should be able to create an account using social login
4. Proper error handling and security measures must be implemented

## Implementation Steps

### 1. Backend Implementation

#### a. Environment Variables
Add the following environment variables:
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
```

#### b. Dependencies
Install required packages:
```bash
npm install passport passport-google-oauth20 passport-facebook
```

#### c. Passport Configuration
Create `src/config/passport.ts` to configure Google and Facebook strategies:

```typescript
import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';
import FacebookStrategy from 'passport-facebook';
import { userService } from '../services/userService';

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: '/api/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Find or create user based on Google profile
    const user = await userService.findOrCreateSocialUser({
      provider: 'google',
      providerId: profile.id,
      email: profile.emails?.[0].value,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
      avatarUrl: profile.photos?.[0].value
    });
    return done(null, user);
  } catch (error) {
    return done(error, false);
  }
}));

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID!,
  clientSecret: process.env.FACEBOOK_APP_SECRET!,
  callbackURL: '/api/auth/facebook/callback',
  profileFields: ['id', 'emails', 'name', 'picture']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Find or create user based on Facebook profile
    const user = await userService.findOrCreateSocialUser({
      provider: 'facebook',
      providerId: profile.id,
      email: profile.emails?.[0].value,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
      avatarUrl: profile.photos?.[0].value
    });
    return done(null, user);
  } catch (error) {
    return done(error, false);
  }
}));

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await userService.findById(id);
    done(null, user);
  } catch (error) {
    done(error, false);
  }
});
```

#### d. Update User Service
Add a method to find or create social users in `src/services/userService.ts`:

```typescript
async findOrCreateSocialUser(socialData: {
 provider: string;
  providerId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}) {
  // Check if user already exists with this social provider
  const existingUser = await this.prisma.user.findFirst({
    where: {
      AND: [
        { email: socialData.email },
        { 
          OR: [
            { googleId: socialData.provider === 'google' ? socialData.providerId : undefined },
            { facebookId: socialData.provider === 'facebook' ? socialData.providerId : undefined }
          ]
        }
      ]
    }
  });

  if (existingUser) {
    // Update social ID if not already set
    const updateData: any = {};
    if (socialData.provider === 'google' && !existingUser.googleId) {
      updateData.googleId = socialData.providerId;
    }
    if (socialData.provider === 'facebook' && !existingUser.facebookId) {
      updateData.facebookId = socialData.providerId;
    }
    
    if (Object.keys(updateData).length > 0) {
      return await this.prisma.user.update({
        where: { id: existingUser.id },
        data: updateData
      });
    }
    
    return existingUser;
  }

  // Create new user
  return await this.prisma.user.create({
    data: {
      email: socialData.email!,
      username: `${socialData.provider}_${socialData.providerId}`,
      passwordHash: '', // Social login users don't have passwords
      firstName: socialData.firstName,
      lastName: socialData.lastName,
      avatarUrl: socialData.avatarUrl,
      emailVerified: true, // Social accounts are considered verified
      googleId: socialData.provider === 'google' ? socialData.providerId : undefined,
      facebookId: socialData.provider === 'facebook' ? socialData.providerId : undefined
    }
  });
}
```

#### e. Update Prisma Schema
Add social ID fields to the User model in `prisma/schema.prisma`:

```prisma
model User {
  // ... existing fields ...
  googleId    String? @unique @map("google_id")
  facebookId  String? @unique @map("facebook_id")
  // ... rest of the model ...
}
```

#### f. Auth Controller Updates
Add social login routes in `src/controllers/authController.ts`:

```typescript
import passport from 'passport';

export const googleAuth = passport.authenticate('google', { scope: ['profile', 'email'] });

export const googleAuthCallback = passport.authenticate('google', { session: false }, (err, user, info) => {
  if (err || !user) {
    return res.status(400).json({ error: 'Authentication failed' });
  }
  
  // Generate JWT tokens
  const accessToken = generateAccessToken({ userId: user.id, email: user.email });
  const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });
  
  // Redirect to frontend with tokens
  res.redirect(`${process.env.FRONTEND_URL}?accessToken=${accessToken}&refreshToken=${refreshToken}`);
});

export const facebookAuth = passport.authenticate('facebook', { scope: ['email'] });

export const facebookAuthCallback = passport.authenticate('facebook', { session: false }, (err, user, info) => {
  if (err || !user) {
    return res.status(400).json({ error: 'Authentication failed' });
  }
  
  // Generate JWT tokens
  const accessToken = generateAccessToken({ userId: user.id, email: user.email });
  const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });
  
  // Redirect to frontend with tokens
  res.redirect(`${process.env.FRONTEND_URL}?accessToken=${accessToken}&refreshToken=${refreshToken}`);
});
```

#### g. Auth Routes Updates
Add social login routes in `src/routes/auth.ts`:

```typescript
import { googleAuth, googleAuthCallback, facebookAuth, facebookAuthCallback } from '../controllers/authController';

// ... existing routes ...

router.get('/google', googleAuth);
router.get('/google/callback', googleAuthCallback);
router.get('/facebook', facebookAuth);
router.get('/facebook/callback', facebookAuthCallback);
```

### 2. Frontend Implementation

#### a. Google Login Button
Add Google login button to the login page:

```jsx
import { GoogleLogin } from '@react-oauth/google';

const GoogleLoginButton = () => {
  const handleGoogleLogin = async (credentialResponse) => {
    // Send credentialResponse.credential to backend for verification
    const response = await fetch('/api/auth/google-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: credentialResponse.credential })
    });
    
    const data = await response.json();
    if (data.accessToken) {
      // Store tokens and redirect
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      window.location.href = '/dashboard';
    }
  };

  return (
    <GoogleLogin
      onSuccess={handleGoogleLogin}
      onError={() => console.log('Login Failed')}
    />
  );
};
```

#### b. Facebook Login Button
Add Facebook login button to the login page:

```jsx
import { FacebookLogin } from 'react-facebook-login';

const FacebookLoginButton = () => {
  const responseFacebook = async (response) => {
    if (response.accessToken) {
      // Send response to backend for verification
      const res = await fetch('/api/auth/facebook-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: response.accessToken })
      });
      
      const data = await res.json();
      if (data.accessToken) {
        // Store tokens and redirect
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        window.location.href = '/dashboard';
      }
    }
  };

  return (
    <FacebookLogin
      appId={process.env.FACEBOOK_APP_ID}
      autoLoad={false}
      fields="name,email,picture"
      callback={responseFacebook}
    />
  );
};
```

### 3. Security Considerations

1. Use HTTPS in production
2. Validate all tokens on the backend
3. Implement rate limiting for auth endpoints
4. Store refresh tokens securely
5. Implement proper session management
6. Use environment variables for secrets

### 4. Testing

1. Unit tests for social login functions
2. Integration tests for auth flows
3. End-to-end tests for UI components
4. Security testing for token handling

## Next Steps

1. Implement the backend changes
2. Update the database schema
3. Create the frontend components
4. Test the implementation
5. Document the API endpoints