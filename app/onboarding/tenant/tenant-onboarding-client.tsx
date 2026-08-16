'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Home, MapPin, DollarSign, Bed, CheckCircle2, 
  ArrowLeft, ArrowRight, Loader2 
} from 'lucide-react';

export default function TenantOnboardingClient() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    lookingFor: '', // apartment, house, room, any
    preferredLocation: '',
    maxBudget: '',
    moveInDate: '',
    bedrooms: '',
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

  const handleComplete = async () => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/onboarding/tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push('/user/dashboard');
      }
    } catch (error) {
      console.error('Onboarding error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-900/20 to-slate-950 text-white flex items-center justify-center px-4 py-10">
      <div className="max-w-xl w-full space-y-8">
        {/* Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i + 1 <= step ? 'w-12 bg-emerald-500' : 'w-8 bg-slate-700'
                }`}
              />
            ))}
          </div>
          <p className="text-center text-xs text-slate-400">
            Step {step} of {totalSteps}
          </p>
        </div>

        {/* Step 1: What are you looking for */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="text-center space-y-3">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                <Home className="h-8 w-8" />
              </div>
              <h1 className="text-3xl font-bold">What are you looking for?</h1>
              <p className="text-slate-400">This helps us show you relevant listings</p>
            </div>

            <div className="grid gap-3">
              {[
                { value: 'apartment', label: 'Apartment', desc: 'Unit in a building' },
                { value: 'house', label: 'House', desc: 'Single family home' },
                { value: 'room', label: 'Room', desc: 'Room in a shared space' },
                { value: 'any', label: 'Open to anything', desc: 'Show me all options' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setFormData({ ...formData, lookingFor: option.value });
                    setTimeout(handleNext, 200);
                  }}
                  className={`
                    w-full text-left rounded-xl border p-4 transition-all
                    ${formData.lookingFor === option.value
                      ? 'border-emerald-500/60 bg-emerald-500/10'
                      : 'border-white/10 bg-slate-900/50 hover:border-emerald-500/40 hover:bg-slate-900/80'
                    }
                  `}
                >
                  <p className="font-semibold text-white">{option.label}</p>
                  <p className="text-sm text-slate-400">{option.desc}</p>
                </button>
              ))}
            </div>

            <Button
              variant="ghost"
              onClick={handleBack}
              className="w-full text-slate-400"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to role selection
            </Button>
          </motion.div>
        )}

        {/* Step 2: Location & Budget */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="text-center space-y-3">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                <MapPin className="h-8 w-8" />
              </div>
              <h1 className="text-3xl font-bold">Where & how much?</h1>
              <p className="text-slate-400">Help us narrow down your search</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-slate-300">Preferred location</Label>
                <Input
                  placeholder="e.g., Las Vegas, Henderson, North Las Vegas"
                  value={formData.preferredLocation}
                  onChange={(e) => setFormData({ ...formData, preferredLocation: e.target.value })}
                  className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Maximum monthly budget</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    type="number"
                    placeholder="2000"
                    value={formData.maxBudget}
                    onChange={(e) => setFormData({ ...formData, maxBudget: e.target.value })}
                    className="pl-9 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Bedrooms needed</Label>
                <div className="grid grid-cols-5 gap-2">
                  {['Studio', '1', '2', '3', '4+'].map((bed) => (
                    <button
                      key={bed}
                      onClick={() => setFormData({ ...formData, bedrooms: bed })}
                      className={`
                        rounded-lg border py-2 text-sm font-medium transition-all
                        ${formData.bedrooms === bed
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                          : 'border-white/10 bg-slate-900/50 text-slate-300 hover:border-white/20'
                        }
                      `}
                    >
                      {bed}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleNext} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Move-in timeline */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="text-center space-y-3">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h1 className="text-3xl font-bold">When do you need to move?</h1>
              <p className="text-slate-400">This helps landlords know your timeline</p>
            </div>

            <div className="grid gap-3">
              {[
                { value: 'asap', label: 'As soon as possible', desc: 'Ready to move now' },
                { value: '1month', label: 'Within 1 month', desc: 'Flexible on exact date' },
                { value: '2-3months', label: '2-3 months', desc: 'Planning ahead' },
                { value: 'browsing', label: 'Just browsing', desc: 'No rush, exploring options' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFormData({ ...formData, moveInDate: option.value })}
                  className={`
                    w-full text-left rounded-xl border p-4 transition-all
                    ${formData.moveInDate === option.value
                      ? 'border-emerald-500/60 bg-emerald-500/10'
                      : 'border-white/10 bg-slate-900/50 hover:border-emerald-500/40 hover:bg-slate-900/80'
                    }
                  `}
                >
                  <p className="font-semibold text-white">{option.label}</p>
                  <p className="text-sm text-slate-400">{option.desc}</p>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleComplete} 
                disabled={isSubmitting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <CheckCircle2 className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
