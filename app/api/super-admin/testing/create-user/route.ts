import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import bcrypt from 'bcryptjs';

const DEFAULT_PASSWORD = 'Test123!';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'superAdmin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { role } = await req.json();

    if (!role) {
      return NextResponse.json({ success: false, message: 'Role is required' }, { status: 400 });
    }

    const suffix = Date.now().toString(36);
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const roleConfig: Record<string, { prefix: string; email: string }> = {
      tenant: { prefix: 'Test Tenant', email: 'tenant' },
      landlord: { prefix: 'Test Landlord', email: 'landlord' },
      admin: { prefix: 'Test Admin', email: 'admin' },
      contractor: { prefix: 'Test Contractor', email: 'contractor' },
      agent: { prefix: 'Test Agent', email: 'agent' },
      homeowner: { prefix: 'Test Homeowner', email: 'homeowner' },
      superAdmin: { prefix: 'Test Super Admin', email: 'superadmin' },
      employee: { prefix: 'Test Employee', email: 'employee' },
    };

    const config = roleConfig[role] || { prefix: 'Test User', email: 'user' };
    const name = `${config.prefix} ${suffix}`;
    const email = `${config.email}-${suffix}@test.com`;

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        emailVerified: new Date(),
        // Enable 2FA by default for landlords
        twoFactorEnabled: role === 'landlord' || role === 'admin',
      },
    });

    // Create role-specific records
    if (role === 'landlord' || role === 'admin') {
      await prisma.landlord.create({
        data: {
          ownerUserId: user.id,
          name: `${name}'s Properties`,
          subdomain: `test-${suffix}`,
        },
      });
    }

    if (role === 'contractor') {
      // Find a landlord to associate the contractor with
      const landlord = await prisma.landlord.findFirst();
      if (landlord) {
        await prisma.contractor.create({
          data: {
            landlordId: landlord.id,
            userId: user.id,
            name: `${name} Services`,
            email: email,
            phone: '555-0100',
            specialties: ['plumbing', 'electrical', 'hvac'],
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `${config.prefix} created successfully`,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      password: DEFAULT_PASSWORD,
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ success: false, message: 'Failed to create user' }, { status: 500 });
  }
}
