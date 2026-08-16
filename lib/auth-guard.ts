import { auth } from '@/auth'
import { prisma } from '@/db/prisma'
import { redirect } from 'next/navigation'

export async function requireAdmin() {
  const session = await auth()
  const sessionRole = session?.user?.role
  const userId = session?.user?.id

  const ALLOWED = new Set(['admin', 'superAdmin', 'landlord', 'property_manager'])

  if (sessionRole && ALLOWED.has(sessionRole)) {
    return session
  }

  // Session role can lag the DB by one request after onboarding (user picks
  // "Property Manager" → DB flipped to 'landlord', but JWT still says 'user').
  // Re-read role from DB before deciding whether to redirect so we don't
  // strand legitimately converted landlords on /unauthorized.
  if (userId) {
    try {
      const fresh = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      })
      if (fresh?.role && ALLOWED.has(fresh.role)) {
        return session
      }
    } catch {
      // fall through
    }

    try {
      const membership = await prisma.teamMember.findFirst({
        where: { userId, status: 'active' },
        select: { id: true },
      })
      if (membership?.id) {
        return session
      }
    } catch {
      // TeamMember model not available in current schema — skip check
    }
  }

  // Recoverable case: default 'user' role means they haven't finished the
  // role picker. Send them there instead of /unauthorized.
  if (!sessionRole || sessionRole === 'user') {
    redirect('/onboarding')
  }

  redirect('/unauthorized')
}

export async function requireSuperAdmin() {
  const session = await auth()
  if (session?.user?.role !== 'superAdmin') {
    redirect('/unauthorized')
  }
  return session
}

export async function requireUser() {
  const session = await auth()

  if (!session?.user) {
    redirect('/sign-in')
  }

  return session
}

export async function requireContractor() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/sign-in')
  }

  // Owner path
  const profile = await prisma.contractorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, subscriptionStatus: true },
  })

  if (profile) return session

  // Employee path — contractor_employee role with an active ContractorEmployee record
  if (session.user.role === 'contractor_employee') {
    const employee = await prisma.contractorEmployee.findFirst({
      where: { userId: session.user.id, status: 'active' },
      select: { id: true },
    })
    if (employee) return session
  }

  redirect('/onboarding/contractor')
}
