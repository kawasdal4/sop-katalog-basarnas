/**
 * Test Script for Microsoft Graph API Connection
 * Run this to verify your tenant configuration
 * 
 * Usage: node test-connection.js
 */

require('dotenv').config();
const axios = require('axios');

const TENANT_ID = process.env.TENANT_ID;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

console.log('='.repeat(60));
console.log('🔧 Microsoft Graph API Connection Tester');
console.log('='.repeat(60));
console.log('');

// Check configuration
console.log('📋 Configuration Check:');
console.log(`   TENANT_ID:     ${TENANT_ID ? '✅ Set (' + TENANT_ID + ')' : '❌ Missing'}`);
console.log(`   CLIENT_ID:     ${CLIENT_ID ? '✅ Set (' + CLIENT_ID + ')' : '❌ Missing'}`);
console.log(`   CLIENT_SECRET: ${CLIENT_SECRET ? '✅ Set (' + CLIENT_SECRET.substring(0, 10) + '...)' : '❌ Missing'}`);
console.log('');

if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
  console.log('❌ Missing configuration. Please check your .env file.');
  process.exit(1);
}

async function testConnection() {
  try {
    // Step 1: Get Access Token
    console.log('🔐 Step 1: Getting Access Token...');
    const tokenUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    });

    const tokenResponse = await axios.post(tokenUrl, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000
    });

    const accessToken = tokenResponse.data.access_token;
    console.log('   ✅ Access token obtained successfully');
    console.log(`   📅 Expires in: ${tokenResponse.data.expires_in} seconds`);
    console.log('');

    // Step 2: Test Graph API - Get Organization Info
    console.log('🏢 Step 2: Getting Organization Info...');
    try {
      const orgResponse = await axios.get('https://graph.microsoft.com/v1.0/organization', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const org = orgResponse.data.value[0];
      console.log(`   ✅ Organization: ${org.displayName}`);
      console.log(`   📧 Verified domains: ${org.verifiedDomains?.map(d => d.name).join(', ')}`);
    } catch (e) {
      console.log(`   ⚠️  Could not get organization info: ${e.response?.data?.error?.message || e.message}`);
    }
    console.log('');

    // Step 3: Check Root Site (SharePoint)
    console.log('🌐 Step 3: Checking SharePoint Root Site...');
    let siteId = null;
    try {
      const siteResponse = await axios.get('https://graph.microsoft.com/v1.0/sites/root', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const site = siteResponse.data;
      siteId = site.id;
      console.log(`   ✅ Root Site: ${site.name}`);
      console.log(`   🆔 Site ID: ${site.id}`);
      console.log(`   🌍 Web URL: ${site.webUrl}`);
    } catch (e) {
      console.log(`   ❌ Failed to get root site: ${e.response?.data?.error?.message || e.message}`);
      console.log('');
      console.log('   ⚠️  POSSIBLE ISSUE: Sites.Read.All permission may not be granted!');
      return;
    }
    console.log('');

    // Step 4: Check Drives
    console.log('💾 Step 4: Checking Available Drives...');
    try {
      const drivesResponse = await axios.get(`https://graph.microsoft.com/v1.0/sites/${siteId}/drives`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const drives = drivesResponse.data.value;
      console.log(`   ✅ Found ${drives.length} drive(s):`);
      drives.forEach((drive, i) => {
        console.log(`      ${i + 1}. ${drive.name} (${drive.driveType})`);
        console.log(`         ID: ${drive.id}`);
      });
    } catch (e) {
      console.log(`   ❌ Failed to get drives: ${e.response?.data?.error?.message || e.message}`);
    }
    console.log('');

    // Step 5: Try to access drive root
    console.log('📁 Step 5: Testing Drive Access...');
    try {
      const drivesResponse = await axios.get(`https://graph.microsoft.com/v1.0/sites/${siteId}/drives`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (drivesResponse.data.value.length > 0) {
        const driveId = drivesResponse.data.value[0].id;
        const rootResponse = await axios.get(`https://graph.microsoft.com/v1.0/drives/${driveId}/root`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        console.log(`   ✅ Can access drive root`);
        console.log(`   📂 Root folder: ${rootResponse.data.name}`);
        console.log(`   🌍 Web URL: ${rootResponse.data.webUrl}`);
      }
    } catch (e) {
      console.log(`   ❌ Failed to access drive: ${e.response?.data?.error?.message || e.message}`);
    }
    console.log('');

    // Step 6: Check if we can create folder
    console.log('📝 Step 6: Testing Write Permission...');
    try {
      const drivesResponse = await axios.get(`https://graph.microsoft.com/v1.0/sites/${siteId}/drives`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (drivesResponse.data.value.length > 0) {
        const driveId = drivesResponse.data.value[0].id;
        
        // Try to create a test folder
        const testFolderName = `test-${Date.now()}`;
        try {
          const createResponse = await axios.post(
            `https://graph.microsoft.com/v1.0/drives/${driveId}/root/children`,
            {
              name: testFolderName,
              folder: {},
              '@microsoft.graph.conflictBehavior': 'rename'
            },
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
          console.log(`   ✅ Can create folder: ${testFolderName}`);
          
          // Clean up - delete the test folder
          await axios.delete(`https://graph.microsoft.com/v1.0/drives/${driveId}/items/${createResponse.data.id}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          console.log(`   🧹 Cleaned up test folder`);
        } catch (e) {
          console.log(`   ❌ Cannot create folder: ${e.response?.data?.error?.message || e.message}`);
          console.log('   ⚠️  POSSIBLE ISSUE: Files.ReadWrite.All permission may not be granted!');
        }
      }
    } catch (e) {
      console.log(`   ❌ Write test failed: ${e.response?.data?.error?.message || e.message}`);
    }
    console.log('');

    // Summary
    console.log('='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log('');
    console.log('If all tests passed, your Microsoft Graph API is properly configured!');
    console.log('');
    console.log('If any test failed:');
    console.log('1. Check Azure AD App Registration permissions');
    console.log('2. Ensure admin consent is granted');
    console.log('3. Verify your tenant has SharePoint/OneDrive licenses');
    console.log('');
    console.log('Common permission errors:');
    console.log('  - "Insufficient privileges" → Add Files.ReadWrite.All, Sites.ReadWrite.All');
    console.log('  - "Resource not found" → OneDrive may not be provisioned');
    console.log('  - "Unauthorized" → Check client secret is correct (use Value, not Secret ID)');
    console.log('');

  } catch (error) {
    console.error('❌ Test failed with error:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${JSON.stringify(error.response.data, null, 2)}`);
      
      if (error.response.status === 401) {
        console.log('');
        console.log('💡 TROUBLESHOOTING for 401 Unauthorized:');
        console.log('   1. Verify CLIENT_SECRET is the VALUE, not Secret ID');
        console.log('   2. Check if client secret has expired');
        console.log('   3. Ensure API permissions are granted admin consent');
      }
      
      if (error.response.status === 400) {
        console.log('');
        console.log('💡 TROUBLESHOOTING for 400 Bad Request:');
        console.log('   1. Verify TENANT_ID is correct');
        console.log('   2. Verify CLIENT_ID is correct');
        console.log('   3. Check if app is configured for this tenant');
      }
    } else {
      console.error(`   ${error.message}`);
    }
  }
}

testConnection();
