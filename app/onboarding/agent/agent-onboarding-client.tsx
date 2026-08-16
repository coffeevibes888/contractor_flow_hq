'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Users, Award, MapPin, Globe, 
  ArrowLeft, ArrowRight, Loader2, CheckCircle2 
} from 'lucide-react';

export default function AgentOnboardingClient() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    licenseNumber: '',
    licenseState: '',
    brokerage: '',
    yearsExperience: '',
    specializations: [] as string[],
    serviceAreas: '',
    subdomain: '',
  });

  const totalSteps = 4;

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

  const toggleSpecialization = (spec: string) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter(s => s !== spec)
        : [...prev.specializations, spec]
    }));
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await fetch('/api/onboarding/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Update the session to refresh the role and onboardingCompleted status
        await updateSession();
        router.push('/agent/dashboard');
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const specializations = [
    'Residential',
    'Commercial',
    'Luxury',
    'First-time Buyers',
    'Investment Properties',
    'New Construction',
    'Condos & Townhomes',
    'Land & Lots',
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-amber-900/20 to-slate-950 text-white flex items-center justify-center px-4 py-10">
      <div className="max-w-xl w-full space-y-8">
        {/* Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i + 1 <= step ? 'w-12 bg-amber-500' : 'w-8 bg-slate-700'
                }`}
              />
            ))}
          </div>
          <p className="text-center text-xs text-slate-400">
            Step {step} of {totalSteps}
          </p>
        </div>

        {/* Step 1: License Info */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="text-center space-y-3">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
                <Award className="h-8 w-8" />
              </div>
              <h1 className="text-3xl font-bold">Your License Information</h1>
              <p className="text-slate-400">This helps verify your credentials</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-slate-300">Real Estate License Number</Label>
                <Input
                  placeholder="e.g., S.0123456"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">License State</Label>
                <Input
                  placeholder="e.g., Nevada"
                  value={formData.licenseState}
                  onChange={(e) => setFormData({ ...formData, licenseState: e.target.value })}
                  className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Brokerage Name</Label>
                <Input
                  placeholder="e.g., Keller Williams Realty"
                  value={formData.brokerage}
                  onChange={(e) => setFormData({ ...formData, brokerage: e.target.value })}
                  className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={handleBack} className="flex-1 text-slate-400">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleNext} className="flex-1 bg-amber-600 hover:bg-amber-700">
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Experience & Specializations */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="text-center space-y-3">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
                <Users className="h-8 w-8" />
              </div>
              <h1 className="text-3xl font-bold">Your Expertise</h1>
              <p className="text-slate-400">Help buyers find the right agent</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-slate-300">Years of Experience</Label>
                <div className="grid grid-cols-4 gap-2">
                  {['0-2', '3-5', '6-10', '10+'].map((years) => (
                    <button
                      key={years}
                      onClick={() => setFormData({ ...formData, yearsExperience: years })}
                      className={`
                        rounded-lg border py-2 text-sm font-medium transition-all
                        ${formData.yearsExperience === years
                          ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                          : 'border-white/10 bg-slate-900/50 text-slate-300 hover:border-white/20'
                        }
                      `}
                    >
                      {years}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Specializations (select all that apply)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {specializations.map((spec) => (
                    <button
                      key={spec}
                      onClick={() => toggleSpecialization(spec)}
                      className={`
                        rounded-lg border py-2 px-3 text-sm font-medium transition-all text-left
                        ${formData.specializations.includes(spec)
                          ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                          : 'border-white/10 bg-slate-900/50 text-slate-300 hover:border-white/20'
                        }
                      `}
                    >
                      {spec}
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
              <Button onClick={handleNext} className="flex-1 bg-amber-600 hover:bg-amber-700">
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Service Areas */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="text-center space-y-3">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
                <MapPin className="h-8 w-8" />
              </div>
              <h1 className="text-3xl font-bold">Where do you work?</h1>
              <p className="text-slate-400">List the areas you serve</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-slate-300">Service Areas</Label>
                <Input
                  placeholder="e.g., Las Vegas, Henderson, Summerlin"
                  value={formData.serviceAreas}
                  onChange={(e) => setFormData({ ...formData, serviceAreas: e.target.value })}
                  className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500"
                />
                <p className="text-xs text-slate-500">Separate multiple areas with commas</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleNext} className="flex-1 bg-amber-600 hover:bg-amber-700">
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Branded URL */}
        {step === 4 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="text-center space-y-3">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
                <Globe className="h-8 w-8" />
              </div>
              <h1 className="text-3xl font-bold">Your Branded Page</h1>
              <p className="text-slate-400">Create your personal agent URL</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-slate-300">Choose your URL</Label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-sm">propertyflowhq.com/</span>
                  <Input
                    placeholder="your-name"
                    value={formData.subdomain}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') 
                    })}
                    className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  This will be your public profile page where buyers can view your listings
                </p>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleComplete} 
                disabled={isSubmitting || !formData.subdomain}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
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
