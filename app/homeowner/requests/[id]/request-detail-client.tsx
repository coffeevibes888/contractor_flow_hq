'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LeadChat } from '@/components/contractor/lead-chat';
import { MapPin, Calendar, Clock, CheckCircle, MessageSquare, Star } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Contractor {
  id: string; // Contractor Profile ID
  businessName: string;
  displayName: string;
  slug: string;
  rating: number;
  jobsCompleted: number;
}

interface Match {
  id: string;
  status: string;
  matchScore: number;
  contractor: Contractor;
}

interface RequestDetailClientProps {
  lead: {
    id: string;
    projectType: string;
    projectDescription: string;
    urgency: string;
    status: string;
    createdAt: string;
  };
  matches: Match[];
  userId: string;
}

export default function RequestDetailClient({ lead, matches, userId }: RequestDetailClientProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(matches[0] || null);

  return (
    <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-120px)]">
      {/* Sidebar - Matches List */}
      <div className="lg:col-span-1 space-y-4 flex flex-col h-full">
        <Card className="bg-white/10 backdrop-blur-md border-white/20 flex-shrink-0">
          <CardHeader>
            <CardTitle className="text-white text-lg">Your Request</CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="font-semibold text-white">{lead.projectType}</h3>
            <p className="text-white/70 text-sm mt-1 line-clamp-2">{lead.projectDescription}</p>
            <div className="flex gap-2 mt-3">
              <Badge className="bg-blue-500/20 text-blue-200">{lead.status}</Badge>
              <Badge className="bg-purple-500/20 text-purple-200">{lead.urgency}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20 flex-1 overflow-hidden flex flex-col">
          <CardHeader>
            <CardTitle className="text-white text-lg">Matched Contractors ({matches.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-2 space-y-2">
            {matches.length === 0 ? (
              <div className="text-center py-8 text-white/50">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Finding best matches...</p>
              </div>
            ) : (
              matches.map((match) => (
                <div 
                  key={match.id}
                  onClick={() => setSelectedMatch(match)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                    selectedMatch?.id === match.id 
                      ? 'bg-blue-600/20 border-blue-500' 
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-white">{match.contractor.businessName}</h4>
                      <div className="flex items-center gap-2 text-xs text-white/60 mt-1">
                        <span className="flex items-center"><Star className="h-3 w-3 mr-1 text-yellow-400" /> {match.contractor.rating}</span>
                        <span>• {match.contractor.jobsCompleted} jobs</span>
                      </div>
                    </div>
                    <Badge variant="outline" className={
                      selectedMatch?.id === match.id ? 'text-blue-200 border-blue-500/50' : 'text-white/40 border-white/10'
                    }>
                      {match.matchScore}% Match
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Chat & Details */}
      <div className="lg:col-span-2 flex flex-col h-full">
        {selectedMatch ? (
          <div className="space-y-4 h-full flex flex-col">
            {/* Contractor Header */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20 flex-shrink-0">
              <CardContent className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    {matchInitials(selectedMatch.contractor.businessName)}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{selectedMatch.contractor.businessName}</h2>
                    <p className="text-white/60 text-sm">Member since 2024</p>
                  </div>
                </div>
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  View Profile
                </Button>
              </CardContent>
            </Card>

            {/* Chat Interface */}
            <div className="flex-1 min-h-0">
               <LeadChat 
                 contractorId={selectedMatch.contractor.id}
                 customerId={userId}
                 customerName="You"
                 leadId={lead.id}
                 viewMode="homeowner"
               />
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-white/50">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Select a contractor to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function matchInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}
