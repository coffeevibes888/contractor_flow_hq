import { notFound } from 'next/navigation';
import { detectSubdomainEntity } from '@/lib/utils/subdomain-detection';
import SubdomainContactClient from './contact-client';
import ContractorContactClient from './contractor-contact-client';

export default async function SubdomainContactPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const result = await detectSubdomainEntity(subdomain);

  if (result.type === 'not_found') {
    return notFound();
  }

  if (result.type === 'landlord') {
    const data = result.data;
    const brandName = data.companyName || data.name;
    const brandEmail = data.companyEmail || data.owner?.email || null;
    const brandPhone = data.companyPhone || data.owner?.phoneNumber || null;
    const brandAddress = data.companyAddress || null;
    const logoUrl = data.logoUrl || null;

    return (
      <SubdomainContactClient
        brandName={brandName}
        brandEmail={brandEmail}
        brandPhone={brandPhone}
        brandAddress={brandAddress}
        logoUrl={logoUrl}
        subdomain={subdomain}
      />
    );
  }

  // Agent subdomains don't have a dedicated contact page yet.
  if (result.type !== 'contractor') {
    return notFound();
  }

  // Contractor
  const data = result.data;
  return (
    <ContractorContactClient
      businessName={data.businessName}
      displayName={data.displayName}
      email={data.email}
      phone={data.phone}
      website={data.website}
      logoUrl={data.logoUrl}
      profilePhoto={data.profilePhoto}
      baseCity={data.baseCity}
      baseState={data.baseState}
      specialties={data.specialties}
      isAvailable={data.isAvailable}
      availabilityNotes={data.availabilityNotes}
      subdomain={subdomain}
      contractorId={data.id}
    />
  );
}
