'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import HeatmapViewer from './heatmap-viewer';
import { 
  Activity, 
  Users, 
  MousePointerClick, 
  TrendingUp, 
  Clock, 
  ArrowDown,
  Eye,
  Target,
  MapPin,
  Smartphone,
  Monitor,
  Tablet,
  Globe
} from 'lucide-react';

interface AnalyticsData {
  summary: {
    totalPageViews: number;
    uniqueVisitors: number;
    totalSessions: number;
    conversions: number;
    conversionRate: number;
    avgTimeOnPage: number;
    bounceRate: number;
    avgScrollDepth: number;
  };
  topPages: Array<{ path: string; views: number }>;
  topExitPages: Array<{ path: string; exits: number }>;
  trafficSources: Array<{ source: string; count: number }>;
  devices: Record<string, number>;
  topCountries: Array<{ country: string; count: number }>;
  formStats: Record<string, { started: number; completed: number; abandoned: number }>;
  funnelAnalysis: Record<string, { total: number; completed: number }>;
  heatmapData: Record<string, Array<{ x: number | null; y: number | null; element: string; text: string | null }>>;
  timeSeriesData: Record<string, number>;
  recentSessions: Array<any>;
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedPage, setSelectedPage] = useState<string>('/');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/super-admin/analytics?range=${timeRange}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6'>
        <div className='max-w-7xl mx-auto'>
          <div className='text-white text-center py-20'>
            <Activity className='h-12 w-12 animate-spin mx-auto mb-4' />
            <p>Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  const { summary } = data;

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6'>
      <div className='max-w-7xl mx-auto space-y-6'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold text-white'>Analytics Dashboard</h1>
            <p className='text-slate-300 mt-1'>Track visitor behavior and optimize conversions</p>
          </div>
          
          {/* Time Range Selector */}
          <div className='flex gap-2'>
            {['24h', '7d', '30d', '90d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  timeRange === range
                    ? 'bg-violet-500 text-white'
                    : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'
                }`}
              >
                {range === '24h' ? 'Last 24h' : `Last ${range.replace('d', ' days')}`}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <Card className='bg-slate-800/60 border-white/10'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-slate-300 flex items-center gap-2'>
                <Eye className='h-4 w-4' />
                Page Views
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-bold text-white'>{summary.totalPageViews.toLocaleString()}</div>
              <p className='text-xs text-slate-400 mt-1'>{summary.uniqueVisitors.toLocaleString()} unique visitors</p>
            </CardContent>
          </Card>

          <Card className='bg-slate-800/60 border-white/10'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-slate-300 flex items-center gap-2'>
                <Users className='h-4 w-4' />
                Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-bold text-white'>{summary.totalSessions.toLocaleString()}</div>
              <p className='text-xs text-slate-400 mt-1'>Active user sessions</p>
            </CardContent>
          </Card>

          <Card className='bg-slate-800/60 border-white/10'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-slate-300 flex items-center gap-2'>
                <Target className='h-4 w-4' />
                Conversion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-bold text-emerald-400'>{summary.conversionRate}%</div>
              <p className='text-xs text-slate-400 mt-1'>{summary.conversions} conversions</p>
            </CardContent>
          </Card>

          <Card className='bg-slate-800/60 border-white/10'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-slate-300 flex items-center gap-2'>
                <Clock className='h-4 w-4' />
                Avg Time on Page
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-bold text-white'>{summary.avgTimeOnPage}s</div>
              <p className='text-xs text-slate-400 mt-1'>{summary.avgScrollDepth}% avg scroll depth</p>
            </CardContent>
          </Card>
        </div>

        {/* Engagement Metrics */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <Card className='bg-slate-800/60 border-white/10'>
            <CardHeader>
              <CardTitle className='text-white flex items-center gap-2'>
                <TrendingUp className='h-5 w-5' />
                Top Pages
              </CardTitle>
              <CardDescription className='text-slate-400'>Most visited pages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {data.topPages.map((page, idx) => (
                  <div key={idx} className='flex items-center justify-between'>
                    <div className='flex-1'>
                      <p className='text-sm text-white font-medium truncate'>{page.path}</p>
                      <div className='w-full bg-slate-700/50 rounded-full h-2 mt-1'>
                        <div
                          className='bg-violet-500 h-2 rounded-full'
                          style={{ width: `${(page.views / data.topPages[0].views) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className='text-sm text-slate-300 ml-4'>{page.views}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className='bg-slate-800/60 border-white/10'>
            <CardHeader>
              <CardTitle className='text-white flex items-center gap-2'>
                <ArrowDown className='h-5 w-5 text-red-400' />
                Exit Pages
              </CardTitle>
              <CardDescription className='text-slate-400'>Where visitors leave</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {data.topExitPages.map((page, idx) => (
                  <div key={idx} className='flex items-center justify-between'>
                    <div className='flex-1'>
                      <p className='text-sm text-white font-medium truncate'>{page.path}</p>
                      <div className='w-full bg-slate-700/50 rounded-full h-2 mt-1'>
                        <div
                          className='bg-red-500 h-2 rounded-full'
                          style={{ width: `${(page.exits / data.topExitPages[0].exits) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className='text-sm text-slate-300 ml-4'>{page.exits}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Traffic Sources & Devices */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <Card className='bg-slate-800/60 border-white/10'>
            <CardHeader>
              <CardTitle className='text-white flex items-center gap-2'>
                <Globe className='h-5 w-5' />
                Traffic Sources
              </CardTitle>
              <CardDescription className='text-slate-400'>Where visitors come from</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {data.trafficSources.slice(0, 8).map((source, idx) => (
                  <div key={idx} className='flex items-center justify-between'>
                    <span className='text-sm text-white'>{source.source}</span>
                    <div className='flex items-center gap-2'>
                      <div className='w-32 bg-slate-700/50 rounded-full h-2'>
                        <div
                          className='bg-cyan-500 h-2 rounded-full'
                          style={{ width: `${(source.count / data.trafficSources[0].count) * 100}%` }}
                        />
                      </div>
                      <span className='text-sm text-slate-300 w-12 text-right'>{source.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className='bg-slate-800/60 border-white/10'>
            <CardHeader>
              <CardTitle className='text-white flex items-center gap-2'>
                <Smartphone className='h-5 w-5' />
                Device Breakdown
              </CardTitle>
              <CardDescription className='text-slate-400'>Visitor devices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {Object.entries(data.devices).map(([device, count]) => {
                  const Icon = device === 'mobile' ? Smartphone : device === 'tablet' ? Tablet : Monitor;
                  const total = Object.values(data.devices).reduce((a, b) => a + b, 0);
                  const percentage = Math.round((count / total) * 100);
                  
                  return (
                    <div key={device} className='flex items-center gap-4'>
                      <Icon className='h-5 w-5 text-slate-400' />
                      <div className='flex-1'>
                        <div className='flex items-center justify-between mb-1'>
                          <span className='text-sm text-white capitalize'>{device}</span>
                          <span className='text-sm text-slate-300'>{percentage}%</span>
                        </div>
                        <div className='w-full bg-slate-700/50 rounded-full h-2'>
                          <div
                            className='bg-emerald-500 h-2 rounded-full'
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <span className='text-sm text-slate-400 w-16 text-right'>{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Geographic Data */}
        <Card className='bg-slate-800/60 border-white/10'>
          <CardHeader>
            <CardTitle className='text-white flex items-center gap-2'>
              <MapPin className='h-5 w-5' />
              Geographic Distribution
            </CardTitle>
            <CardDescription className='text-slate-400'>Top countries by visitors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4'>
              {data.topCountries.map((country, idx) => (
                <div key={idx} className='bg-slate-700/30 rounded-lg p-4 text-center'>
                  <p className='text-2xl font-bold text-white'>{country.count}</p>
                  <p className='text-xs text-slate-400 mt-1'>{country.country}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Form Analytics */}
        {Object.keys(data.formStats).length > 0 && (
          <Card className='bg-slate-800/60 border-white/10'>
            <CardHeader>
              <CardTitle className='text-white flex items-center gap-2'>
                <MousePointerClick className='h-5 w-5' />
                Form Performance
              </CardTitle>
              <CardDescription className='text-slate-400'>Form completion rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {Object.entries(data.formStats).map(([formId, stats]) => {
                  const completionRate = stats.started > 0 ? Math.round((stats.completed / stats.started) * 100) : 0;
                  const abandonmentRate = 100 - completionRate;
                  
                  return (
                    <div key={formId} className='border border-slate-700/50 rounded-lg p-4'>
                      <div className='flex items-center justify-between mb-3'>
                        <h4 className='text-sm font-medium text-white'>{formId}</h4>
                        <span className='text-sm text-slate-400'>{stats.started} started</span>
                      </div>
                      <div className='grid grid-cols-3 gap-4 text-center'>
                        <div>
                          <p className='text-2xl font-bold text-emerald-400'>{completionRate}%</p>
                          <p className='text-xs text-slate-400'>Completed</p>
                        </div>
                        <div>
                          <p className='text-2xl font-bold text-red-400'>{abandonmentRate}%</p>
                          <p className='text-xs text-slate-400'>Abandoned</p>
                        </div>
                        <div>
                          <p className='text-2xl font-bold text-white'>{stats.completed}</p>
                          <p className='text-xs text-slate-400'>Submissions</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bounce Rate & Engagement */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <Card className='bg-slate-800/60 border-white/10'>
            <CardHeader>
              <CardTitle className='text-white text-sm'>Bounce Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-4xl font-bold text-red-400'>{summary.bounceRate}%</div>
              <p className='text-xs text-slate-400 mt-2'>Visitors who left after one page</p>
            </CardContent>
          </Card>

          <Card className='bg-slate-800/60 border-white/10'>
            <CardHeader>
              <CardTitle className='text-white text-sm'>Avg Scroll Depth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-4xl font-bold text-cyan-400'>{summary.avgScrollDepth}%</div>
              <p className='text-xs text-slate-400 mt-2'>How far visitors scroll</p>
            </CardContent>
          </Card>

          <Card className='bg-slate-800/60 border-white/10'>
            <CardHeader>
              <CardTitle className='text-white text-sm'>Pages per Session</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-4xl font-bold text-violet-400'>
                {summary.totalSessions > 0 ? (summary.totalPageViews / summary.totalSessions).toFixed(1) : 0}
              </div>
              <p className='text-xs text-slate-400 mt-2'>Average pages viewed</p>
            </CardContent>
          </Card>
        </div>

        {/* Heatmap Viewer */}
        {Object.keys(data.heatmapData).length > 0 && (
          <HeatmapViewer 
            heatmapData={data.heatmapData} 
            pages={Object.keys(data.heatmapData)}
          />
        )}
      </div>
    </div>
  );
}
