'use client';

import { useEffect, useState, useCallback } from 'react';
import { Briefcase, Plus, Trash2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useJobApplicationWizard } from '../wizard-context';
import type { WorkHistoryEntry } from '../types';

interface Props {
  setValidate: (fn: (() => boolean) | null) => void;
}

const emptyJob = (): WorkHistoryEntry => ({
  id: crypto.randomUUID(),
  employer: '',
  title: '',
  startDate: '',
  endDate: '',
  current: false,
  description: '',
  supervisorName: '',
  supervisorPhone: '',
  mayContact: true,
});

export function ExperienceStep({ setValidate }: Props) {
  const { state, updateFormData } = useJobApplicationWizard();
  const [skillInput, setSkillInput] = useState('');
  const [certInput, setCertInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const workHistory = state.formData.workHistory || [];
  const skills = state.formData.skills || [];
  const certifications = state.formData.certifications || [];

  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    if (workHistory.length === 0) {
      e.workHistory = 'Please add at least one previous position (or mark as no experience below)';
    } else {
      workHistory.forEach((job, i) => {
        if (!job.employer.trim() || !job.title.trim()) {
          e[`job-${i}`] = 'Employer and title are required';
        }
      });
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [workHistory]);

  useEffect(() => {
    setValidate(validate);
    return () => setValidate(null);
  }, [setValidate, validate]);

  const addJob = () => updateFormData({ workHistory: [...workHistory, emptyJob()] });
  const removeJob = (id: string) =>
    updateFormData({ workHistory: workHistory.filter((j) => j.id !== id) });
  const updateJob = (id: string, patch: Partial<WorkHistoryEntry>) =>
    updateFormData({
      workHistory: workHistory.map((j) => (j.id === id ? { ...j, ...patch } : j)),
    });

  const addSkill = () => {
    const v = skillInput.trim();
    if (v && !skills.includes(v)) {
      updateFormData({ skills: [...skills, v] });
      setSkillInput('');
    }
  };
  const removeSkill = (s: string) =>
    updateFormData({ skills: skills.filter((x) => x !== s) });

  const addCert = () => {
    const v = certInput.trim();
    if (v && !certifications.includes(v)) {
      updateFormData({ certifications: [...certifications, v] });
      setCertInput('');
    }
  };
  const removeCert = (c: string) =>
    updateFormData({ certifications: certifications.filter((x) => x !== c) });

  const inputCls = 'bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 h-10';

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 mb-4">
          <Briefcase className="h-8 w-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Work Experience</h2>
        <p className="text-slate-300 mt-2">Share your employment history and skills</p>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-200">Total years of experience</Label>
        <Input
          type="number"
          min="0"
          value={state.formData.yearsExperience || ''}
          onChange={(e) => updateFormData({ yearsExperience: e.target.value })}
          placeholder="e.g. 5"
          className={inputCls}
        />
      </div>

      {/* Work history */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-slate-200 text-base">Work History *</Label>
          <Button
            type="button"
            size="sm"
            onClick={addJob}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Position
          </Button>
        </div>

        {workHistory.length === 0 && (
          <div className="p-6 rounded-xl border border-dashed border-slate-700 text-center">
            <p className="text-slate-400 text-sm">No positions added yet.</p>
            <Button
              type="button"
              variant="ghost"
              onClick={addJob}
              className="mt-2 text-emerald-400"
            >
              <Plus className="h-4 w-4 mr-1" /> Add your first position
            </Button>
          </div>
        )}

        {workHistory.map((job, i) => (
          <div
            key={job.id}
            className="p-4 rounded-xl bg-slate-800/30 border border-slate-700 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Position #{i + 1}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeJob(job.id)}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-200 text-xs">Employer *</Label>
                <Input
                  value={job.employer}
                  onChange={(e) => updateJob(job.id, { employer: e.target.value })}
                  className={inputCls + ' mt-1'}
                />
              </div>
              <div>
                <Label className="text-slate-200 text-xs">Job Title *</Label>
                <Input
                  value={job.title}
                  onChange={(e) => updateJob(job.id, { title: e.target.value })}
                  className={inputCls + ' mt-1'}
                />
              </div>
              <div>
                <Label className="text-slate-200 text-xs">Start Date</Label>
                <Input
                  type="month"
                  value={job.startDate}
                  onChange={(e) => updateJob(job.id, { startDate: e.target.value })}
                  className={inputCls + ' mt-1'}
                />
              </div>
              <div>
                <Label className="text-slate-200 text-xs">End Date</Label>
                <Input
                  type="month"
                  value={job.endDate}
                  onChange={(e) => updateJob(job.id, { endDate: e.target.value })}
                  disabled={job.current}
                  className={inputCls + ' mt-1'}
                />
                <label className="inline-flex items-center gap-2 mt-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={job.current}
                    onChange={(e) =>
                      updateJob(job.id, { current: e.target.checked, endDate: e.target.checked ? '' : job.endDate })
                    }
                  />
                  I currently work here
                </label>
              </div>
            </div>

            <div>
              <Label className="text-slate-200 text-xs">Responsibilities / Achievements</Label>
              <Textarea
                value={job.description}
                onChange={(e) => updateJob(job.id, { description: e.target.value })}
                rows={3}
                className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 mt-1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-200 text-xs">Supervisor Name</Label>
                <Input
                  value={job.supervisorName}
                  onChange={(e) => updateJob(job.id, { supervisorName: e.target.value })}
                  className={inputCls + ' mt-1'}
                />
              </div>
              <div>
                <Label className="text-slate-200 text-xs">Supervisor Phone</Label>
                <Input
                  value={job.supervisorPhone}
                  onChange={(e) => updateJob(job.id, { supervisorPhone: e.target.value })}
                  className={inputCls + ' mt-1'}
                />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={job.mayContact}
                onChange={(e) => updateJob(job.id, { mayContact: e.target.checked })}
              />
              Employer may contact this supervisor
            </label>

            {errors[`job-${i}`] && (
              <p className="text-sm text-red-400">{errors[`job-${i}`]}</p>
            )}
          </div>
        ))}
        {errors.workHistory && <p className="text-sm text-red-400">{errors.workHistory}</p>}
      </div>

      {/* Skills */}
      <div className="space-y-2 pt-4 border-t border-slate-700/50">
        <Label className="text-slate-200">Skills</Label>
        <div className="flex gap-2">
          <Input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSkill();
              }
            }}
            placeholder="e.g. Yardi, Negotiation, Spanish"
            className={inputCls}
          />
          <Button type="button" onClick={addSkill} className="bg-emerald-600 hover:bg-emerald-700">
            Add
          </Button>
        </div>
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {skills.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-sm text-emerald-200"
              >
                {s}
                <button type="button" onClick={() => removeSkill(s)}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Certifications */}
      <div className="space-y-2">
        <Label className="text-slate-200">Certifications / Licenses</Label>
        <div className="flex gap-2">
          <Input
            value={certInput}
            onChange={(e) => setCertInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCert();
              }
            }}
            placeholder="e.g. Real Estate License, OSHA 10, CPR"
            className={inputCls}
          />
          <Button type="button" onClick={addCert} className="bg-emerald-600 hover:bg-emerald-700">
            Add
          </Button>
        </div>
        {certifications.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {certifications.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-sm text-cyan-200"
              >
                {c}
                <button type="button" onClick={() => removeCert(c)}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
