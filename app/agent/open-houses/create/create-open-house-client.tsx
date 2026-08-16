'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, MapPin, Save, Loader2, ArrowLeft, Video, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';

interface Listing {
  id: string;
  title: string;
  address: any;
}

interface CreateOpenHouseClientProps {
  agentId: string;
  listings: Listing[];
}

export default function CreateOpenHouseClient({ agentId, listings }: CreateOpenHouseClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    listingId: '',
    date: '',
    startTime: '14:00',
    endTime: '17:00',
    notes: '',
    isVirtual: false,
    virtualLink: '',
    rsvpEnabled: false,
    maxAttendees: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (!formData.listingId) {
      setError('Please select a listing');
      setIsSubmitting(false);
      return;
    }

    if (!formData.date) {
      setError('Please select a date');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/agent/open-houses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/agent/open-houses');
      } else {
        setError(data.error || 'Failed to schedule open house');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const timeOptions = [];
  for (let h = 8; h <= 20; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour = h.toString().padStart(2, '0');
      const minute = m.toString().padStart(2, '0');
      timeOptions.push(`${hour}:${minute}`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="text-white hover:bg-white/10">
          <Link href="/agent/open-houses">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-white">Schedule Open House</h1>
          <p className="text-slate-300 mt-1">Create a new open house event</p>
        </div>
      </div>

      {listings.length === 0 ? (
        <Card className="bg-slate-800/50 backdrop-blur-sm border-white/10">
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 mx-auto text-slate-500 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Active Listings</h3>
            <p className="text-slate-400 mb-4">You need at least one active listing to schedule an open house.</p>
            <Button asChild className="bg-violet-600 hover:bg-violet-700">
              <Link href="/agent/listings/create">Create a Listing</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Select Listing */}
          <Card className="bg-slate-800/50 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <MapPin className="h-5 w-5 text-violet-400" />
                Select Property
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label className="text-slate-300">Which listing is this open house for?</Label>
                <Select
                  value={formData.listingId}
                  onValueChange={(value) => setFormData({ ...formData, listingId: value })}
                >
                  <SelectTrigger className="bg-slate-700/50 border-white/10 text-white">
                    <SelectValue placeholder="Select a listing" />
                  </SelectTrigger>
                  <SelectContent>
                    {listings.map((listing) => (
                      <SelectItem key={listing.id} value={listing.id}>
                        {listing.title} - {listing.address?.city || 'No address'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Date & Time */}
          <Card className="bg-slate-800/50 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Calendar className="h-5 w-5 text-violet-400" />
                Date & Time
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="bg-slate-700/50 border-white/10 text-white"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Start Time
                  </Label>
                  <Select
                    value={formData.startTime}
                    onValueChange={(value) => setFormData({ ...formData, startTime: value })}
                  >
                    <SelectTrigger className="bg-slate-700/50 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    End Time
                  </Label>
                  <Select
                    value={formData.endTime}
                    onValueChange={(value) => setFormData({ ...formData, endTime: value })}
                  >
                    <SelectTrigger className="bg-slate-700/50 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Virtual Option */}
          <Card className="bg-slate-800/50 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Video className="h-5 w-5 text-violet-400" />
                Virtual Open House
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-slate-300">Enable Virtual Tour</Label>
                  <p className="text-sm text-slate-500">Allow attendees to join virtually via video link</p>
                </div>
                <Switch
                  checked={formData.isVirtual}
                  onCheckedChange={(checked) => setFormData({ ...formData, isVirtual: checked })}
                />
              </div>
              {formData.isVirtual && (
                <div className="space-y-2">
                  <Label className="text-slate-300">Virtual Meeting Link</Label>
                  <Input
                    type="url"
                    value={formData.virtualLink}
                    onChange={(e) => setFormData({ ...formData, virtualLink: e.target.value })}
                    placeholder="https://zoom.us/j/..."
                    className="bg-slate-700/50 border-white/10 text-white placeholder:text-slate-500"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* RSVP Settings */}
          <Card className="bg-slate-800/50 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="h-5 w-5 text-violet-400" />
                RSVP Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-slate-300">Enable RSVP</Label>
                  <p className="text-sm text-slate-500">Allow visitors to RSVP for the open house</p>
                </div>
                <Switch
                  checked={formData.rsvpEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, rsvpEnabled: checked })}
                />
              </div>
              {formData.rsvpEnabled && (
                <div className="space-y-2">
                  <Label className="text-slate-300">Maximum Attendees (Optional)</Label>
                  <Input
                    type="number"
                    value={formData.maxAttendees}
                    onChange={(e) => setFormData({ ...formData, maxAttendees: e.target.value })}
                    placeholder="Leave empty for unlimited"
                    className="bg-slate-700/50 border-white/10 text-white placeholder:text-slate-500"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="bg-slate-800/50 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any special instructions or notes for visitors..."
                rows={3}
                className="bg-slate-700/50 border-white/10 text-white placeholder:text-slate-500"
              />
            </CardContent>
          </Card>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" asChild className="border-white/20 text-white hover:bg-white/10">
              <Link href="/agent/open-houses">Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Schedule Open House
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
