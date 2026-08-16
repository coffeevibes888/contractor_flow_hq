'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Briefcase,
  Clock,
  Award,
  Calendar,
  TrendingUp,
  MapPin,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Banknote,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  hireDate: Date;
  payRate: any;
  avgRating: any;
  paychecks?: Array<{
    id: string;
    status: string;
    grossPay: any;
    netPay: any;
    regularHours: any;
    overtimeHours: any;
    ptoHours: any;
    payType: string;
    paymentMethod: string | null;
    paidAt: Date | null;
    payroll: { periodStart: Date; periodEnd: Date; payDate: Date };
  }>;
  assignments: Array<{
    id: string;
    startDate: Date;
    endDate: Date | null;
    role: string;
    jobId: string;
    isLead: boolean;
    status: string;
  }>;
  timeEntries: Array<{
    id: string;
    clockIn: Date;
    clockOut: Date | null;
    breakMinutes: number | null;
    notes: string | null;
  }>;
  employeeCertifications: Array<{
    id: string;
    name: string;
    type: string;
    issuedBy: string;
    issuedDate: Date;
    expiryDate: Date | null;
    certificateNumber: string | null;
    documentUrl: string | null;
    status: string;
  }>;
  timeOffRequests: Array<{
    id: string;
    type: string;
    startDate: Date;
    endDate: Date;
    status: string;
    reason: string | null;
  }>;
};

export function EmployeeDetailTabs({ employee }: { employee: Employee }) {
  const [activeTab, setActiveTab] = useState('overview');

  const jobStatusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-blue-100 text-blue-700',
    scheduled: 'bg-violet-100 text-violet-700',
    in_progress: 'bg-cyan-100 text-cyan-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  const timeOffStatusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    denied: 'bg-red-100 text-red-700',
  };

  // Calculate total hours worked
  const totalHours = employee.timeEntries.reduce((sum, entry) => {
    if (entry.clockOut) {
      const hours =
        (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) /
        (1000 * 60 * 60);
      const breakHours = (entry.breakMinutes || 0) / 60;
      return sum + hours - breakHours;
    }
    return sum;
  }, 0);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7 bg-gray-100 p-1 rounded-lg">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="jobs">Jobs</TabsTrigger>
        <TabsTrigger value="time">Time</TabsTrigger>
        <TabsTrigger value="certifications">Certs</TabsTrigger>
        <TabsTrigger value="timeoff">Time Off</TabsTrigger>
        <TabsTrigger value="payroll">Payroll</TabsTrigger>
        <TabsTrigger value="performance">Performance</TabsTrigger>
      </TabsList>

      {/* Overview Tab */}
      <TabsContent value="overview" className="space-y-4">
        <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Full Name</p>
              <p className="text-base font-medium text-gray-900">
                {employee.firstName} {employee.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Role</p>
              <p className="text-base font-medium text-gray-900">{employee.role}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Email</p>
              <p className="text-base font-medium text-gray-900">
                {employee.email || 'Not provided'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Phone</p>
              <p className="text-base font-medium text-gray-900">
                {employee.phone || 'Not provided'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Hire Date</p>
              <p className="text-base font-medium text-gray-900">
                {new Date(employee.hireDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Hourly Rate</p>
              <p className="text-base font-medium text-gray-900">
                ${Number(employee.payRate).toFixed(2)}/hr
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-100">
                <Briefcase className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-sm text-gray-600">Total Jobs</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{employee.assignments.length}</p>
          </div>

          <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-violet-100">
                <Clock className="h-5 w-5 text-violet-600" />
              </div>
              <p className="text-sm text-gray-600">Hours Worked</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalHours.toFixed(0)}</p>
          </div>

          <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-emerald-100">
                <Award className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-sm text-gray-600">Avg Rating</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {Number(employee.avgRating).toFixed(1)}
            </p>
          </div>
        </div>
      </TabsContent>

      {/* Jobs Tab */}
      <TabsContent value="jobs" className="space-y-4">
        <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm">
          <div className="p-5 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Assigned Jobs</h3>
          </div>
          <div className="p-5">
            {employee.assignments.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">No jobs assigned yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {employee.assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="rounded-lg border-2 border-gray-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">
                          Job Assignment
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Role: {assignment.role}
                        </p>
                        {assignment.isLead && (
                          <Badge className="bg-blue-100 text-blue-700 mt-1">
                            Lead Technician
                          </Badge>
                        )}
                      </div>
                      <Badge className={jobStatusColors[assignment.status]}>
                        {assignment.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Start {new Date(assignment.startDate).toLocaleDateString()}
                        </span>
                      </div>
                      {assignment.endDate && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>
                            End {new Date(assignment.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </TabsContent>

      {/* Time Tracking Tab */}
      <TabsContent value="time" className="space-y-4">
        <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Time Entries</h3>
              <p className="text-sm text-gray-600 mt-1">
                Total: {totalHours.toFixed(1)} hours
              </p>
            </div>
          </div>
          <div className="p-5">
            {employee.timeEntries.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">No time entries yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {employee.timeEntries.map((entry) => {
                  const hours = entry.clockOut
                    ? (
                        (new Date(entry.clockOut).getTime() -
                          new Date(entry.clockIn).getTime()) /
                          (1000 * 60 * 60) -
                        (entry.breakMinutes || 0) / 60
                      ).toFixed(2)
                    : 'In Progress';

                  return (
                    <div
                      key={entry.id}
                      className="rounded-lg border-2 border-gray-200 bg-white p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="h-4 w-4 text-gray-600" />
                            <span className="font-medium text-gray-900">
                              {new Date(entry.clockIn).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <span>In: {new Date(entry.clockIn).toLocaleTimeString()}</span>
                            {entry.clockOut && (
                              <span className="ml-4">
                                Out: {new Date(entry.clockOut).toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">{hours}</p>
                          <p className="text-xs text-gray-600">hours</p>
                        </div>
                      </div>
                      {entry.notes && (
                        <p className="text-sm text-gray-600 mt-2 pl-6">{entry.notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </TabsContent>

      {/* Certifications Tab */}
      <TabsContent value="certifications" className="space-y-4">
        <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Certifications & Licenses</h3>
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white">
              Add Certification
            </Button>
          </div>
          <div className="p-5">
            {employee.employeeCertifications.length === 0 ? (
              <div className="text-center py-12">
                <Award className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600 mb-4">No certifications yet</p>
                <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white">
                  Add First Certification
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {employee.employeeCertifications.map((cert) => {
                  const isExpired = cert.expiryDate
                    ? new Date(cert.expiryDate) < new Date()
                    : false;
                  const isExpiringSoon =
                    cert.expiryDate &&
                    !isExpired &&
                    new Date(cert.expiryDate).getTime() - Date.now() <
                      30 * 24 * 60 * 60 * 1000;

                  return (
                    <div
                      key={cert.id}
                      className="rounded-lg border-2 border-gray-200 bg-white p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Award className="h-4 w-4 text-blue-600" />
                            <h4 className="font-semibold text-gray-900">{cert.name}</h4>
                          </div>
                          <p className="text-sm text-gray-600">
                            {cert.issuedBy}
                          </p>
                          {cert.certificateNumber && (
                            <p className="text-xs text-gray-500 mt-1">
                              #{cert.certificateNumber}
                            </p>
                          )}
                        </div>
                        {isExpired ? (
                          <Badge className="bg-red-100 text-red-700">
                            <XCircle className="h-3 w-3 mr-1" />
                            Expired
                          </Badge>
                        ) : isExpiringSoon ? (
                          <Badge className="bg-amber-100 text-amber-700">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Expiring Soon
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Valid
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                        <span>
                          Issued: {new Date(cert.issuedDate).toLocaleDateString()}
                        </span>
                        {cert.expiryDate && (
                          <span>
                            Expires: {new Date(cert.expiryDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {cert.documentUrl && (
                        <a
                          href={cert.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-700 mt-2 inline-block"
                        >
                          View Document →
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </TabsContent>

      {/* Time Off Tab */}
      <TabsContent value="timeoff" className="space-y-4">
        <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Time Off Requests</h3>
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white">
              Request Time Off
            </Button>
          </div>
          <div className="p-5">
            {employee.timeOffRequests.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">No time off requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {employee.timeOffRequests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-lg border-2 border-gray-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="h-4 w-4 text-gray-600" />
                          <span className="font-medium text-gray-900 capitalize">
                            {request.type.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {new Date(request.startDate).toLocaleDateString()} -{' '}
                          {new Date(request.endDate).toLocaleDateString()}
                        </p>
                        {request.reason && (
                          <p className="text-sm text-gray-600 mt-2">{request.reason}</p>
                        )}
                      </div>
                      <Badge className={timeOffStatusColors[request.status]}>
                        {request.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </TabsContent>

      {/* Payroll Tab */}
      <TabsContent value="payroll" className="space-y-4">
        <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Paycheck History</h3>
              <p className="text-sm text-gray-500 mt-0.5">All processed paychecks for this employee</p>
            </div>
            <Link href="/contractor-dashboard/payroll" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Payroll →
            </Link>
          </div>
          <div className="p-5">
            {!employee.paychecks || employee.paychecks.length === 0 ? (
              <div className="text-center py-12">
                <Banknote className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600 mb-1">No paychecks yet</p>
                <p className="text-sm text-gray-500">Paychecks will appear here after payroll is run.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {employee.paychecks.map((pc) => {
                  const statusColors: Record<string, string> = {
                    pending: 'bg-amber-100 text-amber-700',
                    paid: 'bg-emerald-100 text-emerald-700',
                    void: 'bg-red-100 text-red-700',
                  };
                  return (
                    <div key={pc.id} className="rounded-lg border-2 border-gray-200 bg-white p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Banknote className="h-4 w-4 text-emerald-600" />
                            <span className="font-medium text-gray-900">
                              {new Date(pc.payroll.periodStart).toLocaleDateString()} – {new Date(pc.payroll.periodEnd).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Pay date: {new Date(pc.payroll.payDate).toLocaleDateString()}
                            {pc.paymentMethod && ` · ${pc.paymentMethod}`}
                            {pc.paidAt && ` · Paid ${new Date(pc.paidAt).toLocaleDateString()}`}
                          </p>
                          <div className="flex gap-4 mt-2 text-sm text-gray-600">
                            <span>Reg: {Number(pc.regularHours).toFixed(1)}h</span>
                            {Number(pc.overtimeHours) > 0 && <span>OT: {Number(pc.overtimeHours).toFixed(1)}h</span>}
                            {Number(pc.ptoHours) > 0 && <span>PTO: {Number(pc.ptoHours).toFixed(1)}h</span>}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-lg font-bold text-emerald-600">{formatCurrency(Number(pc.netPay))}</p>
                          <p className="text-xs text-gray-500">Gross: {formatCurrency(Number(pc.grossPay))}</p>
                          <Badge className={`mt-1 ${statusColors[pc.status] || 'bg-gray-100 text-gray-700'}`}>
                            {pc.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </TabsContent>

      {/* Performance Tab */}
      <TabsContent value="performance" className="space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-emerald-100">
                <Award className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-sm text-gray-600">Average Rating</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {Number(employee.avgRating).toFixed(1)}
            </p>
            <p className="text-xs text-gray-600 mt-1">Out of 5.0</p>
          </div>

          <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-100">
                <Briefcase className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-sm text-gray-600">Jobs Completed</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {employee.assignments.filter((a) => a.status === 'completed').length}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              of {employee.assignments.length} total
            </p>
          </div>

          <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-violet-100">
                <DollarSign className="h-5 w-5 text-violet-600" />
              </div>
              <p className="text-sm text-gray-600">Earnings (Est.)</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              ${(totalHours * Number(employee.payRate)).toFixed(0)}
            </p>
            <p className="text-xs text-gray-600 mt-1">Based on logged hours</p>
          </div>
        </div>

        <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Job Completion Rate</span>
                <span className="text-sm font-semibold text-gray-900">
                  {employee.assignments.length > 0
                    ? (
                        (employee.assignments.filter((a) => a.status === 'completed')
                          .length /
                          employee.assignments.length) *
                        100
                      ).toFixed(0)
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full"
                  style={{
                    width: `${
                      employee.assignments.length > 0
                        ? (employee.assignments.filter((a) => a.status === 'completed')
                            .length /
                            employee.assignments.length) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Attendance Rate</span>
                <span className="text-sm font-semibold text-gray-900">95%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full"
                  style={{ width: '95%' }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Customer Satisfaction</span>
                <span className="text-sm font-semibold text-gray-900">
                  {Number(employee.avgRating).toFixed(1)}/5.0
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-amber-500 to-yellow-500 h-2 rounded-full"
                  style={{ width: `${(Number(employee.avgRating) / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
