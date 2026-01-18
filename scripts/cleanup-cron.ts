#!/usr/bin/env ts-node
/**
 * Cleanup Cron Job
 * 
 * This script should be run periodically (e.g., daily via cron)
 * to clean up expired data and old files.
 * 
 * Usage:
 *   ts-node scripts/cleanup-cron.ts
 * 
 * Or add to crontab:
 *   0 2 * * * cd /path/to/project && npm run cleanup
 */

import { runAllCleanupJobs } from '../src/utils/cleanup-jobs';

async function main() {
  console.log('='.repeat(60));
  console.log('Starting scheduled cleanup job');
  console.log('Timestamp:', new Date().toISOString());
  console.log('='.repeat(60));

  try {
    const stats = await runAllCleanupJobs();

    console.log('\n' + '='.repeat(60));
    console.log('Cleanup Summary:');
    console.log('-'.repeat(60));
    console.log('Expired verification codes: ' + stats.expiredCodes);
    console.log('Expired sessions: ' + stats.expiredSessions);
    console.log('Expired quotes: ' + stats.expiredQuotes);
    console.log('Old files marked for deletion: ' + stats.oldFiles);
    console.log('Orphaned files removed: ' + stats.orphanedFiles);
    console.log('-'.repeat(60));
    console.log('Total records deleted: ' + stats.totalRecordsDeleted);
    console.log('Total files deleted: ' + stats.totalFilesDeleted);
    console.log('='.repeat(60));
    console.log('Cleanup job completed successfully\n');

    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('Cleanup job failed:');
    console.error(error);
    console.error('='.repeat(60) + '\n');
    process.exit(1);
  }
}

main();
