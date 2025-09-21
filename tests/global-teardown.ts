/**
 * Global Test Teardown
 * Runs once after all tests
 */

import { promises as fs } from 'fs';
import path from 'path';

export default async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');

  // Clean up temporary test files only after all tests complete
  const tempDir = path.resolve('tests/temp');
  const markerFile = path.resolve('tests/temp/.setup-complete');

  try {
    // Check if we should preserve files (marker exists means tests might still be running)
    const markerExists = await fs.access(markerFile).then(() => true).catch(() => false);

    if (markerExists) {
      // Clean up only generated files, preserve structure for next run
      const outputDir = path.resolve('tests/temp/output');
      await fs.rm(outputDir, { recursive: true, force: true });
      await fs.mkdir(outputDir, { recursive: true });
      console.log('🗑️ Temporary output files cleaned up, test data preserved');
    } else {
      // Full cleanup
      await fs.rm(tempDir, { recursive: true, force: true });
      console.log('🗑️ All temporary files cleaned up');
    }
  } catch (error) {
    console.warn('⚠️ Could not clean up temp directory:', error);
  }

  console.log('✅ Test cleanup complete');
}