'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { roleOnboardingAction } from '@/lib/actions/onboarding.actions';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Building2, ArrowLeft, ArrowRight } from 'lucide-react';

function SubmitButton({ text = 'Continue' }: { text?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      className="flex-1 bg-violet-600 hover:bg-violet-700 text-lg font-semibold py-6"
      disabled={pending}
    >
      {pending ? 'Saving...' : text}
    </Button>
  );
}

export default function LandlordOnboardingClient() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    unitsEstimateRange: '',
    ownsProperties: false,
    managesForOthers: false,
    useSubdomain: true,
  });

  const [state, action] = useActionState(roleOnboardingAction, {
    success: false,
    message: '',
    role: null as 'tenant' | 'landlord' | null,
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-900/20 to-slate-950 text-white flex items-center justify-center px-4 py-10">
      <div className="max-w-2xl w-full space-y-8">
        {/* Progress indicator */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i + 1 <= step ? 'w-12 bg-violet-500' : 'w-8 bg-slate-700'
                }`}
              />
            ))}
          </div>
          <p className="text-center text-xs text-slate-400">
            Step {step} of {totalSteps}
          </p>
        </div>

        <form action={action} className="space-y-8">
          <input type="hidden" name="role" value="landlord" />
          <input type="hidden" name="unitsEstimateRange" value={formData.unitsEstimateRange} />
          <input type="hidden" name="ownsProperties" value={formData.ownsProperties ? 'on' : 'off'} />
          <input type="hidden" name="managesForOthers" value={formData.managesForOthers ? 'on' : 'off'} />
          <input type="hidden" name="useSubdomain" value={formData.useSubdomain ? 'on' : 'off'} />

          {/* Step 1: How many units */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8 text-center"
            >
              <div className="space-y-4">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-400 mx-auto">
                  <Building2 className="h-8 w-8" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  How many rental units do you manage?
                </h1>
                <p className="text-lg text-slate-400 max-w-xl mx-auto">
                  This helps us tailor your dashboard and recommend the right tools.
                </p>
              </div>

              <div className="grid gap-3 max-w-md mx-auto">
                {[
                  { value: '0-10', label: '0-10 units', desc: 'Small portfolio' },
                  { value: '11-50', label: '11-50 units', desc: 'Growing portfolio' },
                  { value: '51-200', label: '51-200 units', desc: 'Large portfolio' },
                  { value: '200+', label: '200+ units', desc: 'Enterprise' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`rounded-xl border transition-all duration-200 p-5 text-left ${
                      formData.unitsEstimateRange === opt.value
                        ? 'border-violet-500/60 bg-violet-500/10'
                        : 'border-white/10 bg-slate-900/50 hover:border-violet-400/40 hover:bg-slate-900/80'
                    }`}
                    onClick={() => {
                      setFormData({ ...formData, unitsEstimateRange: opt.value });
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

          {/* Step 2: Ownership type */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8 text-center"
            >
              <div className="space-y-4">
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  Tell us about your role
                </h1>
                <p className="text-lg text-slate-400 max-w-xl mx-auto">
                  Do you own these properties, manage them for others, or both?
                </p>
              </div>

              <div className="grid gap-4 max-w-md mx-auto">
                <label className="cursor-pointer">
                  <div className={`rounded-xl border transition-all duration-200 p-5 text-left ${
                    formData.ownsProperties
                      ? 'border-violet-500/60 bg-violet-500/10'
                      : 'border-white/10 bg-slate-900/50 hover:border-violet-400/40 hover:bg-slate-900/80'
                  }`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={formData.ownsProperties}
                        onChange={(e) => setFormData({ ...formData, ownsProperties: e.target.checked })}
                        className="mt-1 h-5 w-5 rounded border-white/20 bg-slate-800 text-violet-500"
                      />
                      <div>
                        <p className="text-lg font-semibold text-white">I own properties</p>
                        <p className="text-sm text-slate-400 mt-1">
                          You're the owner or part of an ownership group
                        </p>
                      </div>
                    </div>
                  </div>
                </label>

                <label className="cursor-pointer">
                  <div className={`rounded-xl border transition-all duration-200 p-5 text-left ${
                    formData.managesForOthers
                      ? 'border-violet-500/60 bg-violet-500/10'
                      : 'border-white/10 bg-slate-900/50 hover:border-violet-400/40 hover:bg-slate-900/80'
                  }`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={formData.managesForOthers}
                        onChange={(e) => setFormData({ ...formData, managesForOthers: e.target.checked })}
                        className="mt-1 h-5 w-5 rounded border-white/20 bg-slate-800 text-violet-500"
                      />
                      <div>
                        <p className="text-lg font-semibold text-white">I manage for other owners</p>
                        <p className="text-sm text-slate-400 mt-1">
                          You're a third-party property manager
                        </p>
                      </div>
                    </div>
                  </div>
                </label>
              </div>

              <div className="flex gap-3 max-w-md mx-auto">
                <Button type="button" onClick={handleBack} variant="outline" size="lg" className="flex-1 text-lg py-6">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button type="button" onClick={handleNext} size="lg" className="flex-1 bg-violet-600 hover:bg-violet-700 text-lg py-6">
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Subdomain preference */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8 text-center"
            >
              <div className="space-y-4">
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  Get your own tenant portal
                </h1>
                <p className="text-lg text-slate-400 max-w-xl mx-auto">
                  We'll create a custom URL like <span className="font-mono text-violet-400">yourname.propertyflowhq.com</span> for tenant applications and rent payments.
                </p>
              </div>

              <div className="max-w-md mx-auto">
                <label className="cursor-pointer">
                  <div className={`rounded-xl border transition-all duration-200 p-5 ${
                    formData.useSubdomain
                      ? 'border-violet-500/60 bg-violet-500/10'
                      : 'border-white/10 bg-slate-900/50 hover:border-violet-400/40 hover:bg-slate-900/80'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <p className="text-lg font-semibold text-white">Enable custom tenant portal</p>
                        <p className="text-sm text-slate-400 mt-1">Recommended for professional landlords</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.useSubdomain}
                        onChange={(e) => setFormData({ ...formData, useSubdomain: e.target.checked })}
                        className="h-6 w-6 rounded border-white/20 bg-slate-800 text-violet-500"
                      />
                    </div>
                  </div>
                </label>
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
