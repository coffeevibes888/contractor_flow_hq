import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { notFound } from 'next/navigation';
import { EmployeeDetailTabs } from '@/components/contractor/employee-detail-tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, Phone, Calendar, Edit } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export default async function EmployeeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const contractorProfile = await getContractorProfileForUser(session.user.id, {
    id: true,
  });

  if (!contractorProfile) {
    redirect('/onboarding/contractor');
  }

  // Fetch employee with all related data
  const employee = await prisma.contractorEmployee.findUnique({
    where: {
      id: params.id,
      contractorId: contractorProfile.id,
    },
    include: {
      assignedRole: {
        select: {
          name: true,
          permissions: true,
        },
      },
      assignments: {
        orderBy: { startDate: 'desc' },
      },
      timeEntries: {
        orderBy: { clockIn: 'desc' },
        take: 50,
      },
      employeeCertifications: {
        orderBy: { createdAt: 'desc' },
      },
      timeOffRequests: {
        orderBy: { startDate: 'desc' },
      },
    },
  });

  if (!employee) {
    notFound();
  }

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    inactive: 'bg-gray-100 text-gray-700 border-gray-300',
    terminated: 'bg-red-100 text-red-700 border-red-300',
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/contractor-dashboard/team">
        <Button variant="outline" className="border-2 border-gray-200">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Team
        </Button>
      </Link>

      {/* Employee Header */}
      <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Photo */}
          <div className="h-24 w-24 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center overflow-hidden flex-shrink-0 border-4 border-blue-200">
            {employee.photo ? (
              <Image
                src={employee.photo}
                alt={`${employee.firstName} ${employee.lastName}`}
                width={96}
                height={96}
                className="object-cover"
              />
            ) : (
              <span className="text-3xl font-bold text-blue-600">
                {employee.firstName[0]}{employee.lastName[0]}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {employee.firstName} {employee.lastName}
                </h1>
                <p className="text-gray-600 mt-1">
                  {employee.assignedRole?.name || employee.role}
                </p>
                <Badge className={`${statusColors[employee.status]} mt-2`}>
                  {employee.status}
                </Badge>
              </div>
              <Link href={`/contractor-dashboard/team/${employee.id}/edit`}>
                <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Employee
                </Button>
              </Link>
            </div>

            {/* Contact Info */}
            <div className="grid md:grid-cols-3 gap-4">
              {employee.email && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm truncate">{employee.email}</span>
                </div>
              )}
              {employee.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{employee.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">
                  Hired {new Date(employee.hireDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t-2 border-gray-100">
              <div>
                <p className="text-xs text-gray-600 mb-1">Jobs Assigned</p>
                <p className="text-2xl font-bold text-gray-900">
                  {employee.assignments.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Avg Rating</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Number(employee.avgRating).toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Hourly Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${Number(employee.payRate).toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Certifications</p>
                <p className="text-2xl font-bold text-gray-900">
                  {employee.employeeCertifications.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <EmployeeDetailTabs employee={employee} />
    </div>
  );
}
