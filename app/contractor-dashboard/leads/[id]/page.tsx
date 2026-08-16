import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, User, Phone, Mail, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { LeadChat } from '@/components/contractor/lead-chat';
import { getContractorIdForUser } from '@/lib/contractor-profile';

export default async function LeadDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return redirect('/sign-in');

  const contractorId = await getContractorIdForUser(session.user.id);

  if (!contractorId) return redirect('/onboarding/contractor');

  const contractor = await prisma.contractorProfile.findUnique({
    where: { id: contractorId }
  });

  if (!contractor) return redirect('/onboarding/contractor');

  // Verify match exists
  const match = await prisma.contractorLeadMatch.findFirst({
    where: {
      leadId: id,
      contractorId: contractor.id
    },
    include: {
      lead: true
    }
  });

  if (!match) return notFound();

  const lead = match.lead;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/contractor-dashboard/leads">
          <Button variant="ghost" size="icon" className="text-gray-900 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
            <h1 className="text-2xl font-bold text-gray-900">Lead Details</h1>
            <p className="text-gray-600">ID: {lead.id.slice(0, 8)}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
            <Card className="border-2 border-gray-200 bg-white shadow-sm">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-gray-900 text-xl">{lead.projectType}</CardTitle>
                            <div className="flex items-center gap-2 mt-2">
                                <Badge className="bg-violet-100 text-violet-600">
                                    {lead.urgency}
                                </Badge>
                                <span className="text-sm text-gray-400">
                                    Created {new Date(lead.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-400">Match Score</p>
                            <p className="text-2xl font-bold text-emerald-400">{match.matchScore}%</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h3 className="text-sm font-medium text-gray-600 mb-2">Description</h3>
                        <p className="text-gray-900">{lead.projectDescription}</p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <h3 className="text-sm font-medium text-gray-600 mb-2">Location</h3>
                            <div className="flex items-center gap-2 text-gray-900">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <span>{lead.propertyAddress || 'Address hidden'}</span>
                            </div>
                            <div className="pl-6 text-gray-600 text-sm">
                                {lead.propertyCity}, {lead.propertyState} {lead.propertyZip}
                            </div>
                        </div>
                        <div>
                             <h3 className="text-sm font-medium text-gray-600 mb-2">Budget</h3>
                             <p className="text-gray-900">
                                {lead.budgetMin && lead.budgetMax 
                                    ? `${formatCurrency(Number(lead.budgetMin))} - ${formatCurrency(Number(lead.budgetMax))}`
                                    : 'Not specified'}
                             </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Chat & Negotiation */}
            {lead.customerUserId ? (
                <LeadChat 
                    contractorId={contractor.id} 
                    customerId={lead.customerUserId} 
                    customerName={lead.customerName}
                    leadId={lead.id}
                />
            ) : (
                <Card className="border-2 border-gray-200 bg-white shadow-sm">
                    <CardContent className="p-6 text-center">
                        <p className="text-gray-600 mb-4">
                            This customer is a guest user. You can contact them via email.
                        </p>
                        <Button className="bg-blue-600 hover:bg-blue-700" asChild>
                            <a href={`mailto:${lead.customerEmail}`}>Email {lead.customerName}</a>
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Customer Info (Protected?) */}
            <Card className="border-2 border-gray-200 bg-white shadow-sm">
                <CardHeader>
                    <CardTitle className="text-gray-900">Customer Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid sm:grid-cols-2 gap-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                                <User className="h-5 w-5 text-gray-900" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Name</p>
                                <p className="font-medium text-gray-900">{lead.customerName}</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-gray-900">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <a href={`mailto:${lead.customerEmail}`} className="hover:underline">{lead.customerEmail}</a>
                            </div>
                            {lead.customerPhone && (
                                <div className="flex items-center gap-2 text-gray-900">
                                    <Phone className="h-4 w-4 text-gray-400" />
                                    <a href={`tel:${lead.customerPhone}`} className="hover:underline">{lead.customerPhone}</a>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
            <Card className="border-2 border-gray-200 bg-white shadow-sm">
                <CardContent className="p-6 space-y-4">
                    <div className="text-center mb-4">
                        <p className="text-sm text-gray-400">Lead Status</p>
                        <Badge className="mt-1 text-lg py-1 px-4 bg-blue-100 text-blue-600">
                            {match.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                    </div>

                    {match.status === 'new' || match.status === 'pending' || match.status === 'matching' ? (
                        <>
                            <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Accept Lead
                            </Button>
                            <Button variant="outline" className="w-full border-gray-300 text-gray-900 hover:bg-gray-100">
                                <XCircle className="h-4 w-4 mr-2" />
                                Decline
                            </Button>
                        </>
                    ) : (
                        <div className="text-center text-gray-600">
                            You have already responded to this lead.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
