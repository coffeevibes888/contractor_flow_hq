import { NextResponse } from 'next/server';
import { verifyApiKey, hasScope } from '@/lib/api-auth';
import { prisma } from '@/db/prisma';

/**
 * Public API endpoint - List properties
 * Requires API key authentication
 * 
 * Example usage:
 * curl https://api.propertyflowhq.com/v1/properties \
 *   -H "Authorization: Bearer pfhq_your_api_key_here"
 */
export async function GET(request: Request) {
  try {
    // Verify API key
    const authResult = await verifyApiKey(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.message },
        { status: 401 }
      );
    }

    const { landlord, apiKey } = authResult;

    // Check if API key has required scope
    if (!hasScope(apiKey!, 'properties:read') && !hasScope(apiKey!, '*')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Fetch properties for this landlord
    const properties = await prisma.property.findMany({
      where: { landlordId: landlord!.id },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        propertyType: true,
        createdAt: true,
        units: {
          select: {
            id: true,
            name: true,
            bedrooms: true,
            bathrooms: true,
            rentAmount: true,
            isAvailable: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: properties,
      meta: {
        total: properties.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
