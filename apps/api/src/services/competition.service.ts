import { prisma } from '../lib/prisma';
import { leaderboardService } from './leaderboard.service';

export class CompetitionService {
  async getActiveCompetitions() {
    return prisma.communityCompetition.findMany({
      where: { isActive: true },
      include: { participants: true },
    });
  }

  async getCompetitionStandings(competitionId: string) {
    const competition = await prisma.communityCompetition.findUnique({
      where: { id: competitionId },
      include: { participants: true },
    });

    if (!competition) throw new Error('Competition not found');

    const standings = [];
    for (const community of competition.participants) {
      const leaderboard = await leaderboardService.getLeaderboard(
        'ALL_TIME', // Or based on competition.metric
        community.id
      );
      const totalPoints = leaderboard.reduce((sum, entry) => sum + entry.points, 0);
      standings.push({ community, totalPoints });
    }

    return standings.sort((a, b) => b.totalPoints - a.totalPoints);
  }
  
  // A cron job would call this to end competitions
  async endCompetition(competitionId: string) {
    const standings = await this.getCompetitionStandings(competitionId);
    const winner = standings[0]?.community;

    if (winner) {
      await prisma.communityCompetition.update({
        where: { id: competitionId },
        data: { isActive: false, winnerId: winner.id },
      });
      // Award prize to winning community members
    }
  }
}
export const competitionService = new CompetitionService();