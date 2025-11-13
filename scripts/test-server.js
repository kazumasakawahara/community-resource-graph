/**
 * Test Server Startup
 *
 * Simple script to test if server starts without errors
 */

const { spawn } = require('child_process');

console.log('Testing server startup...\n');

const server = spawn('node', ['src/server.js']);

let output = '';
let hasError = false;

server.stdout.on('data', (data) => {
  output += data.toString();
  process.stdout.write(data);
});

server.stderr.on('data', (data) => {
  hasError = true;
  process.stderr.write(data);
});

// Kill server after 3 seconds
setTimeout(() => {
  server.kill('SIGTERM');

  setTimeout(() => {
    if (hasError) {
      console.log('\n❌ Server startup failed');
      process.exit(1);
    } else if (output.includes('Community Resource Graph API')) {
      console.log('\n✓ Server startup successful!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Server started but output unexpected');
      process.exit(1);
    }
  }, 500);
}, 3000);
