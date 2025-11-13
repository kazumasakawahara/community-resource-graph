/**
 * Quick Search API Test
 * 検索APIのエラー詳細を確認
 */

const http = require('http');

async function testSearch(keyword) {
  return new Promise((resolve, reject) => {
    const url = `http://localhost:3000/api/resources/search?keyword=${encodeURIComponent(keyword)}`;
    
    console.log(`\n🔍 Testing: ${keyword}`);
    console.log(`URL: ${url}`);
    
    const startTime = Date.now();
    
    http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const elapsed = Date.now() - startTime;
        console.log(`⏱️  Response time: ${elapsed}ms`);
        console.log(`📊 Status: ${res.statusCode}`);
        
        try {
          const json = JSON.parse(data);
          console.log(`✅ Response:`, JSON.stringify(json, null, 2));
        } catch (e) {
          console.log(`📄 Raw response:`, data);
        }
        
        resolve({ statusCode: res.statusCode, data });
      });
    }).on('error', (err) => {
      console.error(`❌ Error:`, err.message);
      reject(err);
    });
  });
}

async function testResourceDetail(resourceId) {
  return new Promise((resolve, reject) => {
    const url = `http://localhost:3000/api/resources/${resourceId}`;
    
    console.log(`\n🔍 Testing resource detail: ${resourceId}`);
    console.log(`URL: ${url}`);
    
    const startTime = Date.now();
    
    http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const elapsed = Date.now() - startTime;
        console.log(`⏱️  Response time: ${elapsed}ms`);
        console.log(`📊 Status: ${res.statusCode}`);
        
        try {
          const json = JSON.parse(data);
          console.log(`✅ Response:`, JSON.stringify(json, null, 2));
        } catch (e) {
          console.log(`📄 Raw response:`, data);
        }
        
        resolve({ statusCode: res.statusCode, data });
      });
    }).on('error', (err) => {
      console.error(`❌ Error:`, err.message);
      reject(err);
    });
  });
}

async function runTests() {
  console.log('========================================');
  console.log('  Quick Search API Test');
  console.log('========================================');
  
  try {
    // Test 1: Health check
    console.log('\n📋 Test 1: Health Check');
    await testSearch('');
    
    // Test 2: Simple search
    console.log('\n📋 Test 2: Search with keyword');
    await testSearch('静かな場所');
    
    // Test 3: Another keyword
    console.log('\n📋 Test 3: Another keyword');
    await testSearch('相談');
    
    // Test 4: Resource detail
    console.log('\n📋 Test 4: Resource detail');
    await testResourceDetail('res_050');
    
    console.log('\n========================================');
    console.log('✅ Tests completed');
    console.log('========================================');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

runTests();
