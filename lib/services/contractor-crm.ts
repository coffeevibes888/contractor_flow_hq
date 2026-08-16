/**
 * Contractor CRM Service
 * 
 * Provides customer relationship management functionality for contractors:
 * - Lead management with status tracking
 * - Customer records with contact info and history
 * - Notes and tags for organization
 * - Communication history tracking
 * 
 * Requirements: 7.1-7.7
 */

import { prisma } from '@/db/prisma';
import { Prisma } from '@prisma/client';

export type LeadStatus = 'new' | 'contacted' | 'quoted' | 'negotiating' | 'won' | 'lost';

export interface LeadFilters {
  status?: LeadStatus[];
  dateRange?: { start: Date; end: Date };
  serviceType?: string;
  search?: string;
}

export interface Lead {
  id: string;
  contractorId: string;
  customerId: string;
  status: LeadStatus;
  source: string;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    name: string;
    email: string;
    phone: string | null;
    address: any;
  };
}

export interface Customer {
  id: string;
  contractorId: string;
  userId: string | null;
  name: string;
  email: string;
  phone: string | null;
  address: any;
  status: string;
  source: string | null;
  tags: string[];
  notes: Array<{ text: string; createdAt: Date; createdBy: string }>;
  totalJobs: number;
  totalSpent: number;
  lastContactedAt: Date | null;
  lastJobAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  threadId: string;
  senderUserId: string | null;
  senderName: string | null;
  senderEmail: string | null;
  content: string;
  role: string;
  createdAt: Date;
}

export class ContractorCRMService {
  /**
   * Get all leads for a contractor with optional filters
   * Requirement 7.1: Display all leads with status
   */
  static async getLeads(
    contractorId: string,
    filters: LeadFilters = {}
  ): Promise<Lead[]> {
    const where: Prisma.ContractorCustomerWhereInput = {
      contractorId,
    };

    // Apply status filter
    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status };
    }

    // Apply date range filter
    if (filters.dateRange) {
      where.createdAt = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end,
      };
    }

    // Apply search filter (name, email, phone)
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const customers = await prisma.contractorCustomer.findMany({
      where,
      orderBy: [
        { status: 'asc' }, // Group by status
        { createdAt: 'desc' }, // Most recent first
      ],
    });

    return customers.map(customer => ({
      id: customer.id,
      contractorId: customer.contractorId,
      customerId: customer.id,
      status: customer.status as LeadStatus,
      source: customer.source || 'unknown',
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
      },
    }));
  }

  /**
   * Update lead status
   * Requirement 7.1: Manage lead status transitions
   */
  static async updateLeadStatus(
    leadId: string,
    status: LeadStatus,
    contractorId: string
  ): Promise<Customer> {
    // Verify the lead belongs to this contractor
    const customer = await prisma.contractorCustomer.findFirst({
      where: {
        id: leadId,
        contractorId,
      },
    });

    if (!customer) {
      throw new Error('Lead not found or access denied');
    }

    // Update status and lastContactedAt if moving from 'new' to 'contacted'
    const updateData: Prisma.ContractorCustomerUpdateInput = {
      status,
    };

    if (status === 'contacted' && customer.status === 'new') {
      updateData.lastContactedAt = new Date();
    }

    // Update totalJobs and lastJobAt if status is 'won'
    if (status === 'won') {
      updateData.totalJobs = { increment: 1 };
      updateData.lastJobAt = new Date();
    }

    const updated = await prisma.contractorCustomer.update({
      where: { id: leadId },
      data: updateData,
    });

    return this.mapCustomerToInterface(updated);
  }

  /**
   * Add a note to a lead/customer
   * Requirement 7.3: Allow contractors to add notes
   */
  static async addNote(
    leadId: string,
    note: string,
    createdBy: string,
    contractorId: string
  ): Promise<void> {
    // Verify the lead belongs to this contractor
    const customer = await prisma.contractorCustomer.findFirst({
      where: {
        id: leadId,
        contractorId,
      },
    });

    if (!customer) {
      throw new Error('Lead not found or access denied');
    }

    // Add note to the notes array
    const noteEntry = {
      text: note,
      createdAt: new Date(),
      createdBy,
    };

    await prisma.contractorCustomer.update({
      where: { id: leadId },
      data: {
        notes: {
          push: noteEntry,
        },
      },
    });
  }

  /**
   * Add a tag to a lead/customer
   * Requirement 7.3: Allow contractors to add tags
   */
  static async addTag(
    leadId: string,
    tag: string,
    contractorId: string
  ): Promise<void> {
    // Verify the lead belongs to this contractor
    const customer = await prisma.contractorCustomer.findFirst({
      where: {
        id: leadId,
        contractorId,
      },
    });

    if (!customer) {
      throw new Error('Lead not found or access denied');
    }

    // Check if tag already exists
    if (customer.tags.includes(tag)) {
      return; // Tag already exists, no need to add
    }

    // Add tag to the tags array
    await prisma.contractorCustomer.update({
      where: { id: leadId },
      data: {
        tags: {
          push: tag,
        },
      },
    });
  }

  /**
   * Remove a tag from a lead/customer
   */
  static async removeTag(
    leadId: string,
    tag: string,
    contractorId: string
  ): Promise<void> {
    // Verify the lead belongs to this contractor
    const customer = await prisma.contractorCustomer.findFirst({
      where: {
        id: leadId,
        contractorId,
      },
    });

    if (!customer) {
      throw new Error('Lead not found or access denied');
    }

    // Remove tag from the tags array
    const updatedTags = customer.tags.filter(t => t !== tag);

    await prisma.contractorCustomer.update({
      where: { id: leadId },
      data: {
        tags: updatedTags,
      },
    });
  }

  /**
   * Get a specific customer by ID
   * Requirement 7.3: Display customer info and history
   */
  static async getCustomer(
    customerId: string,
    contractorId: string
  ): Promise<Customer> {
    const customer = await prisma.contractorCustomer.findFirst({
      where: {
        id: customerId,
        contractorId,
      },
    });

    if (!customer) {
      throw new Error('Customer not found or access denied');
    }

    return this.mapCustomerToInterface(customer);
  }

  /**
   * Get all customers for a contractor
   * Requirement 7.7: Allow filtering and searching customers
   */
  static async getCustomers(
    contractorId: string,
    filters: {
      status?: string[];
      search?: string;
      tags?: string[];
    } = {}
  ): Promise<Customer[]> {
    const where: Prisma.ContractorCustomerWhereInput = {
      contractorId,
    };

    // Apply status filter
    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status };
    }

    // Apply search filter
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Apply tags filter
    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    const customers = await prisma.contractorCustomer.findMany({
      where,
      orderBy: [
        { lastContactedAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return customers.map(this.mapCustomerToInterface);
  }

  /**
   * Get communication history for a customer
   * Requirement 7.4: Track all communication history
   * 
   * Note: This integrates with the existing Thread/Message system
   */
  static async getCommunicationHistory(
    customerId: string,
    contractorId: string
  ): Promise<Message[]> {
    // Verify the customer belongs to this contractor
    const customer = await prisma.contractorCustomer.findFirst({
      where: {
        id: customerId,
        contractorId,
      },
    });

    if (!customer) {
      throw new Error('Customer not found or access denied');
    }

    // Find threads where this customer is a participant
    // This assumes the customer has a userId
    if (!customer.userId) {
      return []; // No communication history for non-registered customers
    }

    const threads = await prisma.thread.findMany({
      where: {
        participants: {
          some: {
            userId: customer.userId,
          },
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Flatten all messages from all threads
    const messages: Message[] = [];
    for (const thread of threads) {
      messages.push(...thread.messages);
    }

    // Sort by date
    messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return messages;
  }

  /**
   * Create a customer record from a lead
   * Requirement 7.2: Automatically create customer record from new lead
   * 
   * This is called automatically when a new lead arrives
   */
  static async createCustomerFromLead(
    contractorId: string,
    leadData: {
      name: string;
      email: string;
      phone?: string;
      address?: any;
      source: string;
      userId?: string;
    }
  ): Promise<Customer> {
    // Check if customer already exists (by email)
    const existing = await prisma.contractorCustomer.findFirst({
      where: {
        contractorId,
        email: leadData.email,
      },
    });

    if (existing) {
      // Update existing customer
      const updated = await prisma.contractorCustomer.update({
        where: { id: existing.id },
        data: {
          status: 'new', // Reset to new lead
          source: leadData.source,
          lastContactedAt: null,
        },
      });
      return this.mapCustomerToInterface(updated);
    }

    // Create new customer
    const customer = await prisma.contractorCustomer.create({
      data: {
        contractorId,
        userId: leadData.userId || null,
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone || null,
        address: leadData.address || null,
        status: 'new',
        source: leadData.source,
        tags: [],
        notes: [],
        totalJobs: 0,
        totalSpent: 0,
      },
    });

    return this.mapCustomerToInterface(customer);
  }

  /**
   * Get leads that haven't been contacted in 48 hours
   * Requirement 7.5: Send reminders for leads not contacted in 48 hours
   */
  static async getUncontactedLeads(contractorId: string): Promise<Customer[]> {
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

    const customers = await prisma.contractorCustomer.findMany({
      where: {
        contractorId,
        status: 'new',
        lastContactedAt: null,
        createdAt: {
          lte: fortyEightHoursAgo,
        },
      },
    });

    return customers.map(this.mapCustomerToInterface);
  }

  /**
   * Update customer's last contacted timestamp
   */
  static async markAsContacted(
    customerId: string,
    contractorId: string
  ): Promise<void> {
    await prisma.contractorCustomer.updateMany({
      where: {
        id: customerId,
        contractorId,
      },
      data: {
        lastContactedAt: new Date(),
      },
    });
  }

  /**
   * Helper to map Prisma model to interface
   */
  private static mapCustomerToInterface(customer: any): Customer {
    return {
      id: customer.id,
      contractorId: customer.contractorId,
      userId: customer.userId,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      status: customer.status,
      source: customer.source,
      tags: customer.tags,
      notes: customer.notes,
      totalJobs: customer.totalJobs,
      totalSpent: parseFloat(customer.totalSpent.toString()),
      lastContactedAt: customer.lastContactedAt,
      lastJobAt: customer.lastJobAt,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }
}
