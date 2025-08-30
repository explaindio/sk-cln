import axios from 'axios';

async function testCompetitionAPI() {
  const baseURL = 'http://localhost:4000/api/gamification';
  
  try {
    // Test get active competitions
    console.log('Testing GET /competitions');
    const competitionsResponse = await axios.get(`${baseURL}/competitions`);
    console.log('Competitions:', competitionsResponse.data);
    
    // Test get competition standings (with a dummy ID)
    console.log('\nTesting GET /competitions/:id/standings');
    try {
      const standingsResponse = await axios.get(`${baseURL}/competitions/dummy-id/standings`);
      console.log('Standings:', standingsResponse.data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.log('Competition not found (expected for dummy ID)');
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testCompetitionAPI();