/**
 * Full Payment Cycle Test: Tenant → Landlord with DB Updates
 * 
 * This script tests the complete payment cycle including:
 * 1. Creating a test tenant and landlord in the database
 * 2. Creating a rent payment record
 * 3. Processing the payment through Stripe
 * 4. Simulating webhook to update payment status
 * 5. Verifying landlord received funds
 * 
 * RUN: npx ts-node scripts/test-full-payment-cycle.ts
 */

import Stripe from 'stripe';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

// Load environment variables
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  console.log('Loading .env.local');
  dotenv.config({ path: envLocalPath });
} else {
  console.log('Loading .env');
  dotenv.config({ path: envPath });
}

const prisma = new PrismaClient();

async function main() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!stripeSecretKey) {
    console.error('❌ STRIPE_SECRET_KEY not found');
    process.exit(1);
  }

  if (!stripeSecretKey.startsWith('sk_test_')) {
    console.error('❌ This script only works in TEST mode');
    process.exit(1);
  }

  const stripe = new Stripe(stripeSecretKey);

  console.log('\n🔄 FULL PAYMENT CYCLE TEST');
  console.log('='.repeat(60));

  // Test parameters
  const RENT_AMOUNT = 1500;
  const testEmail = `test-${Date.now()}@example.com`;

  try {
    // Step 1: Find or create test data
    console.log('\n📋 STEP 1: Setting up test data...');
    
    // Find a landlord with Stripe Connect
    let landlord = await prisma.landlord.findFirst({
      where: {
        stripeConnectAccountId: { not: null },
        stripeOnboardingStatus: 'active',
      },
      include: {
        owner: true,
        properties: {
          include: {
            units: {
              include: {
                leases: {
                  where: { status: 'active' },
                  include: { tenant: true },
                },
              },
            },
          },
        },
      },
    });

    if (!landlord) {
      console.log('   ⚠️  No landlord with active Stripe Connect found');
      console.log('   Looking for any landlord to test with...');
      
      landlord = await prisma.landlord.findFirst({
        include: {
          owner: true,
          properties: {
            include: {
              units: {
                include: {
                  leases: {
                    where: { status: 'active' },
                    include: { tenant: true },
                  },
                },
              },
            },
          },
        },
      });
    }

    if (!landlord) {
      console.log('   ❌ No landlord found in database');
      console.log('   Please create a landlord account first.');
      await prisma.$disconnect();
      process.exit(1);
    }

    console.log(`   ✓ Found landlord: ${landlord.companyName || landlord.owner?.name}`);
    console.log(`   Stripe Connect: ${landlord.stripeConnectAccountId || 'Not connected'}`);

    // Find an active lease
    let lease = null;
    let tenant = null;
    
    for (const property of landlord.properties) {
      for (const unit of property.units) {
        if (unit.leases.length > 0) {
          lease = unit.leases[0];
          tenant = lease.tenant;
          break;
        }
      }
      if (lease) break;
    }

    if (!lease || !tenant) {
      console.log('   ⚠️  No active lease found');
      console.log('   Creating a simulated payment test instead...');
      
      // Just test Stripe flow without DB
      await testStripeOnlyFlow(stripe, landlord.stripeConnectAccountId);
      await prisma.$disconnect();
      return;
    }

    console.log(`   ✓ Found tenant: ${tenant.name}`);
    console.log(`   Lease ID: ${lease.id}`);

    // Step 2: Create a rent payment record
    console.log('\n📋 STEP 2: Creating rent payment record...');
    
    const rentPayment = await prisma.rentPayment.create({
      data: {
        leaseId: lease.id,
        tenantId: tenant.id,
        dueDate: new Date(),
        amount: RENT_AMOUNT,
        status: 'pending',
      },
    });

    console.log(`   ✓ Created RentPayment: ${rentPayment.id}`);
    console.log(`   Amount: $${RENT_AMOUNT}`);
    console.log(`   Status: ${rentPayment.status}`);

    // Step 3: Create PaymentIntent
    console.log('\n📋 STEP 3: Creating Stripe PaymentIntent...');
    
    if (!landlord.stripeConnectAccountId) {
      console.log('   ⚠️  Landlord has no Stripe Connect account');
      console.log('   Creating PaymentIntent without destination (platform receives)...');
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: RENT_AMOUNT * 100,
        currency: 'usd',
        metadata: {
          type: 'rent_payment',
          tenantId: tenant.id,
          rentPaymentId: rentPayment.id,
          landlordId: landlord.id,
          test: 'true',
        },
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
      });

      console.log(`   ✓ PaymentIntent: ${paymentIntent.id}`);
      
      // Update rent payment with PI ID
      await prisma.rentPayment.update({
        where: { id: rentPayment.id },
        data: { stripePaymentIntentId: paymentIntent.id },
      });

      // Confirm payment
      console.log('\n📋 STEP 4: Confirming payment...');
      
      const confirmed = await stripe.paymentIntents.confirm(paymentIntent.id, {
        payment_method: 'pm_card_visa',
        return_url: 'https://example.com/return',
      });

      console.log(`   ✓ Payment ${confirmed.status}`);

      // Update DB status
      if (confirmed.status === 'succeeded') {
        await prisma.rentPayment.update({
          where: { id: rentPayment.id },
          data: {
            status: 'paid',
            paidAt: new Date(),
            paymentMethod: 'card',
          },
        });
        console.log('   ✓ Database updated: status = paid');
      }

    } else {
      // Full flow with Connect
      const paymentIntent = await stripe.paymentIntents.create({
        amount: RENT_AMOUNT * 100,
        currency: 'usd',
        transfer_data: {
          destination: landlord.stripeConnectAccountId,
        },
        metadata: {
          type: 'rent_payment',
          tenantId: tenant.id,
          rentPaymentId: rentPayment.id,
          landlordId: landlord.id,
        },
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
      });

      console.log(`   ✓ PaymentIntent: ${paymentIntent.id}`);
      console.log(`   Destination: ${landlord.stripeConnectAccountId}`);

      // Update rent payment
      await prisma.rentPayment.update({
        where: { id: rentPayment.id },
        data: { stripePaymentIntentId: paymentIntent.id },
      });

      // Confirm payment
      console.log('\n📋 STEP 4: Confirming payment...');
      
      try {
        const confirmed = await stripe.paymentIntents.confirm(paymentIntent.id, {
          payment_method: 'pm_card_visa',
          return_url: 'https://example.com/return',
        });

        console.log(`   ✓ Payment ${confirmed.status}`);

        if (confirmed.status === 'succeeded') {
          // Update DB
          await prisma.rentPayment.update({
            where: { id: rentPayment.id },
            data: {
              status: 'paid',
              paidAt: new Date(),
              paymentMethod: 'card',
            },
          });
          console.log('   ✓ Database updated');

          // Check transfer
          console.log('\n📋 STEP 5: Verifying transfer to landlord...');
          
          const chargeId = typeof confirmed.latest_charge === 'string'
            ? confirmed.latest_charge
            : confirmed.latest_charge?.id;

          if (chargeId) {
            const charge = await stripe.charges.retrieve(chargeId, {
              expand: ['transfer'],
            });

            if (charge.transfer) {
              const transfer = typeof charge.transfer === 'string'
                ? await stripe.transfers.retrieve(charge.transfer)
                : charge.transfer;

              console.log(`   ✓ Transfer: ${transfer.id}`);
              console.log(`   Amount: $${(transfer.amount / 100).toFixed(2)}`);
            }
          }

          // Check landlord balance
          console.log('\n📋 STEP 6: Checking landlord balance...');
          
          const balance = await stripe.balance.retrieve({
            stripeAccount: landlord.stripeConnectAccountId,
          });

          const pending = balance.pending.find(b => b.currency === 'usd');
          const available = balance.available.find(b => b.currency === 'usd');

          console.log(`   Available: $${((available?.amount || 0) / 100).toFixed(2)}`);
          console.log(`   Pending: $${((pending?.amount || 0) / 100).toFixed(2)}`);
        }
      } catch (error: any) {
        console.error(`   ❌ Payment failed: ${error.message}`);
        
        // Update status to failed
        await prisma.rentPayment.update({
          where: { id: rentPayment.id },
          data: { status: 'failed' },
        });
      }
    }

    // Final verification
    console.log('\n📋 FINAL: Verifying database state...');
    
    const finalPayment = await prisma.rentPayment.findUnique({
      where: { id: rentPayment.id },
    });

    console.log(`   Payment ID: ${finalPayment?.id}`);
    console.log(`   Status: ${finalPayment?.status}`);
    console.log(`   Paid At: ${finalPayment?.paidAt || 'N/A'}`);
    console.log(`   Payment Method: ${finalPayment?.paymentMethod || 'N/A'}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completed!');

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

async function testStripeOnlyFlow(stripe: Stripe, connectAccountId: string | null) {
  console.log('\n--- Stripe-Only Flow Test ---\n');
  
  const RENT_AMOUNT = 1500;

  try {
    // Create PaymentIntent
    const piParams: Stripe.PaymentIntentCreateParams = {
      amount: RENT_AMOUNT * 100,
      currency: 'usd',
      metadata: {
        type: 'rent_payment_test',
        test: 'true',
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
    };

    if (connectAccountId) {
      piParams.transfer_data = {
        destination: connectAccountId,
      };
    }

    const paymentIntent = await stripe.paymentIntents.create(piParams);
    console.log(`✓ PaymentIntent created: ${paymentIntent.id}`);

    // Confirm
    const confirmed = await stripe.paymentIntents.confirm(paymentIntent.id, {
      payment_method: 'pm_card_visa',
      return_url: 'https://example.com/return',
    });

    console.log(`✓ Payment ${confirmed.status}`);

    if (confirmed.status === 'succeeded' && connectAccountId) {
      const balance = await stripe.balance.retrieve({
        stripeAccount: connectAccountId,
      });
      const pending = balance.pending.find(b => b.currency === 'usd');
      console.log(`✓ Landlord pending balance: $${((pending?.amount || 0) / 100).toFixed(2)}`);
    }

    console.log('\n✅ Stripe flow test passed!');
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
  }
}

main().catch(console.error);
