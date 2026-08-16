import { requireAdmin } from '@/lib/auth-guard';
import { prisma } from '@/db/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getDecryptedSsn, formatSsn } from '@/lib/utils/ssn-utils';
import { ApplicationDocumentViewer } from '@/components/admin/application-document-viewer';

interface AdminApplicationDetailPageProps {
  params: Promise<{ id: string }>;
}

function calculateAge(dateOfBirth: string): number | null {
  try {
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  } catch {
    return null;
  }
}

export default async function AdminApplicationDetailPage({ params }: AdminApplicationDetailPageProps) {
  await requireAdmin();
  const { id } = await params;

  const application = await prisma.rentalApplication.findUnique({
    where: { id },
    include: {
      unit: { select: { name: true, type: true, rentAmount: true, property: { select: { name: true } } } },
      applicant: { select: { id: true, name: true, email: true } },
      verification: true,
    },
  });

  if (!application) {
    return (
      <main className='w-full min-h-screen flex items-center justify-center'>
        <p className='text-white/60'>Application not found.</p>
      </main>
    );
  }

  const unitName = application.unit?.name;
  const propertyName = application.unit?.property?.name;
  const unitLabel = propertyName && unitName ? `${propertyName} • ${unitName}` : propertyName || unitName || 'Unit';

  const moneyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  type ApplicationDocumentRow = {
    id: string;
    applicationId: string;
    category: string;
    docType: string;
    originalFileName: string;
    status: string;
  };

  const prismaAny = prisma as any;
  const applicationDocuments = (await prismaAny.applicationDocument.findMany({
    where: { applicationId: application.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, applicationId: true, category: true, docType: true, originalFileName: true, status: true },
  })) as ApplicationDocumentRow[];

  const verificationDocuments = await prisma.verificationDocument.findMany({
    where: { applicationId: application.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, category: true, docType: true, originalFileName: true,
      verificationStatus: true, extractedData: true, ocrConfidence: true,
      cloudinaryPublicId: true, cloudinarySecureUrl: true,
    },
  });

  const identityDoc = verificationDocuments.find(d => d.category === 'identity' && d.extractedData);
  const identityData = identityDoc?.extractedData as any;
  const age = identityData?.dateOfBirth ? calculateAge(identityData.dateOfBirth) : null;

  const employmentDocs = verificationDocuments.filter(d => d.category === 'employment' && d.extractedData);
  const incomeData = employmentDocs.map(d => d.extractedData as any).filter(Boolean);
  const payStubData = incomeData.filter(d => d.grossPay);
  const avgGrossPay = payStubData.length > 0 
    ? payStubData.reduce((sum: number, d: any) => sum + (d.grossPay || 0), 0) / payStubData.length
    : null;
  const employerName = incomeData.find(d => d.employerName)?.employerName;

  const decryptedSsn = application.encryptedSsn ? await getDecryptedSsn(application.encryptedSsn) : null;

  // Parse notes into structured data
  const parseNotes = (notes: string | null) => {
    if (!notes) return {};
    const data: Record<string, string> = {};
    notes.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split(': ');
      if (key && valueParts.length > 0) {
        data[key.trim()] = valueParts.join(': ').trim();
      }
    });
    return data;
  };
  const parsedNotes = parseNotes(application.notes);

  // Parse salary from notes (stored as "Salary (monthly): $5,000" or "Salary (monthly): 5000")
  const parseSalaryFromNotes = (notes: Record<string, string>): number | null => {
    const monthlySalary = notes['Salary (monthly)'];
    if (monthlySalary) {
      const cleaned = monthlySalary.replace(/[$,]/g, '');
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed)) return parsed;
    }
    return null;
  };
  const notesMonthlyIncome = parseSalaryFromNotes(parsedNotes);

  // Calculate income - prefer application data, then verification, then notes, then pay stub average
  const monthlyIncome = application.monthlyIncome != null 
    ? Number(application.monthlyIncome) 
    : application.verification?.monthlyIncome != null 
      ? Number(application.verification.monthlyIncome)
      : notesMonthlyIncome != null
        ? notesMonthlyIncome
        : avgGrossPay;
  const yearlyIncome = monthlyIncome ? monthlyIncome * 12 : null;
  const rentAmount = application.unit?.rentAmount != null ? Number(application.unit.rentAmount) : null;
  const incomeToRentMultiple = monthlyIncome && rentAmount ? monthlyIncome / rentAmount : null;
  const qualifiesMultiple = 3;
  const qualifies = incomeToRentMultiple != null ? incomeToRentMultiple >= qualifiesMultiple : null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-500 text-white';
      case 'rejected': return 'bg-red-500 text-white';
      case 'pending': return 'bg-amber-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  return (
    <main className='w-full min-h-screen px-4 py-8 md:px-6'>
      <div className='max-w-5xl mx-auto space-y-6'>
        {/* Header with Back Button */}
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl md:text-3xl font-bold text-white'>Application Review</h1>
            <p className='text-sm text-white/60 mt-1'>
              Submitted {new Date(application.createdAt).toLocaleDateString('en-US', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
              })}
            </p>
          </div>
          <Link
            href='/admin/applications'
            className='px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors'
          >
            ← Back
          </Link>
        </div>

        {/* Quick Action Buttons */}
        <div className='flex flex-wrap gap-3'>
          <form action={async (formData: FormData) => {
            'use server';
            await handleDecision(application.id, 'approved', '', application);
          }}>
            <button type='submit' className='px-6 py-2.5 rounded-full bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors shadow-lg'>
              ✓ Approve Application
            </button>
          </form>
          <form action={async () => {
            'use server';
            await prisma.rentalApplication.update({
              where: { id: application.id },
              data: { status: 'rejected' },
            });
            revalidatePath('/admin/applications');
            redirect('/admin/applications');
          }}>
            <button type='submit' className='px-6 py-2.5 rounded-full bg-red-500/80 text-white font-semibold hover:bg-red-600 transition-colors'>
              ✗ Reject
            </button>
          </form>
        </div>

        {/* Applicant Header Card */}
        <div className='rounded-2xl bg-gradient-to-br from-violet-900/80 to-indigo-900/80 border border-violet-500/20 p-6'>
          <div className='flex items-center gap-4 mb-4'>
            <div className='w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold'>
              {(application.fullName || application.applicant?.name || 'A').charAt(0).toUpperCase()}
            </div>
            <div className='flex-1'>
              <div className='flex items-center gap-3'>
                <h2 className='text-xl font-bold text-white'>
                  {application.fullName || application.applicant?.name || 'Applicant'}
                </h2>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getStatusColor(application.status)}`}>
                  {application.status}
                </span>
              </div>
              <p className='text-violet-200 text-sm'>{unitLabel}</p>
              {qualifies != null && (
                <p className={`text-xs mt-1 ${qualifies ? 'text-emerald-300' : 'text-red-300'}`}>
                  {qualifies ? '✓ Meets income requirements (3x rent)' : '✗ Does not meet income requirements'}
                </p>
              )}
            </div>
          </div>

          {/* Contact Info - Horizontal */}
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            <div>
              <p className='text-violet-300 text-xs uppercase tracking-wide mb-1'>Email</p>
              <p className='text-white text-sm font-medium'>{application.email || application.applicant?.email || '—'}</p>
            </div>
            {application.phone && (
              <div>
                <p className='text-violet-300 text-xs uppercase tracking-wide mb-1'>Phone</p>
                <a href={`tel:${application.phone}`} className='text-white text-sm font-medium hover:text-cyan-300 transition-colors'>
                  {application.phone}
                </a>
              </div>
            )}
            {decryptedSsn && (
              <div>
                <p className='text-violet-300 text-xs uppercase tracking-wide mb-1'>SSN</p>
                <p className='text-white text-sm font-mono'>{formatSsn(decryptedSsn)}</p>
              </div>
            )}
            {application.moveInDate && (
              <div>
                <p className='text-violet-300 text-xs uppercase tracking-wide mb-1'>Move-in Date</p>
                <p className='text-white text-sm font-medium'>{new Date(application.moveInDate).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          {/* Income & Qualification Section */}
          <div className='mt-4 pt-4 border-t border-violet-500/20'>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              <div>
                <p className='text-violet-300 text-xs uppercase tracking-wide mb-1'>Monthly Income</p>
                <p className='text-white text-lg font-bold'>
                  {monthlyIncome != null ? moneyFormatter.format(monthlyIncome) : '—'}
                </p>
              </div>
              <div>
                <p className='text-violet-300 text-xs uppercase tracking-wide mb-1'>Yearly Income</p>
                <p className='text-white text-lg font-bold'>
                  {yearlyIncome != null ? moneyFormatter.format(yearlyIncome) : '—'}
                </p>
              </div>
              <div>
                <p className='text-violet-300 text-xs uppercase tracking-wide mb-1'>Monthly Rent</p>
                <p className='text-white text-lg font-bold'>
                  {rentAmount != null ? moneyFormatter.format(rentAmount) : '—'}
                </p>
              </div>
              <div>
                <p className='text-violet-300 text-xs uppercase tracking-wide mb-1'>Income to Rent Ratio</p>
                <div className='flex items-center gap-2'>
                  <p className={`text-lg font-bold ${
                    incomeToRentMultiple == null ? 'text-white' :
                    incomeToRentMultiple >= 3 ? 'text-emerald-400' :
                    incomeToRentMultiple >= 2 ? 'text-amber-400' :
                    'text-red-400'
                  }`}>
                    {incomeToRentMultiple != null ? `${incomeToRentMultiple.toFixed(1)}x` : '—'}
                  </p>
                  {incomeToRentMultiple != null && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      incomeToRentMultiple >= 3 ? 'bg-emerald-500/20 text-emerald-300' :
                      incomeToRentMultiple >= 2 ? 'bg-amber-500/20 text-amber-300' :
                      'bg-red-500/20 text-red-300'
                    }`}>
                      {incomeToRentMultiple >= 3 ? 'Qualifies' : incomeToRentMultiple >= 2 ? 'Borderline' : 'Below 2x'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Application Details - Organized Sections */}
        <div className='grid md:grid-cols-2 gap-6'>
          {/* Personal & Background */}
          <div className='rounded-2xl bg-gradient-to-br from-violet-900/80 to-indigo-900/80 border border-violet-500/20 p-6 space-y-4'>
            <h3 className='text-lg font-semibold text-white border-b border-violet-500/30 pb-2'>Personal Information</h3>
            <div className='grid grid-cols-2 gap-4'>
              {parsedNotes['DOB'] && (
                <div>
                  <p className='text-violet-300 text-xs uppercase tracking-wide'>Date of Birth</p>
                  <p className='text-white text-sm'>{parsedNotes['DOB']}</p>
                </div>
              )}
              {age !== null && (
                <div>
                  <p className='text-violet-300 text-xs uppercase tracking-wide'>Age</p>
                  <p className='text-white text-sm'>{age} years old</p>
                </div>
              )}
              {parsedNotes['Number of occupants'] && (
                <div>
                  <p className='text-violet-300 text-xs uppercase tracking-wide'>Occupants</p>
                  <p className='text-white text-sm'>{parsedNotes['Number of occupants']}</p>
                </div>
              )}
              {parsedNotes['Vehicles'] && (
                <div>
                  <p className='text-violet-300 text-xs uppercase tracking-wide'>Vehicles</p>
                  <p className='text-white text-sm'>{parsedNotes['Vehicles']}</p>
                </div>
              )}
              {parsedNotes['Emergency contact'] && (
                <div className='col-span-2'>
                  <p className='text-violet-300 text-xs uppercase tracking-wide'>Emergency Contact</p>
                  <p className='text-white text-sm'>{parsedNotes['Emergency contact']}</p>
                </div>
              )}
            </div>

            {/* Pets */}
            {parsedNotes['Has pets'] && (
              <div className='pt-2'>
                <p className='text-violet-300 text-xs uppercase tracking-wide mb-1'>Pets</p>
                <p className='text-white text-sm'>
                  {parsedNotes['Has pets']?.includes('Yes') ? '🐾 ' : ''}{parsedNotes['Has pets']}
                </p>
              </div>
            )}
          </div>

          {/* Employment & Income */}
          <div className='rounded-2xl bg-gradient-to-br from-violet-900/80 to-indigo-900/80 border border-violet-500/20 p-6 space-y-4'>
            <h3 className='text-lg font-semibold text-white border-b border-violet-500/30 pb-2'>Employment & Income</h3>
            <div className='grid grid-cols-2 gap-4'>
              {parsedNotes['Employment status'] && (
                <div>
                  <p className='text-violet-300 text-xs uppercase tracking-wide'>Status</p>
                  <p className='text-white text-sm capitalize'>{parsedNotes['Employment status']}</p>
                </div>
              )}
              {(parsedNotes['Job title'] || application.employmentStatus) && (
                <div>
                  <p className='text-violet-300 text-xs uppercase tracking-wide'>Job Title</p>
                  <p className='text-white text-sm'>{parsedNotes['Job title'] || application.employmentStatus}</p>
                </div>
              )}
              {(employerName || parsedNotes['Employer']) && (
                <div>
                  <p className='text-violet-300 text-xs uppercase tracking-wide'>Employer</p>
                  <p className='text-white text-sm'>{employerName || parsedNotes['Employer']}</p>
                </div>
              )}
              {parsedNotes['Employer phone'] && (
                <div>
                  <p className='text-violet-300 text-xs uppercase tracking-wide'>Employer Phone</p>
                  <p className='text-white text-sm'>{parsedNotes['Employer phone']}</p>
                </div>
              )}
              {parsedNotes['Supervisor'] && (
                <div>
                  <p className='text-violet-300 text-xs uppercase tracking-wide'>Supervisor</p>
                  <p className='text-white text-sm'>{parsedNotes['Supervisor']}</p>
                </div>
              )}
              {parsedNotes['Time employed'] && (
                <div>
                  <p className='text-violet-300 text-xs uppercase tracking-wide'>Time Employed</p>
                  <p className='text-white text-sm'>{parsedNotes['Time employed']}</p>
                </div>
              )}
              {(application.monthlyIncome || avgGrossPay) && (
                <div>
                  <p className='text-violet-300 text-xs uppercase tracking-wide'>Monthly Income</p>
                  <p className='text-emerald-400 text-sm font-semibold'>
                    ${Number(application.monthlyIncome || avgGrossPay).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Current Residence */}
          <div className='rounded-2xl bg-gradient-to-br from-violet-900/80 to-indigo-900/80 border border-violet-500/20 p-6 space-y-4'>
            <h3 className='text-lg font-semibold text-white border-b border-violet-500/30 pb-2'>Current Residence</h3>
            <div className='space-y-3'>
              {parsedNotes['Address'] && (
                <div>
                  <p className='text-violet-300 text-xs uppercase tracking-wide'>Address</p>
                  <p className='text-white text-sm'>{parsedNotes['Address']}</p>
                </div>
              )}
              <div className='grid grid-cols-2 gap-4'>
                {parsedNotes['Time at current address'] && (
                  <div>
                    <p className='text-violet-300 text-xs uppercase tracking-wide'>Time at Address</p>
                    <p className='text-white text-sm'>{parsedNotes['Time at current address']}</p>
                  </div>
                )}
                {parsedNotes['Current rent'] && (
                  <div>
                    <p className='text-violet-300 text-xs uppercase tracking-wide'>Current Rent</p>
                    <p className='text-white text-sm'>{parsedNotes['Current rent']}</p>
                  </div>
                )}
                {parsedNotes['Current landlord'] && (
                  <div className='col-span-2'>
                    <p className='text-violet-300 text-xs uppercase tracking-wide'>Current Landlord</p>
                    <p className='text-white text-sm'>{parsedNotes['Current landlord']}</p>
                  </div>
                )}
              </div>
              {parsedNotes['Reason for leaving'] && (
                <div>
                  <p className='text-violet-300 text-xs uppercase tracking-wide'>Reason for Leaving</p>
                  <p className='text-white text-sm'>{parsedNotes['Reason for leaving']}</p>
                </div>
              )}
            </div>
          </div>

          {/* Background & History */}
          <div className='rounded-2xl bg-gradient-to-br from-violet-900/80 to-indigo-900/80 border border-violet-500/20 p-6 space-y-4'>
            <h3 className='text-lg font-semibold text-white border-b border-violet-500/30 pb-2'>Background</h3>
            <div className='space-y-3'>
              <div className='grid grid-cols-2 gap-4'>
                {parsedNotes['Has been evicted'] && (
                  <div>
                    <p className='text-violet-300 text-xs uppercase tracking-wide'>Prior Evictions</p>
                    <p className={`text-sm font-medium ${parsedNotes['Has been evicted'].toLowerCase() === 'yes' ? 'text-red-400' : 'text-emerald-400'}`}>
                      {parsedNotes['Has been evicted']}
                    </p>
                  </div>
                )}
                {parsedNotes['Has broken lease'] && (
                  <div>
                    <p className='text-violet-300 text-xs uppercase tracking-wide'>Broken Lease</p>
                    <p className={`text-sm font-medium ${parsedNotes['Has broken lease'].toLowerCase() === 'yes' ? 'text-red-400' : 'text-emerald-400'}`}>
                      {parsedNotes['Has broken lease']}
                    </p>
                  </div>
                )}
              </div>
              {parsedNotes['Has convictions'] && (
                <div>
                  <p className='text-violet-300 text-xs uppercase tracking-wide'>Criminal History</p>
                  <p className='text-white text-sm'>{parsedNotes['Has convictions']}</p>
                </div>
              )}
              {parsedNotes['Additional notes'] && (
                <div>
                  <p className='text-violet-300 text-xs uppercase tracking-wide'>Additional Notes</p>
                  <p className='text-white text-sm'>{parsedNotes['Additional notes']}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div className='rounded-2xl bg-gradient-to-br from-violet-900/80 to-indigo-900/80 border border-violet-500/20 p-6'>
          <h3 className='text-lg font-semibold text-white border-b border-violet-500/30 pb-2 mb-4'>Uploaded Documents</h3>
          <ApplicationDocumentViewer
            verificationDocuments={verificationDocuments.map(doc => ({
              id: doc.id,
              originalFileName: doc.originalFileName,
              category: doc.category,
              docType: doc.docType,
              verificationStatus: doc.verificationStatus,
            }))}
            applicationDocuments={applicationDocuments.map(doc => ({
              id: doc.id,
              originalFileName: doc.originalFileName,
              category: doc.category,
              docType: doc.docType,
              status: doc.status,
            }))}
            applicationId={application.id}
          />
        </div>

        {/* Tenant Screening Section */}
        <div className='rounded-2xl bg-gradient-to-br from-violet-900/80 to-indigo-900/80 border border-violet-500/20 p-6'>
          <h3 className='text-lg font-semibold text-white border-b border-violet-500/30 pb-2 mb-4'>Tenant Screening</h3>
          
          {application.screeningStatus && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-4 ${
              application.screeningStatus === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
              application.screeningStatus === 'failed' ? 'bg-red-500/20 text-red-400' :
              'bg-amber-500/20 text-amber-400'
            }`}>
              Status: {application.screeningStatus}
              {application.screeningProvider && ` (${application.screeningProvider})`}
            </div>
          )}

          <p className='text-violet-200 text-sm mb-4'>Run a background check using one of these services:</p>
          
          <div className='grid grid-cols-1 md:grid-cols-3 gap-3 mb-6'>
            <a href='https://www.mysmartmove.com/' target='_blank' rel='noopener noreferrer'
              className='p-4 rounded-xl bg-violet-800/50 border border-violet-500/30 hover:border-violet-400/50 hover:bg-violet-700/50 transition-all group'>
              <p className='font-semibold text-white'>SmartMove</p>
              <p className='text-xs text-violet-300'>by TransUnion</p>
            </a>
            <a href='https://www.avail.co/tenant-screening' target='_blank' rel='noopener noreferrer'
              className='p-4 rounded-xl bg-emerald-900/50 border border-emerald-500/30 hover:bg-emerald-800/50 transition-all group'>
              <p className='font-semibold text-white'>Avail <span className='text-emerald-400 text-xs'>Free</span></p>
              <p className='text-xs text-emerald-300'>Easy to use</p>
            </a>
            <a href='https://www.rentprep.com/' target='_blank' rel='noopener noreferrer'
              className='p-4 rounded-xl bg-violet-800/50 border border-violet-500/30 hover:border-violet-400/50 hover:bg-violet-700/50 transition-all group'>
              <p className='font-semibold text-white'>RentPrep</p>
              <p className='text-xs text-violet-300'>From $21</p>
            </a>
          </div>

          <form action={async (formData: FormData) => {
            'use server';
            const provider = formData.get('screeningProvider') as string || 'manual';
            const notes = formData.get('screeningNotes') as string || '';
            await prisma.rentalApplication.update({
              where: { id: application.id },
              data: {
                screeningProvider: provider,
                screeningStatus: 'in_progress',
                screeningRequestedAt: new Date(),
                notes: application.notes ? `${application.notes}\n\nScreening Notes: ${notes}` : `Screening Notes: ${notes}`,
              },
            });
            revalidatePath(`/admin/applications/${application.id}`);
          }} className='flex flex-wrap gap-3 items-end'>
            <div className='flex-1 min-w-[200px]'>
              <label className='text-violet-300 text-xs block mb-1'>Provider Used</label>
              <select name='screeningProvider' defaultValue={application.screeningProvider || ''}
                className='w-full rounded-lg bg-violet-800/50 border border-violet-500/30 px-3 py-2 text-white text-sm'>
                <option value=''>Select provider...</option>
                <option value='smartmove'>SmartMove</option>
                <option value='avail'>Avail</option>
                <option value='rentprep'>RentPrep</option>
                <option value='other'>Other</option>
              </select>
            </div>
            <div className='flex-1 min-w-[200px]'>
              <label className='text-violet-300 text-xs block mb-1'>Notes</label>
              <input type='text' name='screeningNotes' placeholder='Add results...'
                className='w-full rounded-lg bg-violet-800/50 border border-violet-500/30 px-3 py-2 text-white text-sm placeholder:text-violet-400' />
            </div>
            <button type='submit' className='px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 transition-colors'>
              Update
            </button>
          </form>
        </div>

        {/* Decision Form with Message */}
        <div className='rounded-2xl bg-gradient-to-br from-violet-900/80 to-indigo-900/80 border border-violet-500/20 p-6'>
          <h3 className='text-lg font-semibold text-white border-b border-violet-500/30 pb-2 mb-4'>Send Message to Applicant</h3>
          <form action={async (formData: FormData) => {
            'use server';
            const status = formData.get('status') as string;
            const adminResponse = formData.get('adminResponse') as string;
            await handleDecision(application.id, status, adminResponse, application);
          }} className='space-y-4'>
            <div className='grid md:grid-cols-2 gap-4'>
              <div>
                <label className='text-violet-300 text-xs block mb-1'>Decision</label>
                <select name='status' defaultValue={application.status}
                  className='w-full rounded-lg bg-violet-800/50 border border-violet-500/30 px-3 py-2.5 text-white text-sm'>
                  <option value='pending'>Pending</option>
                  <option value='approved'>Approved</option>
                  <option value='rejected'>Rejected</option>
                  <option value='withdrawn'>Withdrawn</option>
                </select>
              </div>
            </div>
            <div>
              <label className='text-violet-300 text-xs block mb-1'>Message to Applicant</label>
              <textarea name='adminResponse' rows={3} placeholder='Explain your decision or next steps...'
                className='w-full rounded-lg bg-violet-800/50 border border-violet-500/30 px-3 py-2.5 text-white text-sm placeholder:text-violet-400 resize-none' />
            </div>
            <div className='flex gap-3'>
              <button type='submit' className='px-6 py-2.5 rounded-full bg-violet-600 text-white font-semibold hover:bg-violet-700 transition-colors'>
                Save & Notify Applicant
              </button>
              <button
                type='submit'
                formAction={async () => {
                  'use server';
                  await prisma.rentalApplication.delete({ where: { id: application.id } });
                  redirect('/admin/applications');
                }}
                className='px-4 py-2.5 rounded-full bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-colors'
              >
                Delete Application
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}


async function handleDecision(applicationId: string, status: string, adminResponse: string, application: any) {
  'use server';
  
  const combinedNotes = adminResponse?.trim()
    ? `${application.notes ? `${application.notes}\n\n` : ''}Admin response: ${adminResponse.trim()}`
    : application.notes ?? null;

  if (status === 'approved') {
    await prisma.$transaction(async (tx) => {
      const freshApp = await tx.rentalApplication.findUnique({ where: { id: applicationId } });
      if (!freshApp) return;

      const unitId = freshApp.unitId || (freshApp.propertySlug
        ? (await tx.unit.findFirst({
            where: { isAvailable: true, property: { slug: freshApp.propertySlug } },
            orderBy: { createdAt: 'asc' },
          }))?.id ?? null
        : null);

      const applicantId = freshApp.applicantId || (freshApp.email
        ? (await tx.user.findUnique({ where: { email: freshApp.email } }))?.id ?? null
        : null);

      if (!unitId || !applicantId) {
        await tx.rentalApplication.update({
          where: { id: applicationId },
          data: { status, notes: combinedNotes },
        });
        return;
      }

      const unit = await tx.unit.findUnique({
        where: { id: unitId },
        include: { property: true },
      });

      if (!unit) {
        await tx.rentalApplication.update({
          where: { id: applicationId },
          data: { status, notes: combinedNotes },
        });
        return;
      }

      const startDate = application.moveInDate ?? new Date();
      const billingDayOfMonth = startDate.getDate();

      const propertyWithLease = await tx.property.findUnique({
        where: { id: unit.propertyId },
        include: {
          defaultLeaseDocument: { select: { id: true, name: true, isFieldsConfigured: true, signatureFields: true, fileUrl: true } },
          landlord: { select: { id: true } },
        },
      });

      let legalDocumentId: string | null = null;
      let leaseDocument: any = null;

      if (propertyWithLease?.defaultLeaseDocument) {
        legalDocumentId = propertyWithLease.defaultLeaseDocument.id;
        leaseDocument = propertyWithLease.defaultLeaseDocument;
      } else if (propertyWithLease?.landlord?.id) {
        const fallbackLease = await tx.legalDocument.findFirst({
          where: { landlordId: propertyWithLease.landlord.id, type: 'lease', isFieldsConfigured: true, isActive: true },
          select: { id: true, name: true, isFieldsConfigured: true, signatureFields: true, fileUrl: true },
          orderBy: { createdAt: 'desc' },
        });
        if (fallbackLease) {
          legalDocumentId = fallbackLease.id;
          leaseDocument = fallbackLease;
        }
      }

      const lease = await tx.lease.create({
        data: { unitId, tenantId: applicantId, legalDocumentId, startDate, endDate: null, rentAmount: unit.rentAmount, billingDayOfMonth, status: 'pending_signature' },
      });

      if (legalDocumentId && leaseDocument) {
        const crypto = await import('crypto');
        const tenantToken = crypto.randomBytes(24).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const applicantUser = await tx.user.findUnique({ where: { id: applicantId }, select: { name: true, email: true } });
        if (applicantUser?.email) {
          await tx.documentSignatureRequest.create({
            data: { documentId: legalDocumentId, leaseId: lease.id, recipientEmail: applicantUser.email, recipientName: applicantUser.name || 'Tenant', status: 'sent', expiresAt, token: tenantToken, role: 'tenant' },
          });
        }
      }

      await tx.unit.update({ where: { id: unit.id }, data: { isAvailable: false, availableFrom: null } });
      await tx.rentalApplication.update({ where: { id: applicationId }, data: { status, notes: combinedNotes } });

      if (freshApp.applicantId) {
        const { NotificationService } = await import('@/lib/services/notification-service');
        const { sendApplicationStatusUpdate } = await import('@/lib/services/email-service');
        const property = await tx.property.findFirst({ where: { slug: freshApp.propertySlug || '' }, include: { landlord: true } });
        const applicant = await tx.user.findUnique({ where: { id: freshApp.applicantId }, select: { name: true, email: true } });

        if (property?.landlord && applicant) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          await NotificationService.createNotification({
            userId: freshApp.applicantId, type: 'application', title: 'Application Approved!',
            message: `Great news! Your application for ${property.name} has been approved.`,
            actionUrl: `/user/profile/lease`, metadata: { applicationId, leaseId: lease.id }, landlordId: property.landlord.id,
          });
          try {
            await sendApplicationStatusUpdate(applicant.email, applicant.name, property.name, unit?.name || 'Unit', 'approved', combinedNotes || 'Your application has been approved.', property.landlord.id, `${baseUrl}/user/profile/lease`);
          } catch (e) { console.error('Email failed:', e); }
        }
      }
    });
  } else {
    await prisma.rentalApplication.update({ where: { id: applicationId }, data: { status, notes: combinedNotes } });

    if (application.applicantId && (status === 'rejected' || status === 'withdrawn')) {
      const { NotificationService } = await import('@/lib/services/notification-service');
      const { sendApplicationStatusUpdate } = await import('@/lib/services/email-service');
      const property = await prisma.property.findFirst({ where: { slug: application.propertySlug || '' }, include: { landlord: true } });
      const applicant = await prisma.user.findUnique({ where: { id: application.applicantId }, select: { name: true, email: true } });

      if (property?.landlord && applicant) {
        const statusMessage = status === 'rejected' ? 'Unfortunately, your application has been rejected' : 'Your application has been withdrawn';
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        await NotificationService.createNotification({
          userId: application.applicantId, type: 'application', title: `Application ${status === 'rejected' ? 'Rejected' : 'Withdrawn'}`,
          message: `${statusMessage} for ${property.name}.`, actionUrl: `/user/profile/application`, metadata: { applicationId }, landlordId: property.landlord.id,
        });
        try {
          await sendApplicationStatusUpdate(applicant.email, applicant.name, property.name, application.unit?.name || 'Unit', status as any, adminResponse || statusMessage, property.landlord.id, `${baseUrl}/user/profile/application`);
        } catch (e) { console.error('Email failed:', e); }
      }
    }
  }

  revalidatePath('/admin/applications');
  revalidatePath('/admin/leases');
  revalidatePath('/user/profile/rent-receipts');
  revalidatePath('/user/profile/lease');
  redirect('/admin/applications');
}
