/**
 * Diagnostic Script: Webhook & Notification Issues
 *
 * Run this to diagnose why notifications aren't being sent after rent payments.
 *
 * Usage: npx tsx scripts/diagnose-webhook-notifications.ts
 */

import { prisma } from '../db/prisma';
import { Resend } from 'resend';

async function diagnoseWebhookNotifications() {
  console.log('🔍 Starting Webhook & Notification Diagnostics...\n');

  // 1. Check recent webhook events
  console.log('1️⃣ Checking recent Stripe webhook events...');
  const recentWebhooks = await prisma.inboundWebhookEvent.findMany({
    where: {
      provider: 'stripe',
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  console.log(`   Found ${recentWebhooks.length} webhook events in last 7 days`);
  
  const failedWebhooks = recentWebhooks.filter(w => w.status === 'failed');
  const processedWebhooks = recentWebhooks.filter(w => w.status === 'processed');
  
  console.log(`   ✅ Processed: ${processedWebhooks.length}`);
  console.log(`   ❌ Failed: ${failedWebhooks.length}`);
  
  if (failedWebhooks.length > 0) {
    console.log('\n   Recent failures:');
    failedWebhooks.slice(0, 5).forEach(w => {
      console.log(`   - ${w.eventType} (${w.createdAt.toISOString()})`);
      console.log(`     Error: ${w.error?.slice(0, 100)}`);
    });
  }

  // 2. Check recent rent payments
  console.log('\n2️⃣ Checking recent rent payments...');
  const recentPayments = await prisma.rentPayment.findMany({
    where: {
      status: 'paid',
      paidAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
    include: {
      tenant: { select: { id: true, name: true, email: true } },
      lease: {
        include: {
          unit: {
            include: {
              property: {
                include: {
                  landlord: {
                    select: {
                      id: true,
                      name: true,
                      ownerUserId: true,
                      owner: { select: { id: true, email: true, name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { paidAt: 'desc' },
    take: 10,
  });

  console.log(`   Found ${recentPayments.length} paid rent payments in last 7 days`);
  
  if (recentPayments.length > 0) {
    console.log('\n   Recent payments:');
    for (const payment of recentPayments.slice(0, 5)) {
      const landlord = payment.lease.unit.property.landlord;
      console.log(`   - Payment ID: ${payment.id}`);
      console.log(`     Amount: $${payment.amount}`);
      console.log(`     Tenant: ${payment.tenant.name} (${payment.tenant.email})`);
      console.log(`     Landlord: ${landlord?.name || 'UNKNOWN'}`);
      console.log(`     Owner Email: ${landlord?.owner?.email || 'MISSING ❌'}`);
      console.log(`     Paid At: ${payment.paidAt?.toISOString()}`);
      console.log('');
    }
  }

  // 3. Check notifications for these payments
  console.log('3️⃣ Checking if notifications were created...');
  const paymentIds = recentPayments.map(p => p.id);
  
  const notifications = await prisma.notification.findMany({
    where: {
      OR: [
        { type: 'payment' },
        {
          metadata: {
            path: ['rentPaymentIds'],
            array_contains: paymentIds,
          },
        },
      ],
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  console.log(`   Found ${notifications.length} payment notifications in last 7 days`);
  
  if (notifications.length === 0 && recentPayments.length > 0) {
    console.log('   ⚠️  WARNING: Payments exist but NO notifications found!');
    console.log('   This indicates notifications are not being created.');
  }

  // 4. Check audit logs for notification failures
  console.log('\n4️⃣ Checking audit logs for notification failures...');
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      action: { in: ['NOTIFICATION_FAILED', 'EMAIL_FAILED'] },
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log(`   Found ${auditLogs.length} notification failure logs`);
  
  if (auditLogs.length > 0) {
    console.log('\n   Recent failures:');
    auditLogs.forEach(log => {
      console.log(`   - ${log.action} at ${log.createdAt.toISOString()}`);
      console.log(`     Resource: ${log.resourceType} ${log.resourceId}`);
      if (log.metadata) {
        try {
          const meta = JSON.parse(log.metadata);
          console.log(`     Error: ${meta.error}`);
        } catch {
          console.log(`     Metadata: ${log.metadata}`);
        }
      }
    });
  }

  // 5. Test Resend API connection
  console.log('\n5️⃣ Testing Resend API connection...');
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    console.log('   ❌ RESEND_API_KEY not found in environment!');
  } else {
    console.log('   ✅ RESEND_API_KEY is configured');
    
    try {
      const resend = new Resend(resendApiKey);
      const { data, error } = await resend.emails.send({
        from: process.env.SENDER_EMAIL || 'onboarding@resend.dev',
        to: 'delivered@resend.dev', // Resend test email
        subject: 'PropertyFlow Diagnostic Test',
        html: '<p>This is a test email from the diagnostic script.</p>',
      });

      if (error) {
        console.log('   ❌ Resend API test FAILED:', error);
      } else {
        console.log('   ✅ Resend API test SUCCESSFUL');
        console.log(`   Message ID: ${data?.id}`);
      }
    } catch (err) {
      console.log('   ❌ Resend API test threw error:', err);
    }
  }

  // 6. Check environment variables
  console.log('\n6️⃣ Checking critical environment variables...');
  const requiredVars = [
    'RESEND_API_KEY',
    'SENDER_EMAIL',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_CONNECT_WEBHOOK_SECRET',
    'NEXT_PUBLIC_APP_URL',
  ];

  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`   ✅ ${varName}: ${value.slice(0, 20)}...`);
    } else {
      console.log(`   ❌ ${varName}: MISSING`);
    }
  });

  // 7. Summary and recommendations
  console.log('\n📊 SUMMARY & RECOMMENDATIONS\n');
  
  if (failedWebhooks.length > 0) {
    console.log('⚠️  Issue: Webhook events are failing');
    console.log('   → Check the error messages in failed webhooks above');
    console.log('   → Verify Stripe webhook secrets are correct');
  }

  if (recentPayments.length > 0 && notifications.length === 0) {
    console.log('⚠️  Issue: Payments processed but notifications not created');
    console.log('   → Check if landlord.owner.email exists for recent payments');
    console.log('   → Review webhook handler notification logic');
    console.log('   → Check audit logs for NOTIFICATION_FAILED entries');
  }

  if (!resendApiKey) {
    console.log('❌ Critical: RESEND_API_KEY is missing');
    console.log('   → Add RESEND_API_KEY to your .env file');
  }

  const paymentsWithoutOwnerEmail = recentPayments.filter(
    p => !p.lease.unit.property.landlord?.owner?.email
  );
  
  if (paymentsWithoutOwnerEmail.length > 0) {
    console.log('⚠️  Issue: Some landlords missing owner email');
    console.log(`   → ${paymentsWithoutOwnerEmail.length} payments have landlords without owner email`);
    console.log('   → Emails cannot be sent without a recipient address');
  }

  console.log('\n✅ Diagnostic complete!\n');
}

diagnoseWebhookNotifications()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Diagnostic script failed:', err);
    process.exit(1);
  });

// Made with Bob
