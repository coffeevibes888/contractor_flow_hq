/**
 * Quick API Endpoint Test Script
 * Tests that all marketplace API endpoints are accessible
 */

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
}

const results: TestResult[] = [];

async function testEndpoint(
  endpoint: string,
  method: string = 'GET',
  requiresAuth: boolean = true
): Promise<TestResult> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // If requires auth and we get 401, that's expected
    if (requiresAuth && response.status === 401) {
      return {
        endpoint,
        method,
        status: 'PASS',
        message: 'Endpoint exists (requires auth)',
      };
    }

    // If we get 404, endpoint doesn't exist
    if (response.status === 404) {
      return {
        endpoint,
        method,
        status: 'FAIL',
        message: 'Endpoint not found (404)',
      };
    }

    // Any other response means endpoint exists
    return {
      endpoint,
      method,
      status: 'PASS',
      message: `Endpoint exists (${response.status})`,
    };
  } catch (error) {
    return {
      endpoint,
      method,
      status: 'FAIL',
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function runTests() {
  console.log('🧪 Testing Contractor Marketplace API Endpoints\n');
  console.log(`Base URL: ${API_BASE}\n`);

  // Phase 3: Counter-Offers & Quote Comparison
  console.log('📋 Phase 3: Counter-Offers & Quote Comparison');
  results.push(
    await testEndpoint('/api/homeowner/quotes/test-id/counter', 'POST')
  );
  results.push(
    await testEndpoint('/api/contractor/counter-offers/test-id/accept', 'POST')
  );
  results.push(
    await testEndpoint('/api/contractor/counter-offers/test-id/reject', 'POST')
  );

  // Phase 4: Verification
  console.log('\n📋 Phase 4: Verification System');
  results.push(await testEndpoint('/api/contractor/verification', 'GET'));
  results.push(await testEndpoint('/api/contractor/verification/upload', 'POST'));
  results.push(await testEndpoint('/api/admin/verification/review', 'POST'));

  // Phase 5: Search
  console.log('\n📋 Phase 5: Advanced Search');
  results.push(await testEndpoint('/api/contractors/search', 'GET', false));

  // Phase 6: Saved Searches & Favorites
  console.log('\n📋 Phase 6: Saved Searches & Favorites');
  results.push(await testEndpoint('/api/saved-searches', 'GET'));
  results.push(await testEndpoint('/api/saved-searches', 'POST'));
  results.push(await testEndpoint('/api/saved-searches/test-id', 'PATCH'));
  results.push(await testEndpoint('/api/saved-searches/test-id', 'DELETE'));
  results.push(await testEndpoint('/api/favorites', 'GET'));
  results.push(await testEndpoint('/api/favorites', 'POST'));
  results.push(await testEndpoint('/api/favorites/test-id', 'DELETE'));

  // Phase 7: Portfolio & Reviews
  console.log('\n📋 Phase 7: Portfolio & Reviews');
  results.push(await testEndpoint('/api/contractor/portfolio', 'GET'));
  results.push(await testEndpoint('/api/contractor/portfolio', 'POST'));
  results.push(await testEndpoint('/api/contractor/reviews', 'GET'));
  results.push(await testEndpoint('/api/contractor/reviews', 'POST'));

  // Print Results
  console.log('\n\n📊 Test Results:\n');
  console.log('─'.repeat(80));
  console.log(
    `${'Endpoint'.padEnd(50)} ${'Method'.padEnd(8)} ${'Status'.padEnd(8)} Message`
  );
  console.log('─'.repeat(80));

  results.forEach((result) => {
    const statusIcon = result.status === 'PASS' ? '✅' : '❌';
    console.log(
      `${statusIcon} ${result.endpoint.padEnd(48)} ${result.method.padEnd(8)} ${result.status.padEnd(8)} ${result.message}`
    );
  });

  console.log('─'.repeat(80));

  // Summary
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const total = results.length;

  console.log(`\n📈 Summary: ${passed}/${total} passed (${failed} failed)`);

  if (failed === 0) {
    console.log('\n🎉 All API endpoints are accessible!\n');
  } else {
    console.log('\n⚠️  Some endpoints failed. Check the results above.\n');
  }
}

// Run tests
runTests().catch(console.error);
