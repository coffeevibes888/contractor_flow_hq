'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Upload,
  FileText,
  CreditCard,
  Building,
  UserCheck,
  Award,
  ChevronRight,
} from 'lucide-react';

interface VerificationDashboardProps {
  verification: any;
  onStartVerification: (type: string) => void;
}

export function VerificationDashboard({ verification, onStartVerification }: VerificationDashboardProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-500">Verified</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending Review</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'not_started':
        return <Badge variant="outline">Not Started</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const verificationSteps = [
    {
      id: 'identity',
      title: 'Identity Verification',
      description: 'Verify your identity with a government-issued ID',
      icon: UserCheck,
      status: verification?.identityStatus || 'not_started',
      required: true,
    },
    {
      id: 'license',
      title: 'Business License',
      description: 'Upload your contractor license or certification',
      icon: FileText,
      status: verification?.licenseStatus || 'not_started',
      required: true,
    },
    {
      id: 'insurance',
      title: 'Insurance Certificate',
      description: 'Provide proof of liability insurance',
      icon: Shield,
      status: verification?.insuranceStatus || 'not_started',
      required: true,
    },
    {
      id: 'background',
      title: 'Background Check',
      description: 'Complete a background check',
      icon: UserCheck,
      status: verification?.backgroundCheckStatus || 'not_started',
      required: false,
    },
    {
      id: 'bank',
      title: 'Bank Account',
      description: 'Connect your bank account for payouts',
      icon: CreditCard,
      status: verification?.bankAccountStatus || 'not_started',
      required: true,
    },
  ];

  const completedSteps = verificationSteps.filter(
    (step) => step.status === 'verified'
  ).length;
  const totalSteps = verificationSteps.length;
  const progress = (completedSteps / totalSteps) * 100;

  const overallStatus = verification?.verificationStatus || 'unverified';

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Shield className="h-6 w-6 text-blue-600" />
                Contractor Verification
              </CardTitle>
              <CardDescription className="text-base">
                Complete verification to build trust and win more jobs
              </CardDescription>
            </div>
            {getStatusBadge(overallStatus)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Verification Progress</span>
              <span className="text-muted-foreground">
                {completedSteps} of {totalSteps} completed
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {verification?.badges && verification.badges.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {verification.badges.map((badge: string) => (
                <Badge key={badge} className="bg-blue-600">
                  <Award className="h-3 w-3 mr-1" />
                  {badge.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Benefits */}
      {overallStatus !== 'verified' && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-lg">Why Get Verified?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Increase trust and win 3x more jobs</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Get featured in search results</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Unlock premium features and higher lead limits</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Display verification badges on your profile</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Verification Steps */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Verification Steps</h3>
        {verificationSteps.map((step) => {
          const Icon = step.icon;
          const isCompleted = step.status === 'verified';
          const isPending = step.status === 'pending';
          const isRejected = step.status === 'rejected';

          return (
            <Card
              key={step.id}
              className={`transition-all ${
                isCompleted
                  ? 'border-green-200 bg-green-50/50'
                  : isPending
                  ? 'border-yellow-200 bg-yellow-50/50'
                  : isRejected
                  ? 'border-red-200 bg-red-50/50'
                  : 'hover:border-blue-200'
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div
                      className={`p-3 rounded-lg ${
                        isCompleted
                          ? 'bg-green-100'
                          : isPending
                          ? 'bg-yellow-100'
                          : isRejected
                          ? 'bg-red-100'
                          : 'bg-gray-100'
                      }`}
                    >
                      <Icon
                        className={`h-6 w-6 ${
                          isCompleted
                            ? 'text-green-600'
                            : isPending
                            ? 'text-yellow-600'
                            : isRejected
                            ? 'text-red-600'
                            : 'text-gray-600'
                        }`}
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{step.title}</h4>
                        {step.required && (
                          <Badge variant="outline" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {step.description}
                      </p>
                      {isRejected && verification?.[`${step.id}RejectionReason`] && (
                        <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-800">
                          <strong>Rejection Reason:</strong>{' '}
                          {verification[`${step.id}RejectionReason`]}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusIcon(step.status)}
                    {!isCompleted && (
                      <Button
                        onClick={() => onStartVerification(step.id)}
                        variant={isPending ? 'outline' : 'default'}
                        size="sm"
                      >
                        {isPending ? 'View Status' : isRejected ? 'Resubmit' : 'Start'}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Admin Review Notice */}
      {verification?.reviewNotes && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              Admin Review Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{verification.reviewNotes}</p>
            {verification.reviewedAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Reviewed on {new Date(verification.reviewedAt).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
