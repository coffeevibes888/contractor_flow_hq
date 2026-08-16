'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  ArrowRight,
  Plus,
  Building2,
  Wand2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LeaseBuilderModal } from '@/components/admin/lease-builder';

interface LeaseDocument {
  id: string;
  name: string;
  type: string;
  isFieldsConfigured: boolean;
  createdAt: string;
  fileUrl: string | null;
}

interface Unit {
  id: string;
  name: string;
  type: string;
  rentAmount: number;
}

interface LeaseSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  propertyName: string;
  onComplete?: () => void;
}

export default function LeaseSelectionModal({
  open,
  onOpenChange,
  propertyId,
  propertyName,
  onComplete,
}: LeaseSelectionModalProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState<LeaseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  
  // Lease Builder state
  const [showLeaseBuilder, setShowLeaseBuilder] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [loadingUnits, setLoadingUnits] = useState(false);

  useEffect(() => {
    if (open) {
      fetchDocuments();
      fetchUnits();
    }
  }, [open, propertyId]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/legal-documents');
      if (res.ok) {
        const data = await res.json();
        // Filter to only show lease documents
        const leaseDocuments = (data.documents || []).filter(
          (doc: LeaseDocument) => doc.type === 'lease'
        );
        setDocuments(leaseDocuments);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    setLoadingUnits(true);
    try {
      const res = await fetch(`/api/properties?includeUnits=true`);
      if (res.ok) {
        const data = await res.json();
        const property = data.properties?.find((p: any) => p.id === propertyId);
        if (property?.units && property.units.length > 0) {
          const mappedUnits = property.units.map((u: any) => ({
            id: u.id,
            name: u.name,
            type: u.type || 'unit',
            rentAmount: Number(u.rentAmount) || 0,
          }));
          setUnits(mappedUnits);
          // Auto-select first unit if only one
          if (mappedUnits.length === 1) {
            setSelectedUnit(mappedUnits[0]);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch units:', error);
    } finally {
      setLoadingUnits(false);
    }
  };

  const handleStartLeaseBuilder = () => {
    if (units.length === 0) {
      // No units - that's fine, they can still create a lease template
      setSelectedUnit(null);
      setShowLeaseBuilder(true);
    } else if (units.length === 1) {
      setSelectedUnit(units[0]);
      setShowLeaseBuilder(true);
    } else {
      // If multiple units, just use the first one for now
      // Could add a unit selector here in the future
      setSelectedUnit(units[0]);
      setShowLeaseBuilder(true);
    }
  };

  const handleLeaseGenerated = async () => {
    // Refresh documents after lease is generated
    await fetchDocuments();
    setShowLeaseBuilder(false);
  };

  const handleAssignLease = async () => {
    if (!selectedDocId) return;

    setAssigning(true);
    try {
      const res = await fetch('/api/legal-documents/set-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: selectedDocId,
          propertyId,
        }),
      });

      if (res.ok) {
        onOpenChange(false);
        onComplete?.();
      } else {
        const error = await res.json();
        alert(error.message || 'Failed to assign lease');
      }
    } catch (error) {
      console.error('Failed to assign lease:', error);
      alert('Failed to assign lease');
    } finally {
      setAssigning(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    onComplete?.();
  };

  const handleGoToDocuments = () => {
    onOpenChange(false);
    router.push('/admin/legal-documents?returnTo=' + encodeURIComponent(`/admin/dashboard/properties/${propertyId}/edit`));
  };

  const configuredDocuments = documents.filter(d => d.isFieldsConfigured);
  const unconfiguredDocuments = documents.filter(d => !d.isFieldsConfigured);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-white/10 text-white w-[calc(100%-2rem)] max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl sm:rounded-2xl p-4 sm:p-6">
        <DialogHeader className="space-y-2 sm:space-y-3">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <FileText className="h-5 w-5 text-violet-400 flex-shrink-0" />
            Select Lease Template
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-sm sm:text-base">
            Choose a lease for <span className="text-white font-medium">{propertyName}</span>.
            <span className="block mt-2 text-amber-400 text-xs sm:text-sm">
              ⚠️ You won't be able to list units until a lease is assigned.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 mt-3 sm:mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-violet-400" />
            </div>
          ) : documents.length === 0 ? (
            /* No documents - prompt to create or upload */
            <div className="text-center py-6 sm:py-8 space-y-4 sm:space-y-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Wand2 className="h-7 w-7 sm:h-8 sm:w-8 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">Create Your Lease</h3>
                <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto px-2">
                  Use our free state-aware lease builder to create a comprehensive lease, or upload your own.
                </p>
              </div>
              
              {/* Create Lease - Primary Option */}
              <Card
                className={cn(
                  "bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 border-emerald-500/30 cursor-pointer hover:border-emerald-400 transition-all mx-2 sm:mx-0",
                  loadingUnits && "opacity-70 cursor-wait"
                )}
                onClick={loadingUnits ? undefined : handleStartLeaseBuilder}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                      {loadingUnits ? (
                        <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 text-white animate-spin" />
                      ) : (
                        <Wand2 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white text-sm sm:text-base">Create Custom Lease</p>
                        <Badge className="bg-emerald-500 text-white border-emerald-400 text-[10px] px-1.5">
                          <Sparkles className="h-3 w-3 mr-0.5" />
                          FREE
                        </Badge>
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                        State-aware lease with 20+ legal sections, disclosures & audit trail
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex items-center gap-3 px-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-slate-500">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 justify-center px-2 sm:px-0">
                <Button
                  onClick={handleGoToDocuments}
                  variant="outline"
                  className="border-violet-500/30 text-violet-300 hover:bg-violet-500/10 h-11 sm:h-10 text-sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Your Own Lease
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="text-slate-400 hover:text-slate-300 hover:bg-white/5 h-11 sm:h-10 text-sm"
                >
                  Skip for Now
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Ready to use documents */}
              {configuredDocuments.length > 0 && (
                <div className="space-y-2 sm:space-y-3">
                  <h3 className="text-xs sm:text-sm font-medium text-slate-300 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    Ready to Use ({configuredDocuments.length})
                  </h3>
                  <div className="grid gap-2 sm:gap-3">
                    {configuredDocuments.map((doc) => (
                      <Card
                        key={doc.id}
                        className={cn(
                          "cursor-pointer transition-all border-2",
                          selectedDocId === doc.id
                            ? "bg-violet-600/20 border-violet-500"
                            : "bg-white/5 border-white/10 hover:border-white/30"
                        )}
                        onClick={() => setSelectedDocId(doc.id)}
                      >
                        <CardContent className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                          <div className={cn(
                            "w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                            selectedDocId === doc.id ? "bg-violet-500" : "bg-white/10"
                          )}>
                            <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white text-sm sm:text-base truncate">{doc.name}</p>
                            <p className="text-[10px] sm:text-xs text-slate-400">
                              {new Date(doc.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] sm:text-xs px-1.5 sm:px-2">
                              <CheckCircle2 className="h-3 w-3 mr-0.5 sm:mr-1 hidden sm:inline" />
                              Ready
                            </Badge>
                            {selectedDocId === doc.id && (
                              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-violet-400" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Unconfigured documents */}
              {unconfiguredDocuments.length > 0 && (
                <div className="space-y-2 sm:space-y-3">
                  <h3 className="text-xs sm:text-sm font-medium text-slate-300 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                    Needs Setup ({unconfiguredDocuments.length})
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-500">
                    Can still be used with standard signature area.
                  </p>
                  <div className="grid gap-2 sm:gap-3">
                    {unconfiguredDocuments.map((doc) => (
                      <Card
                        key={doc.id}
                        className={cn(
                          "cursor-pointer transition-all border-2",
                          selectedDocId === doc.id
                            ? "bg-amber-600/20 border-amber-500"
                            : "bg-white/5 border-white/10 hover:border-white/30"
                        )}
                        onClick={() => setSelectedDocId(doc.id)}
                      >
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className={cn(
                              "w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                              selectedDocId === doc.id ? "bg-amber-500" : "bg-white/10"
                            )}>
                              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white text-sm sm:text-base truncate">{doc.name}</p>
                              <p className="text-[10px] sm:text-xs text-slate-400">
                                {new Date(doc.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            {selectedDocId === doc.id && (
                              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2 sm:mt-3 ml-12 sm:ml-14">
                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] sm:text-xs px-1.5 sm:px-2">
                              Basic Signing
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-violet-500/30 text-violet-400 hover:bg-violet-500/10 h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/admin/legal-documents?edit=${doc.id}`);
                              }}
                            >
                              Configure
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Create Custom Lease - Primary Option */}
              <Card
                className={cn(
                  "bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 border-emerald-500/30 cursor-pointer hover:border-emerald-400 transition-all",
                  loadingUnits && "opacity-70 cursor-wait"
                )}
                onClick={loadingUnits ? undefined : handleStartLeaseBuilder}
              >
                <CardContent className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
                    {loadingUnits ? (
                      <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 text-white animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white text-sm sm:text-base">Create Custom Lease</p>
                      <Badge className="bg-emerald-500 text-white border-emerald-400 text-[10px] px-1.5">
                        FREE
                      </Badge>
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-300">State-aware with disclosures & audit trail</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                </CardContent>
              </Card>

              {/* Upload new option */}
              <Card
                className="bg-white/5 border-white/10 border-dashed cursor-pointer hover:border-violet-500/50 transition-colors"
                onClick={handleGoToDocuments}
              >
                <CardContent className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-300 text-sm sm:text-base">Upload Your Own Lease</p>
                    <p className="text-[10px] sm:text-xs text-slate-500">Use your existing lease document</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-500 flex-shrink-0" />
                </CardContent>
              </Card>

              {/* Action buttons */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-white/10">
                <Button
                  variant="outline"
                  onClick={handleSkip}
                  className="border-white/20 text-slate-300 hover:bg-white/10 h-11 sm:h-10 text-sm"
                >
                  Skip for Now
                </Button>
                <Button
                  onClick={handleAssignLease}
                  disabled={!selectedDocId || assigning}
                  className="bg-violet-600 hover:bg-violet-700 h-11 sm:h-10 text-sm"
                >
                  {assigning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <Building2 className="h-4 w-4 mr-2" />
                      Assign to Property
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>

      {/* Lease Builder Modal */}
      {showLeaseBuilder && (
        <LeaseBuilderModal
          open={showLeaseBuilder}
          onClose={() => {
            setShowLeaseBuilder(false);
            setSelectedUnit(null);
          }}
          property={{
            id: propertyId,
            name: propertyName,
          }}
          unit={selectedUnit}
          onLeaseGenerated={handleLeaseGenerated}
        />
      )}
    </Dialog>
  );
}
