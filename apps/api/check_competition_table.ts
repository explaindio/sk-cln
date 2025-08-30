import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCompetitionTable() {
  try {
    // Try to query the CommunityCompetition table
    const competitions = await prisma.communityCompetition.findMany();
    console.log('CommunityCompetition table exists and is accessible.');
    console.log('Number of competitions:', competitions.length);
  } catch (error) {
    console.error('Error accessing CommunityCompetition table:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCompetitionTable();