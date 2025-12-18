// Quick diagnostic test for batch router import
import('dotenv/config');

console.log('Step 1: Testing batch module imports...');
try {
  const { batchService } = await import('./server/modules/batch-cohort/index.ts');
  console.log('✓ Batch service imported successfully');
  console.log('  Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(batchService)));
} catch (err) {
  console.error('✗ Failed to import batch service:', err.message);
  process.exit(1);
}

console.log('\nStep 2: Testing batch router import...');
try {
  const { batchRouter } = await import('./server/routes/batch.routes.ts');
  console.log('✓ Batch router imported successfully');
  console.log('  Router stack length:', batchRouter.stack?.length || 0);
} catch (err) {
  console.error('✗ Failed to import batch router:', err.message);
  console.error('  Stack:', err.stack);
  process.exit(1);
}

console.log('\n✓ All imports successful - issue may be elsewhere in server startup');
process.exit(0);
