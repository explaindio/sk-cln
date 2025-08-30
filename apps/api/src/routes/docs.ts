import { Router } from 'express';

const router: Router = Router();

const apiDocs = {
  version: '1.0.0',
  title: 'Skool Clone API',
  description: 'RESTful API for Skool Clone application',
  baseUrl: process.env.API_URL || 'http://localhost:4000',
  endpoints: {
    auth: {
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      refresh: 'POST /api/auth/refresh',
    },
    users: {
      profile: 'GET /api/users/profile/:username',
      me: 'GET /api/users/me',
      updateProfile: 'PUT /api/users/me',
    },
    communities: {
      list: 'GET /api/communities',
      create: 'POST /api/communities',
      get: 'GET /api/communities/:slug',
    },
    posts: {
      create: 'POST /api/posts',
      get: 'GET /api/posts/:id',
      listByCommunity: 'GET /api/posts/community/:communityId',
    },
  },
};

router.get('/', (req, res) => {
  res.json(apiDocs);
});

export default router;