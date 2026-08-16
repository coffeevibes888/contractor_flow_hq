import Link from 'next/link';
import { CheckCircle, ArrowRight, Calendar, MessageSquare, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function QuoteAcceptedSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full bg-white shadow-2xl">
        <CardContent className="p-8 md:p-12">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-white" />
            </div>
          </div>

          {/* Success Message */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
              Quote Accepted! 🎉
            </h1>
            <p className="text-lg text-slate-600">
              Your job has been created and the contractor has been notified. They'll reach out soon to confirm the details and schedule the work.
            </p>
          </div>

          {/* Next Steps */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">What happens next?</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 font-bold">
                  1
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Contractor Confirmation</p>
                  <p className="text-sm text-slate-600">The contractor will review and confirm the job details</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 font-bold">
                  2
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Schedule Coordination</p>
                  <p className="text-sm text-slate-600">You'll work together to set a start date</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 font-bold">
                  3
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Work Begins</p>
                  <p className="text-sm text-slate-600">The contractor will complete the work as quoted</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 font-bold">
                  4
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Review & Payment</p>
                  <p className="text-sm text-slate-600">Approve the work and payment will be released</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid md:grid-cols-3 gap-3">
            <Link href="/homeowner/jobs" className="block">
              <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600">
                <Calendar className="h-4 w-4 mr-2" />
                View Jobs
              </Button>
            </Link>
            <Link href="/homeowner/quotes" className="block">
              <Button variant="outline" className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                My Quotes
              </Button>
            </Link>
            <Link href="/homeowner/dashboard" className="block">
              <Button variant="outline" className="w-full">
                <ArrowRight className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>

          {/* Help Text */}
          <div className="mt-8 pt-6 border-t text-center">
            <p className="text-sm text-slate-500 mb-2">
              Need help or have questions?
            </p>
            <Link href="/contact" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
              Contact Support →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
