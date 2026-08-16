'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DollarSign, 
  QrCode, 
  Download, 
  Printer, 
  CheckCircle, 
  Clock, 
  Home, 
  User,
  Phone,
  Mail,
  CreditCard,
  Receipt,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from '@/lib/utils/date-utils';

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  unit: string;
  rentAmount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  property: string;
}

interface CashPayment {
  id: string;
  tenantId: string;
  amount: number;
  barcode: string;
  referenceId: string;
  createdAt: Date;
  status: 'pending' | 'completed' | 'expired';
  location: string;
}

export default function CashCollection() {
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [generatedPayments, setGeneratedPayments] = useState<CashPayment[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('walmart');

  // Mock tenant data
  const tenants: Tenant[] = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@email.com',
      phone: '555-0101',
      unit: 'A101',
      rentAmount: 1200,
      dueDate: '2024-01-01',
      status: 'pending',
      property: 'Sunset Apartments'
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@email.com',
      phone: '555-0102',
      unit: 'A102',
      rentAmount: 1350,
      dueDate: '2024-01-01',
      status: 'overdue',
      property: 'Sunset Apartments'
    },
    {
      id: '3',
      name: 'Bob Johnson',
      email: 'bob@email.com',
      phone: '555-0103',
      unit: 'B201',
      rentAmount: 1100,
      dueDate: '2024-01-05',
      status: 'paid',
      property: 'Sunset Apartments'
    }
  ];

  const cashPaymentLocations = [
    { id: 'walmart', name: 'Walmart', fee: 0.88, maxAmount: 3000 },
    { id: 'walgreens', name: 'Walgreens', fee: 0.99, maxAmount: 1000 },
    { id: '7eleven', name: '7-Eleven', fee: 1.50, maxAmount: 500 },
    { id: 'cvs', name: 'CVS Pharmacy', fee: 1.25, maxAmount: 1000 }
  ];

  // Generate barcode for cash payment using PayNearMe
  const generateCashPaymentBarcode = (tenant: Tenant, amount: number) => {
    const paymentData = {
      tenantId: tenant.id,
      tenantName: tenant.name,
      amount,
      propertyId: 'property-1', // Would come from selected property
      description: `Rent payment for ${tenant.unit}`,
      tenantInfo: {
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone
      },
      unitInfo: {
        unitNumber: tenant.unit,
        propertyName: tenant.property
      }
    };

    // Import PayNearMe service dynamically
    import('@/lib/services/paynearme-service').then(({ PayNearMeService }) => {
      PayNearMeService.generateCashPayment(paymentData).then(response => {
        if (response.success) {
          const cashPayment: CashPayment = {
            id: response.paymentId,
            tenantId: tenant.id,
            amount,
            barcode: response.barcodeData,
            referenceId: response.referenceId,
            createdAt: new Date(),
            status: 'pending',
            location: selectedLocation
          };

          setGeneratedPayments(prev => [cashPayment, ...prev]);
          
          // Show success message
          alert(`Payment barcode generated! Reference: ${response.referenceId}`);
        }
      }).catch(error => {
        console.error('Error generating payment:', error);
        alert('Failed to generate payment barcode');
      });
    });
  };

  const downloadBarcode = (payment: CashPayment) => {
    const barcodeData = {
      barcode: payment.barcode,
      referenceId: payment.referenceId,
      amount: payment.amount,
      location: payment.location,
      instructions: `
1. Show this barcode at ${payment.location}
2. Pay with cash + service fee
3. Keep the receipt
4. Payment will be processed within 24 hours
Reference ID: ${payment.referenceId}
      `.trim()
    };

    const blob = new Blob([JSON.stringify(barcodeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash-payment-${payment.referenceId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printBarcode = (payment: CashPayment) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Cash Payment Barcode - ${payment.referenceId}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
              .barcode { font-family: monospace; font-size: 24px; margin: 20px 0; }
              .info { margin: 10px 0; }
              .instructions { background: #f5f5f5; padding: 15px; margin: 20px 0; text-align: left; }
            </style>
          </head>
          <body>
            <h2>Property Flow HQ - Cash Payment</h2>
            <div class="info"><strong>Reference ID:</strong> ${payment.referenceId}</div>
            <div class="info"><strong>Amount:</strong> $${payment.amount.toFixed(2)}</div>
            <div class="info"><strong>Location:</strong> ${payment.location}</div>
            <div class="barcode">${payment.barcode}</div>
            <div class="instructions">
              <h3>Instructions:</h3>
              <ol>
                <li>Show this barcode at ${payment.location}</li>
                <li>Pay with cash + service fee</li>
                <li>Keep the receipt for your records</li>
                <li>Payment will be processed within 24 hours</li>
              </ol>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLocationInfo = (locationId: string) => {
    return cashPaymentLocations.find(loc => loc.id === locationId);
  };

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <DollarSign className="h-6 w-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Cash Collection</h1>
            <p className="text-slate-300">Generate barcodes for cash rent payments</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            <CreditCard className="h-3 w-3 mr-1" />
            Low-Cost Processing
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tenant Selection */}
        <Card className="modern-card lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="h-5 w-5" />
              Select Tenant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {tenants.map(tenant => (
                  <div
                    key={tenant.id}
                    onClick={() => {
                      setSelectedTenant(tenant);
                      setPaymentAmount(tenant.rentAmount.toString());
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedTenant?.id === tenant.id 
                        ? 'bg-green-500/20 border-green-400' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-white">{tenant?.name || 'Unknown Tenant'}</div>
                        <div className="text-sm text-slate-300">{tenant.unit} • {tenant.property}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            ${tenant.rentAmount}
                          </Badge>
                          <Badge className={getStatusColor(tenant.status)}>
                            {tenant.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    {selectedTenant?.id === tenant.id && (
                      <div className="mt-3 pt-3 border-t border-white/10 space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Phone className="h-3 w-3" />
                          {tenant.phone}
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <Mail className="h-3 w-3" />
                          {tenant.email}
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <Clock className="h-3 w-3" />
                          Due: {tenant.dueDate}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Payment Generation */}
        <Card className="modern-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Generate Cash Payment
            </CardTitle>
            <CardDescription className="text-slate-300">
              Create barcodes for tenants to pay rent with cash at participating locations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedTenant ? (
              <div className="text-center py-12">
                <User className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-400">Select a tenant to generate cash payment barcode</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Location Selection */}
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-2 block">Payment Location</label>
                  <div className="grid grid-cols-2 gap-2">
                    {cashPaymentLocations.map(location => (
                      <div
                        key={location.id}
                        onClick={() => setSelectedLocation(location.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedLocation === location.id 
                            ? 'bg-blue-500/20 border-blue-400' 
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="font-medium text-white">{location.name}</div>
                        <div className="text-xs text-slate-300">
                          Fee: ${location.fee} • Max: ${location.maxAmount}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-2 block">Payment Amount</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                      placeholder="Enter amount"
                    />
                    <Button
                      onClick={() => selectedTenant && setPaymentAmount(selectedTenant.rentAmount.toString())}
                      variant="outline"
                      size="sm"
                    >
                      Full Rent
                    </Button>
                  </div>
                  {(() => {
                    const locationInfo = getLocationInfo(selectedLocation);
                    if (!locationInfo) return null;
                    const amount = parseFloat(paymentAmount || '0');
                    if (Number.isNaN(amount)) return null;
                    return (
                      amount > locationInfo.maxAmount && (
                        <p className="text-xs text-red-400 mt-1">
                          Amount exceeds maximum for {locationInfo.name}
                        </p>
                      )
                    );
                  })()}
                </div>

                {/* Generate Button */}
                <Button
                  onClick={() => selectedTenant && generateCashPaymentBarcode(selectedTenant, parseFloat(paymentAmount))}
                  className="w-full btn-modern tablet-touch-target"
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Generate Cash Payment Barcode
                </Button>

                {/* Instructions */}
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-400/20">
                  <h4 className="font-medium text-blue-400 mb-2">How it works:</h4>
                  {(() => {
                    const locationInfo = getLocationInfo(selectedLocation);
                    return (
                      <ol className="text-sm text-slate-300 space-y-1 list-decimal list-inside">
                        <li>Generate barcode for tenant</li>
                        <li>Tenant shows barcode at {locationInfo?.name}</li>
                        <li>Tenant pays cash + service fee (${locationInfo?.fee})</li>
                        <li>Payment processes within 24 hours</li>
                        <li>Automatic rent payment update</li>
                      </ol>
                    );
                  })()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Generated Payments */}
      {generatedPayments.length > 0 && (
        <Card className="modern-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Generated Barcodes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {generatedPayments.map(payment => {
                  const tenant = tenants.find(t => t.id === payment.tenantId);
                  const locationInfo = getLocationInfo(payment.location);
                  
                  return (
                    <div key={payment.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-white">{tenant?.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {tenant?.unit}
                            </Badge>
                            <Badge className={getStatusColor(payment.status)}>
                              {payment.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-slate-300 mb-3">
                            <div>
                              <span className="font-medium">Reference ID:</span> {payment.referenceId}
                            </div>
                            <div>
                              <span className="font-medium">Amount:</span> ${payment.amount?.toFixed(2) || '0.00'}
                            </div>
                            <div>
                              <span className="font-medium">Location:</span> {locationInfo?.name}
                            </div>
                            <div>
                              <span className="font-medium">Fee:</span> ${locationInfo?.fee}
                            </div>
                          </div>
                          <div className="p-2 bg-black/50 rounded font-mono text-xs text-green-400 mb-3 break-all">
                            {payment.barcode}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Clock className="h-3 w-3" />
                            Generated {formatDistanceToNow(payment.createdAt, { addSuffix: true })}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadBarcode(payment)}
                            className="tablet-touch-target"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => printBarcode(payment)}
                            className="tablet-touch-target"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Partner Information */}
      <Card className="modern-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Cash Payment Partners
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {cashPaymentLocations.map(location => (
              <div key={location.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                <h4 className="font-medium text-white mb-2">{location.name}</h4>
                <div className="space-y-1 text-sm text-slate-300">
                  <div>Service Fee: ${location.fee}</div>
                  <div>Max Amount: ${location.maxAmount}</div>
                  <div>Processing: 24 hours</div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-400/20">
            <p className="text-sm text-green-400">
              <strong>Zero integration costs:</strong> No monthly fees, no setup costs. 
              Tenants pay only the small service fee at the retail location.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
