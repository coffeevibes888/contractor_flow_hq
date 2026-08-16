'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Download, Plus, Trash2, GripVertical, Eye, Upload } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface ResumeData {
  personalInfo: {
    name: string;
    location: string;
    email: string;
    phone: string;
    photo?: string;
    title?: string;
    linkedin?: string;
    website?: string;
  };
  summary: string;
  experience: Array<{
    id: string;
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    bullets: string[];
  }>;
  education: Array<{
    id: string;
    degree: string;
    school: string;
    location: string;
    years: string;
    details: string[];
  }>;
  skills: string[];
  certifications: string[];
}

const defaultResume: ResumeData = {
  personalInfo: {
    name: 'Gregory Young',
    title: 'Business Operations Manager',
    location: 'Denver, CO',
    email: 'coffeevibes888@gmail.com',
    phone: '(702) 582-7390',
    linkedin: 'linkedin.com/in/gregoryyoung',
    website: '',
    photo: '',
  },
  summary: 'Versatile and dynamic leader with 10+ years of diverse experience in property management, business operations, team leadership, and customer service. Proven success in supervising teams, resolving complex problems, and delivering high-quality results across real estate, tech, service, and entrepreneurial sectors.',
  experience: [
    {
      id: '1',
      title: 'Manager',
      company: 'Application Tech',
      location: 'Las Vegas, NV',
      startDate: 'Jan 2020',
      endDate: 'Present',
      current: true,
      bullets: [
        'Supervised cross-functional tech and service teams to ensure project timelines and quality standards were met',
        'Trained and evaluated team members, improving productivity and workflow consistency',
        'Implemented streamlined scheduling and ticketing system, reducing response time by 25%',
      ],
    },
    {
      id: '2',
      title: 'Property Manager / Supervisor',
      company: 'AAA Real Estate',
      location: 'Buffalo, NY',
      startDate: 'Jun 2016',
      endDate: 'Dec 2019',
      current: false,
      bullets: [
        'Managed 25+ rental units, overseeing tenant relations, maintenance coordination, and leasing processes',
        'Supervised maintenance crews and administrative staff',
        'Reduced vacancy rate by 35% through strategic marketing and customer retention',
      ],
    },
  ],
  education: [
    {
      id: '1',
      degree: 'Leadership & Business Development Program',
      school: 'Peak Potentials / Success Resources',
      location: 'California Valley, CA',
      years: '2016 - 2024',
      details: [
        'Graduate of Enlightened Warrior Training Camp (Leadership & Emotional Mastery)',
        'Train the Trainer (Public Speaking & Influence)',
        'Guerrilla Business School (Entrepreneurship, Sales, and Team Leadership)',
      ],
    },
  ],
  skills: [
    'Team Leadership & Supervision',
    'Property Management',
    'Customer Service Excellence',
    'Business Operations',
    'Conflict Resolution',
    'Sales & Upselling',
  ],
  certifications: ['Valid Driver\'s License', 'Property Management Experience'],
};

export default function ResumeBuilderClient() {
  const [resume, setResume] = useState<ResumeData>(defaultResume);
  const [template, setTemplate] = useState<'modern' | 'classic' | 'minimal'>('modern');
  const [preview, setPreview] = useState(false);
  const [sidebarColor, setSidebarColor] = useState<string>('slate'); // slate, blue, violet, emerald, rose, amber

  const addExperience = () => {
    setResume({
      ...resume,
      experience: [
        ...resume.experience,
        {
          id: Date.now().toString(),
          title: '',
          company: '',
          location: '',
          startDate: '',
          endDate: '',
          current: false,
          bullets: [''],
        },
      ],
    });
  };

  const removeExperience = (id: string) => {
    setResume({
      ...resume,
      experience: resume.experience.filter((exp) => exp.id !== id),
    });
  };

  const updateExperience = (id: string, field: string, value: any) => {
    setResume((prev) => {
      const updatedExperience = prev.experience.map((exp) =>
        exp.id === id ? { ...exp, [field]: value } : exp
      );
      // Sort: current jobs first, then by start date (most recent first)
      return {
        ...prev,
        experience: updatedExperience.sort((a, b) => {
          if (a.current && !b.current) return -1;
          if (!a.current && b.current) return 1;
          return 0;
        }),
      };
    });
  };

  const addBullet = (expId: string) => {
    setResume({
      ...resume,
      experience: resume.experience.map((exp) =>
        exp.id === expId ? { ...exp, bullets: [...exp.bullets, ''] } : exp
      ),
    });
  };

  const updateBullet = (expId: string, bulletIndex: number, value: string) => {
    setResume({
      ...resume,
      experience: resume.experience.map((exp) =>
        exp.id === expId
          ? {
              ...exp,
              bullets: exp.bullets.map((b, i) => (i === bulletIndex ? value : b)),
            }
          : exp
      ),
    });
  };

  const removeBullet = (expId: string, bulletIndex: number) => {
    setResume({
      ...resume,
      experience: resume.experience.map((exp) =>
        exp.id === expId
          ? { ...exp, bullets: exp.bullets.filter((_, i) => i !== bulletIndex) }
          : exp
      ),
    });
  };

  const downloadPDF = async () => {
    const response = await fetch('/api/super-admin/resume/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume, template, sidebarColor }),
    });

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${resume.personalInfo.name.replace(/\s+/g, '_')}_Resume.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Resume Builder</h1>
            <p className="text-slate-300">Create and customize your professional resume</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setPreview(!preview)}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Eye className="h-4 w-4 mr-2" />
              {preview ? 'Edit' : 'Preview'}
            </Button>
            <Button onClick={downloadPDF} className="bg-violet-600 hover:bg-violet-700">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        {!preview ? (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Editor */}
            <div className="space-y-6">
              {/* Personal Info */}
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Photo Upload */}
                  <div>
                    <Label className="text-slate-300">Profile Photo (Optional)</Label>
                    <div className="mt-2 flex items-center gap-4">
                      {resume.personalInfo.photo ? (
                        <div className="relative">
                          <img
                            src={resume.personalInfo.photo}
                            alt="Profile"
                            className="h-24 w-24 rounded-full object-cover border-4 border-violet-500"
                          />
                          <Button
                            onClick={() =>
                              setResume({
                                ...resume,
                                personalInfo: { ...resume.personalInfo, photo: '' },
                              })
                            }
                            size="sm"
                            variant="ghost"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 hover:bg-red-600 text-white p-0"
                          >
                            ×
                          </Button>
                        </div>
                      ) : (
                        <div className="h-24 w-24 rounded-full bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center">
                          <span className="text-white/40 text-xs">No photo</span>
                        </div>
                      )}
                      <div className="flex gap-2 flex-1">
                        <Input
                          type="url"
                          placeholder="Enter photo URL"
                          value={resume.personalInfo.photo || ''}
                          onChange={(e) =>
                            setResume({
                              ...resume,
                              personalInfo: { ...resume.personalInfo, photo: e.target.value },
                            })
                          }
                          className="bg-white/5 border-white/10 text-white"
                        />
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setResume({
                                    ...resume,
                                    personalInfo: { ...resume.personalInfo, photo: reader.result as string },
                                  });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="border-white/20 text-white hover:bg-white/10"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-slate-300">Full Name</Label>
                    <Input
                      value={resume.personalInfo.name}
                      onChange={(e) =>
                        setResume({
                          ...resume,
                          personalInfo: { ...resume.personalInfo, name: e.target.value },
                        })
                      }
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-300">Professional Title</Label>
                    <Input
                      placeholder="e.g., Business Operations Manager"
                      value={resume.personalInfo.title || ''}
                      onChange={(e) =>
                        setResume({
                          ...resume,
                          personalInfo: { ...resume.personalInfo, title: e.target.value },
                        })
                      }
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">Email</Label>
                      <Input
                        value={resume.personalInfo.email}
                        onChange={(e) =>
                          setResume({
                            ...resume,
                            personalInfo: { ...resume.personalInfo, email: e.target.value },
                          })
                        }
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Phone</Label>
                      <Input
                        value={resume.personalInfo.phone}
                        onChange={(e) =>
                          setResume({
                            ...resume,
                            personalInfo: { ...resume.personalInfo, phone: e.target.value },
                          })
                        }
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-300">Location</Label>
                    <Input
                      value={resume.personalInfo.location}
                      onChange={(e) =>
                        setResume({
                          ...resume,
                          personalInfo: { ...resume.personalInfo, location: e.target.value },
                        })
                      }
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">LinkedIn (Optional)</Label>
                      <Input
                        placeholder="linkedin.com/in/yourname"
                        value={resume.personalInfo.linkedin || ''}
                        onChange={(e) =>
                          setResume({
                            ...resume,
                            personalInfo: { ...resume.personalInfo, linkedin: e.target.value },
                          })
                        }
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Website (Optional)</Label>
                      <Input
                        placeholder="yourwebsite.com"
                        value={resume.personalInfo.website || ''}
                        onChange={(e) =>
                          setResume({
                            ...resume,
                            personalInfo: { ...resume.personalInfo, website: e.target.value },
                          })
                        }
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Summary */}
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Professional Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={resume.summary}
                    onChange={(e) => setResume({ ...resume, summary: e.target.value })}
                    rows={4}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </CardContent>
              </Card>

              {/* Experience */}
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">Experience</CardTitle>
                    <Button
                      onClick={addExperience}
                      size="sm"
                      className="bg-violet-600 hover:bg-violet-700"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {resume.experience.map((exp, index) => (
                    <div key={exp.id} className="border border-white/10 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">Position {index + 1}</span>
                        <Button
                          onClick={() => removeExperience(exp.id)}
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-slate-300 text-xs">Job Title</Label>
                          <Input
                            value={exp.title}
                            onChange={(e) => updateExperience(exp.id, 'title', e.target.value)}
                            className="bg-white/5 border-white/10 text-white text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-slate-300 text-xs">Company</Label>
                          <Input
                            value={exp.company}
                            onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                            className="bg-white/5 border-white/10 text-white text-sm"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-slate-300 text-xs">Start Date</Label>
                          <Input
                            value={exp.startDate}
                            onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                            placeholder="Jan 2020"
                            className="bg-white/5 border-white/10 text-white text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-slate-300 text-xs">End Date</Label>
                          <Input
                            value={exp.endDate}
                            onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                            placeholder="Present"
                            disabled={exp.current}
                            className="bg-white/5 border-white/10 text-white text-sm"
                          />
                        </div>
                        <div className="flex items-end">
                          <label className="flex items-center gap-2 text-slate-300 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={exp.current}
                              onChange={(e) => {
                                const isCurrent = e.target.checked;
                                setResume((prev) => {
                                  const updated = prev.experience.map((ex) =>
                                    ex.id === exp.id
                                      ? { ...ex, current: isCurrent, endDate: isCurrent ? 'Present' : ex.endDate }
                                      : ex
                                  );
                                  // Sort: current jobs first
                                  return {
                                    ...prev,
                                    experience: updated.sort((a, b) => {
                                      if (a.current && !b.current) return -1;
                                      if (!a.current && b.current) return 1;
                                      return 0;
                                    }),
                                  };
                                });
                              }}
                              className="rounded"
                            />
                            Current
                          </label>
                        </div>
                      </div>
                      <div>
                        <Label className="text-slate-300 text-xs">Location</Label>
                        <Input
                          value={exp.location}
                          onChange={(e) => updateExperience(exp.id, 'location', e.target.value)}
                          className="bg-white/5 border-white/10 text-white text-sm"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-slate-300 text-xs">Achievements</Label>
                          <Button
                            onClick={() => addBullet(exp.id)}
                            size="sm"
                            variant="ghost"
                            className="text-violet-400 hover:text-violet-300 h-6 text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                        </div>
                        {exp.bullets.map((bullet, bulletIndex) => (
                          <div key={bulletIndex} className="flex gap-2 mb-2">
                            <Textarea
                              value={bullet}
                              onChange={(e) => updateBullet(exp.id, bulletIndex, e.target.value)}
                              rows={2}
                              className="bg-white/5 border-white/10 text-white text-sm"
                            />
                            <Button
                              onClick={() => removeBullet(exp.id, bulletIndex)}
                              size="sm"
                              variant="ghost"
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Template Selection & Preview */}
            <div className="space-y-6">
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Template Style</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-slate-300 mb-3 block">Layout</Label>
                    <div className="grid grid-cols-3 gap-4">
                      {(['modern', 'classic', 'minimal'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTemplate(t)}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            template === t
                              ? 'border-violet-500 bg-violet-500/20'
                              : 'border-white/10 bg-white/5 hover:border-white/30'
                          }`}
                        >
                          <div className="text-white font-medium capitalize">{t}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-slate-300 mb-3 block">Sidebar Color</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { name: 'slate', from: 'from-slate-800', to: 'to-slate-900', accent: 'bg-slate-700' },
                        { name: 'blue', from: 'from-blue-800', to: 'to-blue-900', accent: 'bg-blue-700' },
                        { name: 'violet', from: 'from-violet-800', to: 'to-violet-900', accent: 'bg-violet-700' },
                        { name: 'emerald', from: 'from-emerald-800', to: 'to-emerald-900', accent: 'bg-emerald-700' },
                        { name: 'rose', from: 'from-rose-800', to: 'to-rose-900', accent: 'bg-rose-700' },
                        { name: 'amber', from: 'from-amber-800', to: 'to-amber-900', accent: 'bg-amber-700' },
                      ].map((color) => (
                        <button
                          key={color.name}
                          onClick={() => setSidebarColor(color.name)}
                          className={`relative p-4 rounded-lg border-2 transition-all ${
                            sidebarColor === color.name
                              ? 'border-white ring-2 ring-white/50'
                              : 'border-white/10 hover:border-white/30'
                          }`}
                        >
                          <div className={`h-12 rounded bg-gradient-to-b ${color.from} ${color.to}`}></div>
                          <div className="text-white text-xs mt-2 capitalize">{color.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Live Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-white p-8 rounded-lg shadow-2xl min-h-[600px]">
                    <ResumePreview resume={resume} template={template} sidebarColor={sidebarColor} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-8">
              <div className="bg-white p-12 rounded-lg shadow-2xl max-w-4xl mx-auto">
                <ResumePreview resume={resume} template={template} sidebarColor={sidebarColor} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ResumePreview({ resume, template, sidebarColor = 'slate' }: { resume: ResumeData; template: string; sidebarColor?: string }) {
  // Color mapping for sidebar
  const colorClasses = {
    slate: { gradient: 'from-slate-800 to-slate-900', accent: 'text-slate-300', dot: 'bg-slate-400', border: 'border-slate-600' },
    blue: { gradient: 'from-blue-800 to-blue-900', accent: 'text-blue-300', dot: 'bg-blue-400', border: 'border-blue-600' },
    violet: { gradient: 'from-violet-800 to-violet-900', accent: 'text-violet-300', dot: 'bg-violet-400', border: 'border-violet-600' },
    emerald: { gradient: 'from-emerald-800 to-emerald-900', accent: 'text-emerald-300', dot: 'bg-emerald-400', border: 'border-emerald-600' },
    rose: { gradient: 'from-rose-800 to-rose-900', accent: 'text-rose-300', dot: 'bg-rose-400', border: 'border-rose-600' },
    amber: { gradient: 'from-amber-800 to-amber-900', accent: 'text-amber-300', dot: 'bg-amber-400', border: 'border-amber-600' },
  };

  const colors = colorClasses[sidebarColor as keyof typeof colorClasses] || colorClasses.slate;

  if (template === 'modern') {
    return (
      <div className="flex min-h-[1000px]">
        {/* Sidebar - Colored Panel */}
        <div className={`w-[30%] bg-gradient-to-b ${colors.gradient} p-6 text-white`}>
          {/* Photo */}
          {resume.personalInfo.photo && (
            <div className="mb-6">
              <img
                src={resume.personalInfo.photo}
                alt={resume.personalInfo.name}
                className="w-32 h-32 rounded-full mx-auto object-cover object-top border-4 border-white/20 shadow-xl"
              />
            </div>
          )}

          {/* Contact Info */}
          <div className="mb-8">
            <h3 className={`text-sm font-bold uppercase tracking-wider ${colors.accent} mb-4 border-b ${colors.border} border-opacity-30 pb-2`}>
              Contact
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <span className={colors.accent}>📧</span>
                <span className="break-all">{resume.personalInfo.email}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className={colors.accent}>📱</span>
                <span>{resume.personalInfo.phone}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className={colors.accent}>📍</span>
                <span>{resume.personalInfo.location}</span>
              </div>
              {resume.personalInfo.linkedin && (
                <div className="flex items-start gap-2">
                  <span className={colors.accent}>💼</span>
                  <span className="break-all text-xs">{resume.personalInfo.linkedin}</span>
                </div>
              )}
              {resume.personalInfo.website && (
                <div className="flex items-start gap-2">
                  <span className={colors.accent}>🌐</span>
                  <span className="break-all text-xs">{resume.personalInfo.website}</span>
                </div>
              )}
            </div>
          </div>

          {/* Skills */}
          {resume.skills.length > 0 && (
            <div className="mb-8">
              <h3 className={`text-sm font-bold uppercase tracking-wider ${colors.accent} mb-4 border-b ${colors.border} border-opacity-30 pb-2`}>
                Skills
              </h3>
              <div className="space-y-2">
                {resume.skills.map((skill, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-2 h-2 ${colors.dot} rounded-full`}></div>
                    <span className="text-sm">{skill}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {resume.certifications.length > 0 && (
            <div>
              <h3 className={`text-sm font-bold uppercase tracking-wider ${colors.accent} mb-4 border-b ${colors.border} border-opacity-30 pb-2`}>
                Certifications
              </h3>
              <div className="space-y-2">
                {resume.certifications.map((cert, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-2 h-2 ${colors.dot} rounded-full`}></div>
                    <span className="text-sm">{cert}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 bg-white">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-5xl font-bold text-slate-900 mb-2">{resume.personalInfo.name}</h1>
            {resume.personalInfo.title && (
              <p className="text-xl text-violet-600 font-medium">{resume.personalInfo.title}</p>
            )}
          </div>

          {/* Summary */}
          {resume.summary && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-slate-900 mb-3 uppercase tracking-wide border-b-2 border-violet-600 pb-2">
                Professional Summary
              </h2>
              <p className="text-slate-700 leading-relaxed">{resume.summary}</p>
            </div>
          )}

          {/* Experience */}
          {resume.experience.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-slate-900 mb-4 uppercase tracking-wide border-b-2 border-violet-600 pb-2">
                Experience
              </h2>
              <div className="space-y-6">
                {resume.experience.map((exp) => (
                  <div key={exp.id} className="relative pl-6 border-l-2 border-violet-200">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 bg-violet-600 rounded-full"></div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">{exp.title}</h3>
                        <p className="text-violet-600 font-medium">{exp.company}</p>
                        <p className="text-sm text-slate-600">{exp.location}</p>
                      </div>
                      <span className="text-sm text-slate-600 font-medium whitespace-nowrap ml-4">
                        {exp.startDate} - {exp.endDate}
                      </span>
                    </div>
                    <ul className="space-y-2 mt-3">
                      {exp.bullets.map((bullet, i) => (
                        <li key={i} className="text-slate-700 text-sm flex items-start gap-2">
                          <span className="text-violet-600 mt-1">▸</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {resume.education.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-4 uppercase tracking-wide border-b-2 border-violet-600 pb-2">
                Education & Training
              </h2>
              <div className="space-y-4">
                {resume.education.map((edu) => (
                  <div key={edu.id} className="relative pl-6 border-l-2 border-violet-200">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 bg-violet-600 rounded-full"></div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-slate-900">{edu.degree}</h3>
                        <p className="text-violet-600">{edu.school}</p>
                        <p className="text-sm text-slate-600">{edu.location}</p>
                      </div>
                      <span className="text-sm text-slate-600 font-medium whitespace-nowrap ml-4">
                        {edu.years}
                      </span>
                    </div>
                    {edu.details.length > 0 && (
                      <ul className="space-y-1 mt-2">
                        {edu.details.map((detail, i) => (
                          <li key={i} className="text-slate-700 text-sm flex items-start gap-2">
                            <span className="text-violet-600">•</span>
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <div className="text-slate-600">Select a template to preview</div>;
}
