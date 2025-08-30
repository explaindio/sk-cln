import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { gamificationController } from '../controllers/gamificationController';
import { competitionService } from '../services/competition.service';
import { prisma } from '../lib/prisma';

const router: Router = Router();

// User Stats
router.get('/my-stats', authenticate, gamificationController.getMyStats.bind(gamificationController));
router.get('/users/:userId/stats', authenticate, gamificationController.getUserStats.bind(gamificationController));

// Points
router.get('/my-points', authenticate, gamificationController.getMyPoints.bind(gamificationController));
router.get('/my-points/history', authenticate, gamificationController.getMyPointsHistory.bind(gamificationController));

// Achievements
router.get('/my-achievements', authenticate, gamificationController.getMyAchievements.bind(gamificationController));
router.get('/users/:userId/achievements', authenticate, gamificationController.getUserAchievements.bind(gamificationController));

// Leaderboard
router.get('/leaderboard', authenticate, gamificationController.getLeaderboard.bind(gamificationController));
router.get('/my-rank', authenticate, gamificationController.getMyRank.bind(gamificationController));

// Streaks
router.get('/my-streaks', authenticate, gamificationController.getMyStreaks.bind(gamificationController));

// Rewards
router.get('/rewards', authenticate, gamificationController.getRewards.bind(gamificationController));
router.post('/rewards/:rewardId/claim', authenticate, gamificationController.claimReward.bind(gamificationController));

// Get active competitions
router.get('/competitions', async (req, res) => {
  try {
    const competitions = await competitionService.getActiveCompetitions();
    res.json(competitions);
  } catch (error) {
    console.error('Error fetching competitions:', error);
    res.status(500).json({ error: 'Failed to fetch competitions' });
  }
});

// Get competition standings
router.get('/competitions/:id/standings', async (req, res) => {
  try {
    const { id } = req.params;
    const standings = await competitionService.getCompetitionStandings(id);
    res.json(standings);
  } catch (error) {
    console.error('Error fetching competition standings:', error);
    if (error instanceof Error && error.message === 'Competition not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to fetch competition standings' });
  }
});

// Get specific competition
router.get('/competitions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const competition = await prisma.communityCompetition.findUnique({
      where: { id },
    });
    if (!competition) {
      return res.status(404).json({ error: 'Competition not found' });
    }
    res.json(competition);
  } catch (error) {
    console.error('Error fetching competition:', error);
    res.status(500).json({ error: 'Failed to fetch competition' });
  }
});

export default router;