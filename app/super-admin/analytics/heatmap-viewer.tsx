'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Info } from 'lucide-react';

interface HeatmapPoint {
  x: number | null;
  y: number | null;
  element: string;
  text: string | null;
}

interface HeatmapViewerProps {
  heatmapData: Record<string, HeatmapPoint[]>;
  pages: string[];
}

export default function HeatmapViewer({ heatmapData, pages }: HeatmapViewerProps) {
  const [selectedPage, setSelectedPage] = useState(pages[0] || '/');
  
  const clicks = heatmapData[selectedPage] || [];
  
  // Group clicks by proximity (within 50px)
  const groupedClicks = clicks.reduce((acc, click) => {
    // Skip clicks with null coordinates
    if (click.x === null || click.y === null) return acc;
    
    // TypeScript now knows click.x and click.y are numbers
    const clickX = click.x;
    const clickY = click.y;
    
    const existing = acc.find(
      group => 
        Math.abs(group.x - clickX) < 50 && 
        Math.abs(group.y - clickY) < 50
    );
    
    if (existing) {
      existing.count++;
    } else {
      acc.push({ x: clickX, y: clickY, count: 1, element: click.element, text: click.text });
    }
    
    return acc;
  }, [] as Array<{ x: number; y: number; count: number; element: string; text: string | null }>);
  
  // Find max count for color scaling
  const maxCount = Math.max(...groupedClicks.map(g => g.count), 1);
  
  return (
    <Card className='bg-slate-800/60 border-white/10'>
      <CardHeader>
        <CardTitle className='text-white'>Click Heatmap</CardTitle>
        <CardDescription className='text-slate-400'>
          Visual representation of where users click
        </CardDescription>
        
        {/* Info Banner */}
        <div className='flex items-start gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mt-2'>
          <Info className='h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0' />
          <div className='text-xs text-blue-300'>
            <strong>How to read this:</strong> Each circle shows where users clicked. Bigger circles = more clicks. 
            The vertical position represents where on the page the click happened (top to bottom).
          </div>
        </div>
        
        {/* Page Selector */}
        <div className='flex gap-2 flex-wrap mt-4'>
          {pages.slice(0, 10).map((page) => (
            <button
              key={page}
              onClick={() => setSelectedPage(page)}
              className={`px-3 py-1 rounded-lg text-sm transition-all ${
                selectedPage === page
                  ? 'bg-violet-500 text-white'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {clicks.length === 0 ? (
          <div className='text-center py-12 text-slate-400'>
            <p className='text-lg font-medium mb-2'>No click data yet for this page</p>
            <p className='text-sm'>Clicks will appear here as users interact with your site</p>
          </div>
        ) : (
          <div className='space-y-4'>
            {/* Visual Heatmap - Simplified vertical representation */}
            <div className='bg-slate-900/60 rounded-lg p-6 border border-slate-700/50'>
              <div className='text-xs text-slate-400 mb-4 flex items-center justify-between'>
                <span>{clicks.length} total clicks • {groupedClicks.length} unique locations</span>
                <span className='text-slate-500'>↑ Top of page</span>
              </div>
              
              {/* Simplified vertical page representation */}
              <div className='relative bg-slate-800/40 rounded-lg border border-slate-700/30 min-h-[500px] p-4'>
                {/* Page sections guide */}
                <div className='absolute left-2 top-0 bottom-0 flex flex-col justify-between text-[10px] text-slate-500'>
                  <span>Header</span>
                  <span>Content</span>
                  <span>Footer</span>
                </div>
                
                {/* Click visualization */}
                <div className='relative ml-12 h-full'>
                  {groupedClicks.map((group, idx) => {
                    const intensity = group.count / maxCount;
                    const size = 30 + (intensity * 40); // 30-70px
                    const opacity = 0.4 + (intensity * 0.6); // 0.4-1.0
                    
                    // Normalize Y position to fit in container (0-100%)
                    const yPercent = Math.min((group.y / 3000) * 100, 95);
                    
                    return (
                      <div
                        key={idx}
                        className='absolute rounded-full transition-all hover:scale-110 cursor-pointer group/dot'
                        style={{
                          left: `${(idx % 3) * 30}%`, // Spread horizontally for visibility
                          top: `${yPercent}%`,
                          width: `${size}px`,
                          height: `${size}px`,
                          backgroundColor: `rgba(139, 92, 246, ${opacity})`,
                          boxShadow: `0 0 ${size}px rgba(139, 92, 246, ${opacity * 0.5})`,
                        }}
                      >
                        <div className='absolute inset-0 flex items-center justify-center text-white text-sm font-bold'>
                          {group.count}
                        </div>
                        
                        {/* Tooltip on hover */}
                        <div className='absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white whitespace-nowrap opacity-0 group-hover/dot:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl'>
                          <div className='font-semibold'>{group.count} clicks</div>
                          <div className='text-slate-400'>Element: {group.element}</div>
                          {group.text && (
                            <div className='text-slate-400 max-w-[200px] truncate'>
                              Text: "{group.text}"
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className='absolute right-2 bottom-2 text-[10px] text-slate-500'>
                  ↓ Bottom of page
                </div>
              </div>
            </div>
            
            {/* Click details table */}
            <div className='space-y-2'>
              <h4 className='text-sm font-medium text-white'>Most Clicked Elements</h4>
              <div className='space-y-1'>
                {groupedClicks
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 10)
                  .map((group, idx) => (
                    <div
                      key={idx}
                      className='flex items-center justify-between bg-slate-700/30 rounded px-3 py-2 hover:bg-slate-700/50 transition-colors'
                    >
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2'>
                          <span className='text-sm text-white font-medium'>&lt;{group.element}&gt;</span>
                          {group.text && (
                            <span className='text-xs text-slate-400 truncate'>
                              "{group.text.substring(0, 50)}{group.text.length > 50 ? '...' : ''}"
                            </span>
                          )}
                        </div>
                      </div>
                      <div className='flex items-center gap-3 flex-shrink-0'>
                        <div className='text-sm text-slate-300 font-medium'>{group.count} clicks</div>
                        <div className='w-24 bg-slate-600/50 rounded-full h-2'>
                          <div
                            className='bg-violet-500 h-2 rounded-full transition-all'
                            style={{ width: `${(group.count / maxCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
