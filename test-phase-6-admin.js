/**
 * Phase 6 Admin Module Test
 * Tests audit logging and system settings endpoints
 */

const BASE_URL = 'http://localhost:5000';

// Mock admin session token (assumes authenticated as admin)
const adminHeaders = {
  'Content-Type': 'application/json',
  // In real app, session would be set via cookies
};

async function testAdminEndpoints() {
  console.log('🧪 Phase 6 Admin Module Tests\n');

  try {
    // Test 1: Get all settings (should be empty or have defaults)
    console.log('TEST 1: GET /api/admin/settings');
    const settingsRes = await fetch(`${BASE_URL}/api/admin/settings`, {
      method: 'GET',
      headers: adminHeaders,
    });
    
    if (!settingsRes.ok) {
      console.log(`❌ Failed: ${settingsRes.status}`);
      console.log(`Response: ${await settingsRes.text()}\n`);
    } else {
      const settings = await settingsRes.json();
      console.log(`✅ Success: Retrieved settings`);
      console.log(`Data:`, JSON.stringify(settings, null, 2));
      console.log();
    }

    // Test 2: Set a system setting
    console.log('TEST 2: PUT /api/admin/settings/:key');
    const setSetting = await fetch(`${BASE_URL}/api/admin/settings/max_enrollments_per_batch`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({ value: '50' }),
    });

    if (!setSetting.ok) {
      console.log(`❌ Failed: ${setSetting.status}`);
      console.log(`Response: ${await setSetting.text()}\n`);
    } else {
      const result = await setSetting.json();
      console.log(`✅ Success: Setting updated`);
      console.log(`Data:`, JSON.stringify(result, null, 2));
      console.log();
    }

    // Test 3: Get audit logs (should be empty initially or have system logs)
    console.log('TEST 3: GET /api/admin/audit-logs');
    const logsRes = await fetch(`${BASE_URL}/api/admin/audit-logs?limit=10&offset=0`, {
      method: 'GET',
      headers: adminHeaders,
    });

    if (!logsRes.ok) {
      console.log(`❌ Failed: ${logsRes.status}`);
      console.log(`Response: ${await logsRes.text()}\n`);
    } else {
      const logs = await logsRes.json();
      console.log(`✅ Success: Retrieved audit logs`);
      console.log(`Data:`, JSON.stringify(logs, null, 2));
      console.log();
    }

    // Test 4: Get single setting
    console.log('TEST 4: GET /api/admin/settings/:key');
    const getSingleSetting = await fetch(`${BASE_URL}/api/admin/settings/max_enrollments_per_batch`, {
      method: 'GET',
      headers: adminHeaders,
    });

    if (!getSingleSetting.ok) {
      console.log(`❌ Failed: ${getSingleSetting.status}`);
      console.log(`Response: ${await getSingleSetting.text()}\n`);
    } else {
      const result = await getSingleSetting.json();
      console.log(`✅ Success: Retrieved single setting`);
      console.log(`Data:`, JSON.stringify(result, null, 2));
      console.log();
    }

    console.log('✨ Phase 6 Admin Tests Complete');
  } catch (error) {
    console.error('❌ Test Error:', error.message);
    console.error('\n⚠️ Make sure:');
    console.error('  1. Dev server is running (npm run dev)');
    console.error('  2. You are authenticated as admin');
    console.error('  3. Database is accessible');
  }
}

// Run tests
testAdminEndpoints();
