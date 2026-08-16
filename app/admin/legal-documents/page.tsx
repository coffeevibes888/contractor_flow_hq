import { requireAdmin } from '@/lib/auth-guard';
import LegalDocumentsClient from './legal-documents-client';

export const metadata = {
  title: 'Legal Documents | Admin',
  description: 'Manage lease templates and legal documents',
};

export default async function LegalDocumentsPage() {
  await requireAdmin();
  
  return (
    <main className="w-full px-4 py-8 md:px-0">
      <div className="max-w-6xl mx-auto">
        <LegalDocumentsClient />
      </div>
    </main>
  );
}
