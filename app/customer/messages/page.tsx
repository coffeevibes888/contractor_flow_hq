import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { decryptField } from '@/lib/encrypt';
import { EnhancedMessageCenter } from '@/components/customer/enhanced-message-center';

export const metadata: Metadata = {
  title: 'Messages',
};

export default async function CustomerMessagesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  // Fetch all threads where user is a participant and not deleted
  const threadsRaw = await prisma.thread.findMany({
    where: {
      participants: {
        some: {
          userId: session.user.id,
          isDeleted: false,
        },
      },
    },
    include: {
      messages: {
        orderBy: {
          createdAt: 'asc',
        },
      },
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  // The prisma extension for message.content decryption does not run on
  // nested include queries. Decrypt each message here so thread previews and
  // the conversation view show readable text instead of encrypted ciphertext.
  const threads = await Promise.all(
    threadsRaw.map(async (t) => ({
      ...t,
      messages: await Promise.all(
        t.messages.map(async (m) => ({
          ...m,
          content: await decryptField(m.content),
        }))
      ),
    }))
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-blue-600">Messages</h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          Manage your conversations with folders and organization
        </p>
      </div>

      {/* Enhanced Message Center */}
      <EnhancedMessageCenter initialThreads={threads} userId={session.user.id} />
    </div>
  );
}
