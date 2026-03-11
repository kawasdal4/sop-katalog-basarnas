const { execSync } = require('child_process');

try {
  execSync('npx.cmd tauri signer generate -w ./ekatalog.key', {
    env: { ...process.env, TAURI_KEY_PASSWORD: "testpassword" },
    stdio: 'inherit'
  });
  console.log('Keys generated successfully.');
} catch (error) {
  console.error('Failed to generate keys:', error);
}
