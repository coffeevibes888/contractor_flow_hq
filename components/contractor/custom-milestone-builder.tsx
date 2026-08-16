'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  MapPin, 
  Camera, 
  FileSignature,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

export type CustomMilestone = {
  id: string;
  title: string;
  description: string;
  percentage: number;
  requireGPS: boolean;
  requirePhotos: boolean;
  minPhotos: number;
  requireSignature: boolean;
};

interface CustomMilestoneBuilderProps {
  jobAmount: number;
  onSave: (milestones: CustomMilestone[]) => void;
  onCancel: () => void;
}

export function CustomMilestoneBuilder({
  jobAmount,
  onSave,
  onCancel
}: CustomMilestoneBuilderProps) {
  const [milestones, setMilestones] = useState<CustomMilestone[]>([
    {
      id: '1',
      title: 'Job Started',
      description: '',
      percentage: 50,
      requireGPS: false,
      requirePhotos: false,
      minPhotos: 0,
      requireSignature: true
    },
    {
      id: '2',
      title: 'Job Completed',
      description: '',
      percentage: 50,
      requireGPS: true,
      requirePhotos: true,
      minPhotos: 3,
      requireSignature: true
    }
  ]);

  const totalPercentage = milestones.reduce((sum, m) => sum + m.percentage, 0);
  const isValid = totalPercentage === 100 && milestones.length > 0 && milestones.every(m => m.title.trim());

  const addMilestone = () => {
    if (milestones.length >= 10) return;
    
    const newMilestone: CustomMilestone = {
      id: Date.now().toString(),
      title: '',
      description: '',
      percentage: 0,
      requireGPS: false,
      requirePhotos: false,
      minPhotos: 0,
      requireSignature: false
    };
    
    setMilestones([...milestones, newMilestone]);
  };

  const removeMilestone = (id: string) => {
    if (milestones.length <= 1) return;
    setMilestones(milestones.filter(m => m.id !== id));
  };

  const updateMilestone = (id: string, updates: Partial<CustomMilestone>) => {
    setMilestones(milestones.map(m => 
      m.id === id ? { ...m, ...updates } : m
    ));
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(milestones);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setMilestones(items);
  };

  const distributeEvenly = () => {
    const percentage = Math.floor(100 / milestones.length);
    const remainder = 100 - (percentage * milestones.length);
    
    setMilestones(milestones.map((m, index) => ({
      ...m,
      percentage: index === milestones.length - 1 ? percentage + remainder : percentage
    })));
  };

  const handleSave = () => {
    if (isValid) {
      onSave(milestones);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Build Custom Milestone Structure
        </h2>
        <p className="text-gray-600">
          Create your own payment schedule with custom milestones and verification requirements
        </p>
      </div>

      {/* Job Amount & Progress */}
      <Card className={`border-2 ${
        totalPercentage === 100 
          ? 'border-emerald-300 bg-emerald-50' 
          : totalPercentage > 100
          ? 'border-red-300 bg-red-50'
          : 'border-amber-300 bg-amber-50'
      }`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Job Amount</p>
              <p className="text-3xl font-bold text-gray-900">
                ${jobAmount.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Total Percentage</p>
              <div className="flex items-center gap-2">
                <p className={`text-3xl font-bold ${
                  totalPercentage === 100 
                    ? 'text-emerald-600' 
                    : totalPercentage > 100
                    ? 'text-red-600'
                    : 'text-amber-600'
                }`}>
                  {totalPercentage}%
                </p>
                {totalPercentage === 100 ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                )}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                totalPercentage === 100
                  ? 'bg-gradient-to-r from-emerald-500 to-green-500'
                  : totalPercentage > 100
                  ? 'bg-gradient-to-r from-red-500 to-red-600'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500'
              }`}
              style={{ width: `${Math.min(totalPercentage, 100)}%` }}
            />
          </div>

          {totalPercentage !== 100 && (
            <p className="text-sm text-gray-600 mt-2">
              {totalPercentage < 100 
                ? `${100 - totalPercentage}% remaining to allocate`
                : `${totalPercentage - 100}% over 100% - please adjust`
              }
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={distributeEvenly}
          className="border-2 border-gray-300"
        >
          Distribute Evenly
        </Button>
        <Button
          variant="outline"
          onClick={addMilestone}
          disabled={milestones.length >= 10}
          className="border-2 border-gray-300"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Milestone
        </Button>
        <div className="flex-1" />
        <Badge variant="outline" className="px-3 py-1">
          {milestones.length} / 10 Milestones
        </Badge>
      </div>

      {/* Milestones List */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="milestones">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-4"
            >
              {milestones.map((milestone, index) => (
                <Draggable key={milestone.id} draggableId={milestone.id} index={index}>
                  {(provided, snapshot) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`border-2 transition-all ${
                        snapshot.isDragging
                          ? 'border-blue-400 shadow-lg'
                          : 'border-gray-200'
                      }`}
                    >
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                          <div
                            {...provided.dragHandleProps}
                            className="cursor-grab active:cursor-grabbing"
                          >
                            <GripVertical className="h-5 w-5 text-gray-400" />
                          </div>
                          <Badge variant="outline" className="font-mono">
                            #{index + 1}
                          </Badge>
                          <CardTitle className="text-lg flex-1">
                            Milestone {index + 1}
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMilestone(milestone.id)}
                            disabled={milestones.length <= 1}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Title & Percentage */}
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="md:col-span-2">
                            <Label htmlFor={`title-${milestone.id}`}>
                              Title <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id={`title-${milestone.id}`}
                              value={milestone.title}
                              onChange={(e) => updateMilestone(milestone.id, { 
                                title: e.target.value 
                              })}
                              placeholder="e.g., Job Started, 50% Complete"
                              maxLength={100}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`percentage-${milestone.id}`}>
                              Percentage <span className="text-red-500">*</span>
                            </Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Input
                                id={`percentage-${milestone.id}`}
                                type="number"
                                min={0}
                                max={100}
                                value={milestone.percentage}
                                onChange={(e) => updateMilestone(milestone.id, { 
                                  percentage: parseInt(e.target.value) || 0 
                                })}
                                className="text-right"
                              />
                              <span className="text-gray-600">%</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              ${((jobAmount * milestone.percentage) / 100).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <Label htmlFor={`description-${milestone.id}`}>
                            Description (Optional)
                          </Label>
                          <Textarea
                            id={`description-${milestone.id}`}
                            value={milestone.description}
                            onChange={(e) => updateMilestone(milestone.id, { 
                              description: e.target.value 
                            })}
                            placeholder="Describe what needs to be completed for this milestone..."
                            maxLength={500}
                            rows={2}
                            className="mt-1"
                          />
                        </div>

                        {/* Verification Requirements */}
                        <div className="border-t pt-4">
                          <p className="text-sm font-medium text-gray-700 mb-3">
                            Verification Requirements
                          </p>
                          <div className="space-y-3">
                            {/* GPS */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-gray-500" />
                                <Label htmlFor={`gps-${milestone.id}`} className="cursor-pointer">
                                  Require GPS Verification
                                </Label>
                              </div>
                              <Switch
                                id={`gps-${milestone.id}`}
                                checked={milestone.requireGPS}
                                onCheckedChange={(checked) => 
                                  updateMilestone(milestone.id, { requireGPS: checked })
                                }
                              />
                            </div>

                            {/* Photos */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Camera className="h-4 w-4 text-gray-500" />
                                <Label htmlFor={`photos-${milestone.id}`} className="cursor-pointer">
                                  Require Photos
                                </Label>
                              </div>
                              <Switch
                                id={`photos-${milestone.id}`}
                                checked={milestone.requirePhotos}
                                onCheckedChange={(checked) => 
                                  updateMilestone(milestone.id, { 
                                    requirePhotos: checked,
                                    minPhotos: checked ? 3 : 0
                                  })
                                }
                              />
                            </div>

                            {milestone.requirePhotos && (
                              <div className="ml-6 flex items-center gap-2">
                                <Label htmlFor={`minPhotos-${milestone.id}`} className="text-sm">
                                  Minimum Photos:
                                </Label>
                                <Input
                                  id={`minPhotos-${milestone.id}`}
                                  type="number"
                                  min={1}
                                  max={20}
                                  value={milestone.minPhotos}
                                  onChange={(e) => updateMilestone(milestone.id, { 
                                    minPhotos: parseInt(e.target.value) || 1 
                                  })}
                                  className="w-20"
                                />
                              </div>
                            )}

                            {/* Signature */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FileSignature className="h-4 w-4 text-gray-500" />
                                <Label htmlFor={`signature-${milestone.id}`} className="cursor-pointer">
                                  Require Digital Signature
                                </Label>
                              </div>
                              <Switch
                                id={`signature-${milestone.id}`}
                                checked={milestone.requireSignature}
                                onCheckedChange={(checked) => 
                                  updateMilestone(milestone.id, { requireSignature: checked })
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Validation Messages */}
      {!isValid && (
        <Card className="border-2 border-amber-300 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-amber-900">Please fix the following:</p>
                <ul className="text-sm text-amber-800 list-disc list-inside space-y-1">
                  {totalPercentage !== 100 && (
                    <li>Total percentage must equal 100% (currently {totalPercentage}%)</li>
                  )}
                  {milestones.some(m => !m.title.trim()) && (
                    <li>All milestones must have a title</li>
                  )}
                  {milestones.length === 0 && (
                    <li>At least one milestone is required</li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          className="border-2 border-gray-300"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!isValid}
          className="bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white"
        >
          Save Custom Structure
        </Button>
      </div>
    </div>
  );
}
