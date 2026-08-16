'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Camera, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  MapPin, 
  Home, 
  Wrench, 
  FileText,
  Phone,
  Mail,
  Clock,
  Navigation,
  Download,
  Upload
} from 'lucide-react';
import { formatDistanceToNow } from '@/lib/utils/date-utils';

interface Property {
  id: string;
  name: string;
  address: string;
  units: Array<{
    id: string;
    unitNumber: string;
    tenant?: {
      name: string;
      email: string;
      phone: string;
    } | null;
    status: string;
  }>;
}

interface InspectionItem {
  id: string;
  category: string;
  item: string;
  status: 'pass' | 'fail' | 'warning';
  notes: string;
  photos: string[];
  timestamp: Date;
}

export default function InspectionMode() {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [inspectionItems, setInspectionItems] = useState<InspectionItem[]>([]);
  const [currentCategory, setCurrentCategory] = useState('exterior');
  const [notes, setNotes] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Mock data for demo
  const properties: Property[] = [
    {
      id: '1',
      name: 'Sunset Apartments',
      address: '123 Main St, Las Vegas, NV 89101',
      units: [
        { id: '1', unitNumber: 'A101', tenant: { name: 'John Doe', email: 'john@email.com', phone: '555-0101' }, status: 'occupied' },
        { id: '2', unitNumber: 'A102', tenant: { name: 'Jane Smith', email: 'jane@email.com', phone: '555-0102' }, status: 'occupied' },
        { id: '3', unitNumber: 'B201', tenant: null, status: 'vacant' },
      ]
    }
  ];

  const inspectionCategories = {
    exterior: [
      'Roof condition',
      'Siding/Walls',
      'Windows/Doors',
      'Foundation',
      'Landscaping',
      'Parking lot',
      'Lighting',
      'Signage'
    ],
    interior: [
      'Walls/Ceilings',
      'Floors',
      'Doors/Locks',
      'Windows',
      'Electrical outlets',
      'Light fixtures',
      'Smoke detectors',
      'HVAC system'
    ],
    kitchen: [
      'Appliances',
      'Cabinets',
      'Countertops',
      'Sink/Faucet',
      'Flooring',
      'Backsplash',
      'Lighting',
      'Ventilation'
    ],
    bathroom: [
      'Toilet',
      'Sink/Vanity',
      'Shower/Tub',
      'Flooring',
      'Ventilation',
      'Mirrors',
      'Caulking',
      'Lighting'
    ],
    safety: [
      'Smoke detectors',
      'Carbon monoxide detectors',
      'Fire extinguishers',
      'Emergency exits',
      'Handrails',
      'GFCI outlets',
      'Electrical panel',
      'Water heater'
    ]
  };

  // Get user location
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Location error:', error);
        }
      );
    }

    // Check online status
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInspectionItem = (item: string, status: 'pass' | 'fail' | 'warning') => {
    const inspectionItem: InspectionItem = {
      id: Date.now().toString(),
      category: currentCategory,
      item,
      status,
      notes,
      photos: [],
      timestamp: new Date()
    };

    setInspectionItems(prev => [...prev, inspectionItem]);
    setNotes('');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'bg-green-100 text-green-800';
      case 'fail':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const exportReport = () => {
    const report = {
      property: selectedProperty?.name,
      unit: selectedUnit?.unitNumber,
      date: new Date().toISOString(),
      location,
      items: inspectionItems,
      summary: {
        total: inspectionItems.length,
        passed: inspectionItems.filter(i => i.status === 'pass').length,
        failed: inspectionItems.filter(i => i.status === 'fail').length,
        warnings: inspectionItems.filter(i => i.status === 'warning').length
      }
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspection-report-${selectedProperty?.name}-${selectedUnit?.unitNumber}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Camera className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Inspection Mode</h1>
            <p className="text-slate-300">On-site property inspection tools</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={isOnline ? "default" : "destructive"} className="tablet-hidden">
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </Badge>
          {location && (
            <Badge variant="outline" className="tablet-hidden">
              <Navigation className="h-3 w-3 mr-1" />
              Location Active
            </Badge>
          )}
          <Button onClick={exportReport} variant="outline" size="sm" className="tablet-touch-target">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Property & Unit Selection */}
        <Card className="modern-card lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Home className="h-5 w-5" />
              Property Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Property</label>
              <select
                value={selectedProperty?.id || ''}
                onChange={(e) => {
                  const property = properties.find(p => p.id === e.target.value);
                  setSelectedProperty(property || null);
                  setSelectedUnit(null);
                }}
                className="w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white"
              >
                <option value="">Select Property</option>
                {properties.map(property => (
                  <option key={property.id} value={property.id}>{property.name}</option>
                ))}
              </select>
            </div>

            {selectedProperty && (
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">Unit</label>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {selectedProperty.units.map(unit => (
                      <div
                        key={unit.id}
                        onClick={() => setSelectedUnit(unit)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedUnit?.id === unit.id 
                            ? 'bg-blue-500/20 border-blue-400' 
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-white">{unit.unitNumber}</div>
                            <div className="text-xs text-slate-400">
                              {unit.tenant ? unit.tenant.name : 'Vacant'}
                            </div>
                          </div>
                          <Badge variant={unit.status === 'occupied' ? 'default' : 'secondary'}>
                            {unit.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {selectedUnit && selectedUnit.tenant && (
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <h4 className="font-medium text-white mb-2">Tenant Contact</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Phone className="h-3 w-3" />
                    {selectedUnit.tenant.phone}
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Mail className="h-3 w-3" />
                    {selectedUnit.tenant.email}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inspection Checklist */}
        <Card className="modern-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Inspection Checklist
            </CardTitle>
            <CardDescription className="text-slate-300">
              {selectedProperty?.name} - {selectedUnit?.unitNumber || 'Select unit'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedUnit ? (
              <div className="text-center py-12">
                <Home className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-400">Select a unit to begin inspection</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Category Tabs */}
                <div className="flex flex-wrap gap-2">
                  {Object.keys(inspectionCategories).map(category => (
                    <Button
                      key={category}
                      variant={currentCategory === category ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentCategory(category)}
                      className="tablet-touch-target"
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Button>
                  ))}
                </div>

                {/* Checklist Items */}
                <div className="space-y-3">
                  {inspectionCategories[currentCategory as keyof typeof inspectionCategories].map(item => (
                    <div key={item} className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-white">{item}</span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleInspectionItem(item, 'pass')}
                            className="tablet-touch-target"
                          >
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleInspectionItem(item, 'warning')}
                            className="tablet-touch-target"
                          >
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleInspectionItem(item, 'fail')}
                            className="tablet-touch-target"
                          >
                            <XCircle className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        placeholder="Add notes for this item..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                        rows={2}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Inspection Results */}
      {inspectionItems.length > 0 && (
        <Card className="modern-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Inspection Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{inspectionItems.length}</div>
                <div className="text-sm text-slate-300">Total Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {inspectionItems.filter(i => i.status === 'pass').length}
                </div>
                <div className="text-sm text-slate-300">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {inspectionItems.filter(i => i.status === 'warning').length}
                </div>
                <div className="text-sm text-slate-300">Warnings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">
                  {inspectionItems.filter(i => i.status === 'fail').length}
                </div>
                <div className="text-sm text-slate-300">Failed</div>
              </div>
            </div>

            <ScrollArea className="h-64">
              <div className="space-y-2">
                {inspectionItems.map(item => (
                  <div key={item.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(item.status)}
                          <span className="font-medium text-white">{item.item}</span>
                          <Badge variant="outline" className="text-xs">
                            {item.category}
                          </Badge>
                        </div>
                        {item.notes && (
                          <p className="text-sm text-slate-300 mb-1">{item.notes}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
