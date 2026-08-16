'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Building2, Users, Home, DollarSign, Mail, Phone, MapPin, Calendar } from 'lucide-react';

interface LandlordDetailModalProps {
  landlordId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface LandlordDetail {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  subdomain?: string;
  subscriptionTier: string;
  createdAt: string;
  properties: Array<{
    id: string;
    name: string;
    address: string;
    units: Array<{
      id: string;
      name: string;
      rent: number;
      status: string;
      tenant?: { name: string; email: string } | null;
    }>;
  }>;
  stats: {
    totalProperties: number;
    totalUnits: number;
    occupiedUnits: number;
    totalTenants: number;
    monthlyRevenue: number;
    yearlyRevenue: number;
    occupancyRate: number;
  };
}

export default function LandlordDetailModal({ landlordId, isOpen, onClose }: LandlordDetailModalProps) {
  const [landlord, setLandlord] = useState<LandlordDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (landlordId && isOpen) {
      fetchLandlordDetails();
    }
  }, [landlordId, isOpen]);

  const fetchLandlordDetails = async () => {
    if (!landlordId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/super-admin/landlord/${landlordId}`);
      if (res.ok) {
        const data = await res.json();
        setLandlord(data);
      }
    } catch (error) {
      console.error('Failed to fetch landlord details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Landlord Details
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : landlord ? (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Properties</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{landlord.stats.totalProperties}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Units</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{landlord.stats.totalUnits}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Tenants</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{landlord.stats.totalTenants}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Monthly Rev</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(landlord.stats.monthlyRevenue)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Subscription</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant={landlord.subscriptionTier === 'free' ? 'secondary' : 'default'}>
                      {landlord.subscriptionTier.toUpperCase()}
                    </Badge>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Occupancy Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{landlord.stats.occupancyRate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">
                      {landlord.stats.occupiedUnits} of {landlord.stats.totalUnits} units occupied
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="properties" className="space-y-4 mt-4">
              {landlord.properties.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No properties yet</p>
              ) : (
                landlord.properties.map((property) => (
                  <Card key={property.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        {property.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">{property.address}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {property.units.map((unit) => (
                          <div key={unit.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                            <div>
                              <span className="font-medium">{unit.name}</span>
                              <span className="text-muted-foreground ml-2">
                                {formatCurrency(unit.rent)}/mo
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {unit.tenant ? (
                                <Badge variant="default" className="text-xs">
                                  {unit.tenant.name}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">Vacant</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="contact" className="space-y-4 mt-4">
              <Card>
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium">{landlord.email}</p>
                    </div>
                  </div>
                  {landlord.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="text-sm font-medium">{landlord.phone}</p>
                      </div>
                    </div>
                  )}
                  {landlord.address && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Address</p>
                        <p className="text-sm font-medium">{landlord.address}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Member Since</p>
                      <p className="text-sm font-medium">
                        {new Date(landlord.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <p className="text-center text-muted-foreground py-8">Landlord not found</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
