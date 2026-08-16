'use client';

import { useEffect, useCallback } from 'react';
import { CheckCircle2, User, Briefcase, GraduationCap, FileText, FileSignature, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useJobApplicationWizard } from '../wizard-context';

interface Props {
  setValidate: (fn: (() => boolean) | null) => void;
}

export function ReviewStep({ setValidate }: Props) {
  const { state, goToStep } = useJobApplicationWizard();
  const d = state.formData;

  const validate = useCallback(() => true, []);
  useEffect(() => {
    setValidate(validate);
    return () => setValidate(null);
  }, [setValidate, validate]);

  const Section = ({
    title,
    icon: Icon,
    stepIndex,
    children,
  }: {
    title: string;
    icon: React.ElementType;
    stepIndex: number;
    children: React.ReactNode;
  }) => (
    <div className="p-5 rounded-xl bg-slate-800/30 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Icon className="h-5 w-5 text-emerald-400" />
          {title}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => goToStep(stepIndex)}
          className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
        >
          <Edit2 className="h-4 w-4 mr-1" /> Edit
        </Button>
      </div>
      <div className="space-y-2 text-sm">{children}</div>
    </div>
  );

  const Field = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div className="flex justify-between py-1">
      <span className="text-slate-400">{label}</span>
      <span className="text-white font-medium text-right max-w-[60%] break-words">{value || '—'}</span>
    </div>
  );

  const maskSSN = (ssn?: string) => (ssn ? `***-**-${ssn.slice(-4)}` : '—');

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 mb-4">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Review Your Application</h2>
        <p className="text-slate-300 mt-2">Please review everything before submitting</p>
      </div>

      <Section title="Personal Information" icon={User} stepIndex={0}>
        <Field label="Full Name" value={d.fullName} />
        <Field label="Email" value={d.email} />
        <Field label="Phone" value={d.phone} />
        <Field label="Date of Birth" value={d.dateOfBirth} />
        <Field label="SSN" value={maskSSN(d.ssn)} />
        <Field
          label="Address"
          value={
            d.addressLine1
              ? `${d.addressLine1}${d.addressLine2 ? ', ' + d.addressLine2 : ''}, ${d.city}, ${d.stateRegion} ${d.postalCode}`
              : undefined
          }
        />
        <Field label="Work Authorization" value={d.workAuth?.replace(/_/g, ' ')} />
      </Section>

      <Section title="Experience" icon={Briefcase} stepIndex={1}>
        <Field label="Years of Experience" value={d.yearsExperience} />
        <Field label="Positions Listed" value={d.workHistory?.length || 0} />
        {(d.workHistory || []).map((w, i) => (
          <div key={w.id} className="pt-2 border-t border-slate-700/50 first:border-0 first:pt-0">
            <p className="text-white font-medium">
              {w.title || `Position ${i + 1}`} {w.employer && `@ ${w.employer}`}
            </p>
            <p className="text-xs text-slate-400">
              {w.startDate} {w.current ? '– Present' : w.endDate ? `– ${w.endDate}` : ''}
            </p>
          </div>
        ))}
        {(d.skills?.length ?? 0) > 0 && <Field label="Skills" value={d.skills!.join(', ')} />}
        {(d.certifications?.length ?? 0) > 0 && (
          <Field label="Certifications" value={d.certifications!.join(', ')} />
        )}
      </Section>

      <Section title="Education & References" icon={GraduationCap} stepIndex={2}>
        <Field label="Education Entries" value={d.education?.length || 0} />
        <Field label="References" value={d.references?.length || 0} />
      </Section>

      <Section title="Documents" icon={FileText} stepIndex={3}>
        <Field label="Documents Uploaded" value={d.documents?.length || 0} />
        {(d.documents || []).map((doc) => (
          <div key={doc.id} className="flex justify-between py-1">
            <span className="text-slate-400 capitalize">{doc.type}</span>
            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-300 hover:underline text-right max-w-[60%] truncate"
            >
              {doc.name}
            </a>
          </div>
        ))}
        {d.coverLetter && (
          <div className="pt-3 border-t border-slate-700/50">
            <p className="text-slate-400 text-xs mb-1">Cover Letter</p>
            <p className="text-white text-xs whitespace-pre-wrap line-clamp-4">{d.coverLetter}</p>
          </div>
        )}
      </Section>

      <Section title="Agreement" icon={FileSignature} stepIndex={4}>
        <Field label="Background Check Consent" value={d.backgroundCheckConsent ? 'Yes' : 'No'} />
        <Field label="Credit Check Consent" value={d.creditCheckConsent ? 'Yes' : 'No'} />
        <Field label="Certified Truthful" value={d.certifyTruthful ? 'Yes' : 'No'} />
        <Field label="Signed Name" value={d.signedName} />
        {d.signatureUrl && (
          <div className="pt-2">
            <p className="text-slate-400 text-xs mb-1">Signature</p>
            <img
              src={d.signatureUrl}
              alt="Signature"
              className="h-20 bg-white rounded border border-slate-700"
            />
          </div>
        )}
      </Section>

      <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
        <p className="text-sm text-slate-300">
          By clicking Submit Application, I confirm that all information is accurate and I
          understand the employer may contact me regarding next steps.
        </p>
      </div>
    </div>
  );
}
