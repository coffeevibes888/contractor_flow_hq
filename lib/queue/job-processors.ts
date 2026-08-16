/**
 * Job Processors for Background Tasks
 * Handles CPU-intensive operations asynchronously
 */

import { Job } from './redis-queue';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { prisma } from '@/db/prisma';

const resend = new Resend(process.env.RESEND_API_KEY);

// ============= Email Processor =============

export async function processEmailJob(job: Job): Promise<void> {
  const { to, from, subject, html, react } = job.payload;

  try {
    const emailHtml = react ? render(react) : html;

    await resend.emails.send({
      from: from || `${process.env.APP_NAME} <${process.env.SENDER_EMAIL}>`,
      to,
      subject,
      html: emailHtml,
    });

    console.log(`Email sent successfully: ${job.id}`);
  } catch (error) {
    console.error(`Email job failed: ${job.id}`, error);
    throw error;
  }
}

// ============= PDF Processor =============

export async function processPdfJob(job: Job): Promise<void> {
  const { html, options, callbackUrl } = job.payload;

  try {
    // Import dynamically to avoid loading Puppeteer in every request
    const { htmlToPdfBuffer } = await import('@/lib/services/pdf');
    
    const pdfBuffer = await htmlToPdfBuffer(html);

    // Upload to storage or send callback
    if (callbackUrl) {
      await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/pdf' },
        body: pdfBuffer,
      });
    }

    console.log(`PDF generated successfully: ${job.id}`);
  } catch (error) {
    console.error(`PDF job failed: ${job.id}`, error);
    throw error;
  }
}

// ============= OCR Processor =============

export async function processOcrJob(job: Job): Promise<void> {
  const { imageUrl, documentId, userId } = job.payload;

  try {
    // Import dynamically
    const { extractTextFromImage } = await import('@/lib/services/ocr-service');
    
    const result = await extractTextFromImage(imageUrl);

    // Update document with extracted text
    await prisma.document.update({
      where: { id: documentId },
      data: {
        extractedText: result.text,
        ocrConfidence: result.confidence,
        ocrProcessedAt: new Date(),
      },
    });

    console.log(`OCR processed successfully: ${job.id}`);
  } catch (error) {
    console.error(`OCR job failed: ${job.id}`, error);
    throw error;
  }
}

// ============= Notification Processor =============

export async function processNotificationJob(job: Job): Promise<void> {
  const { userId, title, message, type, metadata } = job.payload;

  try {
    await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        metadata,
        read: false,
      },
    });

    console.log(`Notification created successfully: ${job.id}`);
  } catch (error) {
    console.error(`Notification job failed: ${job.id}`, error);
    throw error;
  }
}

// ============= Stripe Processor =============

export async function processStripeJob(job: Job): Promise<void> {
  const { operation, payload } = job.payload;

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-02-24.acacia',
    });

    switch (operation) {
      case 'create_payout':
        await stripe.payouts.create(payload, {
          stripeAccount: payload.connectedAccountId,
        });
        break;
      
      case 'update_account':
        await stripe.accounts.update(payload.accountId, payload.data);
        break;
      
      case 'process_webhook':
        // Handle webhook processing
        break;
      
      default:
        throw new Error(`Unknown Stripe operation: ${operation}`);
    }

    console.log(`Stripe operation completed: ${job.id}`);
  } catch (error) {
    console.error(`Stripe job failed: ${job.id}`, error);
    throw error;
  }
}

// ============= Daily Check Processor =============

export async function processDailyCheckJob(job: Job): Promise<void> {
  const { contractorId } = job.payload;

  try {
    const { performDailyCheckIfNeeded } = await import('@/lib/services/contractor-daily-check');
    await performDailyCheckIfNeeded(contractorId);

    console.log(`Daily check completed: ${job.id}`);
  } catch (error) {
    console.error(`Daily check job failed: ${job.id}`, error);
    throw error;
  }
}

// ============= Job Router =============

export async function processJob(job: Job): Promise<void> {
  switch (job.type) {
    case 'send_email':
      return processEmailJob(job);
    
    case 'generate_pdf':
      return processPdfJob(job);
    
    case 'process_ocr':
      return processOcrJob(job);
    
    case 'send_notification':
      return processNotificationJob(job);
    
    case 'stripe_operation':
      return processStripeJob(job);
    
    case 'daily_check':
      return processDailyCheckJob(job);
    
    default:
      throw new Error(`Unknown job type: ${job.type}`);
  }
}
