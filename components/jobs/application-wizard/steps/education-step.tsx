'use client';

import { useEffect, useCallback } from 'react';
import { GraduationCap, Plus, Trash2, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useJobApplicationWizard } from '../wizard-context';
import type { EducationEntry, ReferenceEntry } from '../types';

interface Props {
  setValidate: (fn: (() => boolean) | null) => void;
}

const emptyEdu = (): EducationEntry => ({
  id: crypto.randomUUID(),
  institution: '',
  degree: '',
  field: '',
  graduationYear: '',
  gpa: '',
});

const emptyRef = (): ReferenceEntry => ({
  id: crypto.randomUUID(),
  name: '',
  relationship: '',
  phone: '',
  email: '',
  yearsKnown: '',
});

export function EducationStep({ setValidate }: Props) {
  const { state, updateFormData } = useJobApplicationWizard();
  const education = state.formData.education || [];
  const references = state.formData.references || [];

  const validate = useCallback(() => true, []);
  useEffect(() => {
    setValidate(validate);
    return () => setValidate(null);
  }, [setValidate, validate]);

  const inputCls = 'bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-10';

  const updateEdu = (id: string, patch: Partial<EducationEntry>) =>
    updateFormData({ education: education.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
  const updateRef = (id: string, patch: Partial<ReferenceEntry>) =>
    updateFormData({ references: references.map((r) => (r.id === id ? { ...r, ...patch } : r)) });

  return (
    <div className="space-y-8">
      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 mb-4">
          <GraduationCap className="h-8 w-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Education & References</h2>
        <p className="text-slate-300 mt-2">Both sections are optional but recommended</p>
      </div>

      {/* Education */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-slate-200 text-base flex items-center gap-2">
            <GraduationCap className="h-4 w-4" /> Education
          </Label>
          <Button
            type="button"
            size="sm"
            onClick={() => updateFormData({ education: [...education, emptyEdu()] })}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Education
          </Button>
        </div>

        {education.map((edu, i) => (
          <div
            key={edu.id}
            className="p-4 rounded-xl bg-slate-800/30 border border-slate-700 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Education #{i + 1}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  updateFormData({ education: education.filter((e) => e.id !== edu.id) })
                }
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label className="text-slate-200 text-xs">Institution</Label>
                <Input
                  value={edu.institution}
                  onChange={(e) => updateEdu(edu.id, { institution: e.target.value })}
                  placeholder="University of Texas"
                  className={inputCls + ' mt-1'}
                />
              </div>
              <div>
                <Label className="text-slate-200 text-xs">Degree</Label>
                <Input
                  value={edu.degree}
                  onChange={(e) => updateEdu(edu.id, { degree: e.target.value })}
                  placeholder="Bachelor's"
                  className={inputCls + ' mt-1'}
                />
              </div>
              <div>
                <Label className="text-slate-200 text-xs">Field of Study</Label>
                <Input
                  value={edu.field}
                  onChange={(e) => updateEdu(edu.id, { field: e.target.value })}
                  placeholder="Business"
                  className={inputCls + ' mt-1'}
                />
              </div>
              <div>
                <Label className="text-slate-200 text-xs">Graduation Year</Label>
                <Input
                  value={edu.graduationYear}
                  onChange={(e) => updateEdu(edu.id, { graduationYear: e.target.value })}
                  placeholder="2020"
                  className={inputCls + ' mt-1'}
                />
              </div>
              <div>
                <Label className="text-slate-200 text-xs">GPA (optional)</Label>
                <Input
                  value={edu.gpa}
                  onChange={(e) => updateEdu(edu.id, { gpa: e.target.value })}
                  placeholder="3.5"
                  className={inputCls + ' mt-1'}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* References */}
      <div className="space-y-4 pt-4 border-t border-slate-700/50">
        <div className="flex items-center justify-between">
          <Label className="text-slate-200 text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Professional References
          </Label>
          <Button
            type="button"
            size="sm"
            onClick={() => updateFormData({ references: [...references, emptyRef()] })}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Reference
          </Button>
        </div>

        {references.map((ref, i) => (
          <div
            key={ref.id}
            className="p-4 rounded-xl bg-slate-800/30 border border-slate-700 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Reference #{i + 1}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  updateFormData({ references: references.filter((r) => r.id !== ref.id) })
                }
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-200 text-xs">Name</Label>
                <Input
                  value={ref.name}
                  onChange={(e) => updateRef(ref.id, { name: e.target.value })}
                  className={inputCls + ' mt-1'}
                />
              </div>
              <div>
                <Label className="text-slate-200 text-xs">Relationship</Label>
                <Input
                  value={ref.relationship}
                  onChange={(e) => updateRef(ref.id, { relationship: e.target.value })}
                  placeholder="Former supervisor"
                  className={inputCls + ' mt-1'}
                />
              </div>
              <div>
                <Label className="text-slate-200 text-xs">Phone</Label>
                <Input
                  value={ref.phone}
                  onChange={(e) => updateRef(ref.id, { phone: e.target.value })}
                  className={inputCls + ' mt-1'}
                />
              </div>
              <div>
                <Label className="text-slate-200 text-xs">Email</Label>
                <Input
                  type="email"
                  value={ref.email}
                  onChange={(e) => updateRef(ref.id, { email: e.target.value })}
                  className={inputCls + ' mt-1'}
                />
              </div>
              <div>
                <Label className="text-slate-200 text-xs">Years Known</Label>
                <Input
                  value={ref.yearsKnown}
                  onChange={(e) => updateRef(ref.id, { yearsKnown: e.target.value })}
                  placeholder="3"
                  className={inputCls + ' mt-1'}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
