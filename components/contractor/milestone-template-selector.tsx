'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, TrendingUp, Target, Wrench } from 'lucide-react';

export type MilestoneTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  milestones: {
    title: string;
    percentage: number;
    requireGPS?: boolean;
    requirePhotos?: boolean;
    minPhotos?: number;
    requireSignature?: boolean;
  }[];
};

const BUILT_IN_TEMPLATES: MilestoneTemplate[] = [
  {
    id: '50-50',
    name: '50/50 Split',
    description: 'Simple two-payment structure - half upfront, half on completion',
    category: 'standard',
    milestones: [
      { title: 'Job Started', percentage: 50, requireSignature: true },
      { 
        title: 'Job Completed', 
        percentage: 50, 
        requireGPS: true,
        requirePhotos: true,
        minPhotos: 3,
        requireSignature: true 
      }
    ]
  },
  {
    id: '20-30-50',
    name: 'Progressive Payment',
    description: 'Three milestones tracking start, midpoint, and completion',
    category: 'progressive',
    milestones: [
      { title: 'Job Started', percentage: 20, requireSignature: true },
      { 
        title: '50% Complete', 
        percentage: 30,
        requirePhotos: true,
        minPhotos: 2,
        requireSignature: true 
      },
      { 
        title: 'Job Completed', 
        percentage: 50,
        requireGPS: true,
        requirePhotos: true,
        minPhotos: 5,
        requireSignature: true 
      }
    ]
  },
  {
    id: '10-20-30-20-20',
    name: 'Detailed Tracking',
    description: 'Five milestones for comprehensive progress monitoring',
    category: 'detailed',
    milestones: [
      { title: 'Materials Purchased', percentage: 10, requireSignature: true },
      { title: 'Prep Work Complete', percentage: 20, requirePhotos: true, minPhotos: 2 },
      { title: '50% Complete', percentage: 30, requirePhotos: true, minPhotos: 3 },
      { title: '80% Complete', percentage: 20, requirePhotos: true, minPhotos: 3 },
      { 
        title: 'Final Completion', 
        percentage: 20,
        requireGPS: true,
        requirePhotos: true,
        minPhotos: 5,
        requireSignature: true 
      }
    ]
  },
  {
    id: '25-25-25-25',
    name: 'Quarterly Split',
    description: 'Four equal payments for balanced cash flow',
    category: 'standard',
    milestones: [
      { title: 'Phase 1 Complete', percentage: 25, requirePhotos: true, minPhotos: 2 },
      { title: 'Phase 2 Complete', percentage: 25, requirePhotos: true, minPhotos: 2 },
      { title: 'Phase 3 Complete', percentage: 25, requirePhotos: true, minPhotos: 2 },
      { 
        title: 'Final Phase Complete', 
        percentage: 25,
        requireGPS: true,
        requirePhotos: true,
        minPhotos: 3,
        requireSignature: true 
      }
    ]
  }
];

interface MilestoneTemplateSelectorProps {
  jobAmount: number;
  onSelect: (template: MilestoneTemplate) => void;
  onCustom: () => void;
}

export function MilestoneTemplateSelector({
  jobAmount,
  onSelect,
  onCustom
}: MilestoneTemplateSelectorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'standard':
        return <Zap className="h-5 w-5" />;
      case 'progressive':
        return <TrendingUp className="h-5 w-5" />;
      case 'detailed':
        return <Target className="h-5 w-5" />;
      default:
        return <Wrench className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'standard':
        return 'bg-blue-100 text-blue-700';
      case 'progressive':
        return 'bg-emerald-100 text-emerald-700';
      case 'detailed':
        return 'bg-violet-100 text-violet-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleSelect = (template: MilestoneTemplate) => {
    setSelectedId(template.id);
    onSelect(template);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Choose Payment Structure
        </h2>
        <p className="text-gray-600">
          Select a milestone template or create a custom payment schedule
        </p>
      </div>

      {/* Job Amount Display */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Job Amount</p>
              <p className="text-3xl font-bold text-gray-900">
                ${jobAmount.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Platform Fee (10%)</p>
              <p className="text-xl font-semibold text-gray-700">
                ${(jobAmount * 0.1).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {BUILT_IN_TEMPLATES.map((template) => (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedId === template.id
                ? 'border-2 border-blue-500 shadow-md'
                : 'border-2 border-gray-200'
            }`}
            onClick={() => handleSelect(template)}
          >
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${getCategoryColor(template.category)}`}>
                    {getCategoryIcon(template.category)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge variant="outline" className="mt-1">
                      {template.milestones.length} Milestones
                    </Badge>
                  </div>
                </div>
                {selectedId === template.id && (
                  <div className="p-1 rounded-full bg-blue-500">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {template.milestones.map((milestone, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {milestone.title}
                      </p>
                      <div className="flex gap-2 mt-1">
                        {milestone.requireGPS && (
                          <Badge variant="outline" className="text-xs">
                            GPS
                          </Badge>
                        )}
                        {milestone.requirePhotos && (
                          <Badge variant="outline" className="text-xs">
                            {milestone.minPhotos}+ Photos
                          </Badge>
                        )}
                        {milestone.requireSignature && (
                          <Badge variant="outline" className="text-xs">
                            Signature
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {milestone.percentage}%
                      </p>
                      <p className="text-xs text-gray-600">
                        ${((jobAmount * milestone.percentage) / 100).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Custom Template Option */}
        <Card
          className="cursor-pointer transition-all hover:shadow-lg border-2 border-dashed border-gray-300 hover:border-blue-400"
          onClick={onCustom}
        >
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                <Wrench className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg">Custom Structure</CardTitle>
            </div>
            <CardDescription>
              Build your own milestone payment schedule with custom amounts and requirements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <Button variant="outline" className="border-2 border-gray-300">
                Create Custom Milestones
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Continue Button */}
      {selectedId && (
        <div className="flex justify-end">
          <Button
            size="lg"
            className="bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white"
          >
            Continue with {BUILT_IN_TEMPLATES.find(t => t.id === selectedId)?.name}
          </Button>
        </div>
      )}
    </div>
  );
}
