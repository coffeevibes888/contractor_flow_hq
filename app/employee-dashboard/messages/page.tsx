import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { redirect } from 'next/navigation';
import MessagesClient from './messages-client';

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const employee = await prisma.contractorEmployee.findFirst({
    where: { userId: session.user.id, status: 'active' },
    select: { id: true, contractorId: true, firstName: true, lastName: true },
  });

  if (!employee) redirect('/employee-start');

  const db = prisma as any;

  // Fetch team channels this employee has access to
  const channels = await db.contractorTeamChannel.findMany({
    where: { contractorId: employee.contractorId },
    select: {
      id: true,
      name: true,
      type: true,
      description: true,
    },
    orderBy: { name: 'asc' },
  }).catch(() => []);

  // Fetch recent messages across channels (last 50)
  const recentMessages = await db.contractorTeamMessage.findMany({
    where: {
      channel: { contractorId: employee.contractorId },
    },
    select: {
      id: true,
      channelId: true,
      content: true,
      senderName: true,
      senderId: true,
      createdAt: true,
      isAnnouncement: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  }).catch(() => []);

  // Get team members for DM list
  const teamMembers = await prisma.contractorEmployee.findMany({
    where: {
      contractorId: employee.contractorId,
      status: 'active',
      id: { not: employee.id },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      userId: true,
    },
    orderBy: { firstName: 'asc' },
  });

  return (
    <MessagesClient
      employeeId={employee.id}
      employeeName={`${employee.firstName} ${employee.lastName}`.trim()}
      contractorId={employee.contractorId}
      channels={channels}
      recentMessages={recentMessages.map((m: any) => ({
        id: m.id,
        channelId: m.channelId,
        content: m.content,
        senderName: m.senderName,
        senderId: m.senderId,
        createdAt: m.createdAt.toISOString(),
        isAnnouncement: m.isAnnouncement || false,
      }))}
      teamMembers={teamMembers.map((t) => ({
        id: t.id,
        name: `${t.firstName} ${t.lastName}`.trim(),
        role: t.role,
      }))}
    />
  );
}
