'use client';

import { useState } from 'react';
import { Shield, Lock, AlertTriangle, Activity, Ban, CheckCircle2, Globe, Layers, Zap, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

interface SecurityStats {
  usersWithout2FA: number;
  usersWithout2FAList: Array<{ id: string; email: string; role: string; name: string | null }>;
  failedLoginAttempts: number;
  blockedIPs: number;
  recentSecurityEvents: Array<{
    id: string;
    action: string;
    userId: string | null;
    ipAddress: string | null;
    severity: string;
    createdAt: string;
  }>;
  credentialStuffing: Array<{ ipAddress: string; failureCount: number; uniqueEmails: number }>;
  concurrentSessions: Array<{ userId: string; email: string | null; distinctIPs: number }>;
  newCountryAlerts: Array<{ email: string | null; from: string; to: string; at: string; ip: string | null }>;
  botSignupSuspects: Array<{ ipAddress: string; signupCount: number }>;
}

interface SecurityClientProps {
  stats: SecurityStats;
}

export default function SecurityClient({ stats }: SecurityClientProps) {
  const [blockedIPs, setBlockedIPs] = useState<string[]>([]);
  const { toast } = useToast();

  const handleBlockIP = async (ip: string) => {
    if (!ip || !confirm(`Block IP address ${ip}?`)) return;

    try {
      const res = await fetch('/api/super-admin/security/block-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ipAddress: ip }),
      });

      if (res.ok) {
        setBlockedIPs(prev => [...prev, ip]);
        toast({
          title: 'IP Blocked',
          description: `${ip} has been blocked`,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to block IP',
        variant: 'destructive',
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-500/20 text-red-400';
      case 'WARNING': return 'bg-amber-500/20 text-amber-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div>
        <h1 className='text-2xl font-bold text-white mb-2'>Security Dashboard</h1>
        <p className='text-sm text-slate-400'>Monitor security status and manage threats</p>
      </div>

      {/* Security Overview */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <div className='rounded-xl bg-gradient-to-r from-red-600 to-orange-600 p-4'>
          <div className='flex items-center gap-2 text-white/80 mb-2'>
            <Shield className='h-4 w-4' />
            <span className='text-xs'>Users Without 2FA</span>
          </div>
          <p className='text-2xl font-bold text-white'>{stats.usersWithout2FA}</p>
          <p className='text-xs text-white/60 mt-1'>Landlords at risk</p>
        </div>
        
        <div className='rounded-xl bg-slate-900/60 border border-white/10 p-4'>
          <div className='flex items-center gap-2 text-amber-400 mb-2'>
            <AlertTriangle className='h-4 w-4' />
            <span className='text-xs'>Failed Logins (24h)</span>
          </div>
          <p className='text-2xl font-bold text-amber-400'>{stats.failedLoginAttempts}</p>
        </div>
        
        <div className='rounded-xl bg-slate-900/60 border border-white/10 p-4'>
          <div className='flex items-center gap-2 text-red-400 mb-2'>
            <Ban className='h-4 w-4' />
            <span className='text-xs'>Blocked IPs</span>
          </div>
          <p className='text-2xl font-bold text-red-400'>{stats.blockedIPs}</p>
        </div>
        
        <div className='rounded-xl bg-slate-900/60 border border-white/10 p-4'>
          <div className='flex items-center gap-2 text-emerald-400 mb-2'>
            <CheckCircle2 className='h-4 w-4' />
            <span className='text-xs'>System Status</span>
          </div>
          <p className='text-2xl font-bold text-emerald-400'>Healthy</p>
        </div>
      </div>

      {/* Users Without 2FA */}
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <h2 className='text-lg font-semibold text-white flex items-center gap-2'>
            <Lock className='h-5 w-5 text-amber-400' />
            Landlords Without 2FA
          </h2>
          <span className='text-xs text-slate-400'>
            {stats.usersWithout2FAList.length} users need to enable 2FA
          </span>
        </div>
        
        <div className='rounded-xl bg-amber-950/20 border border-amber-800/30 p-4'>
          <p className='text-sm text-amber-200 mb-4'>
            These landlord accounts have access to financial data but haven't enabled two-factor authentication.
            Consider sending them a reminder to secure their accounts.
          </p>
          
          <div className='rounded-lg bg-slate-900/60 border border-white/10 overflow-hidden'>
            <Table>
              <TableHeader>
                <TableRow className='border-white/10'>
                  <TableHead className='text-slate-400'>Email</TableHead>
                  <TableHead className='text-slate-400'>Name</TableHead>
                  <TableHead className='text-slate-400'>Role</TableHead>
                  <TableHead className='text-slate-400'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.usersWithout2FAList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className='text-center text-emerald-400 py-8'>
                      ✓ All landlords have 2FA enabled
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.usersWithout2FAList.slice(0, 10).map((user) => (
                    <TableRow key={user.id} className='border-white/5'>
                      <TableCell className='text-white'>{user.email}</TableCell>
                      <TableCell className='text-slate-300'>{user.name || '-'}</TableCell>
                      <TableCell className='text-slate-400'>{user.role}</TableCell>
                      <TableCell>
                        <Button variant='outline' size='sm'>
                          Send Reminder
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Recent Security Events */}
      <div className='space-y-4'>
        <h2 className='text-lg font-semibold text-white flex items-center gap-2'>
          <Activity className='h-5 w-5 text-violet-400' />
          Recent Security Events
        </h2>
        
        <div className='rounded-xl bg-slate-900/60 border border-white/10 overflow-hidden'>
          <Table>
            <TableHeader>
              <TableRow className='border-white/10'>
                <TableHead className='text-slate-400'>Time</TableHead>
                <TableHead className='text-slate-400'>Event</TableHead>
                <TableHead className='text-slate-400'>Severity</TableHead>
                <TableHead className='text-slate-400'>IP Address</TableHead>
                <TableHead className='text-slate-400'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.recentSecurityEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className='text-center text-slate-500 py-8'>
                    No recent security events
                  </TableCell>
                </TableRow>
              ) : (
                stats.recentSecurityEvents.map((event) => (
                  <TableRow key={event.id} className='border-white/5'>
                    <TableCell className='text-slate-300 text-xs'>
                      {new Date(event.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className='text-white'>{event.action}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(event.severity)}`}>
                        {event.severity}
                      </span>
                    </TableCell>
                    <TableCell className='text-slate-300'>{event.ipAddress || '-'}</TableCell>
                    <TableCell>
                      {event.ipAddress && !blockedIPs.includes(event.ipAddress) && (
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => handleBlockIP(event.ipAddress!)}
                          className='text-red-400 hover:text-red-300 hover:bg-red-500/10'
                        >
                          <Ban className='h-4 w-4 mr-1' />
                          Block
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Threat Intelligence Panels ── */}

      {/* Credential Stuffing */}
      {stats.credentialStuffing.length > 0 && (
        <div className='space-y-3'>
          <h2 className='text-lg font-semibold text-white flex items-center gap-2'>
            <Zap className='h-5 w-5 text-red-400' />
            Credential Stuffing — Live (last 60s)
            <span className='ml-2 rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400'>
              {stats.credentialStuffing.length} IP{stats.credentialStuffing.length > 1 ? 's' : ''}
            </span>
          </h2>
          <div className='rounded-xl bg-red-950/20 border border-red-800/30 overflow-hidden'>
            <Table>
              <TableHeader>
                <TableRow className='border-white/10'>
                  <TableHead className='text-slate-400'>IP Address</TableHead>
                  <TableHead className='text-slate-400'>Failures (60s)</TableHead>
                  <TableHead className='text-slate-400'>Unique Emails</TableHead>
                  <TableHead className='text-slate-400'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.credentialStuffing.map((row) => (
                  <TableRow key={row.ipAddress} className='border-white/5'>
                    <TableCell className='font-mono text-sm text-white'>{row.ipAddress}</TableCell>
                    <TableCell>
                      <span className='rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-400'>
                        {row.failureCount}
                      </span>
                    </TableCell>
                    <TableCell className='text-slate-300'>{row.uniqueEmails}</TableCell>
                    <TableCell>
                      <Button
                        variant='ghost' size='sm'
                        onClick={() => handleBlockIP(row.ipAddress)}
                        className='text-red-400 hover:text-red-300 hover:bg-red-500/10'
                      >
                        <Ban className='h-4 w-4 mr-1' /> Block
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* New-Country Logins */}
      {stats.newCountryAlerts.length > 0 && (
        <div className='space-y-3'>
          <h2 className='text-lg font-semibold text-white flex items-center gap-2'>
            <Globe className='h-5 w-5 text-amber-400' />
            New-Country Logins (24h)
          </h2>
          <div className='rounded-xl bg-amber-950/20 border border-amber-800/30 overflow-hidden'>
            <Table>
              <TableHeader>
                <TableRow className='border-white/10'>
                  <TableHead className='text-slate-400'>User</TableHead>
                  <TableHead className='text-slate-400'>From</TableHead>
                  <TableHead className='text-slate-400'>To</TableHead>
                  <TableHead className='text-slate-400'>When</TableHead>
                  <TableHead className='text-slate-400'>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.newCountryAlerts.map((row, i) => (
                  <TableRow key={i} className='border-white/5'>
                    <TableCell className='text-white text-sm'>{row.email ?? '—'}</TableCell>
                    <TableCell className='text-slate-300'>{row.from}</TableCell>
                    <TableCell>
                      <span className='rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400'>{row.to}</span>
                    </TableCell>
                    <TableCell className='text-slate-400 text-xs'>
                      {new Date(row.at).toLocaleString()}
                    </TableCell>
                    <TableCell className='font-mono text-xs text-slate-400'>{row.ip ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Concurrent Sessions */}
      {stats.concurrentSessions.length > 0 && (
        <div className='space-y-3'>
          <h2 className='text-lg font-semibold text-white flex items-center gap-2'>
            <Layers className='h-5 w-5 text-violet-400' />
            Concurrent Sessions — 3+ IPs (1h)
          </h2>
          <div className='rounded-xl bg-violet-950/20 border border-violet-800/30 overflow-hidden'>
            <Table>
              <TableHeader>
                <TableRow className='border-white/10'>
                  <TableHead className='text-slate-400'>User</TableHead>
                  <TableHead className='text-slate-400'>Distinct IPs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.concurrentSessions.map((row) => (
                  <TableRow key={row.userId} className='border-white/5'>
                    <TableCell className='text-white text-sm'>{row.email ?? row.userId}</TableCell>
                    <TableCell>
                      <span className='rounded-full bg-violet-500/20 px-2 py-0.5 text-xs font-bold text-violet-400'>
                        {row.distinctIPs} IPs
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Bot Signup Suspects */}
      {stats.botSignupSuspects.length > 0 && (
        <div className='space-y-3'>
          <h2 className='text-lg font-semibold text-white flex items-center gap-2'>
            <Bot className='h-5 w-5 text-orange-400' />
            Bot Signup Suspects (24h)
          </h2>
          <p className='text-xs text-slate-500'>IPs that created 3 or more accounts in 24 hours.</p>
          <div className='rounded-xl bg-orange-950/20 border border-orange-800/30 overflow-hidden'>
            <Table>
              <TableHeader>
                <TableRow className='border-white/10'>
                  <TableHead className='text-slate-400'>IP Address</TableHead>
                  <TableHead className='text-slate-400'>Signups</TableHead>
                  <TableHead className='text-slate-400'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.botSignupSuspects.map((row) => (
                  <TableRow key={row.ipAddress} className='border-white/5'>
                    <TableCell className='font-mono text-sm text-white'>{row.ipAddress}</TableCell>
                    <TableCell>
                      <span className='rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-bold text-orange-400'>
                        {row.signupCount}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant='ghost' size='sm'
                        onClick={() => handleBlockIP(row.ipAddress)}
                        className='text-red-400 hover:text-red-300 hover:bg-red-500/10'
                      >
                        <Ban className='h-4 w-4 mr-1' /> Block
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Security Recommendations */}
      <div className='space-y-4'>
        <h2 className='text-lg font-semibold text-white'>Security Recommendations</h2>
        <div className='grid md:grid-cols-2 gap-4'>
          <div className='rounded-xl bg-slate-900/60 border border-white/10 p-4'>
            <div className='flex items-start gap-3'>
              <div className='rounded-lg bg-emerald-500/20 p-2'>
                <CheckCircle2 className='h-5 w-5 text-emerald-400' />
              </div>
              <div>
                <h3 className='font-medium text-white'>Rate Limiting Active</h3>
                <p className='text-sm text-slate-400 mt-1'>
                  API endpoints are protected against brute force attacks
                </p>
              </div>
            </div>
          </div>
          
          <div className='rounded-xl bg-slate-900/60 border border-white/10 p-4'>
            <div className='flex items-start gap-3'>
              <div className='rounded-lg bg-emerald-500/20 p-2'>
                <CheckCircle2 className='h-5 w-5 text-emerald-400' />
              </div>
              <div>
                <h3 className='font-medium text-white'>Audit Logging Enabled</h3>
                <p className='text-sm text-slate-400 mt-1'>
                  All sensitive operations are being logged
                </p>
              </div>
            </div>
          </div>
          
          <div className='rounded-xl bg-slate-900/60 border border-white/10 p-4'>
            <div className='flex items-start gap-3'>
              <div className='rounded-lg bg-emerald-500/20 p-2'>
                <CheckCircle2 className='h-5 w-5 text-emerald-400' />
              </div>
              <div>
                <h3 className='font-medium text-white'>Security Headers</h3>
                <p className='text-sm text-slate-400 mt-1'>
                  HSTS, CSP, and other security headers are configured
                </p>
              </div>
            </div>
          </div>
          
          <div className='rounded-xl bg-slate-900/60 border border-white/10 p-4'>
            <div className='flex items-start gap-3'>
              <div className='rounded-lg bg-emerald-500/20 p-2'>
                <CheckCircle2 className='h-5 w-5 text-emerald-400' />
              </div>
              <div>
                <h3 className='font-medium text-white'>Data Encryption</h3>
                <p className='text-sm text-slate-400 mt-1'>
                  Sensitive data is encrypted at rest and in transit
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
