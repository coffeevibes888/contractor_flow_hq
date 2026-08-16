'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  MapPin, 
  Camera, 
  FileSignature,
  AlertCircle,
  DollarSign
} from 'lucide-react';

export type Milestone = {
  id: string;
  order: number;
  title: string;
  description?: string;
  amount: number;
  percentage: number;
  status: 'pending' | 'in_progress' | 'completed' | 'released' | 'disputed';
  
  // Verification requirements
  requireGPS: boolean;
  requirePhotos: boolean;
  minPhotos: number;
  requireSignature: boolean;
  
  // Verification status
  gpsVerified: boolean;
  gpsVerifiedAt?: Date;
  photosUploaded: number;
  contractorSigned: boolean;
  contractorSignedAt?: Date;
  customerSigned: boolean;
  customerSignedAt?: Date;
  
  completedAt?: Date;
  releasedAt?: Date;
  autoReleaseAt?: Date;
};

interface MilestoneTimelineProps {
  milestones: Milestone[];
  userRole: 'customer' | 'contractor';
  onMilestoneClick?: (milestone: Milestone) => void;
  onRelease?: (milestoneId: string) => void;
}

export function MilestoneTimeline({
  milestones,
  userRole,
  onMilestoneClick,
  onRelease
}: MilestoneTimelineProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'released':
        return <CheckCircle2 className="h-6 w-6 text-emerald-500" />;
      case 'in_progress':
        return <Clock className="h-6 w-6 text-blue-500 animate-pulse" />;
      case 'disputed':
        return <AlertCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Circle className="h-6 w-6 text-gray-300" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-700';
      case 'released':
        return 'bg-green-100 text-green-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'disputed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'released':
        return 'Payment Released';
      case 'in_progress':
        return 'In Progress';
      case 'disputed':
        return 'Disputed';
      default:
        return 'Not Started';
    }
  };

  const isVerificationComplete = (milestone: Milestone) => {
    const gpsOk = !milestone.requireGPS || milestone.gpsVerified;
    const photosOk = !milestone.requirePhotos || milestone.photosUploaded >= milestone.minPhotos;
    const signaturesOk = !milestone.requireSignature || 
      (milestone.contractorSigned && milestone.customerSigned);
    
    return gpsOk && photosOk && signaturesOk;
  };

  const canRelease = (milestone: Milestone) => {
    return userRole === 'customer' && 
           milestone.status === 'completed' && 
           isVerificationComplete(milestone);
  };

  const totalAmount = milestones.reduce((sum, m) => sum + m.amount, 0);
  const releasedAmount = milestones
    .filter(m => m.status === 'released')
    .reduce((sum, m) => sum + m.amount, 0);
  const progressPercentage = (releasedAmount / totalAmount) * 100;

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card className="border-2 border-gray-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Progress</p>
              <p className="text-2xl font-bold text-gray-900">
                {progressPercentage.toFixed(0)}% Complete
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Released / Total</p>
              <p className="text-2xl font-bold text-emerald-600">
                ${releasedAmount.toLocaleString()} / ${totalAmount.toLocaleString()}
              </p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Milestone List */}
      <div className="space-y-4">
        {milestones.map((milestone, index) => (
          <Card
            key={milestone.id}
            className={`border-2 transition-all ${
              milestone.status === 'in_progress'
                ? 'border-blue-300 shadow-md'
                : milestone.status === 'released'
                ? 'border-emerald-300'
                : 'border-gray-200'
            } ${onMilestoneClick ? 'cursor-pointer hover:shadow-lg' : ''}`}
            onClick={() => onMilestoneClick?.(milestone)}
          >
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                {/* Timeline Connector */}
                <div className="flex flex-col items-center">
                  {getStatusIcon(milestone.status)}
                  {index < milestones.length - 1 && (
                    <div className={`w-0.5 h-16 mt-2 ${
                      milestone.status === 'released' ? 'bg-emerald-300' : 'bg-gray-300'
                    }`} />
                  )}
                </div>

                {/* Milestone Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {milestone.order}. {milestone.title}
                        </h3>
                        <Badge className={getStatusColor(milestone.status)}>
                          {getStatusText(milestone.status)}
                        </Badge>
                      </div>
                      {milestone.description && (
                        <p className="text-sm text-gray-600">{milestone.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">
                        ${milestone.amount.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">{milestone.percentage}%</p>
                    </div>
                  </div>

                  {/* Verification Checklist */}
                  {(milestone.status === 'in_progress' || milestone.status === 'completed') && (
                    <div className="space-y-2 mb-4">
                      {milestone.requireGPS && (
                        <div className="flex items-center gap-2 text-sm">
                          {milestone.gpsVerified ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Circle className="h-4 w-4 text-gray-400" />
                          )}
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span className={milestone.gpsVerified ? 'text-emerald-700' : 'text-gray-600'}>
                            GPS Verification
                          </span>
                          {milestone.gpsVerifiedAt && (
                            <span className="text-xs text-gray-500">
                              {new Date(milestone.gpsVerifiedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}

                      {milestone.requirePhotos && (
                        <div className="flex items-center gap-2 text-sm">
                          {milestone.photosUploaded >= milestone.minPhotos ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Circle className="h-4 w-4 text-gray-400" />
                          )}
                          <Camera className="h-4 w-4 text-gray-500" />
                          <span className={
                            milestone.photosUploaded >= milestone.minPhotos 
                              ? 'text-emerald-700' 
                              : 'text-gray-600'
                          }>
                            Photos ({milestone.photosUploaded}/{milestone.minPhotos})
                          </span>
                        </div>
                      )}

                      {milestone.requireSignature && (
                        <>
                          <div className="flex items-center gap-2 text-sm">
                            {milestone.contractorSigned ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Circle className="h-4 w-4 text-gray-400" />
                            )}
                            <FileSignature className="h-4 w-4 text-gray-500" />
                            <span className={
                              milestone.contractorSigned ? 'text-emerald-700' : 'text-gray-600'
                            }>
                              Contractor Signature
                            </span>
                            {milestone.contractorSignedAt && (
                              <span className="text-xs text-gray-500">
                                {new Date(milestone.contractorSignedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            {milestone.customerSigned ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Circle className="h-4 w-4 text-gray-400" />
                            )}
                            <FileSignature className="h-4 w-4 text-gray-500" />
                            <span className={
                              milestone.customerSigned ? 'text-emerald-700' : 'text-gray-600'
                            }>
                              Customer Approval
                            </span>
                            {milestone.customerSignedAt && (
                              <span className="text-xs text-gray-500">
                                {new Date(milestone.customerSignedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {milestone.status === 'released' && milestone.releasedAt && (
                      <div className="flex items-center gap-2 text-sm text-emerald-700">
                        <DollarSign className="h-4 w-4" />
                        <span>
                          Released on {new Date(milestone.releasedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {canRelease(milestone) && onRelease && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRelease(milestone.id);
                        }}
                        className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Release Payment
                      </Button>
                    )}

                    {milestone.autoReleaseAt && milestone.status === 'completed' && (
                      <div className="text-xs text-gray-500">
                        Auto-release: {new Date(milestone.autoReleaseAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
