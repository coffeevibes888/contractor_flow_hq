/**
 * Test script for contractor marketplace features
 * Run with: npx tsx scripts/test-contractor-features.ts
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local first, then .env
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { prisma } from '../db/prisma';

async function testContractorFeatures() {
  console.log('🧪 Testing Contractor Marketplace Features...\n');

  try {
    // Find a contractor profile to test with
    const contractor = await prisma.contractorProfile.findFirst({
      select: {
        id: true,
        businessName: true,
        userId: true,
      },
    });

    if (!contractor) {
      console.log('❌ No contractor profile found. Please create one first.');
      return;
    }

    console.log(`✅ Testing with contractor: ${contractor.businessName}\n`);

    // Test 1: Dashboard Stats
    console.log('📊 Test 1: Dashboard Stats');
    const [jobs, leads, employees, quotes] = await Promise.all([
      prisma.contractorJob.count({ where: { contractorId: contractor.id } }),
      prisma.contractorLeadMatch.count({ where: { contractorId: contractor.id } }),
      prisma.contractorEmployee.count({ where: { contractorId: contractor.id } }),
      prisma.contractorQuote.count({ where: { contractorId: contractor.id } }),
    ]);
    console.log(`   Jobs: ${jobs}`);
    console.log(`   Leads: ${leads}`);
    console.log(`   Employees: ${employees}`);
    console.log(`   Quotes: ${quotes}\n`);

    // Test 2: Team Management
    console.log('👥 Test 2: Team Management');
    const teamMembers = await prisma.contractorEmployee.findMany({
      where: { contractorId: contractor.id },
      include: {
        assignedRole: true,
        _count: {
          select: {
            assignments: true,
            timeEntries: true,
          },
        },
      },
      take: 5,
    });
    console.log(`   Found ${teamMembers.length} team members`);
    teamMembers.forEach((member) => {
      console.log(
        `   - ${member.firstName} ${member.lastName} (${member.role}): ${member._count.assignments} jobs, ${member._count.timeEntries} time entries`
      );
    });
    console.log('');

    // Test 3: Time Tracking
    console.log('⏰ Test 3: Time Tracking');
    const timeEntries = await prisma.contractorTimeEntry.findMany({
      where: {
        employee: {
          contractorId: contractor.id,
        },
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { clockIn: 'desc' },
      take: 5,
    });
    console.log(`   Found ${timeEntries.length} recent time entries`);
    timeEntries.forEach((entry) => {
      const hours = entry.clockOut
        ? (
            (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) /
            (1000 * 60 * 60)
          ).toFixed(2)
        : 'In Progress';
      console.log(
        `   - ${entry.employee.firstName} ${entry.employee.lastName}: ${hours} hours on ${new Date(entry.clockIn).toLocaleDateString()}`
      );
    });
    console.log('');

    // Test 4: Inventory
    console.log('📦 Test 4: Inventory Management');
    const inventory = await prisma.contractorInventoryItem.findMany({
      where: { contractorId: contractor.id },
      include: {
        vendor: {
          select: {
            name: true,
          },
        },
      },
      take: 5,
    });
    console.log(`   Found ${inventory.length} inventory items`);
    inventory.forEach((item) => {
      const status =
        item.quantity === 0
          ? '❌ Out of Stock'
          : item.reorderPoint && item.quantity <= item.reorderPoint
          ? '⚠️  Low Stock'
          : '✅ In Stock';
      console.log(
        `   - ${item.name}: ${item.quantity} ${item.unit} ${status}${item.vendor ? ` (${item.vendor.name})` : ''}`
      );
    });
    console.log('');

    // Test 5: Equipment
    console.log('🔧 Test 5: Equipment Tracking');
    const equipment = await prisma.contractorEquipment.findMany({
      where: { contractorId: contractor.id },
      include: {
        assignedTo: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      take: 5,
    });
    console.log(`   Found ${equipment.length} equipment items`);
    equipment.forEach((item) => {
      const assignment = item.assignedTo
        ? `Assigned to ${item.assignedTo.firstName} ${item.assignedTo.lastName}`
        : 'Available';
      console.log(`   - ${item.name} (${item.status}): ${assignment}`);
    });
    console.log('');

    // Test 6: Vendors
    console.log('🏪 Test 6: Vendor Management');
    const vendors = await prisma.contractorVendor.findMany({
      where: { contractorId: contractor.id },
      include: {
        _count: {
          select: {
            inventoryItems: true,
          },
        },
      },
      take: 5,
    });
    console.log(`   Found ${vendors.length} vendors`);
    vendors.forEach((vendor) => {
      console.log(
        `   - ${vendor.name} (${vendor.status}): ${vendor._count.inventoryItems} items, Rating: ${vendor.rating || 'N/A'}`
      );
    });
    console.log('');

    // Test 7: Jobs
    console.log('💼 Test 7: Jobs Management');
    const jobsList = await prisma.contractorJob.findMany({
      where: { contractorId: contractor.id },
      include: {
        customer: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            assignments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    console.log(`   Found ${jobsList.length} jobs`);
    jobsList.forEach((job) => {
      console.log(
        `   - ${job.title} (${job.status}): ${job.customer?.name || 'No customer'}, ${job._count.assignments} team members`
      );
    });
    console.log('');

    // Test 8: Leads
    console.log('🎯 Test 8: Leads Pipeline');
    const leadMatches = await prisma.contractorLeadMatch.findMany({
      where: { contractorId: contractor.id },
      include: {
        lead: {
          select: {
            projectTitle: true,
            projectType: true,
            stage: true,
            priority: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    console.log(`   Found ${leadMatches.length} lead matches`);
    leadMatches.forEach((match) => {
      console.log(
        `   - ${match.lead.projectTitle || match.lead.projectType} (${match.lead.stage}): ${match.lead.priority} priority, Status: ${match.status}`
      );
    });
    console.log('');

    // Summary
    console.log('📋 Summary:');
    console.log(`   ✅ Dashboard: ${jobs} jobs, ${leads} leads, ${employees} employees`);
    console.log(`   ✅ Team: ${teamMembers.length} members found`);
    console.log(`   ✅ Time Tracking: ${timeEntries.length} entries found`);
    console.log(`   ✅ Inventory: ${inventory.length} items found`);
    console.log(`   ✅ Equipment: ${equipment.length} items found`);
    console.log(`   ✅ Vendors: ${vendors.length} vendors found`);
    console.log(`   ✅ Jobs: ${jobsList.length} jobs found`);
    console.log(`   ✅ Leads: ${leadMatches.length} leads found`);
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testContractorFeatures();
