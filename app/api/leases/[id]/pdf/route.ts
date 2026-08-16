import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getSignedCloudinaryUrl, extractPublicIdFromUrl } from '@/lib/cloudinary';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const { id: leaseId } = await params;

    // First try to find lease as tenant (most common case for this endpoint)
    let lease = await prisma.lease.findFirst({
      where: {
        id: leaseId,
        tenantId: session.user.id,
      },
      include: {
        signatureRequests: {
          where: { status: 'signed', signedPdfUrl: { not: null } },
          orderBy: { signedAt: 'desc' },
          take: 1,
        },
      },
    });
    
    // If not found as tenant, check if user is a landlord
    if (!lease) {
      const landlord = await prisma.landlord.findFirst({
        where: { ownerUserId: session.user.id },
      });
      
      if (landlord) {
        lease = await prisma.lease.findFirst({
          where: {
            id: leaseId,
            unit: {
              property: {
                landlordId: landlord.id,
              },
            },
          },
          include: {
            signatureRequests: {
              where: { status: 'signed', signedPdfUrl: { not: null } },
              orderBy: { signedAt: 'desc' },
              take: 1,
            },
          },
        });
      }
    }

    if (!lease) {
      return NextResponse.json({ message: 'Lease not found or access denied' }, { status: 404 });
    }

    const signedRequest = lease.signatureRequests?.[0];
    if (!signedRequest?.signedPdfUrl) {
      return NextResponse.json({ message: 'No signed PDF available' }, { status: 404 });
    }

    const storedUrl = signedRequest.signedPdfUrl;
    let fetchUrl = storedUrl;
    
    // Check if URL is authenticated (needs signed URL)
    if (storedUrl.includes('/authenticated/')) {
      // Generate a fresh signed URL for authenticated resources
      const publicId = extractPublicIdFromUrl(storedUrl);
      if (!publicId) {
        console.error('Failed to extract public ID from URL:', storedUrl);
        return NextResponse.json({ message: 'Invalid PDF URL format' }, { status: 500 });
      }
      
      console.log('Extracted public ID:', publicId);
      
      fetchUrl = getSignedCloudinaryUrl({
        publicId,
        resourceType: 'raw',
        expiresInSeconds: 3600, // 1 hour
      });
      
      console.log('Generated signed URL:', fetchUrl);
    }

    // Fetch the PDF and stream it to the client.
    //
    // We attach the Cloudinary API key + secret as HTTP Basic Auth on the
    // upstream request. This is required because new Cloudinary accounts
    // have "Allow delivery of PDF and ZIP files" disabled by default, which
    // makes raw `type: 'upload'` PDFs return 401 to anonymous fetches even
    // though the URL is technically public. Authenticated server-to-server
    // fetches (with API key/secret) are unaffected by that setting.
    const cloudinaryHost = 'res.cloudinary.com';
    const isCloudinaryUrl = (() => {
      try {
        return new URL(fetchUrl).hostname === cloudinaryHost;
      } catch {
        return false;
      }
    })();
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const fetchHeaders: Record<string, string> = {};
    if (isCloudinaryUrl && apiKey && apiSecret) {
      fetchHeaders.Authorization =
        'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    }

    const pdfResponse = await fetch(fetchUrl, { headers: fetchHeaders });
    
    if (!pdfResponse.ok) {
      console.error('Failed to fetch PDF:', pdfResponse.status, pdfResponse.statusText);
      console.error('Fetch URL was:', fetchUrl);
      return NextResponse.json({ 
        message: `Failed to fetch PDF: ${pdfResponse.status}` 
      }, { status: 502 });
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="lease-${leaseId}.pdf"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error serving lease PDF:', error);
    return NextResponse.json({ message: 'Failed to serve PDF' }, { status: 500 });
  }
}
