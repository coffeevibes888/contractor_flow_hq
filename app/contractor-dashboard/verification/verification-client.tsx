'use client';

import { useState } from 'react';
import { VerificationDashboard } from '@/components/contractor/verification-dashboard';
import { VerificationUpload } from '@/components/contractor/verification-upload';

interface VerificationClientProps {
  verification: any;
  documents: any[];
}

export function VerificationClient({ verification, documents }: VerificationClientProps) {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');

  const handleStartVerification = (type: string) => {
    setSelectedType(type);
    setUploadModalOpen(true);
  };

  const handleUploadSuccess = () => {
    // Refresh the page to show updated status
    window.location.reload();
  };

  return (
    <>
      <VerificationDashboard
        verification={verification}
        onStartVerification={handleStartVerification}
      />

      <VerificationUpload
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        verificationType={selectedType}
        onSuccess={handleUploadSuccess}
      />
    </>
  );
}
