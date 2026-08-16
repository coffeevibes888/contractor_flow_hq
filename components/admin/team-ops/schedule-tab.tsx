'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, Plus, ChevronLeft, ChevronRight, User, MapPin, 
  Clock, Trash2, Edit2, X, CalendarDays, LayoutGrid, List
} from 'lucide-react';
import { toast } from 'sonner';
import { createShift, getShifts, deleteShift } from '@/lib/actions/team-operations.actions';
import { 
  format, startOfWeek, endOfWeek, addWeeks, subWeeks, 
  eachDayOfInterval, isSameDay, startOfMonth, endOfMonth,
  addMonths, subMonths, isToday, isSameMonth, getDay,
  addDays, parseISO
} from 'date-fns';

interface TeamMember {
  id: string;
  name: string;
  image: string | null;
}

interface Property {
  id: string;
  name: string;
}

interface Shift {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  teamMember: { id: string; name: string; image: string | null };
  property: { id: string | null; name: string } | null;
}

type ViewMode = 'month' | 'week';

export default function ScheduleTab() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);

  // Calculate date ranges based on view mode
  const getDateRange = () => {
    if (viewMode === 'week') {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 0 }),
        end: endOfWeek(currentDate, { weekStartsOn: 0 }),
      };
    }
    // Month view - include days from prev/next month to fill the grid
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return { start: calendarStart, end: calendarEnd };
  };

  const { start: rangeStart, end: rangeEnd } = getDateRange();
  const calendarDays = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

  useEffect(() => {
    loadData();
  }, [currentDate, viewMode]);

  async function loadData() {
    setIsLoading(true);
    try {
      // For month view, fetch a wider range to ensure we have all shifts
      const fetchStart = viewMode === 'month' 
        ? startOfMonth(subMonths(currentDate, 1))
        : rangeStart;
      const fetchEnd = viewMode === 'month'
        ? endOfMonth(addMonths(currentDate, 1))
        : rangeEnd;

      const [shiftsResult, membersRes, propsRes] = await Promise.all([
        getShifts({ startDate: fetchStart, endDate: fetchEnd }),
        fetch('/api/landlord/team/members').then(r => r.json()).catch(() => ({ success: false, members: [] })),
        fetch('/api/admin/properties').then(r => r.json()).catch(() => ({ properties: [] })),
      ]);

      if (shiftsResult.success) {
        setShifts(shiftsResult.shifts.map(s => ({ ...s, date: new Date(s.date) })));
      }
      
      if (membersRes.success && membersRes.members) {
        setTeamMembers(membersRes.members
          .filter((m: { user: { name: string; image: string | null } | null }) => m.user !== null)
          .map((m: { id: string; user: { name: string; image: string | null } | null }) => ({
            id: m.id,
            name: m.user?.name || 'Unknown',
            image: m.user?.image || null,
          })));
      }
      
      if (propsRes.properties) {
        setProperties(propsRes.properties);
      }
    } catch (error) {
      console.error('Failed to load schedule data:', error);
      toast.error('Failed to load schedule data');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateShift(formData: FormData) {
    const teamMemberId = formData.get('teamMemberId') as string;
    const propertyId = formData.get('propertyId') as string;
    const date = formData.get('date') as string;
    const startTime = formData.get('startTime') as string;
    const endTime = formData.get('endTime') as string;
    const notes = formData.get('notes') as string;

    startTransition(async () => {
      const result = await createShift({
        teamMemberId,
        propertyId: propertyId && propertyId !== 'all' ? propertyId : undefined,
        date: new Date(date).toISOString(),
        startTime,
        endTime,
        notes: notes || undefined,
      });

      if (result.success) {
        toast.success(result.message);
        setIsCreateOpen(false);
        setSelectedDate(null);
        loadData();
      } else {
        toast.error(result.message);
      }
    });
  }

  async function handleDeleteShift(shiftId: string) {
    startTransition(async () => {
      const result = await deleteShift(shiftId);
      if (result.success) {
        toast.success(result.message);
        setSelectedShift(null);
        loadData();
      } else {
        toast.error(result.message);
      }
    });
  }

  function getShiftsForDay(day: Date) {
    return shifts.filter(s => isSameDay(new Date(s.date), day));
  }

  const colorClasses = [
    { bg: 'bg-blue-500', light: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
    { bg: 'bg-emerald-500', light: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    { bg: 'bg-violet-500', light: 'bg-violet-500/20', text: 'text-violet-400', border: 'border-violet-500/30' },
    { bg: 'bg-amber-500', light: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
    { bg: 'bg-rose-500', light: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30' },
    { bg: 'bg-cyan-500', light: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
    { bg: 'bg-pink-500', light: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30' },
    { bg: 'bg-indigo-500', light: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  ];

  function getMemberColor(memberId: string) {
    const index = teamMembers.findIndex(m => m.id === memberId);
    return colorClasses[index % colorClasses.length];
  }

  const navigatePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const goToToday = () => setCurrentDate(new Date());

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setIsCreateOpen(true);
  };

  const weekDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekDayNamesShort = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3">
        {/* Navigation Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={navigatePrev}
              className="h-8 w-8 sm:h-9 sm:w-9 bg-slate-800/60 border-white/10 hover:bg-slate-700"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="min-w-[120px] sm:min-w-[180px] text-center">
              <h3 className="text-sm sm:text-lg font-semibold text-white">
                {viewMode === 'month' 
                  ? format(currentDate, 'MMM yyyy')
                  : `${format(rangeStart, 'MMM d')} - ${format(rangeEnd, 'd')}`
                }
              </h3>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={navigateNext}
              className="h-8 w-8 sm:h-9 sm:w-9 bg-slate-800/60 border-white/10 hover:bg-slate-700"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="h-8 px-2 sm:px-3 text-xs sm:text-sm bg-slate-800/60 border-white/10 hover:bg-slate-700"
            >
              Today
            </Button>
            
            <Button 
              size="sm"
              onClick={() => { setSelectedDate(new Date()); setIsCreateOpen(true); }}
              className="h-8 px-2 sm:px-3 text-xs sm:text-sm bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
            >
              <Plus className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Add Shift</span>
            </Button>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center bg-slate-800/60 rounded-lg p-0.5 sm:p-1 border border-white/10">
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm transition-colors ${
                viewMode === 'month' 
                  ? 'bg-violet-600 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Month</span>
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm transition-colors ${
                viewMode === 'week' 
                  ? 'bg-violet-600 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Week</span>
            </button>
          </div>
          
          {/* Legend - Desktop only */}
          {teamMembers.length > 0 && (
            <div className="hidden md:flex items-center gap-3">
              {teamMembers.slice(0, 4).map((member) => {
                const colors = getMemberColor(member.id);
                return (
                  <div key={member.id} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${colors.bg}`} />
                    <span className="text-xs text-slate-400">{member.name.split(' ')[0]}</span>
                  </div>
                );
              })}
              {teamMembers.length > 4 && (
                <span className="text-xs text-slate-500">+{teamMembers.length - 4} more</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Calendar */}
      <div className="rounded-xl sm:rounded-2xl bg-slate-900/60 border border-white/10 overflow-hidden shadow-xl">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-slate-800/50">
          {weekDayNames.map((day, i) => (
            <div
              key={day}
              className={`py-2 sm:py-3 text-center text-[10px] sm:text-sm font-medium border-r border-white/5 last:border-r-0 ${
                i === 0 || i === 6 ? 'text-slate-500' : 'text-slate-300'
              }`}
            >
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{weekDayNamesShort[i]}</span>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className={`grid grid-cols-7 ${viewMode === 'month' ? '' : 'min-h-[300px] sm:min-h-[400px]'}`}>
          {calendarDays.map((day) => {
            const dayShifts = getShiftsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isDayToday = isToday(day);
            const isWeekend = getDay(day) === 0 || getDay(day) === 6;
            const isHovered = hoveredDay && isSameDay(hoveredDay, day);
            
            return (
              <div
                key={day.toISOString()}
                className={`
                  relative border-r border-b border-white/5 last:border-r-0 
                  transition-colors cursor-pointer group
                  ${viewMode === 'month' ? 'min-h-[60px] sm:min-h-[100px]' : 'min-h-[200px] sm:min-h-[300px]'}
                  ${!isCurrentMonth && viewMode === 'month' ? 'bg-slate-900/40' : ''}
                  ${isDayToday ? 'bg-violet-600/10' : ''}
                  ${isHovered ? 'bg-white/5' : ''}
                  ${isWeekend && !isDayToday ? 'bg-slate-800/20' : ''}
                `}
                onClick={() => handleDayClick(day)}
                onMouseEnter={() => setHoveredDay(day)}
                onMouseLeave={() => setHoveredDay(null)}
              >
                {/* Day Number */}
                <div className="p-1 sm:p-2 flex items-start justify-between">
                  <span
                    className={`
                      inline-flex items-center justify-center w-5 h-5 sm:w-7 sm:h-7 rounded-full text-[10px] sm:text-sm font-medium
                      ${isDayToday 
                        ? 'bg-violet-600 text-white' 
                        : isCurrentMonth 
                          ? 'text-white' 
                          : 'text-slate-600'
                      }
                    `}
                  >
                    {format(day, 'd')}
                  </span>
                  
                  {/* Quick add button on hover - desktop only */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDayClick(day); }}
                    className="hidden sm:block opacity-0 group-hover:opacity-100 p-1 rounded-full bg-violet-600/80 hover:bg-violet-600 transition-all"
                  >
                    <Plus className="h-3 w-3 text-white" />
                  </button>
                </div>

                {/* Shifts */}
                <div className={`px-0.5 sm:px-1 pb-1 space-y-0.5 sm:space-y-1 ${viewMode === 'month' ? 'max-h-[35px] sm:max-h-[60px] overflow-hidden' : ''}`}>
                  {isLoading ? (
                    <div className="animate-pulse bg-white/5 rounded h-3 sm:h-5 mx-0.5 sm:mx-1" />
                  ) : (
                    dayShifts.slice(0, viewMode === 'month' ? 2 : undefined).map(shift => {
                      const colors = getMemberColor(shift.teamMember.id);
                      return (
                        <div
                          key={shift.id}
                          onClick={(e) => { e.stopPropagation(); setSelectedShift(shift); }}
                          className={`
                            ${colors.light} ${colors.border} border rounded px-1 sm:px-2 py-0.5 sm:py-1
                            text-[8px] sm:text-xs cursor-pointer hover:scale-[1.02] transition-transform
                            ${viewMode === 'week' ? 'mb-1 sm:mb-2' : ''}
                          `}
                        >
                          <div className={`font-medium ${colors.text} truncate`}>
                            <span className="sm:hidden">{shift.teamMember.name.split(' ')[0]}</span>
                            <span className="hidden sm:inline">{shift.teamMember.name}</span>
                          </div>
                          <div className="text-slate-400 text-[8px] sm:text-[10px] hidden sm:block">
                            {shift.startTime} - {shift.endTime}
                          </div>
                          {viewMode === 'week' && shift.property && (
                            <div className="hidden sm:flex items-center gap-1 text-slate-500 text-[10px] mt-0.5">
                              <MapPin className="h-2.5 w-2.5" />
                              {shift.property.name}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  
                  {/* More indicator */}
                  {viewMode === 'month' && dayShifts.length > 2 && (
                    <div className="text-[8px] sm:text-[10px] text-slate-500 px-1 sm:px-2">
                      +{dayShifts.length - 2}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Legend */}
      {teamMembers.length > 0 && (
        <div className="flex md:hidden flex-wrap items-center gap-2 px-1">
          <span className="text-[10px] text-slate-500 uppercase">Team:</span>
          {teamMembers.map((member) => {
            const colors = getMemberColor(member.id);
            return (
              <div key={member.id} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${colors.bg}`} />
                <span className="text-[10px] text-slate-400">{member.name.split(' ')[0]}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Shift Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) setSelectedDate(null); }}>
        <DialogContent className="bg-slate-900 border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-violet-400" />
              Create Shift
              {selectedDate && (
                <Badge variant="secondary" className="ml-2 bg-violet-500/20 text-violet-300">
                  {format(selectedDate, 'MMM d, yyyy')}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <form action={handleCreateShift} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Team Member</Label>
              <Select name="teamMemberId" required>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {teamMembers.map(m => (
                    <SelectItem key={m.id} value={m.id} className="text-white">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getMemberColor(m.id).bg}`} />
                        {m.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Property (optional)</Label>
              <Select name="propertyId">
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="All properties" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all" className="text-white">All properties</SelectItem>
                  {properties.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-white">{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Date</Label>
              <Input 
                type="date" 
                name="date" 
                required 
                defaultValue={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                className="bg-slate-800 border-slate-700 text-white" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Start Time</Label>
                <Input 
                  type="time" 
                  name="startTime" 
                  required 
                  defaultValue="09:00"
                  className="bg-slate-800 border-slate-700 text-white" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">End Time</Label>
                <Input 
                  type="time" 
                  name="endTime" 
                  required 
                  defaultValue="17:00"
                  className="bg-slate-800 border-slate-700 text-white" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Notes</Label>
              <Input 
                name="notes" 
                placeholder="Optional notes..." 
                className="bg-slate-800 border-slate-700 text-white" 
              />
            </div>

            <DialogFooter className="gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsCreateOpen(false)}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isPending} 
                className="bg-gradient-to-r from-violet-600 to-purple-600"
              >
                {isPending ? 'Creating...' : 'Create Shift'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Shift Details Dialog */}
      <Dialog open={!!selectedShift} onOpenChange={(open) => !open && setSelectedShift(null)}>
        <DialogContent className="bg-slate-900 border-white/10 max-w-sm">
          {selectedShift && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white">Shift Details</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${getMemberColor(selectedShift.teamMember.id).bg} flex items-center justify-center`}>
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{selectedShift.teamMember.name}</p>
                    <p className="text-sm text-slate-400">Team Member</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                      <Calendar className="h-3 w-3" />
                      Date
                    </div>
                    <p className="text-white font-medium">
                      {format(new Date(selectedShift.date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                      <Clock className="h-3 w-3" />
                      Time
                    </div>
                    <p className="text-white font-medium">
                      {selectedShift.startTime} - {selectedShift.endTime}
                    </p>
                  </div>
                </div>
                
                {selectedShift.property && (
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                      <MapPin className="h-3 w-3" />
                      Property
                    </div>
                    <p className="text-white font-medium">{selectedShift.property.name}</p>
                  </div>
                )}
                
                {selectedShift.notes && (
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-slate-400 text-xs mb-1">Notes</p>
                    <p className="text-white text-sm">{selectedShift.notes}</p>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedShift(null)}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Close
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => handleDeleteShift(selectedShift.id)}
                  disabled={isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Shift
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
