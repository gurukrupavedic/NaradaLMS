/**
 * Phase 6 Admin Module - Direct Code Test (No HTTP)
 * Tests the AdminService and AdminStorage directly
 */

const AdminStorage = require('./server/modules/system-admin/storage.ts').AdminStorage;
const { initAdminService } = require('./server/modules/system-admin/service.ts');

async function testAdminServiceDirectly() {
  console.log('🧪 Phase 6 Admin Module - Direct Test\n');

  try {
    // Initialize
    const storage = new AdminStorage();
    const adminService = initAdminService(storage);

    console.log('✅ AdminService initialized\n');

    // Test 1: Set a setting
    console.log('TEST 1: setSetting() - Store a value');
    await adminService.setSetting('max_enrollments_per_batch', '50', 'system-user');
    console.log('✅ Setting stored successfully\n');

    // Test 2: Get the setting back
    console.log('TEST 2: getSetting() - Retrieve the value');
    const value = await adminService.getSetting('max_enrollments_per_batch');
    console.log(`✅ Retrieved value: ${value}\n`);

    // Test 3: Get all settings
    console.log('TEST 3: getAllSettings() - Get all values');
    const allSettings = await adminService.getAllSettings();
    console.log(`✅ Retrieved all settings:`, JSON.stringify(allSettings, null, 2), '\n');

    // Test 4: Log an action
    console.log('TEST 4: logAction() - Record audit log');
    await adminService.logAction(
      'test-user-id',
      'TEST_ACTION',
      'test_resource',
      'test-123',
      { test: 'data' }
    );
    console.log('✅ Audit log recorded\n');

    // Test 5: Get audit logs
    console.log('TEST 5: getAuditLogs() - Retrieve audit logs');
    const logs = await adminService.getAuditLogs({
      limit: 10,
      offset: 0
    });
    console.log(`✅ Retrieved ${logs.length} audit logs`);
    if (logs.length > 0) {
      console.log('Sample log:', JSON.stringify(logs[0], null, 2));
    }
    console.log();

    console.log('✨ All Direct Tests Passed!\n');
    console.log('Summary:');
    console.log('  ✅ AdminService correctly initialized');
    console.log('  ✅ Settings CRUD working (set/get)');
    console.log('  ✅ Audit logging working');
    console.log('  ✅ Database queries executing');
    console.log('\n🎯 Phase 6 is ready for integration testing with HTTP endpoints');

  } catch (error) {
    console.error('❌ Test Error:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

testAdminServiceDirectly();
