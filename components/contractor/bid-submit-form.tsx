'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DollarSign, Calendar, FileText, Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function BidSubmitForm({
  jobId,
  contractorId,
  jobTitle,
  jobBudget,
}: {
  jobId: string;
  contractorId: string;
  jobTitle: string;
  jobBudget?: { min: number; max: number };
}) {
  const router = useRouter();
  const [bidAmount, setBidAmount] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [bidMessage, setBidMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!bidAmount || Number(bidAmount) <= 0) {
      setError('Please enter a valid bid amount');
      return;
    }

    if (!deliveryDays || Number(deliveryDays) <= 0) {
      setError('Please enter estimated delivery days');
      return;
    }

    if (!bidMessage.trim()) {
      setError('Please include a proposal message');
      return;
    }

    // Check if bid is within budget range
    if (jobBudget) {
      const amount = Number(bidAmount);
      if (amount < jobBudget.min * 0.5) {
        if (!confirm('Your bid is significantly lower than the budget. Are you sure?')) {
          return;
        }
      }
      if (amount > jobBudget.max * 1.5) {
        if (!confirm('Your bid is significantly higher than the budget. Are you sure?')) {
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/contractor/jobs/${jobId}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractorId,
          bidAmount: Number(bidAmount),
          deliveryDays: Number(deliveryDays),
          bidMessage: bidMessage.trim(),
        }),
      });

      if (response.ok) {
        router.push('/contractor-dashboard/marketplace?success=bid_submitted');
        router.refresh();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to submit bid');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Submit Your Bid</h3>

        {/* Job Info */}
        <div className="rounded-lg bg-blue-50 border-2 border-blue-200 p-4 mb-6">
          <p className="text-sm font-medium text-blue-900 mb-1">Bidding on:</p>
          <p className="text-lg font-semibold text-gray-900">{jobTitle}</p>
          {jobBudget && (
            <p className="text-sm text-gray-600 mt-2">
              Customer Budget: ${jobBudget.min.toLocaleString()} - ${jobBudget.max.toLocaleString()}
            </p>
          )}
        </div>

        {/* Bid Amount */}
        <div className="mb-6">
          <label htmlFor="bidAmount" className="block text-sm font-medium text-gray-900 mb-2">
            Your Bid Amount *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <DollarSign className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="number"
              id="bidAmount"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder="Enter your bid amount"
              className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-gray-200 focus:outline-none focus:border-blue-400 text-lg font-semibold"
              step="0.01"
              min="0"
              required
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Be competitive! Lower bids are highlighted to customers.
          </p>
        </div>

        {/* Delivery Days */}
        <div className="mb-6">
          <label htmlFor="deliveryDays" className="block text-sm font-medium text-gray-900 mb-2">
            Estimated Completion Time *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="number"
              id="deliveryDays"
              value={deliveryDays}
              onChange={(e) => setDeliveryDays(e.target.value)}
              placeholder="Number of days"
              className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-gray-200 focus:outline-none focus:border-blue-400"
              min="1"
              required
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            How many days will it take to complete this job?
          </p>
        </div>

        {/* Proposal Message */}
        <div className="mb-6">
          <label htmlFor="bidMessage" className="block text-sm font-medium text-gray-900 mb-2">
            Proposal Message *
          </label>
          <div className="relative">
            <div className="absolute top-3 left-3 pointer-events-none">
              <FileText className="h-5 w-5 text-gray-400" />
            </div>
            <textarea
              id="bidMessage"
              value={bidMessage}
              onChange={(e) => setBidMessage(e.target.value)}
              placeholder="Explain why you're the best choice for this job. Include your experience, approach, and what makes your bid competitive..."
              className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-gray-200 focus:outline-none focus:border-blue-400 resize-none"
              rows={6}
              required
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            A detailed proposal increases your chances of winning the bid.
          </p>
        </div>

        {/* Tips */}
        <div className="rounded-lg bg-amber-50 border-2 border-amber-200 p-4 mb-6">
          <h4 className="text-sm font-semibold text-amber-900 mb-2">💡 Tips for Winning Bids</h4>
          <ul className="text-sm text-amber-800 space-y-1">
            <li>• Be competitive with your pricing</li>
            <li>• Provide a realistic timeline</li>
            <li>• Highlight your relevant experience</li>
            <li>• Explain your approach to the job</li>
            <li>• Respond quickly to customer questions</li>
          </ul>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-red-50 border-2 border-red-200 p-4 mb-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-6 border-t-2 border-gray-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={submitting}
            className="flex-1 border-2 border-gray-200"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting Bid...
              </>
            ) : (
              'Submit Bid'
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
