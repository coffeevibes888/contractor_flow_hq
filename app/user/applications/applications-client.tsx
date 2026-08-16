'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileCheck, Upload, CheckCircle2, Clock, AlertCircle, ArrowRight, Home, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { VerificationWizard } from '@/components/tenant/verification-wizard';

interface Application {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: string;
  propertySlug: string | null;
  createdAt: string;
  unit: {
    name: string;
    property: {
      name: string;
      address: any;
    } | null;
  } | null;
  verification: {
    identityStatus: string;
    employmentStatus: string;
    overallStatus: string;
  } | null;
}

interface ApplicationsClientProps {
  applications: Application[];
}

export function ApplicationsClient({ applications }: ApplicationsClientProps) {
  const router = useRouter();
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [justCompletedVerification, setJustCompletedVerification] = useState(false);

  // Handle verification completion - refresh data from server
  const handleVerificationComplete = () => {
    setSelectedAppId(null);
    setJustCompletedVerification(true);
    // Refresh the page data from the server to get updated verification status
    router.refresh();
  };

  // Check if any application has documents uploaded (even if not verified yet)
  const hasUploadedDocuments = (app: Application) => {
    if (!app.verification) return false;
    // If identity or employment status is not 'pending', documents have been uploaded
    // Also check for 'uploaded' status which is the new intermediate state
    return app.verification.identityStatus !== 'pending' || 
           app.verification.employmentStatus !== 'pending' ||
           app.verification.overallStatus === 'documents_submitted' ||
           app.verification.overallStatus === 'in_progress' ||
           app.verification.overallStatus === 'complete';
  };

  // Find application that needs verification (no documents uploaded yet)
  const pendingVerificationApp = applications.find(
    app => app.verification && 
    app.verification.identityStatus === 'pending' && 
    app.verification.employmentStatus === 'pending' &&
    app.verification.overallStatus !== 'complete' &&
    app.verification.overallStatus !== 'documents_submitted' &&
    app.verification.overallStatus !== 'in_progress'
  );

  // Find applications with documents submitted but awaiting review
  const awaitingReviewApps = applications.filter(
    app => app.verification && 
    (app.verification.identityStatus !== 'pending' || app.verification.employmentStatus !== 'pending') &&
    app.verification.overallStatus !== 'complete' &&
    app.status === 'pending'
  );

  // If showing verification wizard
  if (selectedAppId) {
    return (
      <div className="w-full">
        <Button 
          variant="ghost" 
          onClick={() => setSelectedAppId(null)}
          className="mb-4"
        >
          ← Back to Applications
        </Button>
        <VerificationWizard
          applicationId={selectedAppId}
          onComplete={handleVerificationComplete}
        />
      </div>
    );
  }

  // Show success state after completing verification
  if (justCompletedVerification) {
    return (
      <main className="w-full px-4 py-8 md:px-0">
        <div className="max-w-2xl mx-auto">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-8">
              <div className="text-center space-y-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 mb-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Documents Submitted Successfully!
                  </h2>
                  <p className="text-slate-400">
                    Your verification documents have been uploaded and are now being reviewed by the landlord.
                  </p>
                </div>

                <div className="bg-slate-800/60 rounded-lg p-4 text-left space-y-2">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    What happens next?
                  </h3>
                  <ul className="text-sm text-slate-400 space-y-1">
                    <li>• The landlord will review your documents within 1-2 business days</li>
                    <li>• You'll receive a notification when your application is approved</li>
                    <li>• Once approved, you can sign your lease digitally</li>
                  </ul>
                </div>

                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4 text-left">
                  <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-400" />
                    While you wait...
                  </h3>
                  <p className="text-sm text-slate-400 mb-3">
                    Complete your tenant profile to speed up the move-in process once you're approved!
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Link href="/user/profile" className="flex-1">
                      <Button variant="outline" className="w-full border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10">
                        <User className="w-4 h-4 mr-2" />
                        Complete Profile
                      </Button>
                    </Link>
                    <Link href="/" className="flex-1">
                      <Button variant="outline" className="w-full border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10">
                        <Home className="w-4 h-4 mr-2" />
                        Browse More Properties
                      </Button>
                    </Link>
                  </div>
                </div>

                <Button 
                  onClick={() => {
                    setJustCompletedVerification(false);
                    router.refresh();
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  View My Applications
                </Button>
              </div>
          </div>
        </div>
      </main>
    );
  }

  const getVerificationProgress = (verification?: Application['verification']) => {
    if (!verification) return 0;
    let progress = 0;
    
    // Check if documents are uploaded (status is not 'pending')
    const idUploaded = verification.identityStatus !== 'pending';
    const incomeUploaded = verification.employmentStatus !== 'pending';
    const idVerified = verification.identityStatus === 'verified';
    const incomeVerified = verification.employmentStatus === 'verified';
    
    // Progress: ID uploaded = 25%, ID verified = 50%, Income uploaded = 75%, Income verified = 100%
    if (idUploaded) progress += 25;
    if (idVerified) progress += 25;
    if (incomeUploaded) progress += 25;
    if (incomeVerified) progress += 25;
    
    // If documents_submitted, show at least 75%
    if (verification.overallStatus === 'documents_submitted' && progress < 75) {
      progress = 75;
    }
    
    // If complete, show 100%
    if (verification.overallStatus === 'complete') {
      progress = 100;
    }
    
    return progress;
  };

  return (
    <main className="w-full px-4 py-8 md:px-0">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-1">My Rental Applications</h1>
          <p className="text-sm text-slate-600">
            Track the status of your applications and complete verification.
          </p>
        </div>

        {/* Pending Verification Alert - Only show if NO documents uploaded yet */}
        {pendingVerificationApp && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-amber-500/20">
                  <AlertCircle className="h-6 w-6 text-amber-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">Action Required: Complete Verification</h3>
                  <p className="text-sm text-slate-400 mb-4">
                    Your application for {pendingVerificationApp.unit?.property?.name || pendingVerificationApp.propertySlug || 'a property'} requires identity and income verification before it can be reviewed.
                  </p>
                  <Button 
                    onClick={() => setSelectedAppId(pendingVerificationApp.id)}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    Complete Verification
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
          </div>
        )}

        {/* Awaiting Review Banner - Show when documents are uploaded but not yet verified */}
        {awaitingReviewApps.length > 0 && !pendingVerificationApp && (
          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-indigo-500/20">
                  <Clock className="h-6 w-6 text-indigo-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">Documents Under Review</h3>
                  <p className="text-sm text-slate-400 mb-3">
                    Your verification documents have been submitted and are being reviewed by the landlord. 
                    You'll be notified once your application is approved.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/user/profile">
                      <Button variant="outline" size="sm" className="border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10">
                        <User className="w-4 h-4 mr-2" />
                        Complete Your Profile
                      </Button>
                    </Link>
                    <Link href="/">
                      <Button variant="outline" size="sm" className="border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10">
                        <Home className="w-4 h-4 mr-2" />
                        Browse Properties
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
          </div>
        )}

        {/* Applications List */}
        {applications.length === 0 ? (
          <div className="bg-linear-to-r from-cyan-700 to-cyan-700 border border-white/10 rounded-xl py-12 text-center">
              <FileCheck className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Applications Yet</h3>
              <p className="text-sm text-slate-400 mb-4">
                You haven't submitted any rental applications.
              </p>
              <Link href="/">
                <Button className="bg-indigo-600 hover:bg-indigo-700">Browse Properties</Button>
              </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => {
              const progress = getVerificationProgress(app.verification);
              const documentsUploaded = hasUploadedDocuments(app);
              const needsVerification = app.verification && 
                app.verification.identityStatus === 'pending' && 
                app.verification.employmentStatus === 'pending' &&
                !documentsUploaded;
              const awaitingReview = documentsUploaded && 
                app.verification?.overallStatus !== 'complete' &&
                app.status === 'pending';
              
              return (
                <div key={app.id} className={`bg-linear-to-r from-cyan-700 to-cyan-700 border rounded-xl overflow-hidden ${needsVerification ? 'border-amber-500/30' : awaitingReview ? 'border-indigo-500/30' : 'border-white/10'}`}>
                  <div className="p-5 pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-white">
                          {app.unit?.property?.name || app.propertySlug || 'Property Application'}
                        </h3>
                        <p className="text-sm text-slate-400 mt-0.5">
                          {app.unit?.property?.address && typeof app.unit.property.address === 'object' && (
                            <span>
                              {(app.unit.property.address as any).street}, {(app.unit.property.address as any).city}, {(app.unit.property.address as any).state}
                            </span>
                          )}
                          {!app.unit?.property?.address && app.propertySlug && (
                            <span>Property: {app.propertySlug}</span>
                          )}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        app.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300' :
                        app.status === 'rejected' ? 'bg-red-500/20 text-red-300' :
                        awaitingReview ? 'bg-indigo-500/20 text-indigo-300' :
                        app.status === 'pending' ? 'bg-amber-500/20 text-amber-300' :
                        'bg-slate-500/20 text-slate-300'
                      }`}>
                        {app.status === 'approved' ? 'Approved' :
                         app.status === 'rejected' ? 'Rejected' :
                         awaitingReview ? 'Under Review' :
                         app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div className="px-5 pb-5">
                    <div className="space-y-4">
                      {/* Verification Progress */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-300">Verification Progress</span>
                          <span className="text-sm text-slate-500">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      {/* Verification Steps */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className={`p-3 rounded-lg border ${
                          app.verification?.identityStatus === 'verified' 
                            ? 'bg-emerald-500/10 border-emerald-500/30' 
                            : app.verification?.identityStatus === 'rejected'
                            ? 'bg-red-500/10 border-red-500/30'
                            : app.verification?.identityStatus !== 'pending'
                            ? 'bg-indigo-500/10 border-indigo-500/30'
                            : 'bg-linear-to-r from-cyan-400 via-sky-200 to-cyan-500 border-white/20'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            {app.verification?.identityStatus === 'verified' ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : app.verification?.identityStatus === 'rejected' ? (
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            ) : app.verification?.identityStatus !== 'pending' ? (
                              <Clock className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Clock className="h-4 w-4 text-amber-600" />
                            )}
                            <span className="text-sm font-medium text-slate-200">ID Verification</span>
                          </div>
                          <p className="text-xs text-slate-500">
                            {app.verification?.identityStatus === 'verified' 
                              ? 'Identity verified' 
                              : app.verification?.identityStatus === 'rejected'
                              ? 'Verification failed'
                              : app.verification?.identityStatus !== 'pending'
                              ? 'Uploaded - Under review'
                              : 'Upload government ID'}
                          </p>
                        </div>

                        <div className={`p-3 rounded-lg border ${
                          app.verification?.employmentStatus === 'verified' 
                            ? 'bg-emerald-500/10 border-emerald-500/30' 
                            : app.verification?.employmentStatus === 'rejected'
                            ? 'bg-red-500/10 border-red-500/30'
                            : app.verification?.employmentStatus !== 'pending'
                            ? 'bg-indigo-500/10 border-indigo-500/30'
                            : 'bg-linear-to-r from-cyan-400 via-sky-200 to-cyan-500 border-white/20'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            {app.verification?.employmentStatus === 'verified' ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : app.verification?.employmentStatus === 'rejected' ? (
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            ) : app.verification?.employmentStatus !== 'pending' ? (
                              <Clock className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Clock className="h-4 w-4 text-amber-600" />
                            )}
                            <span className="text-sm font-medium text-slate-200">Income Verification</span>
                          </div>
                          <p className="text-xs text-slate-500">
                            {app.verification?.employmentStatus === 'verified' 
                              ? 'Income verified' 
                              : app.verification?.employmentStatus === 'rejected'
                              ? 'Verification failed'
                              : app.verification?.employmentStatus !== 'pending'
                              ? 'Uploaded - Under review'
                              : 'Upload pay stubs or tax docs'}
                          </p>
                        </div>
                      </div>

                      {/* Action Button - Only show if no documents uploaded */}
                      {needsVerification && (
                        <Button 
                          onClick={() => setSelectedAppId(app.id)}
                          className="w-full"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Verification Documents
                        </Button>
                      )}

                      {/* Awaiting Review Message */}
                      {awaitingReview && (
                        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3 text-center">
                          <p className="text-sm text-indigo-300">
                            <Clock className="inline w-4 h-4 mr-1" />
                            Documents submitted - Awaiting landlord review
                          </p>
                        </div>
                      )}

                      {/* Submitted Date */}
                      <p className="text-xs text-slate-400">
                        Submitted on {new Date(app.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
