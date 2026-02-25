
/**
 * Manual API Test Script
 * Run this with: node tests/manual_test.js
 */

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('🚀 Starting API Tests...\n');

  // 1. Test Health Check
  try {
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    console.log('✅ Health Check:', healthData.status === 'ok' ? 'PASS' : 'FAIL', healthData);
  } catch (e) {
    console.log('❌ Health Check: FAILED (Is the server running?)');
  }

  // 2. Test Welcome (Edge Config)
  try {
    const welcomeRes = await fetch(`${BASE_URL}/welcome`);
    if (welcomeRes.ok) {
      const welcomeData = await welcomeRes.json();
      console.log('✅ Welcome Endpoint: PASS', welcomeData);
    } else {
      console.log('⚠️ Welcome Endpoint: Received error (Expected if EDGE_CONFIG is not set)', welcomeRes.status);
    }
  } catch (e) {
    console.log('❌ Welcome Endpoint: FAILED');
  }

  // 3. Test Get Posts
  try {
    const postsRes = await fetch(`${BASE_URL}/api/posts`);
    const postsData = await postsRes.json();
    console.log('✅ Get Posts: PASS', `Found ${postsData.length} posts`);
  } catch (e) {
    console.log('❌ Get Posts: FAILED');
  }

  console.log('\n🏁 Tests Finished.');
}

runTests();
