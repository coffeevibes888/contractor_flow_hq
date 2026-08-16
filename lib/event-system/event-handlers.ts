/**
 * Event Handlers - Replace cron job logic with event-driven handlers
 */

import { eventBus, EventPayload } from './event-bus';
import { jobQueue } from './job-queue';
import { addDays, addHours, addMinutes } from 'date-fns';
import { getWebSocketServer } from '@/lib/websocket-server';
import { NotificationService } from '@/lib/services/notification-service';
import { notifyLandlordTeam } from '@/lib/services/team-notifications';
import { prisma } from '@/db/prisma';

/**
 * Initialize all event handlers
 */
export function initializeEventHandlers() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Initializing event handlers...');
  }

  // Lease events
  eventBus.subscribe('lease.tenant_signed', handleTenantSignedLease);
  eventBus.subscribe('lease.created', handleLeaseCreated);

  // Payment events
  eventBus.subscribe('payment.received', handlePaymentReceived);
  eventBus.subscribe('payment.pending', handlePendingPayment);

  // Appointment events
  eventBus.subscribe('appointment.created', handleAppointmentCreated);
  eventBus.subscribe('appointment.updated', handleAppointmentUpdated);

  // Verification events
  eventBus.subscribe('verification.uploaded', handleVerificationUploaded);
  eventBus.subscribe('verification.expiring_soon', handleVerificationExpiring);

  // Rent events
  eventBus.subscribe('rent.due_soon', handleRentDueSoon);

  // Invoice events
  eventBus.subscribe('invoice.created', handleInvoiceCreated);
  eventBus.subscribe('invoice.overdue', handleInvoiceOverdue);

  // Balance events
  eventBus.subscribe('balance.pending_release', handlePendingBalanceRelease);

  // Document events
  eventBus.subscribe('document.expired', handleDocumentExpired);

  // Webhook events
  eventBus.subscribe('webhook.failed', handleWebhookFailed);

  // Property showing events
  eventBus.subscribe('property.showing_scheduled', handlePropertyShowingScheduled);
  eventBus.subscribe('open_house.scheduled', handleOpenHouseScheduled);
  eventBus.subscribe('open_house.starting_soon', handleOpenHouseStartingSoon);

  // Work order events
  eventBus.subscribe('work_order.created', handleWorkOrderCreated);
  eventBus.subscribe('work_order.bid_received', handleWorkOrderBidReceived);
  eventBus.subscribe('work_order.bid_accepted', handleWorkOrderBidAccepted);

  // Contractor lead events
  eventBus.subscribe('contractor.lead_matched', handleContractorLeadMatched);

  // Contractor pipeline events
  eventBus.subscribe('contractor.quote.accepted', handleContractorQuoteAccepted);
  eventBus.subscribe('contractor.contract.signed', handleContractorContractSigned);
  eventBus.subscribe('contractor.contract.declined', handleContractorContractDeclined);
  eventBus.subscribe('contractor.job.created', handleContractorJobCreated);
  eventBus.subscribe('contractor.job.completed', handleContractorJobCompleted);
  eventBus.subscribe('contractor.job.status_changed', handleContractorJobStatusChanged);

  // Contractor estimate funnel — the "cart abandonment recovery" pipeline
  eventBus.subscribe('contractor.estimate.sent', handleContractorEstimateSent);
  eventBus.subscribe('contractor.estimate.viewed', handleContractorEstimateViewed);
  eventBus.subscribe('contractor.estimate.accepted', handleContractorEstimateAccepted);

  console.log('Event handlers initialized');
}

/**
 * Handle tenant signing lease — fan out to the whole landlord team so the
 * owner, admins, and anyone with `manage_tenants` / `view_financials` /
 * `manage_finances` get pinged. Maintenance techs (only `manage_maintenance`)
 * intentionally drop out.
 */
async function handleTenantSignedLease(event: EventPayload) {
  const { leaseId, tenantName, propertyId, landlordId, landlordUserId } = event.data;

  // Real-time WebSocket broadcast for the owner's open dashboards.
  const wsServer = getWebSocketServer();
  if (wsServer && landlordUserId) {
    wsServer.broadcastNewMessage(`landlord-${landlordUserId}`, {
      type: 'lease_signed',
      leaseId,
      tenantName,
      message: `${tenantName} has signed the lease. Please review and sign.`,
    });
  }

  // Fan out to the whole eligible team. Each recipient's per-user
  // email/sms/push toggles still control their personal delivery.
  if (landlordId) {
    try {
      await notifyLandlordTeam({
        landlordId,
        category: 'lease',
        type: 'reminder',
        title: 'Lease Awaiting Your Signature',
        message: `${tenantName} has signed the lease. Please review and sign to complete the agreement.`,
        actionUrl: `/admin/dashboard/properties/${propertyId}/details`,
        metadata: { leaseId, propertyId },
      });
    } catch (err) {
      console.error('handleTenantSignedLease: team notify failed', err);
    }
  } else if (landlordUserId) {
    // Fall back to the legacy single-user notify if we somehow don't have
    // a landlordId on the event payload. Should be rare.
    await NotificationService.createNotification({
      userId: landlordUserId,
      type: 'reminder',
      title: 'Lease Awaiting Your Signature',
      message: `${tenantName} has signed the lease. Please review and sign to complete the agreement.`,
      actionUrl: `/admin/dashboard/properties/${propertyId}/details`,
      metadata: { leaseId, propertyId },
      landlordId,
    });
  }

  // Schedule follow-up reminder if not signed in 24 hours
  if (landlordUserId) {
    await jobQueue.scheduleReminder(
      'lease_signing',
      landlordUserId,
      addHours(new Date(), 24),
      { leaseId, tenantName, propertyId }
    );
  }
}

/**
 * Handle lease creation - schedule rent reminders
 */
async function handleLeaseCreated(event: EventPayload) {
  const { leaseId, rentDueDate, tenantId } = event.data;

  // Schedule rent reminder 3 days before due date
  await jobQueue.scheduleReminder(
    'rent',
    tenantId,
    addDays(new Date(rentDueDate), -3),
    { leaseId, daysUntilDue: 3 }
  );

  // Schedule rent reminder 1 day before due date
  await jobQueue.scheduleReminder(
    'rent',
    tenantId,
    addDays(new Date(rentDueDate), -1),
    { leaseId, daysUntilDue: 1 }
  );
}

/**
 * Handle payment received — release balance when ready and ping the
 * landlord team so finance-permission folks see it. Maintenance techs
 * are filtered out by category `rent`.
 */
async function handlePaymentReceived(event: EventPayload) {
  const { transactionId, availableAt, landlordId, amount, propertyName } = event.data;

  // Schedule balance release for when Stripe makes it available
  await jobQueue.schedule({
    type: 'release_balance',
    payload: { transactionId },
    scheduledFor: new Date(availableAt),
    priority: 8,
  });

  // Real-time WebSocket broadcast (legacy channel kept for open dashboards).
  const wsServer = getWebSocketServer();
  if (wsServer && landlordId) {
    wsServer.broadcastNewMessage(`landlord-${landlordId}`, {
      type: 'payment_received',
      amount,
      availableAt,
    });
  }

  // Fan a bell-row + email + push out to the full eligible team. We use
  // category `rent` so anyone with finance permissions is notified, and
  // maintenance techs are skipped.
  if (landlordId && amount != null) {
    try {
      const formatted = typeof amount === 'number'
        ? `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : `$${amount}`;
      await notifyLandlordTeam({
        landlordId,
        category: 'rent',
        type: 'payment',
        title: 'Payment received',
        message: propertyName
          ? `${formatted} received for ${propertyName}.`
          : `${formatted} received.`,
        actionUrl: '/admin/payouts',
        metadata: { transactionId, amount, availableAt },
      });
    } catch (err) {
      console.error('handlePaymentReceived: team notify failed', err);
    }
  }
}

/**
 * Handle pending payment - track for release
 */
async function handlePendingPayment(event: EventPayload) {
  const { transactionId, availableAt } = event.data;

  await jobQueue.schedule({
    type: 'release_balance',
    payload: { transactionId },
    scheduledFor: new Date(availableAt),
    priority: 8,
  });
}

/**
 * Handle appointment creation - schedule reminder
 */
async function handleAppointmentCreated(event: EventPayload) {
  const { appointmentId, contractorId, startTime } = event.data;

  // Schedule reminder 24 hours before
  const reminderTime = addHours(new Date(startTime), -24);

  if (reminderTime > new Date()) {
    await jobQueue.scheduleReminder(
      'appointment',
      contractorId,
      reminderTime,
      { appointmentId }
    );
  }
}

/**
 * Handle appointment update - reschedule reminder if time changed
 */
async function handleAppointmentUpdated(event: EventPayload) {
  const { appointmentId, contractorId, startTime, previousStartTime } = event.data;

  // If time changed, cancel old reminder and schedule new one
  if (startTime !== previousStartTime) {
    // Cancel existing reminders for this appointment
    // (In production, you'd want to track reminder job IDs)

    const reminderTime = addHours(new Date(startTime), -24);

    if (reminderTime > new Date()) {
      await jobQueue.scheduleReminder(
        'appointment',
        contractorId,
        reminderTime,
        { appointmentId }
      );
    }
  }
}

/**
 * Handle verification upload - check expiration and schedule reminders
 */
async function handleVerificationUploaded(event: EventPayload) {
  const { verificationType, contractorId, expiresAt } = event.data;

  if (!expiresAt) return;

  const expirationDate = new Date(expiresAt);

  // Schedule reminder based on verification type
  const reminderDays = verificationType === 'insurance' ? 14 : 30;
  const reminderDate = addDays(expirationDate, -reminderDays);

  if (reminderDate > new Date()) {
    await jobQueue.scheduleReminder(
      'verification',
      contractorId,
      reminderDate,
      { verificationType, expiresAt }
    );
  }
}

/**
 * Handle verification expiring soon
 */
async function handleVerificationExpiring(event: EventPayload) {
  const { contractorId, verificationType, expiresAt, daysUntilExpiration } = event.data;

  await jobQueue.scheduleReminder(
    'verification',
    contractorId,
    new Date(),
    { verificationType, expiresAt, daysUntilExpiration }
  );
}

/**
 * Handle rent due soon
 */
async function handleRentDueSoon(event: EventPayload) {
  const { tenantId, leaseId, dueDate, amount } = event.data;

  await jobQueue.scheduleReminder(
    'rent',
    tenantId,
    new Date(),
    { leaseId, dueDate, amount }
  );
}

/**
 * Handle invoice creation - schedule payment reminder
 */
async function handleInvoiceCreated(event: EventPayload) {
  const { invoiceId, customerId, dueDate } = event.data;

  // Schedule reminder 3 days before due date
  const reminderDate = addDays(new Date(dueDate), -3);

  if (reminderDate > new Date()) {
    await jobQueue.scheduleReminder(
      'invoice',
      customerId,
      reminderDate,
      { invoiceId, daysUntilDue: 3 }
    );
  }
}

/**
 * Handle overdue invoice - apply late fees
 */
async function handleInvoiceOverdue(event: EventPayload) {
  const { invoiceId, customerId } = event.data;

  // Schedule late fee application
  await jobQueue.schedule({
    type: 'process_late_fee',
    payload: { invoiceId },
    scheduledFor: new Date(),
    priority: 7,
  });

  // Send notification
  await jobQueue.schedule({
    type: 'send_notification',
    payload: {
      userId: customerId,
      type: 'alert',
      title: 'Invoice Overdue',
      message: 'Your invoice is overdue. Please make payment to avoid additional fees.',
      actionUrl: `/invoices/${invoiceId}`,
    },
    scheduledFor: new Date(),
    priority: 9,
  });
}

/**
 * Handle pending balance release
 */
async function handlePendingBalanceRelease(event: EventPayload) {
  const { transactionId, availableAt } = event.data;

  await jobQueue.schedule({
    type: 'release_balance',
    payload: { transactionId },
    scheduledFor: new Date(availableAt),
    priority: 8,
  });
}

/**
 * Handle expired document - cleanup
 */
async function handleDocumentExpired(event: EventPayload) {
  const { documentId } = event.data;

  await jobQueue.schedule({
    type: 'cleanup_documents',
    payload: { documentId },
    scheduledFor: new Date(),
    priority: 3,
  });
}

/**
 * Handle failed webhook - schedule retry
 */
async function handleWebhookFailed(event: EventPayload) {
  const { webhookId, retryCount } = event.data;

  // Exponential backoff for retries
  const retryDelay = Math.pow(2, retryCount) * 60000; // 2^n minutes

  await jobQueue.schedule({
    type: 'process_webhook',
    payload: { webhookId },
    scheduledFor: addMinutes(new Date(), retryDelay / 60000),
    priority: 5,
    maxRetries: 5,
  });
}

/**
 * Handle property showing scheduled — notify the entire landlord team
 * (owner, admins, and any team member with `schedule_showings` or
 * `manage_tenants` permission), send the visitor a confirmation email,
 * and schedule a 24-hour reminder for the visitor.
 *
 * The maintenance tech role intentionally drops out here because the
 * `showing` category requires `schedule_showings` or `manage_tenants`.
 */
async function handlePropertyShowingScheduled(event: EventPayload) {
  const { appointmentId, propertyId, date, startTime, visitorName, visitorEmail } = event.data;

  // Fetch property + landlord context for branding and team fan-out.
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      name: true,
      slug: true,
      landlordId: true,
    },
  });

  // Format the showing time once for every downstream consumer.
  const showingDateTime = new Date(`${date}T${startTime}`);
  const showingHuman = showingDateTime.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const propertyLabel = property?.name ?? 'your property';

  // 1) Fan out an in-app/email/push notification to the landlord team.
  if (property?.landlordId) {
    try {
      await notifyLandlordTeam({
        landlordId: property.landlordId,
        category: 'showing',
        title: 'New showing requested',
        message: `${visitorName ?? 'A visitor'} booked a showing for ${propertyLabel} on ${showingHuman}.`,
        actionUrl: `/admin/dashboard/properties/${propertyId}/details`,
        metadata: { appointmentId, propertyId, date, startTime, visitorEmail },
      });
    } catch (err) {
      console.error('handlePropertyShowingScheduled: team notify failed', err);
    }
  }

  // 2) Send the visitor a confirmation email using the generic notification
  //    template so they get the landlord's brand on it. We swallow errors
  //    so the rest of the flow still runs even if Resend hiccups.
  if (visitorEmail && property?.landlordId) {
    try {
      const { sendBrandedEmail } = await import('@/lib/services/email-service');
      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
      const protocol = rootDomain.includes('localhost') ? 'http' : 'https';
      const listingUrl = property.slug
        ? `${protocol}://${rootDomain}/property-flow-hq/properties/${property.slug}`
        : `${protocol}://${rootDomain}`;

      await sendBrandedEmail({
        to: visitorEmail,
        subject: `Showing confirmed for ${propertyLabel}`,
        template: 'notification',
        landlordId: property.landlordId,
        data: {
          recipientName: visitorName ?? 'there',
          notificationType: 'reminder',
          title: 'Your showing is booked',
          message: `Thanks for requesting a tour of ${propertyLabel}. We'll see you on ${showingHuman}. If anything changes, reply to this email and the listing team will get back to you.`,
          actionUrl: listingUrl,
          loginUrl: listingUrl,
        },
      });
    } catch (err) {
      console.error('handlePropertyShowingScheduled: visitor email failed', err);
    }
  }

  // 3) Schedule a 24-hour-out reminder for the visitor, same as before.
  const reminderTime = addHours(showingDateTime, -24);
  if (reminderTime > new Date()) {
    await jobQueue.schedule({
      type: 'send_reminder',
      payload: {
        reminderType: 'property_showing',
        recipientEmail: visitorEmail,
        appointmentId,
        showingDateTime,
      },
      scheduledFor: reminderTime,
      priority: 7,
    });
  }

  // 4) Keep the live WebSocket broadcast for any open dashboards.
  const wsServer = getWebSocketServer();
  if (wsServer) {
    wsServer.broadcastNewMessage(`property-${propertyId}`, {
      type: 'showing_scheduled',
      visitorName,
      date,
      startTime,
    });
  }
}

/**
 * Handle open house scheduled - notify agent and schedule reminders
 */
async function handleOpenHouseScheduled(event: EventPayload) {
  const { openHouseId, agentId, listingId, date, startTime, endTime } = event.data;

  // Schedule reminder 24 hours before
  const openHouseDateTime = new Date(`${date}T${startTime}`);
  const reminderTime = addHours(openHouseDateTime, -24);

  if (reminderTime > new Date()) {
    await jobQueue.scheduleReminder(
      'open_house',
      agentId,
      reminderTime,
      { openHouseId, listingId, date, startTime, endTime }
    );
  }

  // Schedule "starting soon" notification 1 hour before
  const startingSoonTime = addHours(openHouseDateTime, -1);

  if (startingSoonTime > new Date()) {
    await jobQueue.schedule({
      type: 'send_notification',
      payload: {
        userId: agentId,
        type: 'reminder',
        title: 'Open House Starting Soon',
        message: 'Your open house starts in 1 hour. Make sure everything is ready!',
        actionUrl: `/agent/open-houses/${openHouseId}`,
      },
      scheduledFor: startingSoonTime,
      priority: 8,
    });
  }

  // Send real-time notification to agent
  const wsServer = getWebSocketServer();
  if (wsServer) {
    wsServer.broadcastNewMessage(`agent-${agentId}`, {
      type: 'open_house_scheduled',
      openHouseId,
      date,
      startTime,
    });
  }
}

/**
 * Handle open house starting soon
 */
async function handleOpenHouseStartingSoon(event: EventPayload) {
  const { agentId, openHouseId } = event.data;

  await jobQueue.schedule({
    type: 'send_notification',
    payload: {
      userId: agentId,
      type: 'alert',
      title: 'Open House Starting Soon',
      message: 'Your open house starts in 1 hour. Make sure everything is ready!',
      actionUrl: `/agent/open-houses/${openHouseId}`,
    },
    scheduledFor: new Date(),
    priority: 9,
  });
}

/**
 * Handle work order created - notify contractors if open bid
 */
async function handleWorkOrderCreated(event: EventPayload) {
  const { workOrderId, posterType, posterId, title, category, isOpenBid, contractorId } = event.data;

  if (isOpenBid) {
    // Notify all contractors in this category via WebSocket
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.broadcastNewMessage(`contractors-${category}`, {
        type: 'new_job_available',
        workOrderId,
        title,
        category,
        posterType,
      });
    }
  } else if (contractorId) {
    // Direct assignment - notify specific contractor
    await jobQueue.schedule({
      type: 'send_notification',
      payload: {
        userId: contractorId,
        type: 'work_order',
        title: 'New Work Order Assigned',
        message: `You have been assigned a new job: ${title}`,
        actionUrl: `/contractor/work-orders/${workOrderId}`,
      },
      scheduledFor: new Date(),
      priority: 9,
    });

    // Real-time notification
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.broadcastNewMessage(`contractor-${contractorId}`, {
        type: 'work_order_assigned',
        workOrderId,
        title,
      });
    }
  }
}

/**
 * Handle bid received on work order - notify owner
 */
async function handleWorkOrderBidReceived(event: EventPayload) {
  const { bidId, workOrderId, contractorId, amount, workOrderOwnerId } = event.data;

  // Validate required fields before attempting real-time or queued notifications.
  if (!workOrderOwnerId) {
    console.warn('Received work_order.bid_received event without owner user id, skipping notifications', { bidId, workOrderId });
    return;
  }
  if (!workOrderId) {
    console.warn('Received work_order.bid_received event without workOrderId, skipping notifications', { bidId });
    return;
  }
  if (amount === undefined || amount === null) {
    console.warn('Received work_order.bid_received event without bid amount, skipping notifications', { bidId, workOrderId });
    return;
  }

  // Send real-time notification to owner
  const wsServer = getWebSocketServer();
  if (wsServer) {
    wsServer.broadcastNewMessage(`user-${workOrderOwnerId}`, {
      type: 'bid_received',
      workOrderId,
      bidId,
      amount,
    });
  }

  // Create in-app notification
  await jobQueue.schedule({
    type: 'send_notification',
    payload: {
      userId: workOrderOwnerId,
      type: 'bid',
      title: 'New Bid Received',
      message: `A contractor has submitted a bid of $${amount} for your work order`,
      actionUrl: `/work-orders/${workOrderId}`,
    },
    scheduledFor: new Date(),
    priority: 8,
  });
}

/**
 * Handle bid accepted - notify contractor
 */
async function handleWorkOrderBidAccepted(event: EventPayload) {
  const { bidId, workOrderId, contractorId, amount } = event.data;

  // Send real-time notification to contractor
  const wsServer = getWebSocketServer();
  if (wsServer) {
    wsServer.broadcastNewMessage(`contractor-${contractorId}`, {
      type: 'bid_accepted',
      workOrderId,
      bidId,
      amount,
    });
  }

  // Create in-app notification
  await jobQueue.schedule({
    type: 'send_notification',
    payload: {
      userId: contractorId,
      type: 'success',
      title: 'Bid Accepted!',
      message: `Your bid of $${amount} has been accepted. Time to get to work!`,
      actionUrl: `/contractor/work-orders/${workOrderId}`,
    },
    scheduledFor: new Date(),
    priority: 9,
  });
}

/**
 * Handle contractor lead matched - notify contractor of new lead
 */
async function handleContractorLeadMatched(event: EventPayload) {
  const { matchId, leadId, contractorId, serviceType, leadScore } = event.data;

  // Send real-time notification
  const wsServer = getWebSocketServer();
  if (wsServer) {
    wsServer.broadcastNewMessage(`contractor-${contractorId}`, {
      type: 'new_lead',
      matchId,
      leadId,
      serviceType,
      leadScore,
    });
  }

  // Create in-app notification
  await jobQueue.schedule({
    type: 'send_notification',
    payload: {
      userId: contractorId,
      type: 'lead',
      title: 'New Lead Available',
      message: `A new ${serviceType} lead (score: ${leadScore}) is waiting for your response`,
      actionUrl: `/contractor/leads/${matchId}`,
    },
    scheduledFor: new Date(),
    priority: 8,
  });
}

/**
 * Handle quote accepted - notify contractor in real-time
 */
async function handleContractorQuoteAccepted(event: EventPayload) {
  const { quoteId, jobId, contractId, contractorId, contractorUserId } = event.data;

  const wsServer = getWebSocketServer();
  if (wsServer && contractorUserId) {
    wsServer.broadcastNewMessage(`contractor-${contractorUserId}`, {
      type: 'quote_accepted',
      quoteId,
      jobId,
      contractId,
      message: 'A customer accepted your quote! Contract has been sent for signing.',
    });
  }
}

/**
 * Handle contract signed - real-time notification + schedule job reminders
 */
async function handleContractorContractSigned(event: EventPayload) {
  const { contractId, jobId, contractorUserId, customerName } = event.data;

  const wsServer = getWebSocketServer();
  if (wsServer && contractorUserId) {
    wsServer.broadcastNewMessage(`contractor-${contractorUserId}`, {
      type: 'contract_signed',
      contractId,
      jobId,
      message: `${customerName} signed the contract. Job is ready to schedule!`,
    });
  }
}

/**
 * Handle contract declined - notify contractor
 */
async function handleContractorContractDeclined(event: EventPayload) {
  const { contractId, contractorUserId, customerName, declineReason } = event.data;

  const wsServer = getWebSocketServer();
  if (wsServer && contractorUserId) {
    wsServer.broadcastNewMessage(`contractor-${contractorUserId}`, {
      type: 'contract_declined',
      contractId,
      message: `${customerName} declined the contract.`,
    });
  }

  await jobQueue.schedule({
    type: 'send_notification',
    payload: {
      userId: contractorUserId,
      type: 'alert',
      title: 'Contract Declined',
      message: `${customerName} declined the contract${declineReason ? `: ${declineReason}` : ''}. Consider following up.`,
      actionUrl: `/contractor/contracts/${contractId}`,
    },
    scheduledFor: new Date(),
    priority: 8,
  });
}

/**
 * Handle job completed - schedule review request
 */
async function handleContractorJobCompleted(event: EventPayload) {
  const { jobId, contractorUserId, customerUserId, totalCost } = event.data;

  // Auto-create invoice from job time entries + expenses
  try {
    const { autoInvoiceOnJobComplete } = await import('@/lib/services/contractor-automation');
    await autoInvoiceOnJobComplete(jobId);
  } catch (err) {
    console.error('[handleContractorJobCompleted] auto-invoice failed:', err);
  }

  // Schedule review request 24 hours after completion
  if (customerUserId) {
    await jobQueue.schedule({
      type: 'send_notification',
      payload: {
        userId: customerUserId,
        type: 'reminder',
        title: 'How Was Your Experience?',
        message: 'Your job has been completed. Please leave a review for your contractor.',
        actionUrl: `/customer/reviews/new?jobId=${jobId}`,
      },
      scheduledFor: addHours(new Date(), 24),
      priority: 6,
    });
  }
}

/**
 * Handle job status changed - real-time updates
 */
async function handleContractorJobStatusChanged(event: EventPayload) {
  const { jobId, previousStatus, newStatus, contractorUserId } = event.data;

  const wsServer = getWebSocketServer();
  if (wsServer && contractorUserId) {
    wsServer.broadcastNewMessage(`contractor-${contractorUserId}`, {
      type: 'job_status_changed',
      jobId,
      previousStatus,
      newStatus,
    });
  }
}

/**
 * Handle job created — the "morning briefing" automation trigger.
 *
 * When a contractor creates a job this handler:
 *  1. Notifies every assigned crew member (in-app notification)
 *  2. Checks inventory for any materials tagged on the job and flags shortages
 *  3. Sends the contractor a real-time WebSocket push so the dispatch board
 *     refreshes without a page reload
 *  4. If the job has a customer, schedules a confirmation message 30 min later
 */
async function handleContractorJobCreated(event: EventPayload) {
  const { jobId, contractorId, customerId, jobNumber, title, status } = event.data;

  try {
    const { prisma } = await import('@/db/prisma');
    const db = prisma as any;

    // ── 1. Fetch job + assigned employees + contractor user ──────────────────
    const job = await db.contractorJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        jobNumber: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        estimatedStartDate: true,
        estimatedHours: true,
        assignedEmployeeIds: true,
        status: true,
        contractor: {
          select: {
            id: true,
            businessName: true,
            userId: true,
            user: { select: { id: true, name: true } },
          },
        },
        customer: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });

    if (!job) return;

    const contractorUserId = job.contractor?.userId;
    const businessName = job.contractor?.businessName || 'Your contractor';
    const jobAddress = [job.address, job.city, job.state].filter(Boolean).join(', ');

    // ── 2. Notify assigned crew members ─────────────────────────────────────
    if (Array.isArray(job.assignedEmployeeIds) && job.assignedEmployeeIds.length > 0) {
      const employees = await db.contractorEmployee.findMany({
        where: {
          id: { in: job.assignedEmployeeIds },
          contractorId,
        },
        select: { id: true, firstName: true, lastName: true, userId: true },
      });

      for (const emp of employees) {
        if (!emp.userId) continue; // employee not linked to a user account yet

        await jobQueue.schedule({
          type: 'send_notification',
          payload: {
            userId: emp.userId,
            type: 'reminder',
            title: `You've been assigned to ${title}`,
            message: `Job ${jobNumber}${jobAddress ? ` at ${jobAddress}` : ''}${job.estimatedStartDate
                ? ` — starts ${new Date(job.estimatedStartDate).toLocaleDateString()}`
                : ''
              }`,
            actionUrl: `/contractor-dashboard/jobs/${jobId}`,
          },
          scheduledFor: new Date(),
          priority: 8,
        });
      }
    }

    // ── 3. Check inventory for material shortages ────────────────────────────
    // Uses the ContractorJobMaterial relation (planned materials linked to inventory items)
    const jobMaterials = await db.contractorJobMaterial.findMany({
      where: { jobId, contractorId },
      select: {
        quantityNeeded: true,
        item: { select: { id: true, name: true, quantity: true, unit: true } },
      },
    });

    if (jobMaterials.length > 0 && contractorUserId) {
      const shortages: string[] = [];

      for (const mat of jobMaterials) {
        const inStock = Number(mat.item.quantity);
        const needed = mat.quantityNeeded;
        if (inStock < needed) {
          shortages.push(`${mat.item.name}: need ${needed - inStock} more ${mat.item.unit}`);
        }
      }

      if (shortages.length > 0) {
        await jobQueue.schedule({
          type: 'send_notification',
          payload: {
            userId: contractorUserId,
            type: 'alert',
            title: `⚠️ Inventory shortage for ${title}`,
            message: `${shortages.length} item(s) are short: ${shortages.slice(0, 3).join('; ')}${shortages.length > 3 ? ` +${shortages.length - 3} more` : ''}`,
            actionUrl: `/contractor-dashboard/inventory`,
          },
          scheduledFor: new Date(),
          priority: 9,
        });
      }
    }

    // ── 4. Real-time dispatch board refresh ──────────────────────────────────
    const wsServer = getWebSocketServer();
    if (wsServer && contractorUserId) {
      wsServer.broadcastNewMessage(`contractor-${contractorUserId}`, {
        type: 'job_created',
        jobId,
        jobNumber,
        title,
        status,
      });
    }

    // ── 5. Auto-create contract if job has a customer with email ────────────
    // Skipped for onQuoteAccepted (already creates its own contract).
    // The autoCreateContractForJob function checks for existing contracts.
    if (customerId && job.customer?.email) {
      try {
        const { autoCreateContractForJob, autoSendContractForSigning } = await import('@/lib/services/contractor-automation');
        const result = await autoCreateContractForJob(jobId);
        if (result) {
          await autoSendContractForSigning(result.contract.id);

          // Notify contractor
          if (contractorUserId) {
            await jobQueue.schedule({
              type: 'send_notification',
              payload: {
                userId: contractorUserId,
                type: 'info',
                title: 'Contract auto-created & sent',
                message: `A service agreement for ${title} (${jobNumber}) has been sent to ${job.customer.name} for signing.`,
                actionUrl: `/contractor-dashboard/contracts/${result.contract.id}`,
              },
              scheduledFor: new Date(),
              priority: 8,
            });
          }
        }
      } catch (contractErr) {
        console.error('[handleContractorJobCreated] Auto-contract failed (non-blocking):', contractErr);
      }
    }

    // ── 6. Schedule customer confirmation (30 min after job creation) ────────
    if (job.customer?.email && status === 'scheduled' && contractorUserId) {
      await jobQueue.schedule({
        type: 'send_notification',
        payload: {
          userId: contractorUserId, // contractor gets a reminder to confirm
          type: 'reminder',
          title: `Confirm job with ${job.customer.name}`,
          message: `Don't forget to confirm ${title} (${jobNumber}) with ${job.customer.name}${job.customer.phone ? ` at ${job.customer.phone}` : ''
            }.`,
          actionUrl: `/contractor-dashboard/jobs/${jobId}`,
        },
        scheduledFor: addMinutes(new Date(), 30),
        priority: 7,
      });
    }
  } catch (err) {
    console.error('[handleContractorJobCreated]', err);
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// CONTRACTOR ESTIMATE FUNNEL — followup automation
//
// The PM-side equivalent is "lease signed → rent reminders scheduled". For
// contractors, the equivalent is "estimate sent → followup cascade scheduled".
//
// Cadence (mirrors typical e-commerce cart abandonment recovery):
//   T+48h: if estimate not viewed, nudge the contractor to phone the customer
//   T+5d:  if viewed but not accepted, send the customer a softer followup
//   T+14d: if still no response, mark the estimate `expired` and move on
//
// All three are scheduled the moment the estimate is sent. If the customer
// views/accepts/declines first, the corresponding event handlers below cancel
// the relevant downstream notifications by short-circuiting their checks.
// ─────────────────────────────────────────────────────────────────────────────

async function handleContractorEstimateSent(event: EventPayload) {
  const { estimateId, contractorId, contractorUserId, title, totalAmount } = event.data;

  // 1. Real-time push so the UI can show a "sent" confirmation.
  const wsServer = getWebSocketServer();
  if (wsServer && contractorUserId) {
    wsServer.broadcastNewMessage(`contractor-${contractorUserId}`, {
      type: 'estimate_sent',
      estimateId,
      title,
      totalAmount,
    });
  }

  // 2. T+48h "customer hasn't opened your estimate" nudge to the contractor.
  //    The job runner will check `estimate.viewedAt` at fire time and skip if
  //    the customer has already viewed.
  if (contractorUserId) {
    await jobQueue.schedule({
      type: 'send_notification',
      payload: {
        userId: contractorUserId,
        type: 'reminder',
        title: 'Estimate not opened yet',
        message: `Your estimate "${title}" hasn't been opened. Try a quick phone call or text.`,
        actionUrl: `/contractor-dashboard/estimates/${estimateId}`,
        // Hint to the runner to short-circuit if the estimate has already
        // been viewed by the time this fires.
        skipIfEstimateField: { estimateId, field: 'viewedAt' },
      },
      scheduledFor: addHours(new Date(), 48),
      priority: 6,
    });
  }

  // 3. T+5d "customer viewed but didn't respond" softer followup. The runner
  //    fires this only if the estimate has been viewed but hasn't been
  //    accepted/declined.
  if (contractorUserId) {
    await jobQueue.schedule({
      type: 'send_notification',
      payload: {
        userId: contractorUserId,
        type: 'reminder',
        title: 'Customer viewed but hasn\'t responded',
        message: `${title} was opened but no response yet. Consider sending a "still interested?" follow-up.`,
        actionUrl: `/contractor-dashboard/estimates/${estimateId}`,
        skipUnlessEstimateViewed: { estimateId },
        skipIfEstimateResponded: { estimateId },
      },
      scheduledFor: addDays(new Date(), 5),
      priority: 6,
    });
  }

  // 4. T+14d auto-expire if untouched. This is the "move on" signal — moves
  //    the estimate out of the contractor's open pipeline so it doesn't
  //    clutter the dashboard forever.
  await jobQueue.schedule({
    type: 'send_notification',
    payload: {
      userId: contractorUserId,
      type: 'alert',
      title: 'Estimate expired',
      message: `${title} was never accepted. We've marked it expired so your pipeline stays clean.`,
      actionUrl: `/contractor-dashboard/estimates/${estimateId}`,
      autoExpireEstimateId: estimateId,
    },
    scheduledFor: addDays(new Date(), 14),
    priority: 4,
  });
}

/**
 * Customer opened the estimate. Currently this just emits a real-time push;
 * the followup-cascade scheduling already happened at send time. We could
 * also cancel the T+48h "not opened" job here, but the runner-side
 * short-circuit handles that idempotently so cancellation isn't required.
 */
async function handleContractorEstimateViewed(event: EventPayload) {
  const { estimateId, contractorUserId, viewedAt } = event.data;

  const wsServer = getWebSocketServer();
  if (wsServer && contractorUserId) {
    wsServer.broadcastNewMessage(`contractor-${contractorUserId}`, {
      type: 'estimate_viewed',
      estimateId,
      viewedAt,
    });
  }

  if (contractorUserId) {
    await jobQueue.schedule({
      type: 'send_notification',
      payload: {
        userId: contractorUserId,
        type: 'reminder',
        title: 'Customer opened your estimate',
        message: 'Strike while the iron is hot — consider a quick follow-up.',
        actionUrl: `/contractor-dashboard/estimates/${estimateId}`,
      },
      scheduledFor: new Date(),
      priority: 7,
    });
  }
}

/**
 * Customer accepted the estimate. The onQuoteAccepted pipeline handles the
 * heavy lifting (creating the job, generating contract, notifying); this
 * handler is a place to record the funnel-conversion event for analytics
 * and to push a celebratory in-app notification.
 */
async function handleContractorEstimateAccepted(event: EventPayload) {
  const { estimateId, contractorUserId, totalAmount } = event.data;

  const wsServer = getWebSocketServer();
  if (wsServer && contractorUserId) {
    wsServer.broadcastNewMessage(`contractor-${contractorUserId}`, {
      type: 'estimate_accepted',
      estimateId,
      totalAmount,
    });
  }

  if (contractorUserId) {
    await jobQueue.schedule({
      type: 'send_notification',
      payload: {
        userId: contractorUserId,
        type: 'success',
        title: '🎉 Estimate accepted!',
        message: `Your estimate for $${totalAmount} was accepted. A job has been auto-created.`,
        actionUrl: `/contractor-dashboard/estimates/${estimateId}`,
      },
      scheduledFor: new Date(),
      priority: 9,
    });
  }
}
