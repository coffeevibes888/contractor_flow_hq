'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

interface Milestone {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  completedAt?: Date | null;
  order: number;
}

interface JobTimelineProps {
  milestones: Milestone[];
}

export function JobTimeline({ milestones }: JobTimelineProps) {
  if (milestones.length === 0) {
    return (
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Project Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/70 text-center py-8">No milestones added yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20">
      <CardHeader>
        <CardTitle className="text-white">Project Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {milestones.map((milestone, index) => {
            const isCompleted = milestone.status === 'completed';
            const isInProgress = milestone.status === 'in_progress';
            const isLast = index === milestones.length - 1;

            return (
              <div key={milestone.id} className="relative">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="relative flex-shrink-0">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      isCompleted 
                        ? 'bg-emerald-500/20 border-2 border-emerald-400'
                        : isInProgress
                        ? 'bg-violet-500/20 border-2 border-violet-400'
                        : 'bg-white/5 border-2 border-white/20'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                      ) : isInProgress ? (
                        <Clock className="h-5 w-5 text-violet-300" />
                      ) : (
                        <Circle className="h-5 w-5 text-white/40" />
                      )}
                    </div>
                    {/* Connecting line */}
                    {!isLast && (
                      <div className={`absolute left-5 top-10 w-0.5 h-8 ${
                        isCompleted ? 'bg-emerald-400/30' : 'bg-white/10'
                      }`} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-8">
                    <h4 className={`font-semibold ${
                      isCompleted ? 'text-emerald-300' : 'text-white'
                    }`}>
                      {milestone.title}
                    </h4>
                    {milestone.description && (
                      <p className="text-sm text-white/70 mt-1">{milestone.description}</p>
                    )}
                    {milestone.completedAt && (
                      <p className="text-xs text-white/50 mt-2">
                        Completed {new Date(milestone.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
