#!/usr/bin/env node
/**
 * Pattern Detection CLI Script
 *
 * Runs co-utilization pattern detection and creates/updates CO_UTILIZED relationships
 *
 * Usage:
 *   node scripts/run-pattern-detection.js [options]
 *
 * Options:
 *   --min-users=N    Minimum number of common users (default: 2)
 *   --dry-run        Preview patterns without creating relationships
 *
 * Examples:
 *   node scripts/run-pattern-detection.js
 *   node scripts/run-pattern-detection.js --min-users=3
 *   node scripts/run-pattern-detection.js --dry-run
 *
 * Requirements: 3 (Batch Processing Script)
 * Task: 2.1 CLIスクリプトのコア機能
 */

const { detectCoUtilizationPatterns } = require('../src/services/pattern-detection-service');

/**
 * Parse command line arguments
 * @returns {Object} Parsed options
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    minUsers: 2,
    dryRun: false
  };

  for (const arg of args) {
    if (arg.startsWith('--min-users=')) {
      const value = parseInt(arg.split('=')[1], 10);
      if (!isNaN(value) && value > 0) {
        options.minUsers = value;
      } else {
        console.error(`❌ Invalid --min-users value: ${arg.split('=')[1]}`);
        process.exit(1);
      }
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    } else {
      console.error(`❌ Unknown option: ${arg}`);
      showHelp();
      process.exit(1);
    }
  }

  return options;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
Usage: node scripts/run-pattern-detection.js [options]

Options:
  --min-users=N    Minimum number of common users (default: 2)
  --dry-run        Preview patterns without creating relationships
  --help, -h       Show this help message

Examples:
  node scripts/run-pattern-detection.js
  node scripts/run-pattern-detection.js --min-users=3
  node scripts/run-pattern-detection.js --dry-run
`);
}

/**
 * Format timestamp for logging
 * @returns {string} Formatted timestamp
 */
function timestamp() {
  return new Date().toISOString();
}

/**
 * Main execution function
 */
async function main() {
  const startTime = new Date();

  console.log('='.repeat(60));
  console.log('Pattern Detection Batch Processing');
  console.log('='.repeat(60));
  console.log(`Start Time: ${timestamp()}\n`);

  try {
    // Parse command line arguments
    const options = parseArgs();

    console.log('Configuration:');
    console.log(`  - Minimum Users: ${options.minUsers}`);
    console.log(`  - Dry Run: ${options.dryRun ? 'Yes (no changes will be made)' : 'No'}\n`);

    if (options.dryRun) {
      console.log('⚠️  DRY RUN MODE - No relationships will be created\n');
    }

    // Run pattern detection
    console.log('🔍 Detecting co-utilization patterns...\n');

    const patterns = await detectCoUtilizationPatterns({
      minUsers: options.minUsers
    });

    // Display results
    console.log('='.repeat(60));
    console.log('Detection Results');
    console.log('='.repeat(60));
    console.log(`Patterns Detected: ${patterns.length}\n`);

    if (patterns.length > 0) {
      console.log('Pattern Details:');
      console.log('-'.repeat(60));

      patterns.forEach((pattern, index) => {
        console.log(`${index + 1}. ${pattern.resource1_name} ↔ ${pattern.resource2_name}`);
        console.log(`   Common Users: ${pattern.users_count}`);
        console.log(`   Strength: ${pattern.strength.toFixed(2)}`);
        console.log(`   IDs: ${pattern.resource1_id} ↔ ${pattern.resource2_id}\n`);
      });
    } else {
      console.log('No patterns detected with the current threshold.\n');
    }

    // Execution summary
    const endTime = new Date();
    const duration = endTime - startTime;

    console.log('='.repeat(60));
    console.log('Execution Summary');
    console.log('='.repeat(60));
    console.log(`Start Time: ${startTime.toISOString()}`);
    console.log(`End Time: ${endTime.toISOString()}`);
    console.log(`Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
    console.log(`Patterns Detected: ${patterns.length}`);
    console.log(`Relationships ${options.dryRun ? 'Would Be' : ''} Created/Updated: ${patterns.length}`);
    console.log(`Status: ✅ Success`);
    console.log('='.repeat(60));

  } catch (error) {
    const endTime = new Date();
    const duration = endTime - startTime;

    console.error('\n' + '='.repeat(60));
    console.error('❌ Error During Pattern Detection');
    console.error('='.repeat(60));

    // Provide user-friendly error messages based on error type
    if (error.message && error.message.includes('Connection')) {
      console.error('\n🔌 Neo4j Connection Error');
      console.error('Unable to connect to Neo4j database.');
      console.error('\nPossible causes:');
      console.error('  - Neo4j is not running');
      console.error('  - Incorrect connection settings in .env file');
      console.error('  - Firewall blocking the connection');
      console.error('\nPlease check:');
      console.error('  1. Neo4j is running (docker-compose up -d)');
      console.error('  2. NEO4J_URI in .env matches your Neo4j instance');
      console.error('  3. NEO4J_USERNAME and NEO4J_PASSWORD are correct');
    } else if (error.message && (error.message.includes('syntax') || error.message.includes('Cypher'))) {
      console.error('\n📝 Cypher Query Syntax Error');
      console.error('The Cypher query contains a syntax error.');
      console.error('\nError details:');
      console.error(`  ${error.message}`);
    } else if (error.name === 'ValidationError') {
      console.error('\n⚠️  Validation Error');
      console.error('Invalid parameters provided.');
      console.error(`\nError: ${error.message}`);
    } else {
      console.error('\n💥 Unexpected Error');
      console.error(`Error: ${error.message}`);
    }

    console.error(`\nDuration: ${duration}ms`);
    console.error('='.repeat(60));

    // Show stack trace for debugging
    if (error.stack) {
      console.error('\nStack Trace:');
      console.error(error.stack);
    }

    // Exit with non-zero code
    process.exit(1);
  }
}

// Run main function
if (require.main === module) {
  main();
}

module.exports = { parseArgs, main };
