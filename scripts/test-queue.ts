/**
 * Test script for Redis queue
 * Run with: npx ts-node scripts/test-queue.ts
 */

import { jobQueue } from '../lib/queue/redis-queue';
import { EmailQueue } from '../lib/queue/email-queue';

async function testQueue() {
  console.log('🧪 Testing Redis Queue...\n');

  try {
    // Test 1: Enqueue a job
    console.log('1️⃣ Enqueueing test job...');
    const jobId = await jobQueue.enqueue('send_email', {
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<p>This is a test</p>',
    });
    console.log(`✅ Job enqueued: ${jobId}\n`);

    // Test 2: Check queue stats
    console.log('2️⃣ Checking queue stats...');
    const stats = await jobQueue.getStats();
    console.log(`✅ Queue stats:`, stats);
    console.log('');

    // Test 3: Dequeue a job
    console.log('3️⃣ Dequeueing job...');
    const job = await jobQueue.dequeue();
    if (job) {
      console.log(`✅ Job dequeued: ${job.id}`);
      console.log(`   Type: ${job.type}`);
      console.log(`   Priority: ${job.priority}`);
      console.log('');

      // Test 4: Complete the job
      console.log('4️⃣ Completing job...');
      await jobQueue.complete(job.id);
      console.log(`✅ Job completed\n`);
    } else {
      console.log('⚠️  No jobs in queue\n');
    }

    // Test 5: Email queue helper
    console.log('5️⃣ Testing email queue helper...');
    const emailJobId = await EmailQueue.send({
      to: 'test@example.com',
      subject: 'Test via EmailQueue',
      html: '<p>Test</p>',
      priority: 8,
    });
    console.log(`✅ Email queued: ${emailJobId}\n`);

    // Final stats
    console.log('📊 Final queue stats:');
    const finalStats = await jobQueue.getStats();
    console.log(finalStats);

    console.log('\n✅ All tests passed!');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testQueue();
