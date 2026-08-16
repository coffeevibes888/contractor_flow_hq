'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { roleOnboardingAction } from '@/lib/actions/onboarding.actions';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { HousePlus, ArrowLeft, ArrowRight, Wrench, PaintBucket, Zap, Droplets, Trees, Hammer } from 'lucide-react';

function SubmitButton({ text = 'Continue' }: { text?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      className="flex-1 bg-sky-600 hover:bg-sky-700 text-lg font-semibold py-6"
      disabled={pending}
    >
      {pending ? 'Saving...' : text}
    </Button>
  );
}

const serviceCategories = [
  { id: 'plumbing', label: 'Plumbing', icon: Droplets },
  { id: 'electrical', label: 'Electrical', icon: Zap },
  { id: 'hvac', label: 'HVAC', icon: Wrench },
  { id: 'painting', label: 'Painting', icon: PaintBucket },
  { id: 'landscaping', label: 'Landscaping', icon: Trees },
  { id: 'general', label: 'General Repairs', icon: Hammer },
];

export default function HomeownerOnboardingClient() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    homeType: '',
    interestedServices: [] as string[],
    projectTimeline: '',
  });

  const [state, action] = useActionState(roleOnboardingAction, {
    success: false,
    message: '',
    role: null as 'homeowner' | null,
  });

  const totalSteps = 3;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.push('/onboarding');
    }
  };

  const toggleService = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      interestedServices: prev.interestedServices.includes(serviceId)
        ? prev.interestedServices.filter(s => s !== serviceId)
        : [...prev.interestedServices, serviceId]
    }));
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-sky-900/20 to-slate-950 text-white flex items-center justify-center px-4 py-10">
      <div className="max-w-2xl w-full space-y-8">
        {/* Progress indicator */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i + 1 <= step ? 'w-12 bg-sky-500' : 'w-8 bg-slate-700'
                }`}
              />
            ))}
          </div>
          <p className="text-center text-xs text-slate-400">
            Step {step} of {totalSteps}
          </p>
        </div>

        <form action={action} className="space-y-8">
          <input type="hidden" name="role" value="homeowner" />
          <input type="hidden" name="homeType" value={formData.homeType} />
          <input type="hidden" name="interestedServices" value={formData.interestedServices.join(',')} />
          <input type="hidden" name="projectTimeline" value={formData.projectTimeline} />

          {/* Step 1: Home type */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8 text-center"
            >
              <div className="space-y-4">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-400 mx-auto">
                  <HousePlus className="h-8 w-8" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  What type of home do you have?
                </h1>
                <p className="text-lg text-slate-400 max-w-xl mx-auto">
                  This helps us connect you with the right contractors.
                </p>
              </div>

              <div className="grid gap-3 max-w-md mx-auto">
                {[
                  { value: 'single_family', label: 'Single Family Home', desc: 'Detached house' },
                  { value: 'townhouse', label: 'Townhouse', desc: 'Attached home with shared walls' },
                  { value: 'condo', label: 'Condo / Apartment', desc: 'Unit in a larger building' },
                  { value: 'multi_family', label: 'Multi-Family', desc: 'Duplex, triplex, or similar' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`rounded-xl border transition-all duration-200 p-5 text-left ${
                      formData.homeType === opt.value
                        ? 'border-sky-500/60 bg-sky-500/10'
                        : 'border-white/10 bg-slate-900/50 hover:border-sky-400/40 hover:bg-slate-900/80'
                    }`}
                    onClick={() => {
                      setFormData({ ...formData, homeType: opt.value });
                      setTimeout(handleNext, 200);
                    }}
                  >
                    <p className="text-lg font-semibold text-white">{opt.label}</p>
                    <p className="text-sm text-slate-400 mt-1">{opt.desc}</p>
                  </button>
                ))}
              </div>

              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push('/onboarding')}
                className="text-slate-400"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to role selection
              </Button>
            </motion.div>
          )}

          {/* Step 2: Services interested in */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8 text-center"
            >
              <div className="space-y-4">
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  What services are you looking for?
                </h1>
                <p className="text-lg text-slate-400 max-w-xl mx-auto">
                  Select all that apply. You can always change this later.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                {serviceCategories.map((service) => {
                  const Icon = service.icon;
                  const isSelected = formData.interestedServices.includes(service.id);
                  return (
                    <button
                      key={service.id}
                      type="button"
                      className={`rounded-xl border transition-all duration-200 p-4 text-left ${
                        isSelected
                          ? 'border-sky-500/60 bg-sky-500/10'
                          : 'border-white/10 bg-slate-900/50 hover:border-sky-400/40 hover:bg-slate-900/80'
                      }`}
                      onClick={() => toggleService(service.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-sky-500/20' : 'bg-slate-800'}`}>
                          <Icon className={`h-5 w-5 ${isSelected ? 'text-sky-400' : 'text-slate-400'}`} />
                        </div>
                        <p className="font-medium text-white">{service.label}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3 max-w-md mx-auto">
                <Button type="button" onClick={handleBack} variant="outline" size="lg" className="flex-1 text-lg py-6">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button type="button" onClick={handleNext} size="lg" className="flex-1 bg-sky-600 hover:bg-sky-700 text-lg py-6">
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Project timeline */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8 text-center"
            >
              <div className="space-y-4">
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  When do you need work done?
                </h1>
                <p className="text-lg text-slate-400 max-w-xl mx-auto">
                  This helps contractors prioritize your requests.
                </p>
              </div>

              <div className="grid gap-3 max-w-md mx-auto">
                {[
                  { value: 'urgent', label: 'Urgent', desc: 'I need help ASAP' },
                  { value: 'this_week', label: 'This week', desc: 'Within the next 7 days' },
                  { value: 'this_month', label: 'This month', desc: 'Within the next 30 days' },
                  { value: 'planning', label: 'Just planning', desc: 'No rush, exploring options' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`rounded-xl border transition-all duration-200 p-5 text-left ${
                      formData.projectTimeline === opt.value
                        ? 'border-sky-500/60 bg-sky-500/10'
                        : 'border-white/10 bg-slate-900/50 hover:border-sky-400/40 hover:bg-slate-900/80'
                    }`}
                    onClick={() => setFormData({ ...formData, projectTimeline: opt.value })}
                  >
                    <p className="text-lg font-semibold text-white">{opt.label}</p>
                    <p className="text-sm text-slate-400 mt-1">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {state && !state.success && state.message && (
                <p className="text-sm text-red-400">{state.message}</p>
              )}

              <div className="flex gap-3 max-w-md mx-auto">
                <Button type="button" onClick={handleBack} variant="outline" size="lg" className="flex-1 text-lg py-6">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <SubmitButton text="Complete Setup" />
              </div>
            </motion.div>
          )}
        </form>
      </div>
    </main>
  );
}
