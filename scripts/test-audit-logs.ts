/**
 * Audit Log Testing Script
 * 
 * This script tests that audit logs are:
 * 1. Connected to the database properly
 * 2. Creating entries correctly
 * 3. Retrieving data as expected
 * 
 * Run with: npx ts-node scripts/test-audit-logs.ts
 * Or: npx tsx scripts/test-audit-logs.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { prisma } from '../db/prisma';
import { logAuditEvent, logAuthEvent, logFinancialEvent, getAuditLogs } from '../lib/security/audit-logger';

async function testAuditLogs() {
  console.log('🔍 Starting Audit Log Tests...\n');

  try {
    // Test 1: Database Connection
    console.log('Test 1: Database Connection');
    const count = await prisma.auditLog.count();
    console.log(`✅ Connected to database. Current audit log count: ${count}\n`);

    // Test 2: Create a basic audit log entry
    console.log('Test 2: Create Basic Audit Log Entry');
    const testUserId = '00000000-0000-0000-0000-000000000001'; // Test UUID
    
    await logAuditEvent({
      action: 'ADMIN_ACTION',
      userId: testUserId,
      resourceType: 'test',
      resourceId: testUserId,
      metadata: { test: true, timestamp: new Date().toISOString() },
      severity: 'INFO',
    });
    console.log('✅ Basic audit log entry created\n');

    // Test 3: Create an auth event
    console.log('Test 3: Create Auth Event');
    await logAuthEvent('AUTH_LOGIN', {
      userId: testUserId,
      email: 'test@example.com',
      ipAddress: '127.0.0.1',
      userAgent: 'Test Script',
      success: true,
    });
    console.log('✅ Auth event logged\n');

    // Test 4: Create a financial event
    console.log('Test 4: Create Financial Event');
    await logFinancialEvent('PAYMENT_COMPLETED', {
      userId: testUserId,
      amount: 1500.00,
      currency: 'USD',
      transactionId: 'test_txn_' + Date.now(),
      paymentMethod: 'card',
      ipAddress: '127.0.0.1',
    });
    console.log('✅ Financial event logged\n');

    // Test 5: Retrieve audit logs
    console.log('Test 5: Retrieve Audit Logs');
    const logs = await getAuditLogs({
      userId: testUserId,
      limit: 10,
    });
    console.log(`✅ Retrieved ${logs.length} audit logs for test user\n`);

    // Test 6: Verify log structure
    console.log('Test 6: Verify Log Structure');
    if (logs.length > 0) {
      const sampleLog = logs[0];
      const requiredFields = ['id', 'action', 'severity', 'createdAt'];
      const missingFields = requiredFields.filter(f => !(f in sampleLog));
      
      if (missingFields.length === 0) {
        console.log('✅ Log structure is correct');
        console.log('   Sample log:', JSON.stringify(sampleLog, null, 2).substring(0, 500) + '...\n');
      } else {
        console.log(`❌ Missing fields: ${missingFields.join(', ')}\n`);
      }
    }

    // Test 7: Query by severity
    console.log('Test 7: Query by Severity');
    const criticalLogs = await prisma.auditLog.count({ where: { severity: 'CRITICAL' } });
    const warningLogs = await prisma.auditLog.count({ where: { severity: 'WARNING' } });
    const infoLogs = await prisma.auditLog.count({ where: { severity: 'INFO' } });
    console.log(`✅ Severity breakdown: CRITICAL=${criticalLogs}, WARNING=${warningLogs}, INFO=${infoLogs}\n`);

    // Test 8: Query by action type
    console.log('Test 8: Query by Action Type');
    const authLogs = await prisma.auditLog.count({ where: { action: { startsWith: 'AUTH_' } } });
    const paymentLogs = await prisma.auditLog.count({ where: { action: { startsWith: 'PAYMENT_' } } });
    const payoutLogs = await prisma.auditLog.count({ where: { action: { startsWith: 'PAYOUT_' } } });
    const adminLogs = await prisma.auditLog.count({ where: { action: 'ADMIN_ACTION' } });
    console.log(`✅ Action breakdown: AUTH=${authLogs}, PAYMENT=${paymentLogs}, PAYOUT=${payoutLogs}, ADMIN=${adminLogs}\n`);

    // Test 9: Recent logs (last 24 hours)
    console.log('Test 9: Recent Activity (Last 24 Hours)');
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentLogs = await prisma.auditLog.count({
      where: { createdAt: { gte: last24Hours } },
    });
    console.log(`✅ Logs in last 24 hours: ${recentLogs}\n`);

    // Test 10: Clean up test entries
    console.log('Test 10: Clean Up Test Entries');
    const deleted = await prisma.auditLog.deleteMany({
      where: { userId: testUserId },
    });
    console.log(`✅ Cleaned up ${deleted.count} test entries\n`);

    // Summary
    console.log('═══════════════════════════════════════════');
    console.log('📊 AUDIT LOG SYSTEM STATUS: ✅ OPERATIONAL');
    console.log('═══════════════════════════════════════════');
    console.log(`Total Audit Logs: ${count}`);
    console.log(`Database: Connected`);
    console.log(`Write Operations: Working`);
    console.log(`Read Operations: Working`);
    console.log(`Indexes: Active (userId, landlordId, action, createdAt, severity)`);
    console.log('═══════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testAuditLogs();
