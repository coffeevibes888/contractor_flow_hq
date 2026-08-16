/**
 * Lease Audit Trail Service
 * Logs all lease-related events for legal documentation
 */

import { prisma } from '@/db/prisma';
import crypto from 'crypto';

export interface AuditEventData {
  leaseId?: string;
  documentId?: string;
  eventType: 'created' | 'modified' | 'sent_for_signature' | 'viewed' | 'signed' | 'countersigned' | 'executed' | 'notice_sent' | 'rent_due' | 'rent_paid' | 'late_fee_applied';
  actorId: string;
  actorRole: 'landlord' | 'tenant' | 'system';
  actorName?: string;
  actorEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: string;
  metadata?: Record<string, any>;
}

/**
 * Generate SHA-256 hash of document content for integrity verification
 */
export function generateDocumentHash(content: string | Buffer): string {
  const hash = crypto.createHash('sha256');
  hash.update(content);
  return hash.digest('hex');
}

/**
 * Log an audit event for a lease or document
 */
export async function logAuditEvent(data: AuditEventData): Promise<void> {
  try {
    // Store in database - you may want to create a LeaseAuditLog model
    // For now, we'll store in the lease's metadata or a separate collection
    
    const auditEntry = {
      timestamp: new Date().toISOString(),
      eventType: data.eventType,
      actorId: data.actorId,
      actorRole: data.actorRole,
      actorName: data.actorName,
      actorEmail: data.actorEmail,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      details: data.details,
      metadata: data.metadata,
    };

    // If we have a leaseId, update the lease's audit log
    if (data.leaseId) {
      const lease = await prisma.lease.findUnique({
        where: { id: data.leaseId },
      });
      
      if (lease) {
        // Get existing audit log or create new array
        const existingLog = (lease as any).auditLog || [];
        existingLog.push(auditEntry);
        
        // Note: You'll need to add an auditLog Json field to the Lease model
        // For now, we'll log to console and could store elsewhere
        console.log(`[LEASE AUDIT] ${data.leaseId}:`, auditEntry);
      }
    }

    // If we have a documentId, update the document's audit log
    if (data.documentId) {
      console.log(`[DOCUMENT AUDIT] ${data.documentId}:`, auditEntry);
    }

    // Also log to a central audit table if needed
    console.log('[AUDIT EVENT]', JSON.stringify(auditEntry, null, 2));
    
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Get audit trail for a lease
 */
export async function getLeaseAuditTrail(leaseId: string): Promise<any[]> {
  try {
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        signatureRequests: {
          orderBy: { createdAt: 'asc' },
        },
        rentPayments: {
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    if (!lease) return [];

    // Build audit trail from related records
    const trail: any[] = [];

    // Lease creation
    trail.push({
      timestamp: lease.createdAt,
      eventType: 'created',
      details: 'Lease created',
    });

    // Signature events
    for (const sig of lease.signatureRequests) {
      trail.push({
        timestamp: sig.createdAt,
        eventType: 'sent_for_signature',
        actorRole: sig.role,
        actorEmail: sig.recipientEmail,
        details: `Signature request sent to ${sig.recipientName}`,
      });

      if (sig.signedAt) {
        trail.push({
          timestamp: sig.signedAt,
          eventType: 'signed',
          actorRole: sig.role,
          actorName: sig.signerName,
          actorEmail: sig.signerEmail,
          ipAddress: sig.signerIp,
          userAgent: sig.signerUserAgent,
          details: `Document signed by ${sig.signerName}`,
          documentHash: sig.documentHash,
        });
      }
    }

    // Rent payment events
    for (const payment of lease.rentPayments) {
      trail.push({
        timestamp: payment.dueDate,
        eventType: 'rent_due',
        details: `Rent due: $${payment.amount}`,
      });

      if (payment.paidAt) {
        trail.push({
          timestamp: payment.paidAt,
          eventType: 'rent_paid',
          details: `Rent paid: $${payment.amount} via ${payment.paymentMethod}`,
        });
      }
    }

    // Sort by timestamp
    trail.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return trail;
  } catch (error) {
    console.error('Failed to get audit trail:', error);
    return [];
  }
}

/**
 * Generate audit report for court documentation
 */
export function generateAuditReport(trail: any[]): string {
  let report = `
LEASE AUDIT TRAIL REPORT
Generated: ${new Date().toISOString()}
================================================================================

`;

  for (const event of trail) {
    report += `
[${new Date(event.timestamp).toLocaleString()}] ${event.eventType.toUpperCase()}
  ${event.details || ''}
  ${event.actorName ? `Actor: ${event.actorName} (${event.actorEmail})` : ''}
  ${event.actorRole ? `Role: ${event.actorRole}` : ''}
  ${event.ipAddress ? `IP: ${event.ipAddress}` : ''}
  ${event.documentHash ? `Document Hash: ${event.documentHash}` : ''}
--------------------------------------------------------------------------------
`;
  }

  report += `
================================================================================
END OF AUDIT TRAIL
Total Events: ${trail.length}
`;

  return report;
}
