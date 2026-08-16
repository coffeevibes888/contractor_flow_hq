'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Wrench, Award, MapPin, 
  ArrowLeft, ArrowRight, Loader2, CheckCircle2 
} from 'lucide-react';

export default function ContractorOnboardingClient() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    companyName: '',
    licenseNumber: '',
    insuranceProvider: '',
    specialties: [] as string[],
    serviceAreas: '',
    inviteCode: '',
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

  const toggleSpecialty = (spec: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(spec)
        ? prev.specialties.filter(s => s !== spec)
        : [...prev.specialties, spec]
    }));
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await fetch('/api/onboarding/contractor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh session so role/onboardingCompleted are up to date
        await updateSession();
        // Go to subscription selection before the dashboard (same as landlord flow)
        router.push('/onboarding/contractor/subscription');
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const specialties = [
    'Plumbing',
    'Electrical',
    'HVAC',
    'General Repairs',
    'Appliance Repair',
    'Painting',
    'Flooring',
    'Roofing',
    'Landscaping',
    'Cleaning',
    'Pest Control',
    'Locksmith',
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-rose-900/20 to-slate-950 text-white flex items-center justify-center px-4 py-10">
      <div className="max-w-xl w-full space-y-8">
        {/* Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i + 1 <= step ? 'w-12 bg-rose-500' : 'w-8 bg-slate-700'
                }`}
              />
            ))}
          </div>
          <p className="text-center text-xs text-slate-400">
            Step {step} of {totalSteps}
          </p>
        </div>

        {/* Step 1: Business Info */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="text-center space-y-3">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400">
                <Wrench className="h-8 w-8" />
              </div>
              <h1 className="text-3xl font-bold">Your Business Info</h1>
              <p className="text-slate-400">Tell us about your contracting business</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-slate-300">Business/Company Name</Label>
                <Input
                  placeholder="e.g., Quick Fix Plumbing"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Contractor License Number (optional)</Label>
                <Input
                  placeholder="e.g., NV-12345"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Insurance Provider (optional)</Label>
                <Input
                  placeholder="e.g., State Farm"
                  value={formData.insuranceProvider}
                  onChange={(e) => setFormData({ ...formData, insuranceProvider: e.target.value })}
                  className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={handleBack} className="flex-1 text-slate-400">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleNext} className="flex-1 bg-rose-600 hover:bg-rose-700">
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Specialties */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="text-center space-y-3">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400">
                <Award className="h-8 w-8" />
              </div>
              <h1 className="text-3xl font-bold">Your Specialties</h1>
              <p className="text-slate-400">What services do you offer?</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-slate-300">Select your specialties</Label>
                <div className="grid grid-cols-2 gap-2">
                  {specialties.map((spec) => (
                    <button
                      key={spec}
                      onClick={() => toggleSpecialty(spec)}
                      className={`
                        rounded-lg border py-2 px-3 text-sm font-medium transition-all text-left
                        ${formData.specialties.includes(spec)
                          ? 'border-rose-500 bg-rose-500/20 text-rose-300'
                          : 'border-white/10 bg-slate-900/50 text-slate-300 hover:border-white/20'
                        }
                      `}
                    >
                      {spec}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Service Areas</Label>
                <Input
                  placeholder="e.g., Las Vegas, Henderson"
                  value={formData.serviceAreas}
                  onChange={(e) => setFormData({ ...formData, serviceAreas: e.target.value })}
                  className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleNext} className="flex-1 bg-rose-600 hover:bg-rose-700">
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Connect to Landlord */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="text-center space-y-3">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400">
                <MapPin className="h-8 w-8" />
              </div>
              <h1 className="text-3xl font-bold">Connect to a Property Manager</h1>
              <p className="text-slate-400">If you have an invite code, enter it below</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-slate-300">Invite Code (optional)</Label>
                <Input
                  placeholder="Enter invite code from property manager"
                  value={formData.inviteCode}
                  onChange={(e) => setFormData({ ...formData, inviteCode: e.target.value })}
                  className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500"
                />
                <p className="text-xs text-slate-500">
                  You can skip this and connect to property managers later
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
                disabled={isSubmitting}
                className="flex-1 bg-rose-600 hover:bg-rose-700"
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
