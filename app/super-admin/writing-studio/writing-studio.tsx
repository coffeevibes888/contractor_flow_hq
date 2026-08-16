'use client';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nspell = typeof window !== 'undefined' ? require('nspell') : null;

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, Highlighter,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Indent, Outdent,
  Undo2, Redo2, Link2, Minus, Quote,
  ChevronDown, ChevronRight, ChevronLeft,
  FilePlus, FolderPlus, Trash2, FileText, Folder, StickyNote,
  Download, Search, Replace,
  Maximize2, Minimize2,
  Type, X, Check, Sparkles, BookOpen, Wand2,
  AlignJustify as ScriptIcon, Mic, Settings2, Eye, EyeOff,
  Plus, LayoutGrid, Lightbulb, BookMarked, SlidersHorizontal,
  BookType,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type DocMode = 'prose' | 'screenplay' | 'teleplay';
type ProseFormat = 'default' | 'fantasy';
type DocSubtype = 'writing' | 'title-page' | 'notes' | 'ideas' | 'timeline';

// ── Screenplay character database ──
interface ScriptCharacter {
  id: string;
  name: string; // uppercase canonical name e.g. JOHN CARTER
  aliases: string[];
  age: string;
  actorNotes: string;
  voice: string;
  description: string;
  relationships: string;
  firstScene: number;
  lastScene: number;
  totalDialogue: number;
  totalScenes: number;
}

// ── Screenplay scene database ──
interface ScriptScene {
  id: string;
  number: number;
  heading: string;
  location: string;
  time: string;
  characters: string[];
  pages: string;
  mood: string;
  purpose: string;
  conflict: string;
  outcome: string;
}

// ── Episode header (teleplay) ──
interface EpisodeHeader {
  series: string;
  episode: string;
  writtenBy: string;
  draft: string;
  revision: string;
  date: string;
}

interface TitlePageMeta {
  title: string; subtitle: string; author: string; email: string;
  phone: string; address: string; wordCountLabel: string;
}
interface TimelineBeat {
  id: string; act: string; title: string; summary: string; color: string;
  // optional fantasy fields
  chapter?: number; pov?: string; location?: string;
}
interface DocFile {
  id: string; type: 'file'; name: string; content: string;
  folderId: string | null; createdAt: number; updatedAt: number;
  wordCount: number; mode: DocMode;
  subtype: DocSubtype;
  titlePage?: TitlePageMeta;
  beats?: TimelineBeat[];
  scriptCharacters?: ScriptCharacter[];
  scriptScenes?: ScriptScene[];
  episodeHeader?: EpisodeHeader;
}
interface DocFolder { id: string; type: 'folder'; name: string; open: boolean; }
interface Notepad { id: string; title: string; content: string; color: string; updatedAt: number; }
type FSItem = DocFolder | DocFile;

const ACT_COLORS = ['#a78bfa','#34d399','#fbbf24','#f87171','#60a5fa','#f472b6'];

// Generic story beats (fallback / screenplay)
const DEFAULT_BEATS: TimelineBeat[] = [
  { id: 'b1', act: 'Act I', title: 'Opening Image', summary: 'Set tone, world, and protagonist.', color: ACT_COLORS[0] },
  { id: 'b2', act: 'Act I', title: 'Inciting Incident', summary: 'The event that disrupts the ordinary world.', color: ACT_COLORS[0] },
  { id: 'b3', act: 'Act II', title: 'First Plot Point', summary: 'Hero crosses into new world / commits.', color: ACT_COLORS[1] },
  { id: 'b4', act: 'Act II', title: 'Midpoint', summary: 'False victory or defeat. Stakes raise.', color: ACT_COLORS[1] },
  { id: 'b5', act: 'Act II', title: 'Dark Night of the Soul', summary: 'All is lost. Hero faces inner truth.', color: ACT_COLORS[2] },
  { id: 'b6', act: 'Act III', title: 'Climax', summary: 'Hero acts on new truth. Final battle.', color: ACT_COLORS[3] },
  { id: 'b7', act: 'Act III', title: 'Resolution', summary: 'New world. Changed hero.', color: ACT_COLORS[3] },
];

// Fantasy novel beats — uses arc/chapter language, not screenplay lingo
const FANTASY_BEATS: TimelineBeat[] = [
  { id: 'f1', act: 'Prologue', title: 'Prologue', summary: 'Hook the reader. Hint at the magic system, the threat, or the prophecy.', color: ACT_COLORS[5], chapter: 0, pov: '', location: '' },
  { id: 'f2', act: 'Part I — The Ordinary World', title: 'The Ordinary World', summary: 'Introduce the protagonist in their everyday life. Establish what they want vs. what they need.', color: ACT_COLORS[0], chapter: 1, pov: '', location: '' },
  { id: 'f3', act: 'Part I — The Ordinary World', title: 'The Inciting Event', summary: 'The catalyst that pulls the protagonist into the larger world. A letter, a vision, a murder, a summons.', color: ACT_COLORS[0], chapter: 2, pov: '', location: '' },
  { id: 'f4', act: 'Part I — The Ordinary World', title: 'The Call & Refusal', summary: 'The hero is called to adventure but hesitates. What do they fear losing?', color: ACT_COLORS[0], chapter: 3, pov: '', location: '' },
  { id: 'f5', act: 'Part II — Into the World', title: 'Crossing the Threshold', summary: 'The protagonist leaves the known world behind. No going back. The quest begins.', color: ACT_COLORS[1], chapter: 4, pov: '', location: '' },
  { id: 'f6', act: 'Part II — Into the World', title: 'Tests, Allies & Enemies', summary: 'New companions are forged. Enemies reveal themselves. The magic system deepens.', color: ACT_COLORS[1], chapter: 5, pov: '', location: '' },
  { id: 'f7', act: 'Part II — Into the World', title: 'The Midpoint Revelation', summary: 'A secret is uncovered, a betrayal occurs, or the stakes are raised. The hero is changed.', color: ACT_COLORS[1], chapter: 6, pov: '', location: '' },
  { id: 'f8', act: 'Part III — The Dark Spiral', title: 'Rising Danger', summary: 'Enemies close in. Allies are lost or questioned. The cost of the quest becomes real.', color: ACT_COLORS[2], chapter: 7, pov: '', location: '' },
  { id: 'f9', act: 'Part III — The Dark Spiral', title: 'The Black Moment', summary: 'Everything falls apart. The hero hits their lowest point. All hope seems lost.', color: ACT_COLORS[3], chapter: 8, pov: '', location: '' },
  { id: 'f10', act: 'Part IV — The Reckoning', title: 'The Resurrection', summary: 'The hero rises — transformed. They draw on everything they have learned to face the final threat.', color: ACT_COLORS[4], chapter: 9, pov: '', location: '' },
  { id: 'f11', act: 'Part IV — The Reckoning', title: 'The Final Battle', summary: 'The climactic confrontation. Physical, magical, or emotional — the hero must sacrifice something to win.', color: ACT_COLORS[4], chapter: 10, pov: '', location: '' },
  { id: 'f12', act: 'Epilogue', title: 'Epilogue — The New World', summary: 'Show how the world and the hero have changed. Tease the next book if part of a series.', color: ACT_COLORS[5], chapter: 11, pov: '', location: '' },
];

const FANTASY_ARC_OPTIONS = [
  'Prologue', 'Part I — The Ordinary World', 'Part II — Into the World',
  'Part III — The Dark Spiral', 'Part IV — The Reckoning', 'Epilogue',
  'Interlude', 'Side Quest', 'Flashback', 'Custom Arc',
];

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);

const countWords = (html: string) => {
  const t = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return t === '' ? 0 : t.split(' ').length;
};

const FONT_FAMILIES = [
  'Georgia', 'Times New Roman', 'Garamond', 'Palatino Linotype',
  'Arial', 'Helvetica Neue', 'Verdana', 'Trebuchet MS',
  'Courier New', 'Courier Prime', 'Lora', 'Merriweather',
];
const FONT_SIZES = ['10','11','12','13','14','16','18','20','22','24','28','32','36','40','48','56','72'];
const HEADINGS = [
  { label: 'Paragraph', value: 'p' }, { label: 'Heading 1', value: 'h1' },
  { label: 'Heading 2', value: 'h2' }, { label: 'Heading 3', value: 'h3' },
  { label: 'Heading 4', value: 'h4' }, { label: 'Blockquote', value: 'blockquote' },
];
const LINE_SPACINGS = [
  { label: 'Single', value: '1' }, { label: '1.15×', value: '1.15' },
  { label: '1.5×', value: '1.5' }, { label: 'Double', value: '2' },
  { label: 'Triple', value: '3' },
];

// Fantasy book format preset
const FANTASY_FORMAT = {
  fontFamily: 'Garamond',
  fontSize: '12',
  lineSpacing: '2',
  alignment: 'justifyFull',
} as const;
const HIGHLIGHT_COLORS = ['#FFE066','#A8FF78','#FF9FF3','#74B9FF','#FFA502','#ECCC68','#FF6B81','transparent'];
const TEXT_COLORS = ['#F8F9FA','#FFFFFF','#FFE066','#FF6B81','#74B9FF','#A8FF78','#FFA502','#D63031','#6C5CE7','#2D3436'];
const NOTE_COLORS = ['#2d2250','#1a3a2a','#2a1a1a','#1a2a3a','#2a2a1a'];

const STORAGE_KEY = 'ws_studio_v4';

// ─────────────────────────────────────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────────────────────────────────────
const THEME = {
  dark: {
    outerBg: 'linear-gradient(135deg, #0d0b1e 0%, #12082a 50%, #0a1628 100%)',
    textPrimary: '#e2e0ff',
    textSecondary: 'rgba(255,255,255,0.75)',
    textMuted: 'rgba(255,255,255,0.35)',
    toolbarBg: 'rgba(255,255,255,0.04)',
    toolbarBorder: '1px solid rgba(255,255,255,0.08)',
    toolbarBlur: 'blur(10px)',
    sepBg: 'rgba(255,255,255,0.12)',
    btnActive: 'rgba(139,92,246,0.7)',
    btnActiveBorder: '1px solid rgba(139,92,246,0.8)',
    btnHover: 'rgba(255,255,255,0.08)',
    selectBg: 'rgba(255,255,255,0.06)',
    selectBorder: '1px solid rgba(255,255,255,0.12)',
    selectOptionBg: '#1a1035',
    selectOptionText: '#e2e0ff',
    sidebarBg: 'rgba(0,0,0,0.25)',
    sidebarBorder: '1px solid rgba(255,255,255,0.06)',
    sidebarBlur: 'blur(8px)',
    sidebarHeaderBorder: '1px solid rgba(255,255,255,0.06)',
    sidebarFolderHover: 'rgba(255,255,255,0.05)',
    sidebarFolderText: 'rgba(255,255,255,0.7)',
    sidebarFolderIcon: 'rgba(255,255,255,0.3)',
    sidebarFileActive: 'rgba(139,92,246,0.2)',
    sidebarFileActiveBorder: '1px solid rgba(139,92,246,0.3)',
    sidebarFileHover: 'rgba(255,255,255,0.04)',
    sidebarFileText: 'rgba(255,255,255,0.6)',
    sidebarFileActiveText: '#e2e0ff',
    sidebarNewBtnBg: 'rgba(139,92,246,0.15)',
    sidebarNewBtnBorder: '1px solid rgba(139,92,246,0.25)',
    sidebarNewBtnColor: '#c4b5fd',
    titleBarBg: 'rgba(0,0,0,0.15)',
    titleBarBorder: '1px solid rgba(255,255,255,0.05)',
    titleBarText: 'rgba(255,255,255,0.85)',
    titleBarMuted: 'rgba(255,255,255,0.3)',
    paperScrollBg: 'transparent',
    paperScrollBgFocus: 'linear-gradient(135deg, #0a0818 0%, #0f0a24 100%)',
    paperBg: 'rgba(255,255,255,0.025)',
    paperBgScript: '#ffffff',
    paperBorder: '1px solid rgba(255,255,255,0.06)',
    paperBorderScript: '1px solid rgba(0,0,0,0.1)',
    paperShadow: '0 20px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,92,246,0.05)',
    paperShadowScript: '0 20px 60px rgba(0,0,0,0.6)',
    editorText: 'rgba(255,255,255,0.88)',
    editorTextScript: '#1a1a1a',
    editorCaret: '#a78bfa',
    editorCaretScript: '#6d28d9',
    editorPlaceholder: 'rgba(255,255,255,0.18)',
    dictPopupBg: 'linear-gradient(135deg, #1e1050, #150d40)',
    dictPopupBorder: '1px solid rgba(139,92,246,0.5)',
    dictPopupShadow: '0 12px 40px rgba(0,0,0,0.7)',
    dictPopupTitle: '#c4b5fd',
    dictPopupBtnBg: 'rgba(139,92,246,0.2)',
    dictPopupBtnBorder: '1px solid rgba(139,92,246,0.35)',
    dictPopupBtnHover: 'rgba(139,92,246,0.5)',
    rightPanelBg: 'rgba(0,0,0,0.3)',
    rightPanelBorder: '1px solid rgba(255,255,255,0.06)',
    rightPanelBlur: 'blur(10px)',
    rightPanelTabActive: '#c4b5fd',
    rightPanelTabBorder: '2px solid #a78bfa',
    rightPanelTabInactive: 'rgba(255,255,255,0.35)',
    aiCardBg: 'rgba(255,255,255,0.04)',
    aiCardBorder: '1px solid rgba(255,255,255,0.07)',
    aiCardBorderHover: 'rgba(139,92,246,0.3)',
    aiCardTitle: '#c4b5fd',
    aiCardText: 'rgba(255,255,255,0.55)',
    aiCardBtnBg: 'rgba(255,255,255,0.05)',
    aiCardBtnBorder: '1px solid rgba(255,255,255,0.1)',
    aiCardBtnColor: 'rgba(255,255,255,0.5)',
    aiCardInsertBg: 'rgba(139,92,246,0.2)',
    aiCardInsertBorder: '1px solid rgba(139,92,246,0.35)',
    aiCardInsertColor: '#c4b5fd',
    noteTabBg: 'rgba(255,255,255,0.05)',
    noteTabActive: 'rgba(255,255,255,0.9)',
    noteTabInactive: 'rgba(255,255,255,0.4)',
    noteInputBorder: '1px solid rgba(139,92,246,0.3)',
    noteTextareaBg: 'rgba(255,255,255,0.04)',
    noteTextareaBorder: '1px solid rgba(255,255,255,0.07)',
    noteTextareaText: 'rgba(255,255,255,0.8)',
    noteMuted: 'rgba(255,255,255,0.2)',
    statusBarBg: 'rgba(0,0,0,0.4)',
    statusBarBorder: '1px solid rgba(255,255,255,0.05)',
    statusBarText: 'rgba(255,255,255,0.25)',
    statusBarHint: 'rgba(255,255,255,0.2)',
    findBarBg: 'rgba(139,92,246,0.12)',
    findBarBorder: '1px solid rgba(139,92,246,0.25)',
    findInputBg: 'rgba(255,255,255,0.06)',
    findInputBorder: '1px solid rgba(139,92,246,0.3)',
    findInputText: '#e2e0ff',
    findBtnBg: 'rgba(139,92,246,0.4)',
    findBtnBorder: '1px solid rgba(139,92,246,0.5)',
    scriptToolbarBg: 'rgba(245,158,11,0.08)',
    scriptToolbarBorder: '1px solid rgba(245,158,11,0.15)',
    scriptToolbarText: '#fcd34d',
    scriptBtnActive: 'rgba(245,158,11,0.35)',
    scriptBtnInactive: 'rgba(255,255,255,0.05)',
    scriptBtnActiveText: '#fcd34d',
    scriptBtnInactiveText: 'rgba(255,255,255,0.6)',
    accentPurple: '#a78bfa',
    accentGreen: '#86efac',
    accentAmber: '#fbbf24',
    accentRed: '#f87171',
  },
  light: {
    outerBg: 'linear-gradient(135deg, #faf8f3 0%, #f5f1e8 50%, #ede8dc 100%)',
    textPrimary: '#2a2520',
    textSecondary: 'rgba(42,37,32,0.85)',
    textMuted: 'rgba(42,37,32,0.45)',
    toolbarBg: 'rgba(255,250,240,0.9)',
    toolbarBorder: '1px solid rgba(42,37,32,0.08)',
    toolbarBlur: 'blur(10px)',
    sepBg: 'rgba(42,37,32,0.12)',
    btnActive: 'rgba(139,92,246,0.15)',
    btnActiveBorder: '1px solid rgba(139,92,246,0.35)',
    btnHover: 'rgba(139,92,246,0.08)',
    selectBg: 'rgba(255,255,255,0.6)',
    selectBorder: '1px solid rgba(42,37,32,0.15)',
    selectOptionBg: '#ffffff',
    selectOptionText: '#2a2520',
    sidebarBg: 'rgba(255,250,240,0.85)',
    sidebarBorder: '1px solid rgba(42,37,32,0.1)',
    sidebarBlur: 'blur(8px)',
    sidebarHeaderBorder: '1px solid rgba(42,37,32,0.08)',
    sidebarFolderHover: 'rgba(139,92,246,0.06)',
    sidebarFolderText: 'rgba(42,37,32,0.75)',
    sidebarFolderIcon: 'rgba(42,37,32,0.35)',
    sidebarFileActive: 'rgba(139,92,246,0.15)',
    sidebarFileActiveBorder: '1px solid rgba(139,92,246,0.3)',
    sidebarFileHover: 'rgba(139,92,246,0.05)',
    sidebarFileText: 'rgba(42,37,32,0.65)',
    sidebarFileActiveText: '#2a2520',
    sidebarNewBtnBg: 'rgba(139,92,246,0.12)',
    sidebarNewBtnBorder: '1px solid rgba(139,92,246,0.25)',
    sidebarNewBtnColor: '#7c3aed',
    titleBarBg: 'rgba(245,241,232,0.8)',
    titleBarBorder: '1px solid rgba(42,37,32,0.08)',
    titleBarText: 'rgba(42,37,32,0.9)',
    titleBarMuted: 'rgba(42,37,32,0.4)',
    paperScrollBg: 'transparent',
    paperScrollBgFocus: 'linear-gradient(135deg, #f9f6f0 0%, #f3ede0 100%)',
    paperBg: '#ffffff',
    paperBgScript: '#ffffff',
    paperBorder: '1px solid rgba(42,37,32,0.08)',
    paperBorderScript: '1px solid rgba(42,37,32,0.08)',
    paperShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
    paperShadowScript: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
    editorText: 'rgba(42,37,32,0.95)',
    editorTextScript: '#1a1a1a',
    editorCaret: '#7c3aed',
    editorCaretScript: '#7c3aed',
    editorPlaceholder: 'rgba(42,37,32,0.25)',
    dictPopupBg: 'linear-gradient(135deg, #ffffff, #faf8f3)',
    dictPopupBorder: '1px solid rgba(139,92,246,0.3)',
    dictPopupShadow: '0 12px 40px rgba(0,0,0,0.15)',
    dictPopupTitle: '#7c3aed',
    dictPopupBtnBg: 'rgba(139,92,246,0.12)',
    dictPopupBtnBorder: '1px solid rgba(139,92,246,0.25)',
    dictPopupBtnHover: 'rgba(139,92,246,0.25)',
    rightPanelBg: 'rgba(250,248,243,0.95)',
    rightPanelBorder: '1px solid rgba(42,37,32,0.1)',
    rightPanelBlur: 'blur(10px)',
    rightPanelTabActive: '#7c3aed',
    rightPanelTabBorder: '2px solid #7c3aed',
    rightPanelTabInactive: 'rgba(42,37,32,0.4)',
    aiCardBg: 'rgba(255,255,255,0.7)',
    aiCardBorder: '1px solid rgba(42,37,32,0.08)',
    aiCardBorderHover: 'rgba(139,92,246,0.3)',
    aiCardTitle: '#7c3aed',
    aiCardText: 'rgba(42,37,32,0.7)',
    aiCardBtnBg: 'rgba(139,92,246,0.08)',
    aiCardBtnBorder: '1px solid rgba(139,92,246,0.15)',
    aiCardBtnColor: 'rgba(42,37,32,0.65)',
    aiCardInsertBg: 'rgba(139,92,246,0.15)',
    aiCardInsertBorder: '1px solid rgba(139,92,246,0.3)',
    aiCardInsertColor: '#7c3aed',
    noteTabBg: 'rgba(139,92,246,0.08)',
    noteTabActive: 'rgba(42,37,32,0.9)',
    noteTabInactive: 'rgba(42,37,32,0.45)',
    noteInputBorder: '1px solid rgba(139,92,246,0.3)',
    noteTextareaBg: 'rgba(255,255,255,0.6)',
    noteTextareaBorder: '1px solid rgba(42,37,32,0.1)',
    noteTextareaText: 'rgba(42,37,32,0.85)',
    noteMuted: 'rgba(42,37,32,0.35)',
    statusBarBg: 'rgba(245,241,232,0.9)',
    statusBarBorder: '1px solid rgba(42,37,32,0.08)',
    statusBarText: 'rgba(42,37,32,0.4)',
    statusBarHint: 'rgba(42,37,32,0.35)',
    findBarBg: 'rgba(254,243,199,0.8)',
    findBarBorder: '1px solid rgba(245,158,11,0.25)',
    findInputBg: 'rgba(255,255,255,0.8)',
    findInputBorder: '1px solid rgba(245,158,11,0.3)',
    findInputText: '#2a2520',
    findBtnBg: 'rgba(139,92,246,0.15)',
    findBtnBorder: '1px solid rgba(139,92,246,0.3)',
    scriptToolbarBg: 'rgba(254,243,199,0.5)',
    scriptToolbarBorder: '1px solid rgba(245,158,11,0.2)',
    scriptToolbarText: '#b45309',
    scriptBtnActive: 'rgba(245,158,11,0.2)',
    scriptBtnInactive: 'rgba(255,255,255,0.5)',
    scriptBtnActiveText: '#b45309',
    scriptBtnInactiveText: 'rgba(42,37,32,0.5)',
    accentPurple: '#7c3aed',
    accentGreen: '#16a34a',
    accentAmber: '#f59e0b',
    accentRed: '#dc2626',
  },
};

// Screenplay element types with proper formatting
const SCRIPT_ELEMENTS = [
  { label: 'Scene Heading', value: 'scene-heading', hint: 'INT. LOCATION - DAY' },
  { label: 'Action',        value: 'action',         hint: 'Describe what we see...' },
  { label: 'Character',     value: 'character',      hint: 'CHARACTER NAME' },
  { label: 'Dialogue',      value: 'dialogue',       hint: 'What they say...' },
  { label: 'Parenthetical', value: 'parenthetical',  hint: '(emotionally)' },
  { label: 'Transition',    value: 'transition',     hint: 'CUT TO:' },
  { label: 'Shot',          value: 'shot',           hint: 'CLOSE ON:' },
  { label: 'Lyrics',        value: 'lyrics',         hint: '♪ La la la...' },
  { label: 'Text Message',  value: 'text-message',   hint: 'TEXT: Hello?' },
  { label: 'Phone Call',    value: 'phone-call',     hint: 'PHONE: (muffled)' },
  { label: 'Voice Over',    value: 'voice-over',     hint: 'CHARACTER (V.O.)' },
  { label: 'Off Screen',    value: 'off-screen',     hint: 'CHARACTER (O.S.)' },
  { label: 'Montage',       value: 'montage',        hint: 'MONTAGE - Location' },
  { label: 'Flashback',     value: 'flashback',      hint: 'FLASHBACK - Year' },
  { label: 'Dream Seq.',    value: 'dream-sequence', hint: 'DREAM SEQUENCE' },
  { label: 'End Scene',     value: 'end-scene',      hint: 'END SCENE' },
  { label: 'Act Break',     value: 'act-break',      hint: 'ACT ONE' },
];

const PARENTHETICAL_SUGGESTIONS = [
  'quietly', 'whispering', 'sarcastically', 'smiling', 'beat',
  'under breath', 'shouting', 'crying', 'laughing', 'angry',
  'confused', 'excited', 'nervous', 'to herself', 'to himself',
  'into phone', 'reading', 'overlapping',
];

const ACT_BREAK_OPTIONS = [
  'COLD OPEN', 'TEASER', 'ACT ONE', 'ACT TWO', 'ACT THREE', 'ACT FOUR', 'TAG', 'END OF ACT ONE', 'END OF ACT TWO', 'END OF EPISODE',
];

// ─────────────────────────────────────────────────────────────────────────────
// THESAURUS / DICTIONARY DATA (curated fantasy writing focused)
// ─────────────────────────────────────────────────────────────────────────────
const SYNONYMS: Record<string, string[]> = {
  said: ['whispered','murmured','declared','announced','growled','hissed','breathed','muttered','exclaimed','replied'],
  dark: ['shadowy','obsidian','murky','stygian','tenebrous','dim','inky','sunless','crepuscular','lightless'],
  run: ['sprint','dash','bolt','flee','race','gallop','hurtle','career','tear','charge'],
  old: ['ancient','archaic','primordial','ageless','venerable','hoary','time-worn','immemorial','antediluvian','elder'],
  big: ['vast','immense','colossal','titanic','gargantuan','towering','mammoth','monolithic','imposing','enormous'],
  scary: ['terrifying','dread','eldritch','sinister','harrowing','chilling','macabre','ominous','foreboding','baleful'],
  magic: ['sorcery','enchantment','arcane','spellcraft','thaumaturgy','witchcraft','conjuration','mysticism','glamour','hex'],
  walk: ['stride','saunter','prowl','stalk','trudge','lumber','glide','drift','wander','meander'],
  beautiful: ['radiant','ethereal','resplendent','luminous','breathtaking','transcendent','sublime','exquisite','celestial','ravishing'],
  sad: ['mournful','desolate','forlorn','bereft','despondent','melancholic','woeful','stricken','grief-stricken','disconsolate'],
  angry: ['wrathful','incensed','furious','livid','seething','enraged','irate','apoplectic','indignant','incandescent'],
  good: ['noble','virtuous','valiant','righteous','sterling','exemplary','commendable','worthy','laudable','admirable'],
  bad: ['villainous','wicked','malevolent','nefarious','insidious','vile','corrupt','perfidious','treacherous','sinister'],
  house: ['manor','fortress','keep','stronghold','citadel','sanctum','dwelling','bastion','haven','tower'],
  eyes: ['gaze','stare','glance','orbs','sight','vision','regard','scrutiny','piercing gaze','watchful eyes'],
  sky: ['firmament','heavens','vault','canopy','expanse','empyrean','celestial dome','stratosphere','ether','welkin'],
  light: ['radiance','luminescence','gleam','glow','brilliance','blaze','shimmer','effulgence','phosphorescence','aureole'],
  fire: ['inferno','conflagration','blaze','pyre','flame','ember','furnace','holocaust','wildfire','firestorm'],
  water: ['torrent','cascade','deluge','abyss','fathom','current','eddies','flux','tide','maelstrom'],
  sword: ['blade','steel','edge','cutlass','rapier','saber','cleaver','falchion','claymore','weapon'],
  // common words
  happy: ['joyful','elated','jubilant','content','blissful','gleeful','delighted','overjoyed','ecstatic','cheerful'],
  fast: ['swift','rapid','fleet','brisk','hasty','nimble','lightning','breakneck','accelerated','expeditious'],
  slow: ['sluggish','languid','ponderous','plodding','unhurried','leisurely','measured','gradual','torpid','dawdling'],
  small: ['tiny','minuscule','petite','compact','diminutive','miniature','negligible','trifling','microscopic','slight'],
  strong: ['powerful','mighty','formidable','stalwart','robust','ironclad','unyielding','indomitable','resolute','tenacious'],
  weak: ['frail','feeble','fragile','tenuous','brittle','delicate','infirm','enfeebled','ineffectual','impotent'],
  cold: ['frigid','glacial','arctic','frosty','icy','wintry','bleak','bone-chilling','numbing','gelid'],
  hot: ['scorching','blazing','searing','sweltering','blistering','torrid','fiery','incandescent','smouldering','sultry'],
  quiet: ['hushed','silent','still','muted','noiseless','tranquil','serene','breathless','subdued','muffled'],
  loud: ['thunderous','deafening','booming','clamorous','resounding','reverberating','ear-splitting','stentorian','cacophonous','strident'],
  look: ['gaze','peer','scrutinise','survey','behold','observe','regard','study','inspect','contemplate'],
  speak: ['utter','proclaim','declare','articulate','express','intone','pronounce','voice','enunciate','discourse'],
  think: ['ponder','contemplate','muse','deliberate','reflect','ruminate','cogitate','meditate','reason','surmise'],
  move: ['traverse','advance','proceed','migrate','shift','transfer','stir','progress','venture','navigate'],
  large: ['enormous','colossal','mammoth','vast','gargantuan','monumental','towering','prodigious','stupendous','behemoth'],
  new: ['novel','fresh','nascent','unprecedented','pioneering','innovative','cutting-edge','uncharted','untried','original'],
  strange: ['uncanny','eldritch','bizarre','peculiar','cryptic','enigmatic','aberrant','anomalous','surreal','otherworldly'],
};

// Antonyms for common words
const ANTONYMS: Record<string, string[]> = {
  dark: ['bright','radiant','luminous','gleaming','brilliant','resplendent','vivid','blazing','sunlit','effulgent'],
  big: ['tiny','minuscule','small','petite','compact','diminutive','microscopic','trifling','slight','negligible'],
  scary: ['comforting','soothing','reassuring','gentle','benign','serene','pleasant','inviting','welcoming','safe'],
  beautiful: ['hideous','grotesque','unsightly','ghastly','repulsive','ghoulish','wretched','loathsome','vile','grim'],
  sad: ['joyful','elated','jubilant','blissful','gleeful','ecstatic','overjoyed','radiant','content','exuberant'],
  angry: ['serene','calm','placid','tranquil','content','composed','gentle','untroubled','peaceful','equanimous'],
  good: ['wicked','malevolent','nefarious','vile','corrupt','villainous','insidious','treacherous','sinister','perfidious'],
  bad: ['noble','virtuous','righteous','exemplary','sterling','admirable','worthy','laudable','commendable','valiant'],
  fast: ['sluggish','languid','ponderous','plodding','unhurried','leisurely','measured','torpid','dawdling','slow'],
  slow: ['swift','rapid','fleet','brisk','nimble','lightning','breakneck','accelerated','expeditious','hasty'],
  small: ['vast','immense','colossal','titanic','gargantuan','towering','mammoth','monolithic','imposing','enormous'],
  strong: ['frail','feeble','fragile','tenuous','brittle','delicate','infirm','enfeebled','ineffectual','impotent'],
  weak: ['powerful','mighty','formidable','stalwart','robust','ironclad','unyielding','indomitable','resolute','tenacious'],
  cold: ['scorching','blazing','searing','sweltering','blistering','torrid','fiery','smouldering','sultry','incandescent'],
  hot: ['frigid','glacial','arctic','frosty','icy','wintry','bleak','bone-chilling','numbing','gelid'],
  quiet: ['thunderous','deafening','booming','clamorous','resounding','ear-splitting','stentorian','cacophonous','strident','loud'],
  loud: ['hushed','silent','still','muted','noiseless','tranquil','serene','breathless','subdued','muffled'],
  happy: ['mournful','desolate','forlorn','bereft','despondent','melancholic','woeful','stricken','grief-stricken','disconsolate'],
  old: ['new','novel','fresh','nascent','unprecedented','pioneering','innovative','cutting-edge','uncharted','nascent'],
  new: ['ancient','archaic','primordial','ageless','venerable','hoary','time-worn','immemorial','antediluvian','elder'],
  light: ['darkness','shadow','gloom','murk','obscurity','dusk','shade','tenebrous','dimness','blackness'],
};

// Minimal definitions for right-click dictionary
const DEFINITIONS: Record<string, { pos: string; def: string; example?: string }[]> = {
  said: [{ pos: 'verb (past)', def: 'Past tense of "say" — to speak or utter words.', example: '"He said nothing for a long moment."' }],
  dark: [{ pos: 'adjective', def: 'Having little or no light; deeply shadowed.', example: '"The dark forest swallowed all sound."' }, { pos: 'noun', def: 'The absence of light; a period of darkness.'}],
  run: [{ pos: 'verb', def: 'To move swiftly on foot; to flee or pursue at speed.', example: '"She ran until her lungs burned."' }],
  old: [{ pos: 'adjective', def: 'Having existed for a long time; ancient or aged.', example: '"An old magic stirred beneath the stones."' }],
  big: [{ pos: 'adjective', def: 'Of considerable size, extent, or intensity.', example: '"A big shadow crossed the moon."' }],
  good: [{ pos: 'adjective', def: 'Having positive qualities; morally right or virtuous.', example: '"A good man does not seek glory."' }],
  bad: [{ pos: 'adjective', def: 'Of poor quality or morally wrong; wicked or evil.', example: '"Something bad was coming — he could feel it."' }],
  magic: [{ pos: 'noun', def: 'The power to influence events through supernatural means; sorcery.', example: '"The magic hummed between her fingers."' }, { pos: 'adjective', def: 'Relating to or resembling the supernatural; enchanted.' }],
  walk: [{ pos: 'verb', def: 'To move at a regular pace by lifting and setting down each foot in turn.', example: '"She walked the empty battlements alone."' }],
  beautiful: [{ pos: 'adjective', def: 'Pleasing the senses or mind aesthetically; possessing great beauty.', example: '"The dawn was heartbreakingly beautiful."' }],
  sad: [{ pos: 'adjective', def: 'Feeling or showing sorrow; unhappy or mournful.', example: '"His eyes held a sad wisdom earned through loss."' }],
  angry: [{ pos: 'adjective', def: 'Feeling or showing strong displeasure; enraged.', example: '"She was angry in the cold, precise way of someone who never shouts."' }],
  fire: [{ pos: 'noun', def: 'Combustion producing heat, light, and flame.', example: '"The fire spoke to her in tongues of amber."' }, { pos: 'verb', def: 'To discharge a weapon; to dismiss from employment.' }],
  light: [{ pos: 'noun', def: 'The natural agent that stimulates sight; electromagnetic radiation visible to the eye.', example: '"A sliver of light cut through the dark."' }, { pos: 'adjective', def: 'Having a considerable amount of light; not dark.' }],
  water: [{ pos: 'noun', def: 'A transparent, odorless liquid essential to life; a body of water.', example: '"The water ran black beneath the bridge."' }],
  sky: [{ pos: 'noun', def: 'The region of the atmosphere visible from the earth; the heavens.', example: '"The sky had turned the colour of old bruises."' }],
  house: [{ pos: 'noun', def: 'A building for human habitation; a noble family or lineage.', example: '"The House of Aravith had stood for five hundred years."' }],
  sword: [{ pos: 'noun', def: 'A long-bladed weapon with a handle, used for thrusting or striking.', example: '"She laid the sword across her knees and waited."' }],
  happy: [{ pos: 'adjective', def: 'Feeling or showing pleasure or contentment; fortunate.', example: '"For one moment, impossibly, she was happy."' }],
  fast: [{ pos: 'adjective', def: 'Moving or capable of moving at high speed; rapid.', example: '"He was fast — faster than anything human."' }, { pos: 'verb', def: 'To abstain from food; a period of abstinence.' }],
  slow: [{ pos: 'adjective', def: 'Moving at a low speed; not quick; taking a long time.', example: '"Time moved slow and thick, like smoke."' }],
  strong: [{ pos: 'adjective', def: 'Having great physical power; morally or intellectually powerful.', example: '"She had always been strong — just not in ways others could see."' }],
  cold: [{ pos: 'adjective', def: 'Of or at a low temperature; lacking warmth or emotion.', example: '"Her voice was cold and perfectly level."' }],
  hot: [{ pos: 'adjective', def: 'Having a high temperature; feeling strong heat; intense.', example: '"The air was hot and tasted of iron."' }],
  quiet: [{ pos: 'adjective', def: 'Making little or no noise; calm and at rest.', example: '"The room went very quiet."' }],
  loud: [{ pos: 'adjective', def: 'Producing much noise; clamorous; obtrusive.', example: '"The silence after was louder than the crash."' }],
  look: [{ pos: 'verb', def: 'To direct one\'s gaze; to have the appearance of being.', example: '"She didn\'t look up. She already knew."' }],
  think: [{ pos: 'verb', def: 'To have a particular opinion, belief, or idea; to use one\'s mind actively.', example: '"He thought carefully before he lied."' }],
  move: [{ pos: 'verb', def: 'To go in a direction; to change position; to evoke strong feelings.', example: '"She moved through the shadows like she was born there."' }],
};

const AI_SUGGESTIONS = [
  { type: 'scene', icon: '🎬', title: 'Scene Starter', text: 'The ancient tower loomed against a bruised sky, its stones slick with centuries of rain. Something moved behind the uppermost window — something that had not moved in a very long time.' },
  { type: 'conflict', icon: '⚔️', title: 'Conflict Beat', text: 'She had three choices: lie to the council and save him, tell the truth and destroy everything they had built, or walk away and let fate decide. She had ten seconds before they noticed her hesitation.' },
  { type: 'character', icon: '🧙', title: 'Character Trait', text: 'He collected other people\'s secrets the way lesser men collected gold — not for leverage, but because every secret was a door, and he was obsessed with what lay behind closed doors.' },
  { type: 'world', icon: '🌍', title: 'World Detail', text: 'In the old kingdom, names had weight. To speak a true name three times under a new moon was to bind the named thing to you — which was why every wise creature kept two names: one to give, one to keep.' },
  { type: 'sensory', icon: '✨', title: 'Sensory Detail', text: 'The magic smelled like petrichor and burned copper, tasted like the moment before a storm breaks. Her fingers tingled with it, warmth pooling at her sternum, spreading outward like sunrise.' },
  { type: 'dialogue', icon: '💬', title: 'Dialogue Hook', text: '"You want my help?" He smiled, slow and certain as a blade clearing its scabbard. "Then you are already in more trouble than you know."' },
  { type: 'twist', icon: '🌀', title: 'Plot Twist Seed', text: 'Consider: the mentor has been dead since chapter one. Everything the protagonist learned came from the villain, who wore the mentor\'s face, teaching exactly the skills they\'d need to destroy themselves.' },
  { type: 'pacing', icon: '⏱️', title: 'Pacing Note', text: 'This scene might benefit from slowing down. Let the character notice a small physical detail — a crack in the stone, the smell of smoke — before the revelation lands. Earned silence makes the hit harder.' },
];

const SCRIPT_SHORTCUTS = [
  { key: 'Tab in Scene Heading', result: '→ Action' },
  { key: 'Tab in Action', result: '→ Character' },
  { key: 'Tab in Character', result: '→ Dialogue' },
  { key: 'Tab in Dialogue', result: '→ Parenthetical' },
  { key: 'Tab in Parenthetical', result: '→ Dialogue' },
  { key: 'Tab in Shot / Transition', result: '→ Action' },
  { key: 'Enter after Character', result: '→ Dialogue' },
  { key: 'Enter after Parenthetical', result: '→ Dialogue' },
  { key: 'Enter after Dialogue', result: '→ next Character' },
  { key: 'Double Enter (empty)', result: '→ Action' },
  { key: 'Enter after Transition', result: '→ Action' },
  { key: 'Ctrl+1', result: 'Scene Heading' },
  { key: 'Ctrl+2', result: 'Action' },
  { key: 'Ctrl+3', result: 'Character' },
  { key: 'Ctrl+4', result: 'Dialogue' },
  { key: 'Ctrl+5', result: 'Transition' },
  { key: 'Ctrl+6', result: 'Parenthetical' },
  { key: 'Ctrl+7', result: 'Shot' },
  { key: 'Ctrl+8', result: 'Act Break' },
  { key: 'Type ( in dialogue', result: 'Parenthetical suggestions' },
];

// ── Screenplay Guide: element rules shown in the Guide panel ──
const SCREENPLAY_GUIDE: { element: string; color: string; rule: string; example: string; tip: string }[] = [
  {
    element: 'Scene Heading',
    color: '#f59e0b',
    rule: 'INT. or EXT. — LOCATION — TIME. Always UPPERCASE. Time is DAY, NIGHT, MORNING, CONTINUOUS, or LATER.',
    example: 'INT. DETECTIVE AGENCY - NIGHT',
    tip: 'Every scene needs one. Tab after it drops you into Action.',
  },
  {
    element: 'Action',
    color: '#94a3b8',
    rule: 'Present tense, active voice. Describe ONLY what we can SEE or HEAR on screen. Max 3–4 lines.',
    example: 'JOHN storms in, soaking wet. He slams the door. Silence.',
    tip: 'Never write what a character thinks or feels — only what\'s visible. Short blocks = fast pacing.',
  },
  {
    element: 'Character',
    color: '#a78bfa',
    rule: 'ALWAYS UPPERCASE. Centred at column 4.2″. First appearance in Action also uppercase.',
    example: 'SARAH',
    tip: 'Tab after Character name → Dialogue automatically.',
  },
  {
    element: 'Dialogue',
    color: '#86efac',
    rule: 'What the character says. Indented 2.7″. Max ~35 characters wide. Keep it tight.',
    example: 'I never said I trusted you.',
    tip: 'People rarely say exactly what they mean. Write subtext, not text.',
  },
  {
    element: 'Parenthetical',
    color: '#67e8f9',
    rule: 'Reading direction in (parentheses). Use sparingly — only when tone is truly ambiguous.',
    example: '(under her breath)',
    tip: 'Don\'t write (angrily) — write dialogue that sounds angry. Use for (beat), (into phone), (V.O.) style notes.',
  },
  {
    element: 'Transition',
    color: '#fbbf24',
    rule: 'Right-aligned. Largely vestigial in modern scripts — the default is a straight cut.',
    example: 'SMASH CUT TO:',
    tip: 'Use CUT TO: rarely. Use SMASH CUT TO: for shock, DISSOLVE TO: for time passing, MATCH CUT: for visual poetry.',
  },
  {
    element: 'Shot',
    color: '#f472b6',
    rule: 'A specific camera direction within a scene. Use rarely — directors prefer latitude.',
    example: 'CLOSE ON: The wedding ring on the counter.',
    tip: 'Too many shot directions make the script feel "written by a director." Trust the reader.',
  },
  {
    element: 'V.O. / O.S.',
    color: '#c084fc',
    rule: 'V.O. (Voice Over) = character narrates off-screen. O.S. (Off Screen) = character is present but not visible.',
    example: 'SARAH (V.O.)\nI knew then it was over.',
    tip: 'Use (V.O.) for narration or internal monologue. Use (O.S.) for someone in the next room, behind a door, etc.',
  },
  {
    element: 'Page = 1 Minute',
    color: '#f87171',
    rule: 'The golden rule: 1 page of screenplay ≈ 1 minute of screen time at 12pt Courier.',
    example: 'Feature: 85–115 pp · TV Hour: 42–46 pp · Sitcom: 22–24 pp',
    tip: 'Check the page counter in the status bar. If your Act I ends at page 30, it\'s too long.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
type TTheme = typeof THEME.dark;

function Sep({ t }: { t: TTheme }) {
  return <div className='w-px h-5 flex-shrink-0' style={{ background: t.sepBg }} />;
}

function TBtn({ title, active, onClick, children, danger = false, t }: {
  title: string; active?: boolean; onClick?: () => void;
  children: React.ReactNode; danger?: boolean; t: TTheme;
}) {
  return (
    <button
      type='button' title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick?.(); }}
      className='flex-shrink-0 w-7 h-7 rounded flex items-center justify-center transition-all text-xs select-none'
      style={{
        background: active ? t.btnActive : 'transparent',
        color: danger ? t.accentRed : active ? t.textPrimary : t.textSecondary,
        border: active ? t.btnActiveBorder : '1px solid transparent',
      }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = t.btnHover; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

function TSelect({ value, onChange, options, title, width = 120, t }: {
  value: string; onChange: (v: string) => void;
  options: { label: string; value: string }[]; title?: string; width?: number; t: TTheme;
}) {
  return (
    <select
      title={title} value={value}
      onMouseDown={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width, height: 26, fontSize: 11, background: t.selectBg,
        border: t.selectBorder, borderRadius: 5, color: t.textSecondary,
        padding: '0 6px', outline: 'none', cursor: 'pointer', flexShrink: 0,
      }}
    >
      {options.map((o) => <option key={o.value} value={o.value} style={{ background: t.selectOptionBg, color: t.selectOptionText }}>{o.label}</option>)}
    </select>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export default function WritingStudio() {
  // ── Core state ──
  const [items, setItems] = useState<FSItem[]>([]);
  const [activeId, setActiveId] = useState('');
  const [notepads, setNotepads] = useState<Notepad[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  // ── Panel state ──
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightPanel, setRightPanel] = useState<'ai' | 'notes' | 'script' | 'dict' | 'thesaurus' | 'definition' | 'guide' | null>('ai');
  const [fullscreen, setFullscreen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [typewriterMode, setTypewriterMode] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const t = darkMode ? THEME.dark : THEME.light;

  // ── Mobile: which panel is visible on small screens ──
  // 'editor' is default so the user lands straight in the writing area.
  const [mobilePanel, setMobilePanel] = useState<'editor' | 'library' | 'tools'>('editor');
  // Detect mobile (< 768px). Re-evaluated on window resize.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Dropdown open state (click-controlled so they don't flicker) ──
  const [openDropdown, setOpenDropdown] = useState<'textColor' | 'highlight' | 'export' | null>(null);
  const toggleDropdown = (name: 'textColor' | 'highlight' | 'export') =>
    setOpenDropdown((v) => (v === name ? null : name));

  // ── Find/replace ──
  const [showFind, setShowFind] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');

  // ── Formatting state ──
  // Screenplay default: Courier New, 12pt, 1.5 spacing.
  // Prose default: Garamond, 12pt, double spacing (fantasy book preset).
  const [fontSize, setFontSize] = useState<string>('12');
  const [fontFamily, setFontFamily] = useState<string>('Courier New');
  const [lineSpacing, setLineSpacing] = useState<string>('1.5');
  const [headingBlock, setHeadingBlock] = useState('p');
  const [scriptElement, setScriptElement] = useState('action');
  const [activeStates, setActiveStates] = useState<Record<string, boolean>>({});
  const [proseFormat, setProseFormat] = useState<ProseFormat>('fantasy');

  // ── Toolbar ──
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);
  // Collapse formatting row by default on mobile to give more editor height
  useEffect(() => { if (isMobile) setToolbarCollapsed(true); }, [isMobile]);

  // ── Page / margin settings ──
  const [pageMargins, setPageMargins] = useState({ top: 1, right: 1, bottom: 1, left: 1 }); // inches
  const [pageSize, setPageSize] = useState<'letter' | 'a4'>('letter');
  const [showFormatPanel, setShowFormatPanel] = useState(false);

  // ── Status ──
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [readTime, setReadTime] = useState('0 min');
  const [savedLabel, setSavedLabel] = useState('');

  // ── Custom words (personal dictionary) ──
  const [customWords, setCustomWords] = useState<string[]>([]);
  const [dictInput, setDictInput] = useState('');

  // ── Context menu (right-click in editor) ──
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; word: string; spellSuggestions: string[]; isMisspelled: boolean } | null>(null);

  // ── nspell instance (loaded once from public dict files) ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const spellRef = useRef<any>(null);
  useEffect(() => {
    if (!nspell) return;
    (async () => {
      try {
        const [affRes, dicRes] = await Promise.all([
          fetch('/dict-en.aff'),
          fetch('/dict-en.dic'),
        ]);
        const [affBuf, dicBuf] = await Promise.all([affRes.arrayBuffer(), dicRes.arrayBuffer()]);
        spellRef.current = nspell({
          aff: Buffer.from(affBuf),
          dic: Buffer.from(dicBuf),
        });
      } catch { /* spell check unavailable */ }
    })();
  }, []);

  // ── Thesaurus / Dictionary lookup in right panel ──
  // Saved range from the right-click — persists after ctxMenu closes so panel can replace
  const lookupRangeRef = useRef<Range | null>(null);
  // Manual search inputs for the standalone Thesaurus / Dictionary panels
  const [thesaurusInput, setThesaurusInput] = useState('');
  const [definitionInput, setDefinitionInput] = useState('');
  const [thesaurusWord, setThesaurusWord] = useState<string | null>(null);
  const [definitionWord, setDefinitionWord] = useState<string | null>(null);

  // ── Datamuse API results ──
  const [dataSynonyms, setDataSynonyms] = useState<string[]>([]);
  const [dataAntonyms, setDataAntonyms] = useState<string[]>([]);
  const [dataDefinitions, setDataDefinitions] = useState<{ pos: string; def: string; example?: string }[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataDefWord, setDataDefWord] = useState<string | null>(null);

  // ── AI Feedback ──
  const [aiFeedback, setAiFeedback] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const aiAbortRef = useRef<AbortController | null>(null);

  // ── Rename ──
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // ── Screenplay: character database & scene database ──
  const [scriptCharacters, setScriptCharacters] = useState<ScriptCharacter[]>([]);
  const [scriptScenes, setScriptScenes] = useState<ScriptScene[]>([]);
  const [episodeHeader, setEpisodeHeader] = useState<EpisodeHeader>({ series: '', episode: '', writtenBy: '', draft: '1st Draft', revision: '', date: new Date().toLocaleDateString() });
  const [charDropdown, setCharDropdown] = useState<{ x: number; y: number; filter: string } | null>(null);
  const [parenSuggest, setParenSuggest] = useState<{ x: number; y: number } | null>(null);
  // Scene heading autocomplete — shows past headings from this document while typing in a scene-heading element
  const [sceneHeadingDropdown, setSceneHeadingDropdown] = useState<{ x: number; y: number; matches: string[]; typed: string } | null>(null);
  // Transition picker — shows on toolbar Transition button click
  const [transitionPicker, setTransitionPicker] = useState<{ x: number; y: number } | null>(null);
  const [editingCharId, setEditingCharId] = useState<string | null>(null);
  const [newCharName, setNewCharName] = useState('');
  const charDropdownRef = useRef<HTMLDivElement>(null);
  const parenSuggestRef = useRef<HTMLDivElement>(null);
  const sceneHeadingDropdownRef = useRef<HTMLDivElement>(null);
  const transitionPickerRef = useRef<HTMLDivElement>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Load from DB (falls back to localStorage for migration) ───
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/writing-studio/state');
        const json = await res.json() as { state?: unknown };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const state = (json.state as any) ?? null;

        // Migrate: if no DB record yet, seed from localStorage if present
        const raw = !state ? localStorage.getItem(STORAGE_KEY) : null;
        const src = state ?? (raw ? JSON.parse(raw) : null);

        if (src) {
          let fsItems: FSItem[] = (src.items || []).map((i: FSItem) => {
            if (i.type === 'file' && !(i as DocFile).subtype) {
              return { ...(i as DocFile), subtype: 'writing' as DocSubtype };
            }
            return i;
          });
          if (!fsItems.some((i) => i.type === 'folder')) {
            fsItems = [{ id: 'default', type: 'folder', name: 'My Novels', open: true }, ...fsItems];
          }
          if (!fsItems.some((i) => i.type === 'file')) {
            const bookItems = makeBookItems('The Untitled Chronicle', 'default');
            fsItems = [...fsItems, ...bookItems];
          }
          setItems(fsItems);
          const aid = src.activeId || (fsItems.find((i) => i.type === 'file') as DocFile)?.id || '';
          setActiveId(aid);
          setNotepads(src.notepads || [makeNote('Story Notes', NOTE_COLORS[0])]);
          setActiveNoteId(src.activeNoteId || null);
        } else {
          const folder: DocFolder = { id: 'default', type: 'folder', name: 'My Novels', open: true };
          const bookItems = makeBookItems('The Untitled Chronicle', folder.id);
          const note = makeNote('Story Notes', NOTE_COLORS[0]);
          setItems([folder, ...bookItems]);
          setActiveId(bookItems[0].id);
          setNotepads([note]);
          setActiveNoteId(note.id);
        }
      } catch { /* ignore */ }
      // Load custom dictionary (still stored locally — it's device-independent preference)
      try {
        const saved = localStorage.getItem('ws_custom_words_v1');
        if (saved) setCustomWords(JSON.parse(saved));
      } catch { /* ignore */ }
    })();
  }, []);

  // ─── Sync editor when active doc changes ───
  useEffect(() => {
    if (!editorRef.current || !activeId) return;
    const file = items.find((i) => i.id === activeId) as DocFile | undefined;
    if (!file) return;
    // Strip legacy text-transform:uppercase that was baked into older saved documents
    const sanitised = (file.content || '').replace(/text-transform\s*:\s*uppercase\s*;?\s*/gi, '');
    editorRef.current.innerHTML = sanitised;
    editorRef.current.style.lineHeight = lineSpacing;
    updateCounts(file.content || '');
    // Re-apply custom dictionary after switching documents
    setTimeout(() => applyCustomDictionary(customWords), 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  // ─── Close dropdown on outside click ───
  useEffect(() => {
    if (!openDropdown) return;
    const handler = () => setOpenDropdown(null);
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openDropdown]);

  // ─── Datamuse: fetch synonyms + antonyms when thesaurus word changes ───
  useEffect(() => {
    if (!thesaurusWord) return;
    let cancelled = false;
    setDataLoading(true);
    setDataSynonyms([]);
    setDataAntonyms([]);
    const fallbackSyns = SYNONYMS[thesaurusWord] || [];
    const fallbackAnts = ANTONYMS[thesaurusWord] || [];
    Promise.all([
      // rel_syn = WordNet synonyms; ml = means-like (broader semantic similarity)
      Promise.all([
        fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(thesaurusWord)}&max=20`).then((r) => r.json()).catch(() => []),
        fetch(`https://api.datamuse.com/words?ml=${encodeURIComponent(thesaurusWord)}&max=10`).then((r) => r.json()).catch(() => []),
      ]).then(([syn, ml]: [{ word: string }[], { word: string }[]]) => {
        // Merge, deduplicate, remove the word itself
        const seen = new Set<string>([thesaurusWord]);
        return [...syn, ...ml].filter((w) => { if (seen.has(w.word)) return false; seen.add(w.word); return true; });
      }),
      fetch(`https://api.datamuse.com/words?rel_ant=${encodeURIComponent(thesaurusWord)}&max=10`).then((r) => r.json()).catch(() => []),
    ]).then(([syns, ants]: [{ word: string }[], { word: string }[]]) => {
      if (cancelled) return;
      const synWords = syns.map((s) => s.word).filter(Boolean);
      const antWords = ants.map((a) => a.word).filter(Boolean);
      setDataSynonyms(synWords.length > 0 ? synWords : fallbackSyns);
      setDataAntonyms(antWords.length > 0 ? antWords : fallbackAnts);
      setDataLoading(false);
    });
    return () => { cancelled = true; };
  }, [thesaurusWord]);

  // ─── Free Dictionary API: fetch definitions when definition word changes ───
  useEffect(() => {
    if (!definitionWord) return;
    let cancelled = false;
    setDataLoading(true);
    setDataDefinitions([]);
    setDataDefWord(null);
    // Free Dictionary API returns rich structured data: pos, definition, example, phonetics
    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(definitionWord)}`)
      .then((r) => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then((entries: { meanings: { partOfSpeech: string; definitions: { definition: string; example?: string }[] }[]; phonetic?: string }[]) => {
        if (cancelled) return;
        const defs: { pos: string; def: string; example?: string }[] = [];
        for (const entry of entries) {
          for (const meaning of entry.meanings) {
            for (const d of meaning.definitions.slice(0, 3)) {
              defs.push({ pos: meaning.partOfSpeech, def: d.definition, example: d.example });
            }
          }
        }
        setDataDefinitions(defs.slice(0, 8));
        setDataDefWord(definitionWord);
        setDataLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        // Fall back to hardcoded list if API fails or word not found
        const fallback = DEFINITIONS[definitionWord];
        if (fallback) setDataDefinitions(fallback.map((e) => ({ pos: e.pos, def: e.def, example: e.example })));
        else setDataDefinitions([]);
        setDataDefWord(definitionWord);
        setDataLoading(false);
      });
    return () => { cancelled = true; };
  }, [definitionWord]);

  // ─── Persist to DB (debounced) ───
  const persist = useCallback((fsItems: FSItem[], aid: string, pads: Notepad[], anid: string | null) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const payload = { items: fsItems, activeId: aid, notepads: pads, activeNoteId: anid };
      fetch('/api/writing-studio/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: payload }),
      }).catch(() => { /* silent — non-fatal */ });
      setSavedLabel('Saved');
      setTimeout(() => setSavedLabel(''), 1800);
    }, 500);
  }, []);

  // ─── Immediate save to DB (for Ctrl+S) ───
  const saveNow = useCallback((fsItems: FSItem[], aid: string, pads: Notepad[], anid: string | null) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const payload = { items: fsItems, activeId: aid, notepads: pads, activeNoteId: anid };
    fetch('/api/writing-studio/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: payload }),
    }).catch(() => { /* silent — non-fatal */ });
    setSavedLabel('Saved ✓');
    setTimeout(() => setSavedLabel(''), 2500);
  }, []);

  // ─── Counts ───
  const updateCounts = (html: string) => {
    const t = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const wc = t === '' ? 0 : t.split(' ').length;
    setWordCount(wc);
    setCharCount(t.length);
    setReadTime(`${Math.max(1, Math.ceil(wc / 250))} min`);
  };

  // ─── Screenplay page estimator ───
  // Standard: 12pt Courier at 1" margins ≈ 55 lines / page.
  // We estimate by counting newline-equivalent block elements in the script HTML.
  const getPageEstimate = (html: string): number => {
    // Count block-level script elements as line groups; each element type has a known line cost.
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    let lines = 0;
    tmp.querySelectorAll('[data-script-el]').forEach((el) => {
      const type = el.getAttribute('data-script-el') || '';
      const text = (el.textContent || '').trim();
      if (!text) return;
      // Rough line heights per element type (including surrounding blank lines)
      if (type === 'scene-heading') lines += 3;
      else if (type === 'action') lines += Math.max(1, Math.ceil(text.length / 60)) + 1;
      else if (type === 'character' || type === 'voice-over' || type === 'off-screen') lines += 2;
      else if (type === 'dialogue') lines += Math.max(1, Math.ceil(text.length / 35)) + 1;
      else if (type === 'parenthetical') lines += 1;
      else if (type === 'transition') lines += 2;
      else if (type === 'act-break') lines += 4;
      else lines += 2;
    });
    return Math.max(1, Math.round(lines / 55));
  };

  // ─── Input handler ───
  const handleInput = useCallback(() => {
    if (!editorRef.current || !activeId) return;

    // ── Auto-uppercase inside scene-heading / character / voice-over / off-screen ──
    // Done via CSS text-transform:uppercase on the element style — no JS needed.
    // We no longer do el.textContent = upper here because that wipes execCommand bold spans.
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {

      // ── Scene heading autocomplete ──
      let inSceneHeading = false;
      let sceneEl: HTMLElement | null = null;
      let checkNode: Node | null = sel.getRangeAt(0).startContainer;
      while (checkNode && checkNode !== editorRef.current) {
        if (checkNode.nodeType === Node.ELEMENT_NODE) {
          const el = checkNode as HTMLElement;
          if (el.getAttribute('data-script-el') === 'scene-heading') {
            inSceneHeading = true;
            sceneEl = el;
            break;
          }
        }
        checkNode = checkNode.parentNode;
      }

      if (inSceneHeading && sceneEl) {
        const typedRaw = (sceneEl.textContent || '').replace(/\u200b/g, '').toUpperCase();
        // Collect all past scene headings in the document
        const allHeadings = Array.from(
          editorRef.current.querySelectorAll('[data-script-el="scene-heading"]')
        )
          .map((h) => (h.textContent || '').replace(/\u200b/g, '').trim().toUpperCase())
          .filter((h) => h.length > 2 && h !== typedRaw);

        // Deduplicate
        const seen = new Set<string>();
        const unique = allHeadings.filter((h) => { if (seen.has(h)) return false; seen.add(h); return true; });

        // Also prepend the standard prefixes if the user hasn't typed them yet
        const prefixSuggestions: string[] = [];
        if (!typedRaw || 'INT.'.startsWith(typedRaw)) prefixSuggestions.push('INT.');
        if (!typedRaw || 'EXT.'.startsWith(typedRaw)) prefixSuggestions.push('EXT.');
        if (!typedRaw || 'INT./EXT.'.startsWith(typedRaw)) prefixSuggestions.push('INT./EXT.');

        const matches = [
          ...prefixSuggestions.filter((p) => !unique.includes(p)),
          ...unique.filter((h) => !typedRaw || h.startsWith(typedRaw)),
        ].slice(0, 8);

        if (matches.length > 0) {
          const range = sel.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setSceneHeadingDropdown({ x: rect.left, y: rect.bottom + 4, matches, typed: typedRaw });
        } else {
          setSceneHeadingDropdown(null);
        }
      } else {
        setSceneHeadingDropdown(null);
      }
    }

    const html = editorRef.current.innerHTML;
    updateCounts(html);
    setItems((prev) => {
      const next = prev.map((i) =>
        i.id === activeId && i.type === 'file'
          ? { ...(i as DocFile), content: html, updatedAt: Date.now(), wordCount: countWords(html) }
          : i
      );
      persist(next, activeId, notepads, activeNoteId);
      return next;
    });
  }, [activeId, notepads, activeNoteId, persist]);

  // ─── execCommand ───
  const exec = useCallback((cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value ?? '');
    // Update active states immediately so Bold/Italic buttons reflect the new state
    requestAnimationFrame(() => {
      try {
        setActiveStates({
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          underline: document.queryCommandState('underline'),
          strikethrough: document.queryCommandState('strikeThrough'),
          justifyLeft: document.queryCommandState('justifyLeft'),
          justifyCenter: document.queryCommandState('justifyCenter'),
          justifyRight: document.queryCommandState('justifyRight'),
          justifyFull: document.queryCommandState('justifyFull'),
          ul: document.queryCommandState('insertUnorderedList'),
          ol: document.queryCommandState('insertOrderedList'),
        });
      } catch { /* ignore */ }
    });
    handleInput();
  }, [handleInput]);

  // ─── Format helpers ───
  const applyFontSize = (size: string) => {
    setFontSize(size);
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.getRangeAt(0).collapsed) return;
    const range = sel.getRangeAt(0);
    try {
      const span = document.createElement('span');
      span.style.fontSize = size + 'pt';
      range.surroundContents(span);
    } catch { exec('fontSize', '3'); }
    handleInput();
  };

  const applyFontFamily = (f: string) => { setFontFamily(f); exec('fontName', f); };

  const applyFantasyFormat = () => {
    setProseFormat('fantasy');
    setFontFamily(FANTASY_FORMAT.fontFamily);
    setFontSize(FANTASY_FORMAT.fontSize);
    setLineSpacing(FANTASY_FORMAT.lineSpacing);
    if (editorRef.current) {
      editorRef.current.style.lineHeight = FANTASY_FORMAT.lineSpacing;
      editorRef.current.querySelectorAll<HTMLElement>('p,div,h1,h2,h3,h4,h5,h6,li').forEach((el) => {
        el.style.lineHeight = FANTASY_FORMAT.lineSpacing;
      });
    }
    exec('fontName', FANTASY_FORMAT.fontFamily);
    exec(FANTASY_FORMAT.alignment);
  };

  const clearFantasyFormat = () => {
    setProseFormat('default');
  };
  const applyLineSpacing = (v: string) => {
    setLineSpacing(v);
    if (!editorRef.current) return;
    editorRef.current.style.lineHeight = v;
    editorRef.current.querySelectorAll<HTMLElement>('p,div,h1,h2,h3,h4,h5,h6,li').forEach((el) => { el.style.lineHeight = v; });
    handleInput();
  };
  const applyHeading = (tag: string) => { setHeadingBlock(tag); exec('formatBlock', tag); };
  const applyHighlight = (c: string) => exec('hiliteColor', c === 'transparent' ? 'transparent' : c);
  const applyTextColor = (c: string) => exec('foreColor', c);
  const insertLink = () => { const u = prompt('URL:','https://'); if (u) exec('createLink', u); };

  // ─── Screenplay element insert ───
  // ── Count scene headings in the editor to get next scene number ──
  const getNextSceneNumber = (): number => {
    if (!editorRef.current) return 1;
    const headings = editorRef.current.querySelectorAll('[data-script-el="scene-heading"]');
    return headings.length + 1;
  };

  // ── Auto-register new character names from the editor ──
  const scanForCharacters = useCallback(() => {
    if (!editorRef.current) return;
    const charEls = editorRef.current.querySelectorAll('[data-script-el="character"]');
    const found: string[] = [];
    charEls.forEach((el) => {
      const raw = (el.textContent || '').trim().replace(/\s*\(.*?\)\s*$/, '').trim().toUpperCase();
      if (raw && raw.length > 1 && !found.includes(raw)) found.push(raw);
    });
    setScriptCharacters((prev) => {
      const next = [...prev];
      found.forEach((name) => {
        if (!next.find((c) => c.name === name)) {
          next.push({ id: uid(), name, aliases: [], age: '', actorNotes: '', voice: '', description: '', relationships: '', firstScene: 0, lastScene: 0, totalDialogue: 0, totalScenes: 0 });
        }
      });
      return next;
    });
  }, []);

  const getScriptElementStyle = (elType: string): string => {
    // All screenplay elements use 12pt Courier New, placed on a 60-char line.
    // Industry standard indents (from left margin of the text area):
    //   Scene Heading / Action / Shot: 0 indent, full 60ch width
    //   Character name:  ~20ch indent from left (centred over dialogue)
    //   Dialogue:        10ch indent, 35ch wide
    //   Parenthetical:   15ch indent, 25ch wide
    //   Transition:      right-aligned
    const mono = "font-family:'Courier New',monospace;font-size:12pt";
    const normal = "font-weight:normal;text-transform:none";
    const bold = "font-weight:bold";
    const block = "display:block;margin-left:0;margin-right:0";
    switch (elType) {
      case 'scene-heading':   return `${mono};${bold};text-transform:uppercase;margin:1.5em 0 0.5em;letter-spacing:0.05em;color:inherit;${block}`;
      case 'action':         return `${mono};${normal};margin:0.5em 0;max-width:60ch;${block}`;
      case 'character':      return `${mono};${bold};text-transform:uppercase;text-align:center;margin:1em 0 0;letter-spacing:0.08em;color:inherit;max-width:60ch;min-height:1.4em;caret-color:currentColor;${block}`;
      case 'dialogue':       return `${mono};${normal};padding-left:10ch;max-width:45ch;margin:0 0 0.5em;${block}`;
      case 'parenthetical':  return `${mono};${normal};font-style:italic;padding-left:15ch;max-width:40ch;margin:0 0 0.2em;opacity:0.75;${block}`;
      case 'transition':     return `${mono};${bold};text-transform:uppercase;text-align:right;margin:1em 0;letter-spacing:0.05em;color:inherit;max-width:60ch;${block}`;
      case 'shot':           return `${mono};${normal};text-transform:uppercase;margin:1em 0 0.25em;color:inherit;${block}`;
      case 'lyrics':         return `${mono};${normal};font-style:italic;padding-left:10ch;max-width:50ch;margin:0.5em 0;border-left:3px solid rgba(139,92,246,0.5);${block}`;
      case 'text-message':   return `${mono};${normal};padding:8px 14px;max-width:40ch;margin:0.5em 0;background:rgba(60,120,255,0.12);border:1px solid rgba(60,120,255,0.3);border-radius:12px;${block}`;
      case 'phone-call':     return `${mono};${normal};padding-left:10ch;max-width:45ch;margin:0.5em 0;border:1px dashed rgba(128,128,128,0.4);padding:4px 10px 4px calc(10ch);${block}`;
      case 'voice-over':     return `${mono};${normal};padding-left:20ch;margin:1em 0 0;letter-spacing:0.08em;color:inherit;${block}`;
      case 'off-screen':     return `${mono};${normal};padding-left:20ch;margin:1em 0 0;letter-spacing:0.08em;opacity:0.85;${block}`;
      case 'montage':        return `${mono};${normal};margin:2em 0 0.5em;letter-spacing:0.05em;border-bottom:2px solid rgba(251,191,36,0.5);padding-bottom:4px;${block}`;
      case 'flashback':      return `${mono};${normal};margin:2em 0 0.5em;letter-spacing:0.05em;font-style:italic;border-left:4px solid rgba(139,92,246,0.6);padding-left:1ch;${block}`;
      case 'dream-sequence': return `${mono};${normal};margin:2em 0 0.5em;letter-spacing:0.05em;opacity:0.7;font-style:italic;${block}`;
      case 'end-scene':      return `${mono};${normal};text-align:center;margin:1.5em 0;letter-spacing:0.2em;opacity:0.5;max-width:60ch;${block}`;
      case 'act-break':      return `${mono};${bold};text-transform:uppercase;text-align:center;margin:2.5em 0 2em;letter-spacing:0.3em;font-size:14pt;border-top:2px solid currentColor;border-bottom:2px solid currentColor;padding:8px 0;max-width:60ch;${block}`;
      default:               return `${mono};${normal};margin:0.5em 0;${block}`;
    }
  };

  // ── Build the display text for special element types ──
  const getElementInitialText = (elType: string): string => {
    switch (elType) {
      case 'voice-over':     return 'CHARACTER (V.O.)';
      case 'off-screen':     return 'CHARACTER (O.S.)';
      case 'end-scene':      return 'END SCENE';
      default: return '';
    }
  };

  const insertScriptElement = (elType: string, overrideText?: string) => {
    setScriptElement(elType);
    if (!editorRef.current) return;
    editorRef.current.focus();
    const div = document.createElement('div');
    div.setAttribute('data-script-el', elType);
    const placeholder = SCRIPT_ELEMENTS.find((e) => e.value === elType)?.hint || '';
    div.style.cssText = getScriptElementStyle(elType);
    div.setAttribute('data-placeholder', placeholder);

    const elIsBold = elType === 'scene-heading' || elType === 'character' || elType === 'transition' || elType === 'act-break';

    // For scene headings, auto-number
    if (elType === 'scene-heading') {
      const num = getNextSceneNumber();
      div.setAttribute('data-scene-num', String(num));
    }

    // All content goes in as a single text node so the div's inline style governs it.
    // Never set textContent to '' — an empty element causes the browser to insert its
    // own <span> on the first keystroke which ignores the parent's font-weight.
    const initText = elType === 'act-break' ? (overrideText ?? 'ACT ONE')
      : overrideText ? overrideText
      : getElementInitialText(elType);
    if (initText) {
      div.appendChild(document.createTextNode(initText));
    } else {
      div.appendChild(document.createTextNode('\u200b')); // zero-width space keeps caret in context
    }

    const sel = window.getSelection();
    const placeInsideAtEnd = !!(overrideText || getElementInitialText(elType) || elType === 'act-break');
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.collapse(false);
      range.insertNode(div);
      const r = document.createRange();
      r.selectNodeContents(div);
      r.collapse(!placeInsideAtEnd);
      sel.removeAllRanges();
      sel.addRange(r);
    } else {
      editorRef.current.appendChild(div);
      const r = document.createRange();
      r.selectNodeContents(div);
      r.collapse(!placeInsideAtEnd);
      sel?.removeAllRanges();
      sel?.addRange(r);
    }

    // Use execCommand to set bold state at the caret — this is the only reliable way
    // to make typed text bold in a contenteditable across all browsers.
    const isBoldNow = document.queryCommandState('bold');
    if (elIsBold && !isBoldNow) document.execCommand('bold');
    if (!elIsBold && isBoldNow) document.execCommand('bold');

    handleInput();
    if (elType === 'character' || elType === 'voice-over' || elType === 'off-screen') {
      setTimeout(scanForCharacters, 200);
    }
  };

  // ─── Find / Replace ───
  const doFind = () => {
    if (!findText || !editorRef.current) return;
    const html = editorRef.current.innerHTML;
    const esc = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    editorRef.current.innerHTML = html.replace(new RegExp(esc, 'gi'), (m) => `<mark style="background:#a78bfa;color:#1a0a3a;border-radius:2px;padding:0 2px">${m}</mark>`);
    handleInput();
  };
  const doReplace = () => {
    if (!findText || !editorRef.current) return;
    const html = editorRef.current.innerHTML;
    const esc = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    editorRef.current.innerHTML = html.replace(new RegExp(esc, 'gi'), replaceText);
    handleInput();
  };

  // ─── Dictionary/Thesaurus ───
  const handleMouseUp = () => {
    updateActiveStates();
  };

  // ─── Right-click context menu helper ───
  // Gets the word under the right-click point using document.caretRangeFromPoint / caretPositionFromPoint
  const getWordFromPoint = (x: number, y: number): { word: string; range: Range } | null => {
    let range: Range | null = null;
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(x, y);
    } else if ((document as unknown as { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null }).caretPositionFromPoint) {
      const pos = (document as unknown as { caretPositionFromPoint: (x: number, y: number) => { offsetNode: Node; offset: number } | null }).caretPositionFromPoint(x, y);
      if (pos) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
      }
    }
    if (!range || range.startContainer.nodeType !== Node.TEXT_NODE) return null;
    const text = range.startContainer.textContent || '';
    let start = range.startOffset;
    let end = range.startOffset;
    while (start > 0 && /[a-zA-Z''-]/.test(text[start - 1])) start--;
    while (end < text.length && /[a-zA-Z''-]/.test(text[end])) end++;
    if (start === end) return null;
    const word = text.slice(start, end).toLowerCase().replace(/[^a-z'-]/g, '');
    if (word.length < 2) return null;
    const wordRange = document.createRange();
    wordRange.setStart(range.startContainer, start);
    wordRange.setEnd(range.startContainer, end);
    return { word, range: wordRange };
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    // Only intercept inside the editor
    if (!editorRef.current?.contains(e.target as Node)) return;
    e.preventDefault();
    const result = getWordFromPoint(e.clientX, e.clientY);
    if (!result) return;
    // Persist the range so the panel can replace later, independently of ctxMenu state
    lookupRangeRef.current = result.range.cloneRange();
    // Also highlight it
    const sel = window.getSelection();
    if (sel) { sel.removeAllRanges(); sel.addRange(result.range); }

    // Spell-check the word; if misspelled, get suggestions
    let isMisspelled = false;
    let spellSuggestions: string[] = [];
    if (spellRef.current) {
      // Treat custom-dictionary words as always correct
      const isCustomWord = customWords.includes(result.word.toLowerCase());
      if (!isCustomWord) {
        isMisspelled = !spellRef.current.correct(result.word);
        if (isMisspelled) {
          spellSuggestions = (spellRef.current.suggest(result.word) as string[]).slice(0, 6);
        }
      }
    }

    setCtxMenu({ x: e.clientX, y: e.clientY, word: result.word, isMisspelled, spellSuggestions });
  };

  // Replaces the persisted lookup range with the given text
  const replaceFromCtxMenu = useCallback((replacement: string) => {
    const range = lookupRangeRef.current;
    if (range) {
      try {
        range.deleteContents();
        range.insertNode(document.createTextNode(replacement));
        const sel = window.getSelection();
        if (sel) { sel.removeAllRanges(); sel.collapse(range.startContainer, range.startOffset + replacement.length); }
      } catch { /* range may have been invalidated */ }
      lookupRangeRef.current = null;
    }
    handleInput();
  }, [handleInput]);

  // ─── Custom dictionary: wrap known words in spellcheck=false spans ───
  const applyCustomDictionary = useCallback((words: string[]) => {
    if (!editorRef.current || words.length === 0) return;
    // Save + restore selection
    const sel = window.getSelection();
    let savedRange: Range | null = null;
    if (sel && sel.rangeCount > 0) savedRange = sel.getRangeAt(0).cloneRange();

    // Work on the raw HTML: wrap each custom word (whole-word, case-insensitive) in a no-spellcheck span
    let html = editorRef.current.innerHTML;
    for (const word of words) {
      if (!word) continue;
      const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      html = html.replace(
        new RegExp(`(?<![a-zA-Z'\\-])(${esc})(?![a-zA-Z'\\-])`, 'gi'),
        `<span spellcheck="false">$1</span>`
      );
    }
    editorRef.current.innerHTML = html;

    // Restore selection
    if (savedRange && sel) {
      try { sel.removeAllRanges(); sel.addRange(savedRange); } catch { /* ignore */ }
    }
  }, []);

  const addCustomWord = useCallback((word: string) => {
    const trimmed = word.trim().toLowerCase();
    if (!trimmed) return;
    setCustomWords((prev) => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed];
      localStorage.setItem('ws_custom_words_v1', JSON.stringify(next));
      // Apply immediately to the editor
      setTimeout(() => applyCustomDictionary(next), 0);
      return next;
    });
    setDictInput('');
  }, [applyCustomDictionary]);

  const removeCustomWord = useCallback((word: string) => {
    setCustomWords((prev) => {
      const next = prev.filter((w) => w !== word);
      localStorage.setItem('ws_custom_words_v1', JSON.stringify(next));
      return next;
    });
  }, []);

  // ─── Global Ctrl+S handler ───
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        // Capture latest editor content first
        if (editorRef.current && activeId) {
          const html = editorRef.current.innerHTML;
          setItems((prev) => {
            const next = prev.map((i) =>
              i.id === activeId && i.type === 'file'
                ? { ...(i as DocFile), content: html, updatedAt: Date.now(), wordCount: countWords(html) }
                : i
            );
            saveNow(next, activeId, notepads, activeNoteId);
            return next;
          });
        } else {
          saveNow(items, activeId, notepads, activeNoteId);
        }
        // Also trigger file download as backup
        if (editorRef.current) {
          const text = editorRef.current.innerText || '';
          const fileName = (items.find((i) => i.id === activeId) as DocFile | undefined)?.name || 'document';
          dl(text, `${fileName}.txt`, 'text/plain');
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, notepads, activeNoteId, items]);

  // ── Helper: find the script element type of the block containing the cursor ──
  const getCurrentScriptElType = (): string | null => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    let node: Node | null = sel.getRangeAt(0).startContainer;
    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const t = el.getAttribute('data-script-el');
        if (t) return t;
      }
      node = node.parentNode;
    }
    return null;
  };

  // ─── Keyboard shortcuts ───
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const ctrl = e.ctrlKey || e.metaKey;

    // ── Escape: close dropdowns ──
    if (e.key === 'Escape') {
      setCharDropdown(null);
      setParenSuggest(null);
      setSceneHeadingDropdown(null);
      setTransitionPicker(null);
    }

    // ── Enter while scene heading autocomplete is open → pick first match ──
    if (e.key === 'Enter' && !e.shiftKey) {
      setSceneHeadingDropdown((current) => {
        if (current && current.matches.length > 0) {
          e.preventDefault();
          // Apply first match to the current scene-heading element
          const sel2 = window.getSelection();
          if (sel2 && sel2.rangeCount > 0) {
            let node: Node | null = sel2.getRangeAt(0).startContainer;
            while (node && node !== editorRef.current) {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as HTMLElement;
                if (el.getAttribute('data-script-el') === 'scene-heading') {
                  el.textContent = current.matches[0];
                  const r = document.createRange();
                  r.selectNodeContents(el);
                  r.collapse(false);
                  sel2.removeAllRanges();
                  sel2.addRange(r);
                  break;
                }
              }
              node = node.parentNode;
            }
          }
          return null; // close dropdown
        }
        return current; // keep dropdown, don't intercept Enter
      });
    }

    // ── Tab / Shift+Tab: full Writer's Duet-style cycle in screenplay ──
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        // Shift+Tab: reverse cycle in screenplay, otherwise outdent
        if (isScript) {
          const curType = getCurrentScriptElType();
          const reverseMap: Record<string, string> = {
            'action': 'scene-heading',
            'character': 'action',
            'dialogue': 'character',
            'parenthetical': 'dialogue',
          };
          if (curType && reverseMap[curType]) {
            insertScriptElement(reverseMap[curType]);
          }
        } else {
          exec('outdent');
        }
      } else {
        const curType = isScript ? getCurrentScriptElType() : null;
        // Full forward Tab-cycle for screenplay elements
        const tabCycleMap: Record<string, string> = {
          'scene-heading': 'action',
          'action': 'character',
          'character': 'dialogue',
          'dialogue': 'parenthetical',
          'parenthetical': 'dialogue',
          'shot': 'action',
          'transition': 'scene-heading',
          'montage': 'action',
          'flashback': 'action',
          'dream-sequence': 'action',
          'end-scene': 'action',
          'act-break': 'scene-heading',
          'lyrics': 'dialogue',
          'text-message': 'dialogue',
          'phone-call': 'dialogue',
          'voice-over': 'dialogue',
          'off-screen': 'dialogue',
        };
        if (curType && tabCycleMap[curType]) {
          insertScriptElement(tabCycleMap[curType]);
        } else if (!curType) {
          // Not in a script element: insert a tab-width indent
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            if (!range.collapsed) {
              exec('indent');
            } else {
              range.deleteContents();
              const tab = document.createTextNode('\u00a0\u00a0\u00a0\u00a0');
              range.insertNode(tab);
              range.setStartAfter(tab);
              range.collapse(true);
              sel.removeAllRanges();
              sel.addRange(range);
              handleInput();
            }
          }
        }
      }
      return;
    }

    // ── Enter key: screenplay smart automation ──
    if (e.key === 'Enter' && isScript && !ctrl) {
      const curType = getCurrentScriptElType();
      if (curType === 'scene-heading') {
        // After scene heading → insert action (default, left-aligned, no bold)
        e.preventDefault();
        insertScriptElement('action');
        return;
      }
      if (curType === 'character') {
        // After character → insert action
        e.preventDefault();
        insertScriptElement('action');
        return;
      }
      if (curType === 'parenthetical') {
        // After parenthetical → insert dialogue
        e.preventDefault();
        insertScriptElement('dialogue');
        return;
      }
      if (curType === 'transition' || curType === 'shot' || curType === 'end-scene' || curType === 'act-break' || curType === 'montage' || curType === 'flashback' || curType === 'dream-sequence') {
        // After transition / shot / structural elements → back to action (left-aligned)
        e.preventDefault();
        insertScriptElement('action');
        return;
      }
      if (curType === 'dialogue') {
        // After dialogue → insert next character (for quick dialogue flow)
        // Check if the user double-pressed Enter (i.e., dialogue is empty)
        const sel = window.getSelection();
        const curEl = sel?.anchorNode?.parentElement?.closest('[data-script-el]') as HTMLElement | null;
        const dialogueText = curEl?.textContent?.replace(/\u200b/g, '').trim() ?? '';
        if (dialogueText === '') {
          // Empty dialogue → go to action
          e.preventDefault();
          insertScriptElement('action');
          return;
        }
        // Non-empty → next character, show dropdown
        e.preventDefault();
        insertScriptElement('character');
        setTimeout(() => {
          const sel2 = window.getSelection();
          if (sel2 && sel2.rangeCount > 0) {
            const rect = sel2.getRangeAt(0).getBoundingClientRect();
            if (scriptCharacters.length > 0) {
              setCharDropdown({ x: rect.left, y: rect.bottom + 4, filter: '' });
            }
          }
        }, 50);
        return;
      }
    }

    // ── Opening parenthesis in dialogue → show suggestions ──
    if (e.key === '(' && isScript) {
      const curType = getCurrentScriptElType();
      if (curType === 'dialogue' || curType === 'parenthetical') {
        setTimeout(() => {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            const rect = sel.getRangeAt(0).getBoundingClientRect();
            setParenSuggest({ x: rect.left, y: rect.bottom + 4 });
          }
        }, 10);
      }
    }

    // ── Auto-wrap parenthetical text in ( ) if the element is empty ──
    // When the user starts typing in a freshly-inserted parenthetical (first printable char,
    // no modifier keys), auto-insert opening paren so they always get (word) format.
    if (isScript && !ctrl && e.key.length === 1 && e.key !== '(' && e.key !== ')') {
      const curType = getCurrentScriptElType();
      if (curType === 'parenthetical') {
        const sel = window.getSelection();
        const curEl = sel?.anchorNode?.parentElement?.closest('[data-script-el]') as HTMLElement | null;
        const existingText = curEl?.textContent?.replace(/\u200b/g, '').trim() ?? '';
        if (existingText === '' || existingText === '\u200b') {
          // Element is empty — pre-insert ( and schedule ) after the typed char
          setTimeout(() => {
            if (!curEl) return;
            const text = curEl.textContent?.replace(/\u200b/g, '') ?? '';
            if (!text.startsWith('(')) {
              curEl.textContent = `(${text})`;
              // Place caret before the closing paren
              const r = document.createRange();
              const textNode = curEl.firstChild;
              if (textNode) {
                const pos = Math.max(1, (curEl.textContent?.length ?? 2) - 1);
                r.setStart(textNode, pos);
                r.collapse(true);
                const s = window.getSelection();
                s?.removeAllRanges();
                s?.addRange(r);
              }
              handleInput();
            }
          }, 0);
        }
      }
    }

    if (ctrl && e.key === 'z') { e.preventDefault(); exec('undo'); }
    if (ctrl && e.shiftKey && (e.key === 'Z' || e.key === 'y')) { e.preventDefault(); exec('redo'); }
    if (ctrl && e.key === 'b') { e.preventDefault(); exec('bold'); }
    if (ctrl && e.key === 'i') { e.preventDefault(); exec('italic'); }
    if (ctrl && e.key === 'u') { e.preventDefault(); exec('underline'); }
    if (ctrl && e.key === 'f') { e.preventDefault(); setShowFind((v) => !v); }

    // ── Formatting hotkeys ──
    if (ctrl && e.shiftKey && e.key === 'K') { e.preventDefault(); exec('strikeThrough'); }
    if (ctrl && e.shiftKey && e.key === 'L') { e.preventDefault(); exec('insertUnorderedList'); }
    if (ctrl && e.shiftKey && e.key === 'O') { e.preventDefault(); exec('insertOrderedList'); }
    if (ctrl && e.key === ']') { e.preventDefault(); exec('indent'); }
    if (ctrl && e.key === '[') { e.preventDefault(); exec('outdent'); }
    if (ctrl && e.altKey && e.key === 'c') { e.preventDefault(); exec('justifyCenter'); }
    if (ctrl && e.altKey && e.key === 'l') { e.preventDefault(); exec('justifyLeft'); }
    if (ctrl && e.altKey && e.key === 'r') { e.preventDefault(); exec('justifyRight'); }
    if (ctrl && e.altKey && e.key === 'j') { e.preventDefault(); exec('justifyFull'); }
    if (ctrl && e.key === '`') { e.preventDefault(); exec('removeFormat'); }

    // ── Script element shortcuts ──
    if (ctrl && e.key === '1') { e.preventDefault(); insertScriptElement('scene-heading'); }
    if (ctrl && e.key === '2') { e.preventDefault(); insertScriptElement('action'); }
    if (ctrl && e.key === '3') { e.preventDefault(); insertScriptElement('character'); }
    if (ctrl && e.key === '4') { e.preventDefault(); insertScriptElement('dialogue'); }
    if (ctrl && e.key === '5') { e.preventDefault(); insertScriptElement('transition'); }
    if (ctrl && e.key === '6') { e.preventDefault(); insertScriptElement('parenthetical'); }
    if (ctrl && e.key === '7') { e.preventDefault(); insertScriptElement('shot'); }
    if (ctrl && e.key === '8') { e.preventDefault(); insertScriptElement('act-break'); }

    // Typewriter: scroll cursor to middle
    if (typewriterMode) {
      requestAnimationFrame(() => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          const mid = window.innerHeight / 2;
          window.scrollBy({ top: rect.top - mid, behavior: 'smooth' });
        }
      });
    }
  };

  // ─── Active states ───
  const updateActiveStates = () => {
    try {
      setActiveStates({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikethrough: document.queryCommandState('strikeThrough'),
        justifyLeft: document.queryCommandState('justifyLeft'),
        justifyCenter: document.queryCommandState('justifyCenter'),
        justifyRight: document.queryCommandState('justifyRight'),
        justifyFull: document.queryCommandState('justifyFull'),
        ul: document.queryCommandState('insertUnorderedList'),
        ol: document.queryCommandState('insertOrderedList'),
      });
    } catch { /* ignore */ }
  };

  // ─── File/folder ops ───
  const activeFile = items.find((i) => i.id === activeId) as DocFile | undefined;

  const newFile = (folderId: string | null = null, mode: DocMode = 'prose', subtype: DocSubtype = 'writing') => {
    const fid = folderId ?? (items.find((i) => i.type === 'folder') as DocFolder)?.id ?? null;
    const f = makeFile('Untitled', fid, mode, subtype);
    const next = [...items, f];
    setItems(next); setActiveId(f.id);
    persist(next, f.id, notepads, activeNoteId);
    setRenamingId(f.id); setRenameValue('Untitled');
  };

  // Create a full new book folder with all sub-docs
  const newBook = () => {
    const folder: DocFolder = { id: uid(), type: 'folder', name: 'New Book', open: true };
    const bookItems = makeBookItems('Writing', folder.id);
    const next = [...items, folder, ...bookItems];
    setItems(next); setActiveId(bookItems[0].id);
    persist(next, bookItems[0].id, notepads, activeNoteId);
    setRenamingId(folder.id); setRenameValue('New Book');
  };

  // Add a single sub-doc page to an existing folder
  const addPageToFolder = (folderId: string, subtype: DocSubtype) => {
    const labelMap: Record<DocSubtype, string> = {
      'writing': 'Writing', 'title-page': 'Title Page',
      'notes': 'Notes', 'ideas': 'Ideas', 'timeline': 'Timeline',
    };
    const f = makeFile(labelMap[subtype], folderId, 'prose', subtype);
    const next = [...items, f];
    setItems(next); setActiveId(f.id);
    persist(next, f.id, notepads, activeNoteId);
  };

  const newFolder = () => {
    const folder: DocFolder = { id: uid(), type: 'folder', name: 'New Folder', open: true };
    const next = [...items, folder];
    setItems(next); persist(next, activeId, notepads, activeNoteId);
    setRenamingId(folder.id); setRenameValue('New Folder');
  };

  const deleteItem = (id: string) => {
    if (!confirm('Delete this item permanently?')) return;
    const dead = new Set([id]);
    items.forEach((i) => { if (i.type === 'file' && (i as DocFile).folderId === id) dead.add(i.id); });
    const next = items.filter((i) => !dead.has(i.id));
    const newAid = (next.find((i) => i.type === 'file') as DocFile | undefined)?.id || '';
    setItems(next); setActiveId(newAid);
    persist(next, newAid, notepads, activeNoteId);
  };

  const toggleFolder = (id: string) => {
    const next = items.map((i) => i.id === id && i.type === 'folder' ? { ...i, open: !(i as DocFolder).open } : i) as FSItem[];
    setItems(next); persist(next, activeId, notepads, activeNoteId);
  };

  const commitRename = () => {
    if (!renamingId || !renameValue.trim()) { setRenamingId(null); return; }
    const next = items.map((i) => i.id === renamingId ? { ...i, name: renameValue.trim() } : i) as FSItem[];
    setItems(next); persist(next, activeId, notepads, activeNoteId); setRenamingId(null);
  };

  const selectFile = (id: string) => { if (!renamingId) { setActiveId(id); persist(items, id, notepads, activeNoteId); } };

  // ─── Notepad ops ───
  const newNote = () => {
    const n = makeNote('New Note', NOTE_COLORS[notepads.length % NOTE_COLORS.length]);
    const pads = [...notepads, n];
    setNotepads(pads); setActiveNoteId(n.id);
    persist(items, activeId, pads, n.id);
  };
  const updateNote = (id: string, content: string) => {
    const pads = notepads.map((n) => n.id === id ? { ...n, content, updatedAt: Date.now() } : n);
    setNotepads(pads); persist(items, activeId, pads, activeNoteId);
  };
  const renameNote = (id: string, title: string) => {
    const pads = notepads.map((n) => n.id === id ? { ...n, title } : n);
    setNotepads(pads); persist(items, activeId, pads, activeNoteId);
  };
  const deleteNote = (id: string) => {
    const pads = notepads.filter((n) => n.id !== id);
    const anid = pads[0]?.id || null;
    setNotepads(pads); setActiveNoteId(anid);
    persist(items, activeId, pads, anid);
  };

  // ─── Export ───
  const exportHTML = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${activeFile?.name || 'Document'}</title>
      <style>body{font-family:Georgia,serif;max-width:800px;margin:3rem auto;padding:0 2rem;line-height:1.8;color:#1a1a1a;font-size:14pt}</style>
      </head><body>${editorRef.current?.innerHTML || ''}</body></html>`;
    dl(html, `${activeFile?.name || 'document'}.html`, 'text/html');
  };
  const exportTXT = () => {
    const text = editorRef.current?.innerText || '';
    dl(text, `${activeFile?.name || 'document'}.txt`, 'text/plain');
  };
  const exportMarkdown = () => {
    const text = editorRef.current?.innerText || '';
    dl(text, `${activeFile?.name || 'document'}.md`, 'text/plain');
  };
  const printDoc = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const isScript = activeFile?.mode !== 'prose';
    win.document.write(`<!DOCTYPE html><html><head><title>${activeFile?.name || 'Document'}</title>
      <style>body{font-family:${isScript ? "'Courier Prime','Courier New',monospace" : 'Georgia,serif'};${isScript ? 'max-width:65ch;margin:1in auto' : 'max-width:800px;margin:3rem auto'};padding:0;line-height:1.8;color:#000;font-size:12pt}@page{margin:1in}@media print{body{margin:0}}</style>
      </head><body>${editorRef.current?.innerHTML || ''}</body></html>`);
    win.document.close(); win.focus(); win.print(); win.close();
  };

  // ─── Current mode ───
  const currentMode = activeFile?.mode || 'prose';
  const isScript = currentMode !== 'prose';

  // ─── Book title / author (needed before runAiAnalysis) ───
  const activeFolder = items.find(
    (i) => i.type === 'folder' && (activeFile?.folderId === i.id)
  ) as DocFolder | undefined;
  const bookTitle = activeFolder?.name || activeFile?.name || 'Untitled';
  const bookAuthor = (() => {
    const tp = (items.find(
      (i) => i.type === 'file' && (i as DocFile).folderId === activeFolder?.id && (i as DocFile).subtype === 'title-page'
    ) as DocFile | undefined)?.titlePage;
    return tp?.author || '';
  })();

  // ─── AI Feedback ───
  const runAiAnalysis = useCallback(async () => {
    const text = editorRef.current?.innerText?.trim() || '';
    if (!text || text.length < 50) {
      setAiError('Write at least a few sentences before analysing.');
      return;
    }
    // Cancel any in-flight request
    aiAbortRef.current?.abort();
    const controller = new AbortController();
    aiAbortRef.current = controller;

    setAiFeedback('');
    setAiError('');
    setAiLoading(true);

    try {
      const res = await fetch('/api/writing-studio/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, title: bookTitle, author: bookAuthor }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(j.error || `Server error ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');
      const decoder = new TextDecoder();
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) setAiFeedback((prev) => prev + decoder.decode(value, { stream: !done }));
      }
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'AbortError') return;
      setAiError((err as Error).message || 'Something went wrong.');
    } finally {
      setAiLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookTitle, bookAuthor]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  // On mobile: only show left/right panels when the matching tab is active.
  // On desktop: honour the existing leftOpen / rightPanel logic unchanged.
  const showLeft = isMobile
    ? mobilePanel === 'library'
    : (leftOpen && !focusMode);
  const showRight = isMobile
    ? mobilePanel === 'tools' && rightPanel !== null
    : (rightPanel !== null && !focusMode);

  return (
    <div
      className={fullscreen ? 'fixed inset-0 z-[100]' : ''}
      onContextMenu={handleContextMenu}
      onClick={() => {
        if (ctxMenu) setCtxMenu(null);
        if (charDropdown) setCharDropdown(null);
        if (parenSuggest) setParenSuggest(null);
        if (sceneHeadingDropdown) setSceneHeadingDropdown(null);
        if (transitionPicker) setTransitionPicker(null);
      }}
      style={{
        display: 'flex', flexDirection: 'column',
        height: fullscreen ? '100vh' : 'calc(100vh - 64px)',
        background: t.outerBg,
        color: t.textPrimary, fontFamily: 'system-ui, sans-serif', overflow: 'hidden',
        position: fullscreen ? 'fixed' : 'relative',
        transition: 'background 0.3s, color 0.3s',
      }}
    >
      {/* ── Context menu overlay ── */}
      {ctxMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            position: 'fixed', left: ctxMenu.x, top: ctxMenu.y, zIndex: 9999,
            background: darkMode ? '#1a1035' : '#ffffff',
            border: t.dictPopupBorder, borderRadius: 8,
            boxShadow: t.dictPopupShadow,
            minWidth: 230, padding: '4px 0', fontSize: 13,
          }}
        >
          {/* ── MISSPELLED WORD BLOCK ── */}
          {ctxMenu.isMisspelled ? (
            <>
              {/* Red header — word is misspelled */}
              <div style={{ padding: '6px 14px 5px', fontSize: 11, fontWeight: 700, color: '#ef4444', letterSpacing: '0.04em', borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`, marginBottom: 2 }}>
                &ldquo;{ctxMenu.word}&rdquo; — not in dictionary
              </div>

              {/* Spelling suggestions */}
              {ctxMenu.spellSuggestions.length > 0 ? (
                <>
                  {ctxMenu.spellSuggestions.map((s) => (
                    <button key={s} type='button'
                      onClick={() => { replaceFromCtxMenu(s); setCtxMenu(null); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 14px', background: 'transparent', border: 'none', color: t.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: 600 }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = darkMode ? 'rgba(52,211,153,0.18)' : 'rgba(16,185,129,0.1)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                    >
                      <Check style={{ width: 13, height: 13, color: '#10b981', flexShrink: 0 }} />
                      {s}
                    </button>
                  ))}
                </>
              ) : (
                <div style={{ padding: '6px 14px', fontSize: 12, color: t.textMuted, fontStyle: 'italic' }}>
                  No suggestions found
                </div>
              )}

              <div style={{ margin: '3px 14px', borderTop: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}` }} />

              {/* Add to dictionary */}
              <button type='button'
                onClick={() => { addCustomWord(ctxMenu.word); setCtxMenu(null); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 14px', background: 'transparent', border: 'none', color: t.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: 13 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <Plus style={{ width: 13, height: 13, flexShrink: 0 }} />
                Add to Dictionary
              </button>

              {/* Ignore All */}
              <button type='button'
                onClick={() => { addCustomWord(ctxMenu.word); setCtxMenu(null); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 14px', background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', textAlign: 'left', fontSize: 13 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <EyeOff style={{ width: 13, height: 13, flexShrink: 0 }} />
                Ignore All
              </button>
            </>
          ) : (
            <>
              {/* Correct word header */}
              <div style={{ padding: '6px 14px 5px', fontSize: 10, fontWeight: 700, color: t.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`, marginBottom: 2 }}>
                &ldquo;{ctxMenu.word}&rdquo;
              </div>
              {/* Look up in Thesaurus */}
              <button type='button'
                onClick={() => { const w = ctxMenu.word; setThesaurusWord(w); setThesaurusInput(w); setRightPanel('thesaurus'); setCtxMenu(null); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 14px', background: 'transparent', border: 'none', color: t.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: 13 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = darkMode ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.1)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <BookOpen style={{ width: 14, height: 14, color: t.accentPurple, flexShrink: 0 }} />
                Synonyms &amp; Antonyms
              </button>
              {/* Look up in Dictionary */}
              <button type='button'
                onClick={() => { const w = ctxMenu.word; setDefinitionWord(w); setDefinitionInput(w); setRightPanel('definition'); setCtxMenu(null); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 14px', background: 'transparent', border: 'none', color: t.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: 13 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = darkMode ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.1)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <BookType style={{ width: 14, height: 14, color: t.accentPurple, flexShrink: 0 }} />
                Define
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Character dropdown overlay ── */}
      {charDropdown && (
        <div
          ref={charDropdownRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', left: charDropdown.x, top: charDropdown.y, zIndex: 9998,
            background: darkMode ? '#1a1035' : '#ffffff',
            border: t.dictPopupBorder, borderRadius: 10,
            boxShadow: t.dictPopupShadow,
            minWidth: 260, maxHeight: 320, overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}
        >
          <div style={{ padding: '8px 12px 4px', borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
              👤 Insert Character
            </div>
            <input
              autoFocus
              value={charDropdown.filter}
              onChange={(e) => setCharDropdown({ ...charDropdown, filter: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setCharDropdown(null);
                if (e.key === 'Enter') {
                  const filtered = scriptCharacters.filter((c) => c.name.includes(charDropdown.filter.toUpperCase()));
                  if (filtered.length > 0) {
                    const el = editorRef.current?.querySelector('[data-script-el="character"]:last-of-type') as HTMLElement | null;
                    if (el) { el.textContent = filtered[0].name; }
                    setCharDropdown(null);
                    editorRef.current?.focus();
                  }
                }
              }}
              placeholder='Filter characters…'
              style={{ width: '100%', height: 28, background: t.findInputBg, border: t.findInputBorder, borderRadius: 5, color: t.findInputText, fontSize: 12, padding: '0 8px', outline: 'none' }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {scriptCharacters
              .filter((c) => !charDropdown.filter || c.name.includes(charDropdown.filter.toUpperCase()))
              .map((c) => (
                <button key={c.id} type='button'
                  onClick={() => {
                    // Replace last character element text with this name
                    const charEls = editorRef.current?.querySelectorAll('[data-script-el="character"]');
                    if (charEls && charEls.length > 0) {
                      (charEls[charEls.length - 1] as HTMLElement).textContent = c.name;
                    }
                    setCharDropdown(null);
                    editorRef.current?.focus();
                    setTimeout(() => insertScriptElement('dialogue'), 50);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '8px 14px', background: 'transparent', border: 'none',
                    color: t.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: 600,
                    fontFamily: "'Courier Prime','Courier New',monospace",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = darkMode ? 'rgba(139,92,246,0.18)' : 'rgba(139,92,246,0.1)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  <span>{c.name}</span>
                  {c.age && <span style={{ fontSize: 10, color: t.textMuted }}>age {c.age}</span>}
                </button>
              ))}
            {/* Add new character */}
            <div style={{ padding: '6px 12px 10px', borderTop: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}` }}>
              <button type='button'
                onClick={() => {
                  if (!charDropdown.filter.trim()) return;
                  const name = charDropdown.filter.trim().toUpperCase();
                  const newChar: ScriptCharacter = { id: uid(), name, aliases: [], age: '', actorNotes: '', voice: '', description: '', relationships: '', firstScene: 0, lastScene: 0, totalDialogue: 0, totalScenes: 0 };
                  setScriptCharacters((prev) => [...prev, newChar]);
                  const charEls = editorRef.current?.querySelectorAll('[data-script-el="character"]');
                  if (charEls && charEls.length > 0) (charEls[charEls.length - 1] as HTMLElement).textContent = name;
                  setCharDropdown(null);
                  editorRef.current?.focus();
                  setTimeout(() => insertScriptElement('dialogue'), 50);
                }}
                style={{ width: '100%', padding: '5px 0', fontSize: 11, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 5, color: t.accentPurple, cursor: 'pointer', fontWeight: 600 }}>
                {charDropdown.filter ? `+ Add "${charDropdown.filter.toUpperCase()}"` : '+ New Character'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Parenthetical suggestion overlay ── */}
      {parenSuggest && (
        <div
          ref={parenSuggestRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', left: parenSuggest.x, top: parenSuggest.y, zIndex: 9997,
            background: darkMode ? '#1a1035' : '#ffffff',
            border: t.dictPopupBorder, borderRadius: 8,
            boxShadow: t.dictPopupShadow,
            minWidth: 200, padding: '6px 0',
          }}
        >
          <div style={{ padding: '4px 12px 6px', fontSize: 10, fontWeight: 700, color: t.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`, marginBottom: 4 }}>
            Parenthetical
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '4px 10px 8px' }}>
            {PARENTHETICAL_SUGGESTIONS.map((s) => (
              <button key={s} type='button'
                onClick={() => {
                  // Insert the suggestion at the current cursor position
                  const sel = window.getSelection();
                  if (sel && sel.rangeCount > 0) {
                    const range = sel.getRangeAt(0);
                    range.deleteContents();
                    const text = document.createTextNode(s + ')');
                    range.insertNode(text);
                    range.setStartAfter(text);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                  }
                  setParenSuggest(null);
                  handleInput();
                }}
                style={{
                  padding: '3px 10px', fontSize: 11, borderRadius: 20,
                  background: t.dictPopupBtnBg, border: t.dictPopupBtnBorder,
                  color: t.textPrimary, cursor: 'pointer',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = t.dictPopupBtnHover; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = t.dictPopupBtnBg; }}
              >
                {s}
              </button>
            ))}
          </div>
          <button type='button' onClick={() => setParenSuggest(null)}
            style={{ display: 'block', width: '100%', padding: '4px 12px', fontSize: 10, background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', textAlign: 'center' }}>
            Dismiss (Esc)
          </button>
        </div>
      )}

      {/* ── Scene heading autocomplete overlay ── */}
      {sceneHeadingDropdown && (
        <div
          ref={sceneHeadingDropdownRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', left: sceneHeadingDropdown.x, top: sceneHeadingDropdown.y, zIndex: 9997,
            background: darkMode ? '#1a1035' : '#ffffff',
            border: t.dictPopupBorder, borderRadius: 8,
            boxShadow: t.dictPopupShadow,
            minWidth: 280, padding: '4px 0', fontSize: 13,
          }}
        >
          <div style={{ padding: '4px 12px 6px', fontSize: 10, fontWeight: 700, color: t.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`, marginBottom: 2 }}>
            🎬 Scene Heading
          </div>
          {sceneHeadingDropdown.matches.map((heading) => (
            <button key={heading} type='button'
              onMouseDown={(e) => {
                e.preventDefault();
                // Replace the current scene-heading element text with chosen heading
                const sel2 = window.getSelection();
                if (sel2 && sel2.rangeCount > 0) {
                  let node: Node | null = sel2.getRangeAt(0).startContainer;
                  while (node && node !== editorRef.current) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                      const el = node as HTMLElement;
                      if (el.getAttribute('data-script-el') === 'scene-heading') {
                        el.textContent = heading;
                        // Move caret to end
                        const r = document.createRange();
                        r.selectNodeContents(el);
                        r.collapse(false);
                        sel2.removeAllRanges();
                        sel2.addRange(r);
                        break;
                      }
                    }
                    node = node.parentNode;
                  }
                }
                setSceneHeadingDropdown(null);
                editorRef.current?.focus();
                handleInput();
              }}
              style={{
                display: 'block', width: '100%', padding: '7px 14px',
                background: 'transparent', border: 'none',
                color: t.textPrimary, cursor: 'pointer', textAlign: 'left',
                fontSize: 12, fontFamily: "'Courier Prime','Courier New',monospace",
                fontWeight: 600, letterSpacing: '0.03em',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = darkMode ? 'rgba(245,158,11,0.18)' : 'rgba(245,158,11,0.1)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              {heading || <span style={{ opacity: 0.5 }}>INT. / EXT. …</span>}
            </button>
          ))}
        </div>
      )}

      {/* ── Transition picker overlay ── */}
      {transitionPicker && (
        <div
          ref={transitionPickerRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', left: transitionPicker.x, top: transitionPicker.y, zIndex: 9997,
            background: darkMode ? '#1a1035' : '#ffffff',
            border: t.dictPopupBorder, borderRadius: 8,
            boxShadow: t.dictPopupShadow,
            minWidth: 200, padding: '4px 0', fontSize: 13,
          }}
        >
          <div style={{ padding: '4px 12px 6px', fontSize: 10, fontWeight: 700, color: t.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`, marginBottom: 2 }}>
            ↗ Transition
          </div>
          {['CUT TO:', 'SMASH CUT TO:', 'JUMP CUT TO:', 'MATCH CUT TO:', 'FADE IN:', 'FADE TO:', 'FADE OUT.', 'DISSOLVE TO:', 'BACK TO:', 'INTERCUT WITH:', 'FLASHBACK TO:', 'WIPE TO:', 'IRIS IN:', 'IRIS OUT.'].map((trans) => (
            <button key={trans} type='button'
              onMouseDown={(e) => {
                e.preventDefault();
                insertScriptElement('transition', trans);
                setTransitionPicker(null);
                editorRef.current?.focus();
              }}
              style={{
                display: 'block', width: '100%', padding: '7px 16px',
                background: 'transparent', border: 'none',
                color: t.textPrimary, cursor: 'pointer', textAlign: 'left',
                fontSize: 12, fontFamily: "'Courier Prime','Courier New',monospace",
                fontWeight: 600, letterSpacing: '0.03em',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = darkMode ? 'rgba(139,92,246,0.18)' : 'rgba(139,92,246,0.1)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              {trans}
            </button>
          ))}
        </div>
      )}

      {/* ════════════════ TOOLBAR ════════════════ */}
      <div style={{
        background: t.toolbarBg,
        borderBottom: t.toolbarBorder,
        backdropFilter: t.toolbarBlur,
        flexShrink: 0,
        position: 'relative', zIndex: 20,
      }}>
        {/* ── Toolbar Row 1: doc controls + view + saved ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', flexWrap: 'wrap' }}>
          {/* Left panel toggle */}
          <TBtn t={t} title='Documents panel' onClick={() => setLeftOpen((v) => !v)} active={leftOpen}>
            <ChevronLeft className='w-3.5 h-3.5' style={{ transform: leftOpen ? 'none' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
          </TBtn>

          <Sep t={t} />

          {/* Prose format preset — only shown in prose mode */}
          {!isScript && (
            <>
              <select
                value={proseFormat}
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => {
                  if (e.target.value === 'fantasy') applyFantasyFormat();
                  else clearFantasyFormat();
                }}
                title='Prose format preset'
                style={{
                  background: proseFormat === 'fantasy' ? 'rgba(139,92,246,0.22)' : t.selectBg,
                  border: proseFormat === 'fantasy' ? '1px solid rgba(139,92,246,0.55)' : t.selectBorder,
                  color: proseFormat === 'fantasy' ? t.accentPurple : t.textSecondary,
                  borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: proseFormat === 'fantasy' ? 700 : 400,
                  cursor: 'pointer', outline: 'none', flexShrink: 0, height: 26,
                }}
              >
                <option value='default' style={{ background: t.selectOptionBg, color: t.selectOptionText }}>📄 Default</option>
                <option value='fantasy' style={{ background: t.selectOptionBg, color: t.selectOptionText }}>📖 Fantasy Book</option>
              </select>
              <Sep t={t} />
            </>
          )}

          {/* Mode badge */}
          <select
            value={currentMode}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => {
              if (!activeFile) return;
              const newMode = e.target.value as DocMode;
              const next = items.map((i) => i.id === activeId ? { ...(i as DocFile), mode: newMode } : i) as FSItem[];
              setItems(next); persist(next, activeId, notepads, activeNoteId);
              // Sync toolbar font/size/spacing to match the target mode's defaults
              if (newMode === 'screenplay' || newMode === 'teleplay') {
                setFontFamily('Courier New');
                setFontSize('12');
                setLineSpacing('1.5');
                if (editorRef.current) editorRef.current.style.lineHeight = '1.5';
              } else {
                setFontFamily(FANTASY_FORMAT.fontFamily);
                setFontSize(FANTASY_FORMAT.fontSize);
                setLineSpacing(FANTASY_FORMAT.lineSpacing);
                if (editorRef.current) editorRef.current.style.lineHeight = FANTASY_FORMAT.lineSpacing;
              }
            }}
            style={{
              background: currentMode === 'prose' ? 'rgba(139,92,246,0.25)' : 'rgba(245,158,11,0.25)',
              border: `1px solid ${currentMode === 'prose' ? 'rgba(139,92,246,0.5)' : 'rgba(245,158,11,0.5)'}`,
              color: currentMode === 'prose' ? t.accentPurple : t.accentAmber,
              borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 600,
              cursor: 'pointer', outline: 'none', flexShrink: 0,
            }}
          >
            <option value='prose' style={{ background: t.selectOptionBg, color: t.selectOptionText }}>✍️ Prose</option>
            <option value='screenplay' style={{ background: t.selectOptionBg, color: t.selectOptionText }}>🎬 Screenplay</option>
            <option value='teleplay' style={{ background: t.selectOptionBg, color: t.selectOptionText }}>📺 Teleplay</option>
          </select>

          <Sep t={t} />

          {/* Undo/Redo */}
          <TBtn t={t} title='Undo (Ctrl+Z)' onClick={() => exec('undo')}><Undo2 className='w-3.5 h-3.5' /></TBtn>
          <TBtn t={t} title='Redo (Ctrl+Y)' onClick={() => exec('redo')}><Redo2 className='w-3.5 h-3.5' /></TBtn>

          <Sep t={t} />

          {/* Find */}
          <TBtn t={t} title='Find & Replace (Ctrl+F)' active={showFind} onClick={() => setShowFind((v) => !v)}><Search className='w-3.5 h-3.5' /></TBtn>

          {/* Format panel */}
          <TBtn t={t} title='Format & Margins' active={showFormatPanel} onClick={() => setShowFormatPanel((v) => !v)}>
            <SlidersHorizontal className='w-3.5 h-3.5' />
          </TBtn>

          <Sep t={t} />

          {/* View toggles */}
          <TBtn t={t} title={typewriterMode ? 'Disable typewriter mode' : 'Typewriter mode'} active={typewriterMode} onClick={() => setTypewriterMode((v) => !v)}>
            <Mic className='w-3.5 h-3.5' />
          </TBtn>
          <TBtn t={t} title={focusMode ? 'Exit focus mode' : 'Focus mode'} active={focusMode} onClick={() => setFocusMode((v) => !v)}>
            {focusMode ? <EyeOff className='w-3.5 h-3.5' /> : <Eye className='w-3.5 h-3.5' />}
          </TBtn>
          <TBtn t={t} title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={() => setFullscreen((v) => !v)}>
            {fullscreen ? <Minimize2 className='w-3.5 h-3.5' /> : <Maximize2 className='w-3.5 h-3.5' />}
          </TBtn>

          <Sep t={t} />

          {/* Right panel toggles */}
          {/* AI Suggestions button — temporarily hidden */}
          {/* <TBtn t={t} title='AI Suggestions' active={rightPanel === 'ai'} onClick={() => setRightPanel((v) => v === 'ai' ? null : 'ai')}>
            <Sparkles className='w-3.5 h-3.5' />
          </TBtn> */}
          <TBtn t={t} title='Thesaurus' active={rightPanel === 'thesaurus'} onClick={() => setRightPanel((v) => v === 'thesaurus' ? null : 'thesaurus')}>
            <BookOpen className='w-3.5 h-3.5' />
          </TBtn>
          <TBtn t={t} title='Dictionary' active={rightPanel === 'definition'} onClick={() => setRightPanel((v) => v === 'definition' ? null : 'definition')}>
            <BookType className='w-3.5 h-3.5' />
          </TBtn>
          {isScript && (
            <TBtn t={t} title='Script Tools' active={rightPanel === 'script'} onClick={() => setRightPanel((v) => v === 'script' ? null : 'script')}>
              <ScriptIcon className='w-3.5 h-3.5' />
            </TBtn>
          )}

          <Sep t={t} />

          {/* Export */}
          <div style={{ position: 'relative', flexShrink: 0 }} onMouseDown={(e) => e.stopPropagation()}>
            <TBtn t={t} title='Export / Save to file' active={openDropdown === 'export'} onClick={() => toggleDropdown('export')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Download className='w-3.5 h-3.5' />
                <ChevronDown className='w-2.5 h-2.5' />
              </div>
            </TBtn>
            {openDropdown === 'export' && (
              <div style={{
                position: 'absolute', top: 34, right: 0, zIndex: 200,
                background: t.selectOptionBg, border: t.dictPopupBorder,
                borderRadius: 8, padding: 4, flexDirection: 'column', minWidth: 175,
                boxShadow: darkMode ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 24px rgba(0,0,0,0.2)',
                display: 'flex',
              }}>
                {[
                  ['💾 Save as TXT (Ctrl+S)', exportTXT],
                  ['🌐 Save as HTML', exportHTML],
                  ['📄 Save as Markdown (.md)', exportMarkdown],
                  ['🖨 Print / Export PDF', printDoc],
                ].map(([label, fn]) => (
                  <button key={label as string} type='button'
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); (fn as () => void)(); setOpenDropdown(null); }}
                    style={{ padding: '7px 14px', fontSize: 12, textAlign: 'left', background: 'transparent', color: t.textSecondary, border: 'none', cursor: 'pointer', borderRadius: 5, whiteSpace: 'nowrap' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = t.btnHover; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                    {label as string}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dark mode toggle + Saved indicator + collapse toggle */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <TBtn t={t} title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setDarkMode((v) => !v)}>
              <span style={{ fontSize: 14, lineHeight: 1 }}>{darkMode ? '☀️' : '🌙'}</span>
            </TBtn>
            {savedLabel && (
              <span style={{ fontSize: 11, color: t.accentGreen, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Check className='w-3 h-3' /> {savedLabel}
              </span>
            )}
            <span style={{ fontSize: 11, color: t.textMuted, whiteSpace: 'nowrap' }}>
              {wordCount.toLocaleString()} words
            </span>
            <Sep t={t} />
            {/* Toolbar row-2 collapse toggle */}
            <button type='button'
              title={toolbarCollapsed ? 'Show formatting toolbar' : 'Hide formatting toolbar'}
              onClick={() => setToolbarCollapsed((v) => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 3,
                padding: '2px 7px', fontSize: 10, fontWeight: 600,
                background: toolbarCollapsed ? 'rgba(139,92,246,0.18)' : 'transparent',
                border: toolbarCollapsed ? '1px solid rgba(139,92,246,0.4)' : '1px solid transparent',
                borderRadius: 5, color: toolbarCollapsed ? t.accentPurple : t.textMuted,
                cursor: 'pointer', flexShrink: 0,
              }}>
              <ChevronDown className='w-3 h-3' style={{ transform: toolbarCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
              {toolbarCollapsed ? 'Format' : 'Hide'}
            </button>
          </div>
        </div>

        {/* ── Toolbar Row 2: formatting tools (collapsible) ── */}
        {!toolbarCollapsed && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 8px 4px',
            borderTop: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
            flexWrap: 'wrap',
          }}>
            {/* Heading */}
            <TSelect t={t} value={headingBlock} onChange={applyHeading} options={HEADINGS} title='Style' width={108} />

            {/* Font */}
            <TSelect t={t} value={fontFamily} onChange={applyFontFamily}
              options={FONT_FAMILIES.map((f) => ({ label: f, value: f }))} title='Font' width={134} />

            {/* Size */}
            <TSelect t={t} value={fontSize} onChange={applyFontSize}
              options={FONT_SIZES.map((s) => ({ label: s + 'pt', value: s }))} title='Size' width={62} />

            <Sep t={t} />

            {/* Bold/Italic/Underline/Strike */}
            <TBtn t={t} title='Bold (Ctrl+B)' active={activeStates.bold} onClick={() => exec('bold')}><Bold className='w-3.5 h-3.5' /></TBtn>
            <TBtn t={t} title='Italic (Ctrl+I)' active={activeStates.italic} onClick={() => exec('italic')}><Italic className='w-3.5 h-3.5' /></TBtn>
            <TBtn t={t} title='Underline (Ctrl+U)' active={activeStates.underline} onClick={() => exec('underline')}><Underline className='w-3.5 h-3.5' /></TBtn>
            <TBtn t={t} title='Strikethrough' active={activeStates.strikethrough} onClick={() => exec('strikeThrough')}><Strikethrough className='w-3.5 h-3.5' /></TBtn>
            <TBtn t={t} title='Superscript' onClick={() => exec('superscript')}><span style={{ fontSize: 9, fontWeight: 700 }}>x²</span></TBtn>
            <TBtn t={t} title='Subscript' onClick={() => exec('subscript')}><span style={{ fontSize: 9, fontWeight: 700 }}>x₂</span></TBtn>

            <Sep t={t} />

            {/* Text colour */}
            <div style={{ position: 'relative', flexShrink: 0 }} onMouseDown={(e) => e.stopPropagation()}>
              <TBtn t={t} title='Text colour' active={openDropdown === 'textColor'} onClick={() => toggleDropdown('textColor')}>
                <Type className='w-3.5 h-3.5' />
              </TBtn>
              {openDropdown === 'textColor' && (
                <div style={{
                  position: 'absolute', top: 34, left: 0, zIndex: 200,
                  background: t.selectOptionBg, border: t.dictPopupBorder,
                  borderRadius: 8, padding: 8, gap: 4, flexWrap: 'wrap', width: 130,
                  boxShadow: darkMode ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 24px rgba(0,0,0,0.2)',
                  display: 'flex',
                }}>
                  {TEXT_COLORS.map((c) => (
                    <button key={c} type='button'
                      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); applyTextColor(c); setOpenDropdown(null); }}
                      style={{ width: 22, height: 22, borderRadius: 4, background: c, border: '1px solid rgba(128,128,128,0.3)', cursor: 'pointer', flexShrink: 0 }} />
                  ))}
                </div>
              )}
            </div>

            {/* Highlight */}
            <div style={{ position: 'relative', flexShrink: 0 }} onMouseDown={(e) => e.stopPropagation()}>
              <TBtn t={t} title='Highlight' active={openDropdown === 'highlight'} onClick={() => toggleDropdown('highlight')}>
                <Highlighter className='w-3.5 h-3.5' />
              </TBtn>
              {openDropdown === 'highlight' && (
                <div style={{
                  position: 'absolute', top: 34, left: 0, zIndex: 200,
                  background: t.selectOptionBg, border: t.dictPopupBorder,
                  borderRadius: 8, padding: 8, gap: 4, flexWrap: 'wrap', width: 160,
                  boxShadow: darkMode ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 24px rgba(0,0,0,0.2)',
                  display: 'flex',
                }}>
                  {HIGHLIGHT_COLORS.map((c) => (
                    <button key={c} type='button'
                      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); applyHighlight(c === 'transparent' ? 'transparent' : c); setOpenDropdown(null); }}
                      title={c === 'transparent' ? 'Remove highlight' : c}
                      style={{ width: 22, height: 22, borderRadius: 4, background: c === 'transparent' ? 'linear-gradient(135deg,#fff 45%,#f00 45%,#f00 55%,#fff 55%)' : c, border: '1px solid rgba(128,128,128,0.3)', cursor: 'pointer', flexShrink: 0 }} />
                  ))}
                </div>
              )}
            </div>

            <Sep t={t} />

            {/* Alignment */}
            <TBtn t={t} title='Left' active={activeStates.justifyLeft} onClick={() => exec('justifyLeft')}><AlignLeft className='w-3.5 h-3.5' /></TBtn>
            <TBtn t={t} title='Center' active={activeStates.justifyCenter} onClick={() => exec('justifyCenter')}><AlignCenter className='w-3.5 h-3.5' /></TBtn>
            <TBtn t={t} title='Right' active={activeStates.justifyRight} onClick={() => exec('justifyRight')}><AlignRight className='w-3.5 h-3.5' /></TBtn>
            <TBtn t={t} title='Justify' active={activeStates.justifyFull} onClick={() => exec('justifyFull')}><AlignJustify className='w-3.5 h-3.5' /></TBtn>

            <Sep t={t} />

            {/* Line spacing */}
            <TSelect t={t} value={lineSpacing} onChange={applyLineSpacing} options={LINE_SPACINGS} title='Line spacing' width={72} />

            <Sep t={t} />

            {/* Lists */}
            <TBtn t={t} title='Bullet list' active={activeStates.ul} onClick={() => exec('insertUnorderedList')}><List className='w-3.5 h-3.5' /></TBtn>
            <TBtn t={t} title='Numbered list' active={activeStates.ol} onClick={() => exec('insertOrderedList')}><ListOrdered className='w-3.5 h-3.5' /></TBtn>
            <TBtn t={t} title='Indent' onClick={() => exec('indent')}><Indent className='w-3.5 h-3.5' /></TBtn>
            <TBtn t={t} title='Outdent' onClick={() => exec('outdent')}><Outdent className='w-3.5 h-3.5' /></TBtn>

            <Sep t={t} />

            {/* Insert */}
            <TBtn t={t} title='Blockquote' onClick={() => exec('formatBlock', 'blockquote')}><Quote className='w-3.5 h-3.5' /></TBtn>
            <TBtn t={t} title='Horizontal rule' onClick={() => exec('insertHorizontalRule')}><Minus className='w-3.5 h-3.5' /></TBtn>
            <TBtn t={t} title='Insert link' onClick={insertLink}><Link2 className='w-3.5 h-3.5' /></TBtn>
            <TBtn t={t} title='Remove formatting' onClick={() => exec('removeFormat')}><X className='w-3.5 h-3.5' /></TBtn>
          </div>
        )}
      </div>

      {/* ════════════════ FIND/REPLACE BAR ════════════════ */}
      {showFind && (
        <div style={{
          background: t.findBarBg,
          borderBottom: t.findBarBorder,
          padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap',
        }}>
          <Search className='w-3.5 h-3.5' style={{ color: t.accentPurple, flexShrink: 0 }} />
          <input value={findText} onChange={(e) => setFindText(e.target.value)} placeholder='Find…'
            onKeyDown={(e) => e.key === 'Enter' && doFind()}
            style={{ height: 26, width: 160, background: t.findInputBg, border: t.findInputBorder, borderRadius: 5, color: t.findInputText, fontSize: 12, padding: '0 8px', outline: 'none' }} />
          <Replace className='w-3.5 h-3.5' style={{ color: t.accentPurple, flexShrink: 0 }} />
          <input value={replaceText} onChange={(e) => setReplaceText(e.target.value)} placeholder='Replace with…'
            style={{ height: 26, width: 160, background: t.findInputBg, border: t.findInputBorder, borderRadius: 5, color: t.findInputText, fontSize: 12, padding: '0 8px', outline: 'none' }} />
          <button type='button' onClick={doFind}
            style={{ height: 26, padding: '0 12px', background: t.findBtnBg, border: t.findBtnBorder, borderRadius: 5, color: t.textPrimary, fontSize: 11, cursor: 'pointer' }}>Find All</button>
          <button type='button' onClick={doReplace}
            style={{ height: 26, padding: '0 12px', background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 5, color: t.accentAmber, fontSize: 11, cursor: 'pointer' }}>Replace All</button>
          <button type='button' onClick={() => setShowFind(false)}
            style={{ height: 26, width: 26, background: 'transparent', border: t.sidebarBorder, borderRadius: 5, color: t.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X className='w-3.5 h-3.5' />
          </button>
        </div>
      )}

      {/* ════════════════ BODY ════════════════ */}
      {/* On mobile add bottom padding so the sticky tab bar doesn't overlap the editor */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', paddingBottom: isMobile ? 48 : 0 }}>

        {/* ─── LEFT PANEL: Document tree ─── */}
        {showLeft && (
          <div style={{
            width: isMobile ? '100%' : 230,
            minWidth: isMobile ? '100%' : 200,
            flexShrink: 0, display: 'flex', flexDirection: 'column',
            background: t.sidebarBg, borderRight: t.sidebarBorder,
            backdropFilter: t.sidebarBlur,
          }}>
            {/* Header */}
            <div style={{ padding: '10px 12px 8px', borderBottom: t.sidebarHeaderBorder, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.textMuted }}>Library</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {[
                  { title: 'New Book', fn: newBook, icon: <BookMarked className='w-3 h-3' /> },
                  { title: 'New Empty Folder', fn: newFolder, icon: <FolderPlus className='w-3 h-3' /> },
                ].map(({ title, fn, icon }) => (
                  <button key={title} type='button' title={title} onClick={fn}
                    style={{ width: 22, height: 22, background: t.sidebarNewBtnBg, border: t.sidebarNewBtnBorder, borderRadius: 4, color: t.sidebarNewBtnColor, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Tree */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 4px' }}>
              {(items.filter((i) => i.type === 'folder') as DocFolder[]).map((folder) => {
                const folderFiles = items.filter((i) => i.type === 'file' && (i as DocFile).folderId === folder.id) as DocFile[];
                return (
                  <div key={folder.id}>
                    {/* Folder row */}
                    <FolderRow
                      folder={folder}
                      renamingId={renamingId}
                      renameValue={renameValue}
                      t={t}
                      onToggle={() => toggleFolder(folder.id)}
                      onCommitRename={commitRename}
                      onCancelRename={() => setRenamingId(null)}
                      onSetRenameValue={setRenameValue}
                      onStartRename={() => { setRenamingId(folder.id); setRenameValue(folder.name); }}
                      onDelete={() => deleteItem(folder.id)}
                    />
                    {/* Book page tabs */}
                    {folder.open && folderFiles.length > 0 && (
                      <BookPageTabs
                        files={folderFiles}
                        activeId={activeId}
                        t={t}
                        onSelect={selectFile}
                        onDelete={deleteItem}
                        onAdd={(subtype) => addPageToFolder(folder.id, subtype)}
                      />
                    )}
                    {/* Empty folder prompt */}
                    {folder.open && folderFiles.length === 0 && (
                      <div style={{ padding: '6px 10px 4px 20px' }}>
                        <button type='button' onClick={() => newBook()}
                          style={{ fontSize: 11, color: t.accentPurple, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                          + Add book pages
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Root files (legacy / no-folder) */}
              {(items.filter((i) => i.type === 'file' && (i as DocFile).folderId === null) as DocFile[]).map((file) => (
                <LibraryFileRow key={file.id} file={file} isActive={file.id === activeId} t={t}
                  isRenaming={renamingId === file.id} renameValue={renameValue}
                  onSelect={() => selectFile(file.id)} onDelete={() => deleteItem(file.id)}
                  onStartRename={() => { setRenamingId(file.id); setRenameValue(file.name); }}
                  onRenameChange={setRenameValue} onRenameCommit={commitRename} onRenameCancel={() => setRenamingId(null)} />
              ))}
            </div>
          </div>
        )}

        {/* ─── EDITOR ─── */}
        {/* On mobile, hide the editor when a different panel tab is active */}
        <div style={{
          flex: 1, minWidth: 0, display: isMobile && mobilePanel !== 'editor' ? 'none' : 'flex',
          flexDirection: 'column', overflow: 'hidden', position: 'relative',
        }}>
          {/* Script toolbar row */}
          {isScript && !focusMode && (
            <div style={{
              background: t.scriptToolbarBg, borderBottom: t.scriptToolbarBorder,
              padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: t.scriptToolbarText, letterSpacing: '0.08em', marginRight: 2, flexShrink: 0 }}>
                {currentMode === 'screenplay' ? '🎬' : '📺'}
              </span>
              {/* Group 1: Core elements */}
              {SCRIPT_ELEMENTS.slice(0, 7).map((el) => {
                // Character button — insert element then immediately show character dropdown
                if (el.value === 'character') {
                  return (
                    <button key={el.value} type='button'
                      title='Insert Character (auto-uppercase, choose from known characters)'
                      onMouseDown={(e) => {
                        e.preventDefault();
                        insertScriptElement('character');
                        setTimeout(() => {
                          const sel2 = window.getSelection();
                          if (sel2 && sel2.rangeCount > 0) {
                            const rect = sel2.getRangeAt(0).getBoundingClientRect();
                            setCharDropdown({ x: rect.left, y: rect.bottom + 4, filter: '' });
                          }
                        }, 50);
                      }}
                      style={{
                        padding: '2px 8px', fontSize: 10, borderRadius: 4, cursor: 'pointer', border: 'none', whiteSpace: 'nowrap',
                        background: scriptElement === 'character' ? t.scriptBtnActive : t.scriptBtnInactive,
                        color: scriptElement === 'character' ? t.scriptBtnActiveText : t.scriptBtnInactiveText,
                        fontWeight: scriptElement === 'character' ? 700 : 400,
                      }}>
                      {el.label} ▾
                    </button>
                  );
                }
                // Transition button — show picker dropdown instead of inserting directly
                if (el.value === 'transition') {
                  return (
                    <button key={el.value} type='button'
                      title='Choose a transition'
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTransitionPicker((v) => v ? null : { x: rect.left, y: rect.bottom + 4 });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        padding: '2px 8px', fontSize: 10, borderRadius: 4, cursor: 'pointer', border: 'none', whiteSpace: 'nowrap',
                        background: scriptElement === 'transition' ? t.scriptBtnActive : t.scriptBtnInactive,
                        color: scriptElement === 'transition' ? t.scriptBtnActiveText : t.scriptBtnInactiveText,
                        fontWeight: scriptElement === 'transition' ? 700 : 400,
                      }}>
                      {el.label} ▾
                    </button>
                  );
                }
                // All other core elements — insert directly
                return (
                  <button key={el.value} type='button' onMouseDown={(e) => { e.preventDefault(); insertScriptElement(el.value); }}
                    title={el.hint}
                    style={{
                      padding: '2px 8px', fontSize: 10, borderRadius: 4, cursor: 'pointer', border: 'none', whiteSpace: 'nowrap',
                      background: scriptElement === el.value ? t.scriptBtnActive : t.scriptBtnInactive,
                      color: scriptElement === el.value ? t.scriptBtnActiveText : t.scriptBtnInactiveText,
                      fontWeight: scriptElement === el.value ? 700 : 400,
                    }}>
                    {el.label}
                  </button>
                );
              })}
              <div style={{ width: 1, height: 16, background: t.sepBg, flexShrink: 0 }} />
              {/* Group 2: Special elements */}
              {SCRIPT_ELEMENTS.slice(7).map((el) => (
                el.value === 'act-break' ? (
                  /* Act break has a dropdown */
                  <div key={el.value} style={{ position: 'relative', flexShrink: 0 }}>
                    <button type='button' title='Insert Act Break'
                      onMouseDown={(e) => { e.preventDefault(); insertScriptElement('act-break', 'ACT ONE'); }}
                      style={{
                        padding: '2px 8px', fontSize: 10, borderRadius: 4, cursor: 'pointer', border: 'none',
                        background: scriptElement === 'act-break' ? t.scriptBtnActive : t.scriptBtnInactive,
                        color: scriptElement === 'act-break' ? t.scriptBtnActiveText : t.scriptBtnInactiveText,
                        fontWeight: 600,
                      }}>
                      Act Break ▾
                    </button>
                  </div>
                ) : (
                  <button key={el.value} type='button' onMouseDown={(e) => { e.preventDefault(); insertScriptElement(el.value); }}
                    title={el.hint}
                    style={{
                      padding: '2px 8px', fontSize: 10, borderRadius: 4, cursor: 'pointer', border: 'none', whiteSpace: 'nowrap',
                      background: scriptElement === el.value ? t.scriptBtnActive : t.scriptBtnInactive,
                      color: scriptElement === el.value ? t.scriptBtnActiveText : t.scriptBtnInactiveText,
                      fontWeight: scriptElement === el.value ? 700 : 400,
                    }}>
                    {el.label}
                  </button>
                )
              ))}
              {/* Character quick-insert dropdown */}
              {scriptCharacters.length > 0 && (
                <>
                  <div style={{ width: 1, height: 16, background: t.sepBg, flexShrink: 0 }} />
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <button type='button'
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setCharDropdown((v) => v ? null : { x: rect.left, y: rect.bottom + 4, filter: '' });
                      }}
                      style={{
                        padding: '2px 8px', fontSize: 10, borderRadius: 4, cursor: 'pointer',
                        background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.35)',
                        color: t.accentPurple, fontWeight: 600, whiteSpace: 'nowrap',
                      }}>
                      👤 Characters ▾
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Document title bar */}
          {!focusMode && (
            <div style={{ padding: '8px 24px', borderBottom: t.titleBarBorder, background: t.titleBarBg, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              {renamingId === activeId ? (
                <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename} onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingId(null); }}
                  style={{ fontSize: 15, fontWeight: 600, background: 'transparent', border: 'none', borderBottom: `1px solid ${t.accentPurple}`, color: t.textPrimary, outline: 'none', flex: 1 }} />
              ) : (
                <span onDoubleClick={() => { if (activeId) { setRenamingId(activeId); setRenameValue(activeFile?.name || ''); } }}
                  title='Double-click to rename'
                  style={{ fontSize: 15, fontWeight: 600, color: t.titleBarText, cursor: 'text', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeFile?.name || 'No document selected'}
                </span>
              )}
              <div style={{ display: 'flex', gap: 16, fontSize: 11, color: t.titleBarMuted, flexShrink: 0 }}>
                {activeFile?.subtype !== 'title-page' && activeFile?.subtype !== 'timeline' && (
                  <><span>{wordCount.toLocaleString()} words</span><span>{charCount.toLocaleString()} chars</span><span>{readTime} read</span></>
                )}
                {activeFile?.subtype && (
                  <span style={{ color: t.accentPurple, fontWeight: 600, textTransform: 'capitalize' }}>
                    {activeFile.subtype === 'title-page' ? '📄 Title Page' : activeFile.subtype === 'timeline' ? '🗺 Timeline' : activeFile.subtype === 'notes' ? '📝 Notes' : activeFile.subtype === 'ideas' ? '💡 Ideas' : '✍️ Writing'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Format Panel (inline slide-down) */}
          {showFormatPanel && (
            <FormatPanel
              t={t}
              darkMode={darkMode}
              pageMargins={pageMargins}
              pageSize={pageSize}
              onMarginsChange={setPageMargins}
              onPageSizeChange={setPageSize}
              onClose={() => setShowFormatPanel(false)}
            />
          )}

          {/* Paper scroll area */}
          <div style={{
            flex: 1, overflowY: 'auto',
            padding: focusMode ? '80px 0' : isMobile ? '12px 0' : '48px 0',
            background: focusMode ? t.paperScrollBgFocus : (darkMode ? 'rgba(0,0,0,0.25)' : '#e8e4dc'),
          }}>

            {/* ── TITLE PAGE VIEW ── */}
            {activeFile?.subtype === 'title-page' && (
              <TitlePageView file={activeFile} t={t} darkMode={darkMode} onUpdate={(updated) => {
                const next = items.map((i) => i.id === activeId ? { ...(i as DocFile), ...updated } : i) as FSItem[];
                setItems(next); persist(next, activeId, notepads, activeNoteId);
              }} />
            )}

            {/* ── TIMELINE VIEW ── */}
            {activeFile?.subtype === 'timeline' && (
              <TimelineView file={activeFile} t={t} darkMode={darkMode} onUpdate={(beats) => {
                const next = items.map((i) => i.id === activeId ? { ...(i as DocFile), beats } : i) as FSItem[];
                setItems(next); persist(next, activeId, notepads, activeNoteId);
              }} />
            )}

            {/* ── PAGED EDITOR (writing / notes / ideas) ── */}
            {activeFile?.subtype !== 'title-page' && activeFile?.subtype !== 'timeline' && (
              <PagedEditor
                editorRef={editorRef}
                t={t}
                darkMode={darkMode}
                isScript={isScript}
                focusMode={focusMode}
                fontFamily={fontFamily}
                fontSize={fontSize}
                lineSpacing={lineSpacing}
                proseFormat={proseFormat}
                pageMargins={pageMargins}
                pageSize={pageSize}
                bookTitle={bookTitle}
                bookAuthor={bookAuthor}
                placeholder={
                  isScript ? 'FADE IN:\n\nBegin your script…'
                  : activeFile?.subtype === 'notes' ? 'Jot down notes, world-building, character details…'
                  : activeFile?.subtype === 'ideas' ? 'Capture ideas, sparks, what-if questions…'
                  : 'Begin your story…'
                }
                handleInput={handleInput}
                handleKeyDown={handleKeyDown}
                updateActiveStates={updateActiveStates}
                handleMouseUp={handleMouseUp}
              />
            )}
          </div>
        </div>

        {/* ─── RIGHT PANEL ─── */}
        {showRight && (
          <div style={{
            width: isMobile ? '100%' : 300,
            flexShrink: 0, display: 'flex', flexDirection: 'column',
            background: t.rightPanelBg, borderLeft: isMobile ? 'none' : t.rightPanelBorder,
            backdropFilter: t.rightPanelBlur,
          }}>
            {/* Panel tabs */}
            <div style={{ display: 'flex', borderBottom: t.rightPanelBorder, flexShrink: 0 }}>
              {([
                { id: 'thesaurus',  icon: <BookOpen className='w-3.5 h-3.5' />,  label: 'Thes.' },
                { id: 'definition', icon: <BookType className='w-3.5 h-3.5' />,  label: 'Dict.' },
                ...(isScript ? [{ id: 'script', icon: <Settings2 className='w-3.5 h-3.5' />, label: 'Script' }] : []),
                ...(isScript ? [{ id: 'guide', icon: <span style={{ fontSize: 13, lineHeight: 1 }}>📖</span>, label: 'Guide' }] : []),
                { id: 'dict',       icon: <BookMarked className='w-3.5 h-3.5' />, label: 'Words' },
              ] as { id: string; icon: React.ReactNode; label: string }[]).map((tab) => (
                <button key={tab.id} type='button' onClick={() => setRightPanel(tab.id as 'ai' | 'notes' | 'script' | 'dict' | 'thesaurus' | 'definition' | 'guide')}
                  style={{
                    flex: 1, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    fontSize: 10, fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer',
                    color: rightPanel === tab.id ? t.rightPanelTabActive : t.rightPanelTabInactive,
                    borderBottom: rightPanel === tab.id ? t.rightPanelTabBorder : '2px solid transparent',
                  }}>
                  {tab.icon}{tab.label}
                </button>
              ))}
              <button type='button' onClick={() => setRightPanel(null)}
                style={{ width: 30, background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer' }}>
                <X className='w-3.5 h-3.5' style={{ margin: '0 auto' }} />
              </button>
            </div>

            {/* ── AI Writing Coach panel — temporarily hidden ── */}
            {/* rightPanel === 'ai' && ( ... AI panel content ... ) */}

            {/* ── Script Tools Panel ── */}
            {rightPanel === 'script' && isScript && (
              <ScriptToolsPanel
                t={t} darkMode={darkMode}
                scriptCharacters={scriptCharacters}
                setScriptCharacters={setScriptCharacters}
                scriptScenes={scriptScenes}
                setScriptScenes={setScriptScenes}
                episodeHeader={episodeHeader}
                setEpisodeHeader={setEpisodeHeader}
                editingCharId={editingCharId}
                setEditingCharId={setEditingCharId}
                newCharName={newCharName}
                setNewCharName={setNewCharName}
                scriptElement={scriptElement}
                insertScriptElement={insertScriptElement}
                currentMode={currentMode}
                onScanCharacters={scanForCharacters}
              />
            )}

            {/* ── Thesaurus Panel ── */}
            {rightPanel === 'thesaurus' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
                {/* Search input */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                  <input
                    value={thesaurusInput}
                    onChange={(e) => setThesaurusInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && thesaurusInput.trim()) { const w = thesaurusInput.trim().toLowerCase(); setThesaurusWord(w); } }}
                    placeholder='Enter any word…'
                    style={{ flex: 1, height: 32, background: t.findInputBg, border: t.findInputBorder, borderRadius: 6, color: t.findInputText, fontSize: 12, padding: '0 10px', outline: 'none' }}
                  />
                  <button type='button'
                    onClick={() => { if (thesaurusInput.trim()) { const w = thesaurusInput.trim().toLowerCase(); setThesaurusWord(w); } }}
                    style={{ height: 32, padding: '0 12px', background: t.findBtnBg, border: t.findBtnBorder, borderRadius: 6, color: t.textPrimary, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>
                    Look up
                  </button>
                </div>

                {thesaurusWord && (
                  <>
                    {/* Word heading */}
                    <div style={{ marginBottom: 14, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, fontFamily: 'Garamond, Georgia, serif', letterSpacing: '0.02em' }}>
                        {thesaurusWord}
                      </span>
                      {dataLoading && <span style={{ fontSize: 11, color: t.textMuted }}>loading…</span>}
                    </div>

                    {/* Synonyms */}
                    {dataSynonyms.length > 0 ? (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: t.accentPurple, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                          Synonyms
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {dataSynonyms.map((syn) => (
                            <button key={syn} type='button'
                              onClick={() => replaceFromCtxMenu(syn)}
                              title='Click to replace selected word in document'
                              style={{ padding: '4px 11px', fontSize: 12, borderRadius: 20, cursor: 'pointer', background: t.dictPopupBtnBg, border: t.dictPopupBtnBorder, color: t.textPrimary }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = t.dictPopupBtnHover; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = t.dictPopupBtnBg; }}>
                              {syn}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : !dataLoading && (
                      <p style={{ fontSize: 12, color: t.textMuted, marginBottom: 12 }}>No synonyms found for &ldquo;{thesaurusWord}&rdquo;.</p>
                    )}

                    {/* Antonyms */}
                    {dataAntonyms.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: t.accentAmber, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                          Antonyms
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {dataAntonyms.map((ant) => (
                            <button key={ant} type='button'
                              onClick={() => replaceFromCtxMenu(ant)}
                              title='Click to replace selected word in document'
                              style={{ padding: '4px 11px', fontSize: 12, borderRadius: 20, cursor: 'pointer', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', color: t.textPrimary }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(251,191,36,0.28)'; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(251,191,36,0.12)'; }}>
                              {ant}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {!dataLoading && dataSynonyms.length === 0 && dataAntonyms.length === 0 && (
                      <p style={{ fontSize: 12, color: t.textMuted }}>No entries found for &ldquo;{thesaurusWord}&rdquo;.</p>
                    )}

                    <p style={{ fontSize: 10, color: t.textMuted, marginTop: 12, lineHeight: 1.6 }}>
                      Right-click a word in your document, then click any entry above to replace it.
                    </p>
                  </>
                )}

                {!thesaurusWord && (
                  <p style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.7 }}>
                    Type any word above, or right-click a word in your document and choose <strong>Synonyms &amp; Antonyms</strong>.
                  </p>
                )}
              </div>
            )}

            {/* ── Dictionary / Definition Panel ── */}
            {rightPanel === 'definition' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
                {/* Search input */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                  <input
                    value={definitionInput}
                    onChange={(e) => setDefinitionInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && definitionInput.trim()) setDefinitionWord(definitionInput.trim().toLowerCase()); }}
                    placeholder='Enter any word…'
                    style={{ flex: 1, height: 32, background: t.findInputBg, border: t.findInputBorder, borderRadius: 6, color: t.findInputText, fontSize: 12, padding: '0 10px', outline: 'none' }}
                  />
                  <button type='button'
                    onClick={() => { if (definitionInput.trim()) setDefinitionWord(definitionInput.trim().toLowerCase()); }}
                    style={{ height: 32, padding: '0 12px', background: t.findBtnBg, border: t.findBtnBorder, borderRadius: 6, color: t.textPrimary, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>
                    Look up
                  </button>
                </div>

                {definitionWord && (
                  <>
                    {/* Word heading */}
                    <div style={{ marginBottom: 14, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, fontFamily: 'Garamond, Georgia, serif', letterSpacing: '0.02em' }}>
                        {definitionWord}
                      </span>
                      {dataLoading && dataDefWord !== definitionWord && <span style={{ fontSize: 11, color: t.textMuted }}>loading…</span>}
                    </div>

                    {dataDefWord === definitionWord && dataDefinitions.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {dataDefinitions.map((entry, i) => (
                          <div key={i} style={{ padding: '10px 12px', background: t.aiCardBg, border: t.aiCardBorder, borderRadius: 8 }}>
                            {entry.pos && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: t.accentAmber, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                {entry.pos}
                              </span>
                            )}
                            <p style={{ fontSize: 13, color: t.textPrimary, marginTop: entry.pos ? 5 : 0, lineHeight: 1.65, fontFamily: 'Garamond, Georgia, serif' }}>
                              {entry.def}
                            </p>
                            {entry.example && (
                              <p style={{ fontSize: 11, color: t.textMuted, marginTop: 5, fontStyle: 'italic', lineHeight: 1.55 }}>
                                &ldquo;{entry.example}&rdquo;
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : dataDefWord === definitionWord ? (
                      <p style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.7 }}>
                        No definition found for &ldquo;{definitionWord}&rdquo;.
                      </p>
                    ) : null}
                  </>
                )}

                {!definitionWord && (
                  <p style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.7 }}>
                    Type any word above, or right-click a word in your document and choose <strong>Define</strong>.
                  </p>
                )}
              </div>
            )}

            {/* ── Custom Dictionary Panel ── */}
            {rightPanel === 'dict' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    📖 Custom Dictionary
                  </span>
                  <p style={{ fontSize: 11, color: t.textMuted, marginTop: 4, lineHeight: 1.5 }}>
                    Add names, slang, or invented words to suppress red underlines.
                  </p>
                </div>

                {/* Add word form */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                  <input
                    value={dictInput}
                    onChange={(e) => setDictInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomWord(dictInput); } }}
                    placeholder='Type a word…'
                    style={{
                      flex: 1, height: 30, background: t.findInputBg, border: t.findInputBorder,
                      borderRadius: 6, color: t.findInputText, fontSize: 12, padding: '0 10px', outline: 'none',
                    }}
                  />
                  <button
                    type='button'
                    onClick={() => addCustomWord(dictInput)}
                    style={{
                      height: 30, padding: '0 12px', background: t.findBtnBg, border: t.findBtnBorder,
                      borderRadius: 6, color: t.textPrimary, fontSize: 11, cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    Add
                  </button>
                </div>

                {/* Word list */}
                {customWords.length === 0 ? (
                  <div style={{ fontSize: 12, color: t.textMuted, textAlign: 'center', marginTop: 24 }}>
                    No words added yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {customWords.map((word) => (
                      <div key={word} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '6px 10px', borderRadius: 6,
                        background: t.aiCardBg, border: t.aiCardBorder, fontSize: 12,
                      }}>
                        <span style={{ color: t.textPrimary, fontFamily: 'Georgia, serif' }}>{word}</span>
                        <button
                          type='button'
                          title='Remove from dictionary'
                          onClick={() => removeCustomWord(word)}
                          style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', padding: 2, lineHeight: 1 }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = t.accentRed; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = t.textMuted; }}
                        >
                          <X className='w-3 h-3' />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Guide Panel (Screenplay cheat-sheet) ── */}
            {rightPanel === 'guide' && isScript && (
              <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
                  📖 Screenplay Guide
                </div>
                <div style={{ fontSize: 11, color: t.textMuted, lineHeight: 1.55, marginBottom: 14, padding: '8px 10px', background: darkMode ? 'rgba(245,158,11,0.07)' : 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 6 }}>
                  Your fiction instincts are an asset. The only new skill is <strong style={{ color: t.accentAmber }}>format</strong>. Each element has a fixed place on the page. Tab cycles through them automatically.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {SCREENPLAY_GUIDE.map((g) => (
                    <div key={g.element} style={{
                      borderRadius: 8, overflow: 'hidden',
                      border: `1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                    }}>
                      <div style={{
                        padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8,
                        background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                        borderBottom: `2px solid ${g.color}`,
                      }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: g.color, flexShrink: 0, display: 'inline-block' }} />
                        <span style={{ fontSize: 11, fontWeight: 800, color: t.textPrimary, letterSpacing: '0.03em' }}>{g.element}</span>
                      </div>
                      <div style={{ padding: '8px 10px', background: darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)' }}>
                        <div style={{ fontSize: 11, color: t.textSecondary, lineHeight: 1.55, marginBottom: 6 }}>{g.rule}</div>
                        <div style={{
                          fontFamily: "'Courier Prime','Courier New',monospace", fontSize: 10,
                          color: g.color, padding: '4px 8px', borderRadius: 4, marginBottom: 6,
                          background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        }}>{g.example}</div>
                        <div style={{ display: 'flex', gap: 5, alignItems: 'flex-start' }}>
                          <span style={{ color: t.accentGreen, fontSize: 11, flexShrink: 0, marginTop: 1 }}>💡</span>
                          <span style={{ fontSize: 10, color: t.textMuted, lineHeight: 1.5 }}>{g.tip}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tab cycle flow diagram */}
                <div style={{ marginTop: 16, padding: '10px 12px', background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: t.accentAmber, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Tab Key Flow</div>
                  {[
                    { from: 'Scene Heading', to: 'Action', fromColor: '#f59e0b', toColor: '#94a3b8' },
                    { from: 'Action', to: 'Character', fromColor: '#94a3b8', toColor: '#a78bfa' },
                    { from: 'Character', to: 'Dialogue', fromColor: '#a78bfa', toColor: '#86efac' },
                    { from: 'Dialogue', to: 'Parenthetical', fromColor: '#86efac', toColor: '#67e8f9' },
                    { from: 'Parenthetical', to: 'Dialogue', fromColor: '#67e8f9', toColor: '#86efac' },
                    { from: 'Transition', to: 'Scene Heading', fromColor: '#fbbf24', toColor: '#f59e0b' },
                  ].map(({ from, to, fromColor, toColor }) => (
                    <div key={from} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, fontSize: 10 }}>
                      <span style={{ padding: '2px 7px', borderRadius: 3, background: `${fromColor}22`, color: fromColor, fontFamily: 'monospace', fontWeight: 700, fontSize: 9 }}>{from}</span>
                      <span style={{ color: t.textMuted }}>→ Tab →</span>
                      <span style={{ padding: '2px 7px', borderRadius: 3, background: `${toColor}22`, color: toColor, fontFamily: 'monospace', fontWeight: 700, fontSize: 9 }}>{to}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ════════════════ MOBILE BOTTOM TAB BAR ════════════════ */}
      {isMobile && !focusMode && (
        <div className="ws-mobile-tabbar" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          height: 48, display: 'flex', alignItems: 'stretch',
          background: darkMode ? '#120825' : '#ffffff',
          borderTop: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.12)',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.15)',
        }}>
          {([
            { id: 'library', label: 'Library',  emoji: '📚' },
            { id: 'editor',  label: 'Write',    emoji: '✍️' },
            { id: 'tools',   label: 'Tools',    emoji: '✨' },
          ] as { id: 'library' | 'editor' | 'tools'; label: string; emoji: string }[]).map((tab) => {
            const isActive = mobilePanel === tab.id;
            return (
              <button
                key={tab.id}
                type='button'
                onClick={() => {
                  setMobilePanel(tab.id);
                  // When switching to Tools, make sure a panel is open
                  if (tab.id === 'tools' && rightPanel === null) setRightPanel('ai');
                  // When switching to Editor, focus the editor
                  if (tab.id === 'editor') setTimeout(() => editorRef.current?.focus(), 50);
                }}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: 2,
                  background: isActive
                    ? (darkMode ? 'rgba(139,92,246,0.18)' : 'rgba(139,92,246,0.08)')
                    : 'transparent',
                  border: 'none', cursor: 'pointer',
                  borderTop: isActive
                    ? `2px solid ${darkMode ? '#a78bfa' : '#7c3aed'}`
                    : '2px solid transparent',
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>{tab.emoji}</span>
                <span style={{
                  fontSize: 10, fontWeight: isActive ? 700 : 500,
                  color: isActive
                    ? (darkMode ? '#c4b5fd' : '#7c3aed')
                    : (darkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)'),
                }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ════════════════ STATUS BAR ════════════════ */}
      {!focusMode && (
        <div style={{
          height: 24, background: t.statusBarBg, borderTop: t.statusBarBorder,
          display: 'flex', alignItems: 'center', padding: '0 16px', gap: 20, flexShrink: 0,
        }}>
          {[
            { label: `${wordCount.toLocaleString()} words` },
            { label: `${charCount.toLocaleString()} characters` },
            { label: `${readTime} read` },
            ...(isScript && editorRef.current ? [{
              label: (() => {
                const pages = getPageEstimate(editorRef.current.innerHTML);
                return `~${pages} page${pages !== 1 ? 's' : ''} · ~${pages} min`;
              })(),
              highlight: true,
            }] : []),
            { label: currentMode === 'prose' ? '✍️ Prose' : currentMode === 'screenplay' ? '🎬 Screenplay' : '📺 Teleplay' },
            { label: activeFile?.name || '' },
          ].map(({ label, highlight }: { label: string; highlight?: boolean }) => label ? (
            <span key={label} style={{ fontSize: 10, color: highlight ? t.accentAmber : t.statusBarText, whiteSpace: 'nowrap', fontWeight: highlight ? 700 : 400 }}>{label}</span>
          ) : null)}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Hide keyboard shortcuts hint on mobile — not useful on touch devices */}
            <span className="hidden md:inline" style={{ fontSize: 10, color: t.statusBarHint }}>Ctrl+B Bold · Ctrl+I Italic · Ctrl+F Find · Right-click any word for spell check, synonyms &amp; definitions</span>
          </div>
        </div>
      )}

      {/* ════════════════ GLOBAL STYLES ════════════════ */}
      <style>{`
        /* Safe-area inset so the bottom tab bar clears the iPhone home indicator */
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .ws-mobile-tabbar { padding-bottom: env(safe-area-inset-bottom); height: calc(48px + env(safe-area-inset-bottom)) !important; }
        }
        .ws-editor:empty:not(:focus)::before {
          content: attr(data-placeholder);
          color: ${t.editorPlaceholder};
          pointer-events: none;
          white-space: pre;
        }
        .ws-editor { caret-color: ${t.editorCaret}; font-weight: normal; }
        /* Hard reset — prevent browser from carrying bold/italic forward on Enter.
           The contenteditable's execCommand('bold') wraps text in <b> or <strong>;
           we neutralise that at the script-element level so the line never goes bold
           unless the user explicitly has the cursor inside a <b> span they typed. */
        .ws-editor div, .ws-editor p, .ws-editor span { font-weight: inherit; }
        .ws-editor [data-script-el] { font-weight: normal !important; font-family: 'Courier New', monospace !important; font-size: 12pt !important; }
        .ws-editor [data-script-el] b,
        .ws-editor [data-script-el] strong { font-weight: bold; }
        .ws-editor [data-script-el="act-break"] { font-weight: 700 !important; }
        .ws-editor h1 { font-size: 2.2em; font-weight: 800; margin: 0.5em 0 0.3em; letter-spacing: -0.02em; }
        .ws-editor h2 { font-size: 1.7em; font-weight: 700; margin: 1em 0 0.3em; }
        .ws-editor h3 { font-size: 1.3em; font-weight: 600; margin: 1em 0 0.3em; }
        .ws-editor h4, .ws-editor h5, .ws-editor h6 { font-size: 1.1em; font-weight: 600; margin: 0.8em 0 0.2em; }
        .ws-editor p { margin: 0.4em 0; }
        /* ── Fantasy Book format ── */
        .ws-fantasy p { margin: 0; text-indent: 2em; text-align: justify; }
        .ws-fantasy p:first-child,
        .ws-fantasy h1 + p,
        .ws-fantasy h2 + p,
        .ws-fantasy h3 + p { text-indent: 0; }
        .ws-fantasy h1 { font-family: Garamond, Georgia, serif; font-size: 2em; font-weight: 700; text-align: center; letter-spacing: 0.05em; margin: 1.5em 0 0.8em; }
        .ws-fantasy h2 { font-family: Garamond, Georgia, serif; font-size: 1.4em; font-weight: 600; text-align: center; letter-spacing: 0.04em; margin: 2em 0 1em; }
        .ws-fantasy h3 { font-family: Garamond, Georgia, serif; font-size: 1.15em; font-style: italic; text-align: center; margin: 1.5em 0 0.8em; }
        .ws-fantasy blockquote { font-style: italic; margin: 1.5em 3em; border-left: none; background: transparent; padding: 0; color: inherit; }
        .ws-fantasy hr { border: none; text-align: center; margin: 2em 0; color: ${t.textMuted}; }
        .ws-fantasy hr::after { content: '✦  ✦  ✦'; letter-spacing: 0.5em; font-size: 0.85em; }
        .ws-editor ul { list-style: disc; padding-left: 1.6em; margin: 0.5em 0; }
        .ws-editor ol { list-style: decimal; padding-left: 1.6em; margin: 0.5em 0; }
        .ws-editor blockquote {
          border-left: 3px solid ${t.accentPurple};
          margin: 1.2em 0; padding: 0.6em 1.2em;
          background: rgba(139,92,246,0.08);
          font-style: italic;
          border-radius: 0 6px 6px 0;
        }
        .ws-editor a { color: ${t.accentPurple}; text-decoration: underline; }
        .ws-editor img { max-width: 100%; height: auto; border-radius: 4px; }
        .ws-editor hr { border: none; border-top: ${t.paperBorder}; margin: 2em 0; }
        .ws-editor [data-script-el]:empty::before {
          content: attr(data-placeholder);
          color: ${t.editorPlaceholder};
          pointer-events: none;
        }
        /* Lyrics purple border */
        .ws-editor [data-script-el="lyrics"] { border-left-color: ${t.accentPurple}; }
        /* Text message bubble */
        .ws-editor [data-script-el="text-message"] { background: ${darkMode ? 'rgba(60,120,255,0.15)' : 'rgba(60,120,255,0.08)'} !important; border-color: rgba(60,120,255,0.35) !important; }
        /* Phone call dashed border */
        .ws-editor [data-script-el="phone-call"] { border-color: ${t.textMuted} !important; }
        /* Act break highlight */
        .ws-editor [data-script-el="act-break"] { color: ${t.accentAmber} !important; }
        /* Parenthetical green tint */
        .ws-editor [data-script-el="parenthetical"] { color: ${t.accentGreen} !important; }
        /* Transition right-align amber */
        .ws-editor [data-script-el="transition"] { color: ${t.accentAmber} !important; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.5); }
        @media print {
          body > *:not(.ws-print) { display: none !important; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FACTORIES
// ─────────────────────────────────────────────────────────────────────────────
function makeFile(name: string, folderId: string | null, mode: DocMode = 'prose', subtype: DocSubtype = 'writing'): DocFile {
  const base: DocFile = { id: uid(), type: 'file', name, content: '', folderId, createdAt: Date.now(), updatedAt: Date.now(), wordCount: 0, mode, subtype };
  if (subtype === 'title-page') {
    base.titlePage = { title: name, subtitle: '', author: '', email: '', phone: '', address: '', wordCountLabel: '' };
  }
  if (subtype === 'timeline') {
    base.beats = DEFAULT_BEATS.map((b) => ({ ...b, id: uid() }));
  }
  return base;
}

function makeBookItems(bookTitle: string, folderId: string): DocFile[] {
  return [
    makeFile('Writing', folderId, 'prose', 'writing'),
    makeFile('Title Page', folderId, 'prose', 'title-page'),
    makeFile('Notes', folderId, 'prose', 'notes'),
    makeFile('Ideas', folderId, 'prose', 'ideas'),
    makeFile('Timeline', folderId, 'prose', 'timeline'),
  ].map((f, i) => i === 1 ? { ...f, titlePage: { ...f.titlePage!, title: bookTitle } } : f);
}
function makeNote(title: string, color: string): Notepad {
  return { id: uid(), title, content: '', color, updatedAt: Date.now() };
}
function dl(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

// ─────────────────────────────────────────────────────────────────────────────
// FOLDER ROW
// ─────────────────────────────────────────────────────────────────────────────
function FolderRow({ folder, renamingId, renameValue, t, onToggle, onCommitRename, onCancelRename, onSetRenameValue, onStartRename, onDelete }: {
  folder: DocFolder; renamingId: string | null; renameValue: string; t: TTheme;
  onToggle: () => void; onCommitRename: () => void; onCancelRename: () => void;
  onSetRenameValue: (v: string) => void; onStartRename: () => void; onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={renamingId === folder.id ? undefined : onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 5, padding: '5px 8px',
        borderRadius: 6, cursor: 'pointer', userSelect: 'none',
        background: hovered ? t.sidebarFolderHover : 'transparent',
      }}
    >
      {folder.open
        ? <ChevronDown className='w-3 h-3' style={{ color: t.sidebarFolderIcon, flexShrink: 0 }} />
        : <ChevronRight className='w-3 h-3' style={{ color: t.sidebarFolderIcon, flexShrink: 0 }} />}
      <Folder className='w-3.5 h-3.5' style={{ color: t.accentAmber, flexShrink: 0 }} />
      {renamingId === folder.id ? (
        <input
          autoFocus value={renameValue}
          onChange={(e) => onSetRenameValue(e.target.value)}
          onBlur={onCommitRename}
          onKeyDown={(e) => { if (e.key === 'Enter') onCommitRename(); if (e.key === 'Escape') onCancelRename(); }}
          onClick={(e) => e.stopPropagation()}
          style={{ flex: 1, fontSize: 12, background: 'transparent', border: 'none', borderBottom: `1px solid ${t.accentPurple}`, color: t.textPrimary, outline: 'none', minWidth: 0 }}
        />
      ) : (
        <span style={{ flex: 1, fontSize: 12, color: t.sidebarFolderText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {folder.name}
        </span>
      )}
      {hovered && renamingId !== folder.id && (
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button type='button' title='Rename folder'
            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onStartRename(); }}
            style={{ width: 18, height: 18, background: 'transparent', border: 'none', color: t.accentPurple, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, fontSize: 11 }}>
            ✏
          </button>
          {folder.id !== 'default' && (
            <button type='button' title='Delete folder'
              onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(); }}
              style={{ width: 18, height: 18, background: 'transparent', border: 'none', color: t.accentRed, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3 }}>
              <Trash2 className='w-3 h-3' />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIBRARY FILE ROW
// ─────────────────────────────────────────────────────────────────────────────
function LibraryFileRow({ file, isActive, isRenaming, renameValue, t, onSelect, onDelete, onStartRename, onRenameChange, onRenameCommit, onRenameCancel }: {
  file: DocFile; isActive: boolean; isRenaming: boolean; renameValue: string; t: TTheme;
  onSelect: () => void; onDelete: () => void; onStartRename: () => void;
  onRenameChange: (v: string) => void; onRenameCommit: () => void; onRenameCancel: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const modeColor = file.mode === 'screenplay' ? t.accentAmber : file.mode === 'teleplay' ? t.accentGreen : t.accentPurple;
  return (
    <div
      onClick={isRenaming ? undefined : onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 8px 5px 26px', borderRadius: 6, cursor: 'pointer', userSelect: 'none',
        background: isActive ? t.sidebarFileActive : hovered ? t.sidebarFileHover : 'transparent',
        border: isActive ? t.sidebarFileActiveBorder : '1px solid transparent',
        marginBottom: 1,
      }}
    >
      <FileText className='w-3.5 h-3.5' style={{ color: modeColor, flexShrink: 0 }} />
      {isRenaming ? (
        <input autoFocus value={renameValue} onChange={(e) => onRenameChange(e.target.value)}
          onBlur={onRenameCommit}
          onKeyDown={(e) => { if (e.key === 'Enter') onRenameCommit(); if (e.key === 'Escape') onRenameCancel(); }}
          onClick={(e) => e.stopPropagation()}
          style={{ flex: 1, fontSize: 12, background: 'transparent', border: 'none', borderBottom: `1px solid ${t.accentPurple}`, color: t.textPrimary, outline: 'none', minWidth: 0 }} />
      ) : (
        <span style={{ flex: 1, fontSize: 12, color: isActive ? t.sidebarFileActiveText : t.sidebarFileText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {file.name}
        </span>
      )}
      {/* Action buttons — shown on hover */}
      {hovered && !isRenaming && (
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          {/* Rename */}
          <button type='button' title='Rename'
            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onStartRename(); }}
            style={{ width: 18, height: 18, background: 'transparent', border: 'none', color: t.accentPurple, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, fontSize: 11 }}>
            ✏
          </button>
          {/* Delete */}
          <button type='button' title='Delete'
            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(); }}
            style={{ width: 18, height: 18, background: 'transparent', border: 'none', color: t.accentRed, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3 }}>
            <Trash2 className='w-3 h-3' />
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI CARD
// ─────────────────────────────────────────────────────────────────────────────
function AiCard({ suggestion, onInsert, t }: {
  suggestion: { type: string; icon: string; title: string; text: string };
  onInsert: () => void; t: TTheme;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <div style={{
      background: t.aiCardBg, border: t.aiCardBorder,
      borderRadius: 8, padding: 10, transition: 'border-color 0.2s',
    }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.aiCardBorderHover; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.aiCardBorder.replace('1px solid ',''); }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <span style={{ fontSize: 14 }}>{suggestion.icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: t.aiCardTitle }}>{suggestion.title}</span>
        <button type='button' onClick={() => setExpanded((v) => !v)}
          style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 10 }}>
          {expanded ? '▲' : '▼'}
        </button>
      </div>
      <p style={{ fontSize: 12, color: t.aiCardText, lineHeight: 1.6, margin: 0,
        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: expanded ? 999 : 3, WebkitBoxOrient: 'vertical' as const }}>
        {suggestion.text}
      </p>
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <button type='button' onClick={() => { navigator.clipboard?.writeText(suggestion.text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          style={{ flex: 1, padding: '4px 8px', fontSize: 11, background: t.aiCardBtnBg, border: t.aiCardBtnBorder, borderRadius: 5, color: copied ? t.accentGreen : t.aiCardBtnColor, cursor: 'pointer' }}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
        <button type='button' onClick={onInsert}
          style={{ flex: 1, padding: '4px 8px', fontSize: 11, background: t.aiCardInsertBg, border: t.aiCardInsertBorder, borderRadius: 5, color: t.aiCardInsertColor, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <Wand2 className='w-3 h-3' /> Insert
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCRIPT TOOLS PANEL  (full-featured character DB, scene DB, episode header, shortcuts)
// ─────────────────────────────────────────────────────────────────────────────
function ScriptToolsPanel({
  t, darkMode, scriptCharacters, setScriptCharacters, scriptScenes, setScriptScenes,
  episodeHeader, setEpisodeHeader, editingCharId, setEditingCharId, newCharName, setNewCharName,
  scriptElement, insertScriptElement, currentMode, onScanCharacters,
}: {
  t: TTheme; darkMode: boolean;
  scriptCharacters: ScriptCharacter[]; setScriptCharacters: React.Dispatch<React.SetStateAction<ScriptCharacter[]>>;
  scriptScenes: ScriptScene[]; setScriptScenes: React.Dispatch<React.SetStateAction<ScriptScene[]>>;
  episodeHeader: EpisodeHeader; setEpisodeHeader: React.Dispatch<React.SetStateAction<EpisodeHeader>>;
  editingCharId: string | null; setEditingCharId: React.Dispatch<React.SetStateAction<string | null>>;
  newCharName: string; setNewCharName: React.Dispatch<React.SetStateAction<string>>;
  scriptElement: string; insertScriptElement: (elType: string, overrideText?: string) => void;
  currentMode: string; onScanCharacters: () => void;
}) {
  const [tab, setTab] = useState<'elements' | 'characters' | 'scenes' | 'episode' | 'shortcuts'>('elements');
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);

  const inputSty: React.CSSProperties = {
    width: '100%', height: 26, background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.12)',
    borderRadius: 4, color: t.textPrimary, fontSize: 11, padding: '0 8px', outline: 'none', marginBottom: 6,
  };
  const labelSty: React.CSSProperties = { fontSize: 10, color: t.textMuted, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 3, marginTop: 8 };

  const editingChar = scriptCharacters.find((c) => c.id === editingCharId) || null;
  const updateChar = (id: string, patch: Partial<ScriptCharacter>) => {
    setScriptCharacters((prev) => prev.map((c) => c.id === id ? { ...c, ...patch } : c));
  };
  const deleteChar = (id: string) => {
    setScriptCharacters((prev) => prev.filter((c) => c.id !== id));
    if (editingCharId === id) setEditingCharId(null);
  };
  const addChar = () => {
    const name = newCharName.trim().toUpperCase();
    if (!name) return;
    const exists = scriptCharacters.find((c) => c.name === name);
    if (exists) { setEditingCharId(exists.id); setNewCharName(''); return; }
    const nc: ScriptCharacter = { id: uid(), name, aliases: [], age: '', actorNotes: '', voice: '', description: '', relationships: '', firstScene: 0, lastScene: 0, totalDialogue: 0, totalScenes: 0 };
    setScriptCharacters((prev) => [...prev, nc]);
    setEditingCharId(nc.id);
    setNewCharName('');
  };

  const editingScene = scriptScenes.find((s) => s.id === editingSceneId) || null;
  const updateScene = (id: string, patch: Partial<ScriptScene>) => {
    setScriptScenes((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s));
  };
  const addScene = () => {
    const ns: ScriptScene = { id: uid(), number: scriptScenes.length + 1, heading: 'INT. LOCATION - DAY', location: '', time: 'DAY', characters: [], pages: '', mood: '', purpose: '', conflict: '', outcome: '' };
    setScriptScenes((prev) => [...prev, ns]);
    setEditingSceneId(ns.id);
  };

  const tabStyle = (id: typeof tab): React.CSSProperties => ({
    flex: 1, padding: '6px 4px', fontSize: 9, fontWeight: 700, background: 'transparent', border: 'none',
    cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em',
    color: tab === id ? t.accentAmber : t.textMuted,
    borderBottom: tab === id ? `2px solid ${t.accentAmber}` : '2px solid transparent',
  });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, flexShrink: 0 }}>
        {(['elements', 'characters', 'scenes', ...(currentMode === 'teleplay' ? ['episode'] : []), 'shortcuts'] as (typeof tab)[]).map((id) => (
          <button key={id} type='button' style={tabStyle(id)} onClick={() => setTab(id)}>
            {id === 'elements' ? '⌖' : id === 'characters' ? '👤' : id === 'scenes' ? '🎬' : id === 'episode' ? '📺' : '⌨'}
            {' '}{id === 'elements' ? 'Elem' : id === 'characters' ? 'Chars' : id === 'scenes' ? 'Scenes' : id === 'episode' ? 'Ep.' : 'Keys'}
          </button>
        ))}
      </div>

      {/* ── ELEMENTS TAB ── */}
      {tab === 'elements' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
          {SCRIPT_ELEMENTS.map((el) => (
            <button key={el.value} type='button' onMouseDown={(e) => { e.preventDefault(); insertScriptElement(el.value); }}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                width: '100%', padding: '7px 10px', marginBottom: 4, fontSize: 11, textAlign: 'left', borderRadius: 6, cursor: 'pointer',
                background: scriptElement === el.value ? t.scriptBtnActive : darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                border: `1px solid ${scriptElement === el.value ? t.accentAmber : darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                color: scriptElement === el.value ? t.scriptBtnActiveText : t.textSecondary,
              }}>
              <span style={{ fontWeight: 700 }}>{el.label}</span>
              <span style={{ fontSize: 9, color: t.textMuted, fontStyle: 'italic', fontFamily: "'Courier New',monospace" }}>{el.hint}</span>
            </button>
          ))}
          <div style={{ marginTop: 10, borderTop: `1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, paddingTop: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Act Breaks</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {ACT_BREAK_OPTIONS.map((ab) => (
                <button key={ab} type='button'
                  onMouseDown={(e) => { e.preventDefault(); insertScriptElement('act-break', ab); }}
                  style={{ padding: '3px 9px', fontSize: 10, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 4, color: t.accentAmber, cursor: 'pointer', fontWeight: 700, fontFamily: "'Courier New',monospace" }}>
                  {ab}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CHARACTERS TAB ── */}
      {tab === 'characters' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
          {/* Scan button */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <input
              value={newCharName}
              onChange={(e) => setNewCharName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addChar(); }}
              placeholder='NEW CHARACTER NAME'
              style={{ ...inputSty, flex: 1, height: 28, marginBottom: 0, textTransform: 'uppercase', fontFamily: "'Courier New',monospace", fontWeight: 700 }}
            />
            <button type='button' onClick={addChar}
              style={{ height: 28, padding: '0 10px', background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.35)', borderRadius: 4, color: t.accentPurple, cursor: 'pointer', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
              +
            </button>
            <button type='button' onClick={onScanCharacters} title='Scan document for characters'
              style={{ height: 28, padding: '0 10px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 4, color: t.accentAmber, cursor: 'pointer', fontSize: 11, flexShrink: 0 }}>
              ⟳
            </button>
          </div>

          {/* Character list / editor */}
          {editingChar ? (
            <div style={{ background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${t.accentPurple}`, borderRadius: 8, padding: 10, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: t.accentPurple, fontFamily: "'Courier Prime','Courier New',monospace" }}>{editingChar.name}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type='button' onClick={() => { insertScriptElement('character', editingChar.name); setEditingCharId(null); }}
                    style={{ fontSize: 10, padding: '2px 8px', background: t.scriptBtnActive, border: 'none', borderRadius: 4, color: t.scriptBtnActiveText, cursor: 'pointer', fontWeight: 700 }}>
                    Insert
                  </button>
                  <button type='button' onClick={() => setEditingCharId(null)}
                    style={{ fontSize: 10, background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer' }}>✕</button>
                </div>
              </div>
              <label style={labelSty}>Age</label>
              <input value={editingChar.age} onChange={(e) => updateChar(editingChar.id, { age: e.target.value })} placeholder='e.g. 35' style={inputSty} />
              <label style={labelSty}>Description</label>
              <input value={editingChar.description} onChange={(e) => updateChar(editingChar.id, { description: e.target.value })} placeholder='Physical description…' style={inputSty} />
              <label style={labelSty}>Voice / Speech style</label>
              <input value={editingChar.voice} onChange={(e) => updateChar(editingChar.id, { voice: e.target.value })} placeholder='Terse, sarcastic, verbose…' style={inputSty} />
              <label style={labelSty}>Aliases / Nicknames</label>
              <input value={editingChar.aliases.join(', ')} onChange={(e) => updateChar(editingChar.id, { aliases: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} placeholder='Jake, The Kid…' style={inputSty} />
              <label style={labelSty}>Relationships</label>
              <input value={editingChar.relationships} onChange={(e) => updateChar(editingChar.id, { relationships: e.target.value })} placeholder='Sister of MARY, enemy of JOHN…' style={inputSty} />
              <label style={labelSty}>Actor Notes</label>
              <input value={editingChar.actorNotes} onChange={(e) => updateChar(editingChar.id, { actorNotes: e.target.value })} placeholder='Casting notes, physicality…' style={inputSty} />
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <div style={{ flex: 1, padding: '6px 8px', background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)', borderRadius: 5, fontSize: 10, color: t.textMuted, textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, color: t.accentAmber, fontSize: 14 }}>{editingChar.totalDialogue}</div>
                  Dialogue lines
                </div>
                <div style={{ flex: 1, padding: '6px 8px', background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)', borderRadius: 5, fontSize: 10, color: t.textMuted, textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, color: t.accentPurple, fontSize: 14 }}>{editingChar.totalScenes}</div>
                  Scenes
                </div>
              </div>
              <button type='button' onClick={() => deleteChar(editingChar.id)}
                style={{ marginTop: 8, width: '100%', padding: '4px 0', fontSize: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 4, color: '#ef4444', cursor: 'pointer' }}>
                Remove Character
              </button>
            </div>
          ) : null}

          {scriptCharacters.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 11, color: t.textMuted }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>👤</div>
              No characters yet. Type a name above or click ⟳ to scan the document.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {scriptCharacters.map((c) => (
                <div key={c.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 10px', borderRadius: 6,
                    background: editingCharId === c.id ? (darkMode ? 'rgba(139,92,246,0.18)' : 'rgba(139,92,246,0.1)') : (darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                    border: `1px solid ${editingCharId === c.id ? t.accentPurple : darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                    cursor: 'pointer',
                  }}
                  onClick={() => setEditingCharId(editingCharId === c.id ? null : c.id)}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: t.textPrimary, fontFamily: "'Courier New',monospace" }}>{c.name}</div>
                    {c.age && <div style={{ fontSize: 9, color: t.textMuted }}>Age {c.age}{c.description ? ` · ${c.description.slice(0, 28)}…` : ''}</div>}
                    {c.aliases.length > 0 && <div style={{ fontSize: 9, color: t.accentPurple }}>a.k.a. {c.aliases.join(', ')}</div>}
                  </div>
                  <button type='button' title='Insert this character'
                    onClick={(e) => { e.stopPropagation(); insertScriptElement('character', c.name); }}
                    style={{ fontSize: 10, padding: '2px 8px', background: t.scriptBtnActive, border: 'none', borderRadius: 4, color: t.scriptBtnActiveText, cursor: 'pointer', fontWeight: 700, flexShrink: 0 }}>
                    Insert
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SCENES TAB ── */}
      {tab === 'scenes' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {scriptScenes.length} Scene{scriptScenes.length !== 1 ? 's' : ''}
            </span>
            <button type='button' onClick={addScene}
              style={{ padding: '3px 10px', fontSize: 10, background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 4, color: t.accentAmber, cursor: 'pointer', fontWeight: 700 }}>
              + New Scene
            </button>
          </div>

          {editingScene ? (
            <div style={{ background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${t.accentAmber}`, borderRadius: 8, padding: 10, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: t.accentAmber }}>Scene {editingScene.number}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button type='button' onClick={() => insertScriptElement('scene-heading', editingScene.heading)}
                    style={{ fontSize: 10, padding: '2px 8px', background: t.scriptBtnActive, border: 'none', borderRadius: 4, color: t.scriptBtnActiveText, cursor: 'pointer', fontWeight: 700 }}>
                    Insert
                  </button>
                  <button type='button' onClick={() => setEditingSceneId(null)}
                    style={{ fontSize: 10, background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer' }}>✕</button>
                </div>
              </div>
              <label style={labelSty}>Scene Heading</label>
              <input value={editingScene.heading} onChange={(e) => updateScene(editingScene.id, { heading: e.target.value })}
                placeholder='INT. OFFICE - DAY' style={{ ...inputSty, fontFamily: "'Courier New',monospace", textTransform: 'uppercase', fontWeight: 700 }} />
              <label style={labelSty}>Location</label>
              <input value={editingScene.location} onChange={(e) => updateScene(editingScene.id, { location: e.target.value })} placeholder='e.g. Detective Agency' style={inputSty} />
              <label style={labelSty}>Time of Day</label>
              <input value={editingScene.time} onChange={(e) => updateScene(editingScene.id, { time: e.target.value })} placeholder='DAY / NIGHT / DAWN…' style={inputSty} />
              <label style={labelSty}>Characters in Scene</label>
              <input value={editingScene.characters.join(', ')} onChange={(e) => updateScene(editingScene.id, { characters: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} placeholder='JOHN, MARY, DETECTIVE…' style={inputSty} />
              <label style={labelSty}>Mood</label>
              <input value={editingScene.mood} onChange={(e) => updateScene(editingScene.id, { mood: e.target.value })} placeholder='Tense, romantic, comedic…' style={inputSty} />
              <label style={labelSty}>Purpose</label>
              <input value={editingScene.purpose} onChange={(e) => updateScene(editingScene.id, { purpose: e.target.value })} placeholder='Establish setting, reveal secret…' style={inputSty} />
              <label style={labelSty}>Conflict</label>
              <input value={editingScene.conflict} onChange={(e) => updateScene(editingScene.id, { conflict: e.target.value })} placeholder='What does each character want?' style={inputSty} />
              <label style={labelSty}>Outcome / Resolution</label>
              <input value={editingScene.outcome} onChange={(e) => updateScene(editingScene.id, { outcome: e.target.value })} placeholder='What changes by end of scene?' style={inputSty} />
              <label style={labelSty}>Pages</label>
              <input value={editingScene.pages} onChange={(e) => updateScene(editingScene.id, { pages: e.target.value })} placeholder='e.g. 2.5' style={inputSty} />
              <button type='button' onClick={() => { setScriptScenes((prev) => prev.filter((s) => s.id !== editingScene.id)); setEditingSceneId(null); }}
                style={{ marginTop: 4, width: '100%', padding: '4px 0', fontSize: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 4, color: '#ef4444', cursor: 'pointer' }}>
                Remove Scene
              </button>
            </div>
          ) : null}

          {scriptScenes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 11, color: t.textMuted }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🎬</div>
              No scenes tracked yet. Click &ldquo;+ New Scene&rdquo; to begin.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {scriptScenes.map((sc) => (
                <div key={sc.id}
                  style={{
                    padding: '7px 10px', borderRadius: 6, cursor: 'pointer',
                    background: editingSceneId === sc.id ? (darkMode ? 'rgba(251,191,36,0.12)' : 'rgba(251,191,36,0.08)') : (darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                    border: `1px solid ${editingSceneId === sc.id ? t.accentAmber : darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                  }}
                  onClick={() => setEditingSceneId(editingSceneId === sc.id ? null : sc.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: t.accentAmber, flexShrink: 0 }}>{sc.number}.</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: t.textPrimary, fontFamily: "'Courier New',monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sc.heading}</span>
                  </div>
                  {sc.characters.length > 0 && (
                    <div style={{ fontSize: 9, color: t.textMuted, marginTop: 2 }}>{sc.characters.join(', ')}</div>
                  )}
                  {sc.mood && <div style={{ fontSize: 9, color: t.accentPurple, marginTop: 1 }}>{sc.mood}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── EPISODE TAB (teleplay only) ── */}
      {tab === 'episode' && currentMode === 'teleplay' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            📺 Episode Header
          </div>
          {([
            { key: 'series',    label: 'Series',         placeholder: 'Series Title' },
            { key: 'episode',   label: 'Episode',        placeholder: 'Ep. 1x03 — "Title"' },
            { key: 'writtenBy', label: 'Written By',     placeholder: 'Author Name' },
            { key: 'draft',     label: 'Draft',          placeholder: '1st Draft' },
            { key: 'revision',  label: 'Revision Color', placeholder: 'Blue, Pink…' },
            { key: 'date',      label: 'Date',           placeholder: 'Jan 1, 2025' },
          ] as { key: keyof EpisodeHeader; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
            <div key={key}>
              <label style={labelSty}>{label}</label>
              <input value={episodeHeader[key]} onChange={(e) => setEpisodeHeader((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder} style={inputSty} />
            </div>
          ))}
          <div style={{ marginTop: 12, padding: 10, background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderRadius: 6, fontFamily: "'Courier Prime','Courier New',monospace", fontSize: 11, lineHeight: 2, color: t.textSecondary }}>
            <div>{episodeHeader.series || 'SERIES TITLE'}</div>
            <div>{episodeHeader.episode || 'Episode: "Untitled"'}</div>
            <div>Written by {episodeHeader.writtenBy || 'Author'}</div>
            <div>{episodeHeader.draft}</div>
            {episodeHeader.revision && <div>Revision: {episodeHeader.revision}</div>}
            <div>{episodeHeader.date}</div>
          </div>
        </div>
      )}

      {/* ── SHORTCUTS TAB ── */}
      {tab === 'shortcuts' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Keyboard Shortcuts
          </div>
          {SCRIPT_SHORTCUTS.map((s) => (
            <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, padding: '5px 6px', borderBottom: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)' }}>
              <span style={{ color: t.textMuted, fontFamily: "'Courier New',monospace", fontSize: 10 }}>{s.key}</span>
              <span style={{ color: t.accentPurple, fontWeight: 700, fontSize: 10 }}>→ {s.result}</span>
            </div>
          ))}
          <div style={{ marginTop: 14, padding: 10, background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderRadius: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: t.accentAmber, marginBottom: 6 }}>Smart Automation</div>
            {[
              'Enter after Character → Dialogue',
              'Enter after Parenthetical → Dialogue',
              'Enter after Dialogue → next Character + dropdown',
              'Empty Dialogue + Enter → Action',
              'Tab in Dialogue → Parenthetical',
              'Type ( → Parenthetical suggestions popup',
            ].map((tip) => (
              <div key={tip} style={{ fontSize: 10, color: t.textMuted, padding: '3px 0', display: 'flex', gap: 6 }}>
                <span style={{ color: t.accentGreen, flexShrink: 0 }}>✓</span> {tip}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMAT PANEL  (margins + page size)
// ─────────────────────────────────────────────────────────────────────────────
interface PageMargins { top: number; right: number; bottom: number; left: number; }

function FormatPanel({ t, darkMode, pageMargins, pageSize, onMarginsChange, onPageSizeChange, onClose }: {
  t: TTheme; darkMode: boolean;
  pageMargins: PageMargins;
  pageSize: 'letter' | 'a4';
  onMarginsChange: (m: PageMargins) => void;
  onPageSizeChange: (s: 'letter' | 'a4') => void;
  onClose: () => void;
}) {
  const row = (label: string, key: keyof PageMargins) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <span style={{ width: 52, fontSize: 11, color: t.textSecondary, flexShrink: 0 }}>{label}</span>
      <input type='range' min='0.25' max='3' step='0.25'
        value={pageMargins[key]}
        onChange={(e) => onMarginsChange({ ...pageMargins, [key]: parseFloat(e.target.value) })}
        style={{ flex: 1, accentColor: t.accentPurple }}
      />
      <span style={{ width: 38, fontSize: 11, color: t.accentPurple, fontWeight: 600, textAlign: 'right', flexShrink: 0 }}>
        {pageMargins[key]}&quot;
      </span>
    </div>
  );

  return (
    <div style={{
      background: t.toolbarBg, borderBottom: t.toolbarBorder,
      backdropFilter: t.toolbarBlur,
      padding: '12px 20px', flexShrink: 0,
      display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start',
    }}>
      {/* Margins */}
      <div style={{ minWidth: 240 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
          Page Margins
        </div>
        {row('Top', 'top')}
        {row('Bottom', 'bottom')}
        {row('Left', 'left')}
        {row('Right', 'right')}
        <button type='button'
          onClick={() => onMarginsChange({ top: 1, right: 1, bottom: 1, left: 1 })}
          style={{ fontSize: 10, color: t.accentPurple, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}>
          Reset to 1″
        </button>
      </div>

      {/* Page size */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
          Page Size
        </div>
        {(['letter', 'a4'] as const).map((s) => (
          <button key={s} type='button'
            onClick={() => onPageSizeChange(s)}
            style={{
              display: 'block', marginBottom: 6, padding: '5px 14px', fontSize: 11, borderRadius: 5, cursor: 'pointer',
              background: pageSize === s ? t.btnActive : 'transparent',
              border: pageSize === s ? t.btnActiveBorder : '1px solid transparent',
              color: pageSize === s ? t.textPrimary : t.textSecondary,
              fontWeight: pageSize === s ? 700 : 400,
            }}>
            {s === 'letter' ? '📄 US Letter (8.5 × 11″)' : '📄 A4 (210 × 297mm)'}
          </button>
        ))}
        <div style={{ marginTop: 10, fontSize: 10, color: t.textMuted }}>
          {pageSize === 'letter' ? '816 × 1056 px at 96dpi' : '794 × 1123 px at 96dpi'}
        </div>
      </div>

      {/* Quick presets */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
          Margin Presets
        </div>
        {[
          { label: 'Standard (1″)', m: { top:1, right:1, bottom:1, left:1 } },
          { label: 'Manuscript (1.25″)', m: { top:1.25, right:1.25, bottom:1.25, left:1.25 } },
          { label: 'Narrow (0.5″)', m: { top:0.5, right:0.5, bottom:0.5, left:0.5 } },
          { label: 'Wide left (1.5″ L)', m: { top:1, right:1, bottom:1, left:1.5 } },
        ].map((p) => (
          <button key={p.label} type='button'
            onClick={() => onMarginsChange(p.m)}
            style={{
              display: 'block', marginBottom: 5, padding: '4px 12px', fontSize: 11,
              background: 'transparent', border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              borderRadius: 5, color: t.textSecondary, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = t.accentPurple; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'; }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Close */}
      <button type='button' onClick={onClose}
        style={{ marginLeft: 'auto', alignSelf: 'flex-start', background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', padding: 4 }}>
        <X className='w-4 h-4' />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGED EDITOR  (discrete page sheets, like Word)
// ─────────────────────────────────────────────────────────────────────────────
// Page dimensions at 96dpi
const PAGE_DIMS = {
  letter: { w: 816, h: 1056 },
  a4:     { w: 794, h: 1123 },
};

function PagedEditor({
  editorRef, t, darkMode, isScript, focusMode,
  fontFamily, fontSize, lineSpacing, proseFormat,
  pageMargins, pageSize, placeholder, bookTitle, bookAuthor,
  handleInput, handleKeyDown, updateActiveStates, handleMouseUp,
}: {
  editorRef: React.RefObject<HTMLDivElement>;
  t: TTheme; darkMode: boolean; isScript: boolean; focusMode: boolean;
  fontFamily: string; fontSize: string; lineSpacing: string; proseFormat: ProseFormat;
  pageMargins: PageMargins; pageSize: 'letter' | 'a4'; placeholder: string;
  bookTitle: string; bookAuthor: string;
  handleInput: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  updateActiveStates: () => void;
  handleMouseUp: () => void;
}) {
  const dims = PAGE_DIMS[pageSize];
  // Convert inches to px at 96dpi
  const mTop    = Math.round(pageMargins.top    * 96);
  const mRight  = Math.round(pageMargins.right  * 96);
  const mBottom = Math.round(pageMargins.bottom * 96);
  const mLeft   = Math.round(pageMargins.left   * 96);

  // Script overrides
  const scriptW = 780;
  const effectiveW = focusMode ? 680 : isScript ? scriptW : dims.w;

  // On mobile, clamp so the paper fits within the viewport and use compact margins.
  const isMobileView = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div style={{
      // Single-page wrapper — the editor is one continuous div styled to look like pages
      maxWidth: effectiveW,
      width: '100%',
      margin: '0 auto',
      position: 'relative',
    }}>
      {/* ── Page shadow / background — decorative page sheet ── */}
      <div
        style={{
          backgroundColor: isScript ? t.paperBgScript : t.paperBg,
          border: isScript ? (t as any).paperBorderScript ?? t.paperBorder : t.paperBorder,
          boxShadow: isMobileView ? 'none' : (isScript ? (t as any).paperShadowScript ?? t.paperShadow : t.paperShadow),
          borderRadius: isScript ? 3 : 4,
          // Padding = margins; halved on mobile so text area is maximised
          paddingTop:    isMobileView ? 16 : (isScript ? 60 : mTop),
          paddingRight:  isMobileView ? 16 : (isScript ? 80 : mRight),
          paddingBottom: isMobileView ? 24 : (isScript ? 60 : mBottom),
          paddingLeft:   isMobileView ? 16 : (isScript ? 80 : mLeft),
          // The editor grows infinitely but we visually break it into pages
          // via CSS column-break simulation using repeating linear-gradient
          backgroundImage: isScript ? undefined : `
            repeating-linear-gradient(
              to bottom,
              transparent 0px,
              transparent ${dims.h - 1}px,
              ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'} ${dims.h - 1}px,
              ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'} ${dims.h}px
            )
          `,
          backgroundOrigin: 'padding-box',
          // Min height of 3 pages
          minHeight: dims.h * 3,
          position: 'relative',
          transition: 'background-color 0.3s, box-shadow 0.3s',
        }}
      >
        {/* ── Running book headers — hidden on mobile (too narrow) ── */}
        {!isScript && !focusMode && !isMobileView && (
          <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
            {Array.from({ length: 20 }).map((_, i) => {
              const pageNum = i + 1;
              const isEven = pageNum % 2 === 0;
              // Standard book convention:
              //   Odd  (recto) pages → Book Title centre-left, page number far right
              //   Even (verso) pages → page number far left, Author Name centre-right
              const headerTop = dims.h * i + Math.max(24, Math.round(pageMargins.top * 96 * 0.45));
              const headerColor = darkMode ? 'rgba(220,210,255,0.55)' : 'rgba(60,40,10,0.45)';
              const numColor    = darkMode ? 'rgba(180,160,255,0.70)' : 'rgba(80,60,20,0.65)';
              const headerStyle: React.CSSProperties = {
                position: 'absolute',
                top: headerTop,
                fontFamily: 'Garamond, "IM Fell English", "Palatino Linotype", Georgia, serif',
                fontSize: 11,
                fontStyle: 'italic',
                letterSpacing: '0.07em',
                userSelect: 'none',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '42%',
              };
              return (
                <React.Fragment key={i}>
                  {/* Left element */}
                  <div style={{ ...headerStyle, left: Math.round(pageMargins.left * 96), color: isEven ? numColor : headerColor, fontStyle: isEven ? 'normal' : 'italic', fontWeight: isEven ? 700 : 400, fontSize: isEven ? 10 : 11, letterSpacing: isEven ? '0.12em' : '0.07em' }}>
                    {isEven ? pageNum : (bookTitle || 'Untitled')}
                  </div>
                  {/* Right element */}
                  <div style={{ ...headerStyle, right: Math.round(pageMargins.right * 96), textAlign: 'right', color: isEven ? headerColor : numColor, fontStyle: isEven ? 'italic' : 'normal', fontWeight: isEven ? 400 : 700, fontSize: isEven ? 11 : 10, letterSpacing: isEven ? '0.07em' : '0.12em' }}>
                    {isEven ? (bookAuthor || bookTitle) : pageNum}
                  </div>
                  {/* Ornamental rule */}
                  <div style={{
                    position: 'absolute',
                    top: headerTop + 18,
                    left: Math.round(pageMargins.left * 96),
                    right: Math.round(pageMargins.right * 96),
                    height: 1,
                    background: darkMode
                      ? 'linear-gradient(to right, transparent, rgba(180,150,255,0.25) 20%, rgba(180,150,255,0.25) 80%, transparent)'
                      : 'linear-gradient(to right, transparent, rgba(120,80,20,0.18) 20%, rgba(120,80,20,0.18) 80%, transparent)',
                  }} />
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Contenteditable editor */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          spellCheck
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onKeyUp={updateActiveStates}
          onMouseUp={handleMouseUp}
          onFocus={updateActiveStates}
          data-placeholder={placeholder}
          style={{
            outline: 'none',
            minHeight: dims.h * 3 - mTop - mBottom,
            fontFamily: isScript ? "'Courier New', monospace" : fontFamily,
            fontSize: '12pt',
            lineHeight: lineSpacing,
            color: isScript ? (t as any).editorTextScript ?? t.editorText : t.editorText,
            caretColor: isScript ? (t as any).editorCaretScript ?? t.editorCaret : t.editorCaret,
            wordBreak: 'break-word',
          }}
          className={`ws-editor${proseFormat === 'fantasy' ? ' ws-fantasy' : ''}`}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOK PAGE TABS  (horizontal icon strip inside a folder)
// ─────────────────────────────────────────────────────────────────────────────
const PAGE_TAB_META: Record<DocSubtype, { icon: React.ReactNode; label: string }> = {
  'writing':    { icon: <FileText className='w-3 h-3' />,    label: 'Writing' },
  'title-page': { icon: <BookOpen className='w-3 h-3' />,    label: 'Title Page' },
  'notes':      { icon: <StickyNote className='w-3 h-3' />,  label: 'Notes' },
  'ideas':      { icon: <Lightbulb className='w-3 h-3' />,   label: 'Ideas' },
  'timeline':   { icon: <LayoutGrid className='w-3 h-3' />,  label: 'Timeline' },
};

const ADD_PAGE_OPTIONS: { subtype: DocSubtype; label: string }[] = [
  { subtype: 'writing',    label: '✍️ Writing' },
  { subtype: 'title-page', label: '📄 Title Page' },
  { subtype: 'notes',      label: '📝 Notes' },
  { subtype: 'ideas',      label: '💡 Ideas' },
  { subtype: 'timeline',   label: '🗺 Timeline' },
];

function BookPageTabs({ files, activeId, t, onSelect, onDelete, onAdd }: {
  files: DocFile[]; activeId: string; t: TTheme;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (subtype: DocSubtype) => void;
}) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div style={{ paddingLeft: 16, paddingBottom: 6 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center', padding: '4px 4px 4px 4px' }}>
        {files.map((file) => {
          const meta = PAGE_TAB_META[file.subtype] || PAGE_TAB_META['writing'];
          const isActive = file.id === activeId;
          const isHovered = hoveredId === file.id;
          return (
            <div key={file.id} style={{ position: 'relative' }}>
              <button
                type='button'
                title={file.name}
                onClick={() => onSelect(file.id)}
                onMouseEnter={() => setHoveredId(file.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', fontSize: 11, borderRadius: 5,
                  background: isActive ? 'rgba(139,92,246,0.25)' : isHovered ? 'rgba(255,255,255,0.06)' : 'transparent',
                  border: isActive ? '1px solid rgba(139,92,246,0.45)' : '1px solid transparent',
                  color: isActive ? t.accentPurple : t.sidebarFileText,
                  cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: isActive ? 700 : 400,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ color: isActive ? t.accentPurple : t.textMuted }}>{meta.icon}</span>
                <span>{meta.label}</span>
              </button>
              {/* X delete on hover */}
              {isHovered && (
                <button
                  type='button'
                  title='Remove page'
                  onMouseEnter={() => setHoveredId(file.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={(e) => { e.stopPropagation(); onDelete(file.id); }}
                  style={{
                    position: 'absolute', top: -4, right: -4,
                    width: 14, height: 14, borderRadius: '50%',
                    background: t.accentRed, border: 'none', color: '#fff',
                    fontSize: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    lineHeight: 1, padding: 0,
                  }}
                >×</button>
              )}
            </div>
          );
        })}
        {/* Add page button */}
        <div style={{ position: 'relative' }}>
          <button
            type='button'
            title='Add page to this book'
            onClick={() => setShowAddMenu((v) => !v)}
            style={{
              width: 20, height: 20, borderRadius: 4,
              background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)',
              color: t.accentPurple, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Plus className='w-2.5 h-2.5' />
          </button>
          {showAddMenu && (
            <div
              style={{
                position: 'absolute', top: 24, left: 0, zIndex: 200,
                background: t.selectOptionBg, border: t.dictPopupBorder,
                borderRadius: 8, padding: 4, minWidth: 140,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}
              onMouseLeave={() => setShowAddMenu(false)}
            >
              {ADD_PAGE_OPTIONS.map((opt) => (
                <button key={opt.subtype} type='button'
                  onClick={() => { onAdd(opt.subtype); setShowAddMenu(false); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '6px 12px', fontSize: 11, background: 'transparent',
                    border: 'none', color: t.textSecondary, cursor: 'pointer', borderRadius: 5,
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,92,246,0.15)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TITLE PAGE VIEW  (manuscript-style cover page)
// ─────────────────────────────────────────────────────────────────────────────
function TitlePageView({ file, t, darkMode, onUpdate }: {
  file: DocFile; t: TTheme; darkMode: boolean;
  onUpdate: (patch: Partial<DocFile>) => void;
}) {
  const [meta, setMeta] = useState<TitlePageMeta>(file.titlePage ?? {
    title: '', subtitle: '', author: '', email: '', phone: '', address: '', wordCountLabel: '',
  });

  const update = (patch: Partial<TitlePageMeta>) => {
    const next = { ...meta, ...patch };
    setMeta(next);
    onUpdate({ titlePage: next });
  };

  const fieldStyle: React.CSSProperties = {
    width: '100%', background: 'transparent',
    border: 'none', borderBottom: `1px solid ${darkMode ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.25)'}`,
    color: t.editorText, outline: 'none', fontFamily: 'Georgia, serif',
    padding: '4px 0', marginBottom: 6, fontSize: 13, lineHeight: 1.5,
  };

  return (
    <div style={{
      maxWidth: 680, margin: '0 auto',
      background: t.paperBg, border: t.paperBorder, borderRadius: 8,
      boxShadow: t.paperShadow, minHeight: 900,
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Georgia, serif',
    }}>
      {/* Top-left contact block */}
      <div style={{ padding: '56px 72px 0', fontSize: 12, lineHeight: 2, color: t.editorText }}>
        <input value={meta.author} onChange={(e) => update({ author: e.target.value })}
          placeholder='Your Full Name' style={{ ...fieldStyle, fontSize: 12 }} />
        <input value={meta.address} onChange={(e) => update({ address: e.target.value })}
          placeholder='Street Address / City, State ZIP' style={{ ...fieldStyle, fontSize: 12 }} />
        <input value={meta.phone} onChange={(e) => update({ phone: e.target.value })}
          placeholder='Phone Number' style={{ ...fieldStyle, fontSize: 12 }} />
        <input value={meta.email} onChange={(e) => update({ email: e.target.value })}
          placeholder='Email Address' style={{ ...fieldStyle, fontSize: 12 }} />
      </div>

      {/* Top-right word count */}
      <div style={{ padding: '0 72px', textAlign: 'right', fontSize: 12, color: t.editorText }}>
        <input value={meta.wordCountLabel} onChange={(e) => update({ wordCountLabel: e.target.value })}
          placeholder='Approx. word count (e.g. ~95,000 words)'
          style={{ ...fieldStyle, textAlign: 'right', fontSize: 12 }} />
      </div>

      {/* Centre: Title / Subtitle / By / Author */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 72px', textAlign: 'center' }}>
        <input
          value={meta.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder='TITLE OF YOUR BOOK'
          style={{
            ...fieldStyle,
            fontSize: 26, fontWeight: 700, textAlign: 'center',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            borderBottom: `2px solid ${darkMode ? 'rgba(139,92,246,0.5)' : 'rgba(139,92,246,0.4)'}`,
            marginBottom: 16,
          }}
        />
        <input
          value={meta.subtitle}
          onChange={(e) => update({ subtitle: e.target.value })}
          placeholder='A subtitle or series name (optional)'
          style={{ ...fieldStyle, fontSize: 15, fontStyle: 'italic', textAlign: 'center', marginBottom: 40 }}
        />
        <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 8 }}>by</div>
        <input
          value={meta.author}
          onChange={(e) => update({ author: e.target.value })}
          placeholder='Author Name'
          style={{ ...fieldStyle, fontSize: 16, fontWeight: 600, textAlign: 'center', maxWidth: 340 }}
        />
      </div>

      {/* Footer note */}
      <div style={{ padding: '0 72px 40px', textAlign: 'center', fontSize: 10, color: t.textMuted, fontStyle: 'italic' }}>
        Click any field to edit · This page follows standard manuscript format
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE VIEW  — adapts to prose (fantasy novel) vs. screenplay
// ─────────────────────────────────────────────────────────────────────────────
function TimelineView({ file, t, darkMode, onUpdate }: {
  file: DocFile; t: TTheme; darkMode: boolean;
  onUpdate: (beats: TimelineBeat[]) => void;
}) {
  // Detect whether this document lives inside a fantasy-mode book
  const isFantasy = file.mode === 'prose';

  // Seed with fantasy or screenplay beats based on context
  const seedBeats = isFantasy
    ? FANTASY_BEATS.map((b) => ({ ...b, id: uid() }))
    : DEFAULT_BEATS.map((b) => ({ ...b, id: uid() }));

  const [beats, setBeats] = useState<TimelineBeat[]>(
    file.beats && file.beats.length > 0 ? file.beats : seedBeats
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const updateBeat = (id: string, patch: Partial<TimelineBeat>) => {
    const next = beats.map((b) => b.id === id ? { ...b, ...patch } : b);
    setBeats(next); onUpdate(next);
  };

  const addChapter = (afterId?: string) => {
    const idx = afterId ? beats.findIndex((b) => b.id === afterId) : beats.length - 1;
    const ref = beats[idx];
    const newBeat: TimelineBeat = {
      id: uid(),
      act: ref?.act || (isFantasy ? 'Part I — The Ordinary World' : 'Act I'),
      title: isFantasy ? 'New Chapter' : 'New Beat',
      summary: '',
      color: ref?.color || ACT_COLORS[0],
      chapter: isFantasy ? (ref?.chapter ?? 0) + 1 : undefined,
      pov: '',
      location: '',
    };
    const next = [...beats.slice(0, idx + 1), newBeat, ...beats.slice(idx + 1)];
    setBeats(next); onUpdate(next);
    setEditingId(newBeat.id);
  };

  const removeBeat = (id: string) => {
    const next = beats.filter((b) => b.id !== id);
    setBeats(next); onUpdate(next);
  };

  const arcOptions = isFantasy ? FANTASY_ARC_OPTIONS : ['Act I', 'Act II', 'Act III', 'Prologue', 'Epilogue', 'Interlude'];
  const arcs = Array.from(new Set(beats.map((b) => b.act)));

  const cardBg = darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.92)';
  const inputStyle = (color: string): React.CSSProperties => ({
    width: '100%', fontSize: 11, background: 'transparent', border: 'none',
    borderBottom: `1px solid ${color}`, color: t.textPrimary, outline: 'none',
    padding: '2px 0', marginBottom: 6, fontFamily: 'inherit',
  });

  return (
    <div style={{ maxWidth: 1160, margin: '0 auto', padding: '28px 24px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: t.textPrimary }}>
            {isFantasy ? '🗺 Novel Outline' : '🎬 Story Timeline'}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: t.textMuted }}>
            {isFantasy
              ? 'Fantasy novel structure · Click any card to edit chapter details · POV · Location'
              : 'Story beat sheet · Click any card to edit · Use + to add beats'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.12)' }}>
            {(['grid', 'list'] as const).map((v) => (
              <button key={v} type='button' onClick={() => setViewMode(v)}
                style={{
                  padding: '4px 10px', fontSize: 11, border: 'none', cursor: 'pointer',
                  background: viewMode === v ? t.accentPurple : 'transparent',
                  color: viewMode === v ? '#fff' : t.textMuted, fontWeight: viewMode === v ? 700 : 400,
                }}>
                {v === 'grid' ? '⊞ Grid' : '≡ List'}
              </button>
            ))}
          </div>
          {/* Reset to template */}
          <button type='button' title='Reset to default template'
            onClick={() => { if (confirm('Reset to default template? This will clear your current outline.')) { const fresh = seedBeats; setBeats(fresh); onUpdate(fresh); } }}
            style={{ padding: '4px 10px', fontSize: 11, background: 'transparent', border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.12)', borderRadius: 5, color: t.textMuted, cursor: 'pointer' }}>
            ↺ Reset
          </button>
          {/* Add chapter/beat */}
          <button type='button' onClick={() => addChapter()}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
              background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)',
              borderRadius: 6, color: t.accentPurple, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
            <Plus className='w-3.5 h-3.5' />
            {isFantasy ? 'Add Chapter' : 'Add Beat'}
          </button>
        </div>
      </div>

      {/* ── Arc sections ── */}
      {arcs.map((arc) => {
        const arcBeats = beats.filter((b) => b.act === arc);
        const arcColor = arcBeats[0]?.color || t.accentPurple;
        return (
          <div key={arc} style={{ marginBottom: 36 }}>
            {/* Arc header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
              paddingLeft: 8, paddingBottom: 6,
              borderLeft: `3px solid ${arcColor}`,
              borderBottom: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: arcColor, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.textMuted }}>
                {arc}
              </span>
              <span style={{ fontSize: 10, color: t.textMuted, marginLeft: 4 }}>
                ({arcBeats.length} {isFantasy ? (arcBeats.length === 1 ? 'chapter' : 'chapters') : (arcBeats.length === 1 ? 'beat' : 'beats')})
              </span>
              {/* Add to this arc */}
              <button type='button' title={`Add ${isFantasy ? 'chapter' : 'beat'} to ${arc}`}
                onClick={() => {
                  const lastInArc = arcBeats[arcBeats.length - 1];
                  addChapter(lastInArc?.id);
                  setTimeout(() => {
                    setBeats((prev) => {
                      const lastIdx = prev.reduce((acc, b, i) => b.act === arc ? i : acc, -1);
                      if (lastIdx !== -1) {
                        const next = prev.map((b, i) => i === lastIdx + 1 ? { ...b, act: arc } : b);
                        onUpdate(next);
                        return next;
                      }
                      return prev;
                    });
                  }, 0);
                }}
                style={{ marginLeft: 'auto', padding: '2px 8px', fontSize: 10, background: 'transparent', border: `1px solid ${arcColor}55`, borderRadius: 4, color: arcColor, cursor: 'pointer' }}>
                + Add here
              </button>
            </div>

            {/* Cards */}
            {viewMode === 'grid' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {arcBeats.map((beat) => {
                  const isEditing = editingId === beat.id;
                  return (
                    <div key={beat.id}
                      onClick={() => setEditingId(isEditing ? null : beat.id)}
                      style={{
                        background: cardBg,
                        border: `1px solid ${isEditing ? beat.color : darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                        borderTop: `3px solid ${beat.color}`,
                        borderRadius: 8, padding: 14, cursor: 'pointer',
                        boxShadow: isEditing ? `0 0 0 2px ${beat.color}33` : darkMode ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
                        transition: 'border-color 0.15s, box-shadow 0.15s',
                      }}>
                      {/* Chapter number + delete */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        {isFantasy && beat.chapter !== undefined ? (
                          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: beat.color }}>
                            {beat.chapter === 0 ? 'Prologue' : `Ch. ${beat.chapter}`}
                          </span>
                        ) : (
                          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: beat.color }}>Beat</span>
                        )}
                        <button type='button' title={`Remove ${isFantasy ? 'chapter' : 'beat'}`}
                          onClick={(e) => { e.stopPropagation(); removeBeat(beat.id); }}
                          style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', padding: 0, opacity: 0.5, fontSize: 14, lineHeight: 1 }}>
                          ×
                        </button>
                      </div>

                      {/* Title */}
                      {isEditing ? (
                        <input value={beat.title} onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateBeat(beat.id, { title: e.target.value })}
                          placeholder='Chapter / beat title'
                          style={{ ...inputStyle(beat.color), fontSize: 13, fontWeight: 700 }} />
                      ) : (
                        <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, marginBottom: 6, lineHeight: 1.3 }}>{beat.title}</div>
                      )}

                      {/* Summary */}
                      {isEditing ? (
                        <textarea value={beat.summary} onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateBeat(beat.id, { summary: e.target.value })}
                          placeholder='What happens? What changes?'
                          rows={3}
                          style={{ width: '100%', fontSize: 11, background: 'transparent', border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 4, color: t.editorText, outline: 'none', resize: 'vertical', padding: '4px 6px', lineHeight: 1.5, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                      ) : (
                        <div style={{ fontSize: 11, color: t.textMuted, lineHeight: 1.5, minHeight: 32 }}>
                          {beat.summary || <span style={{ fontStyle: 'italic' }}>Click to add notes…</span>}
                        </div>
                      )}

                      {/* Fantasy extra fields */}
                      {isFantasy && isEditing && (
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                          <input value={beat.pov || ''} onChange={(e) => updateBeat(beat.id, { pov: e.target.value })}
                            placeholder='POV character'
                            style={{ ...inputStyle(beat.color), fontSize: 11 }} />
                          <input value={beat.location || ''} onChange={(e) => updateBeat(beat.id, { location: e.target.value })}
                            placeholder='Location / setting'
                            style={{ ...inputStyle(beat.color), fontSize: 11 }} />
                          <input value={beat.chapter !== undefined ? String(beat.chapter) : ''} onChange={(e) => updateBeat(beat.id, { chapter: Number(e.target.value) || 0 })}
                            placeholder='Chapter #'
                            type='number' min={0}
                            style={{ ...inputStyle(beat.color), fontSize: 11 }} />
                        </div>
                      )}

                      {/* Fantasy POV/Location badges (read mode) */}
                      {isFantasy && !isEditing && (beat.pov || beat.location) && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                          {beat.pov && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 10, background: `${beat.color}22`, color: beat.color, fontWeight: 600 }}>👤 {beat.pov}</span>}
                          {beat.location && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 10, background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', color: t.textMuted }}>📍 {beat.location}</span>}
                        </div>
                      )}

                      {/* Editing footer: arc picker + color + add-after */}
                      {isEditing && (
                        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                          <select value={beat.act}
                            onChange={(e) => updateBeat(beat.id, { act: e.target.value })}
                            style={{ fontSize: 10, background: t.selectBg, border: t.selectBorder, color: t.textMuted, borderRadius: 4, padding: '2px 4px', cursor: 'pointer', outline: 'none' }}>
                            {arcOptions.map((a) => (
                              <option key={a} value={a} style={{ background: t.selectOptionBg }}>{a}</option>
                            ))}
                          </select>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            {ACT_COLORS.map((c) => (
                              <button key={c} type='button' title={c}
                                onClick={() => updateBeat(beat.id, { color: c })}
                                style={{ width: 14, height: 14, borderRadius: '50%', background: c, border: beat.color === c ? '2px solid #fff' : '1px solid transparent', cursor: 'pointer', flexShrink: 0 }} />
                            ))}
                            <button type='button'
                              onClick={() => { addChapter(beat.id); setEditingId(null); }}
                              style={{ marginLeft: 'auto', fontSize: 10, color: t.accentPurple, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}>
                              + after
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── LIST VIEW ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {arcBeats.map((beat) => {
                  const isEditing = editingId === beat.id;
                  return (
                    <div key={beat.id}
                      onClick={() => setEditingId(isEditing ? null : beat.id)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: isFantasy ? '80px 1fr 1fr 1fr auto' : '1fr 2fr auto',
                        alignItems: 'start', gap: 10,
                        background: cardBg,
                        border: `1px solid ${isEditing ? beat.color : darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
                        borderLeft: `3px solid ${beat.color}`,
                        borderRadius: 6, padding: '10px 14px', cursor: 'pointer',
                        transition: 'border-color 0.15s',
                      }}>
                      {/* Chapter # */}
                      {isFantasy && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: beat.color }}>
                          {isEditing ? (
                            <input value={beat.chapter !== undefined ? String(beat.chapter) : ''} type='number' min={0}
                              onChange={(e) => updateBeat(beat.id, { chapter: Number(e.target.value) || 0 })}
                              onClick={(e) => e.stopPropagation()}
                              style={{ width: 60, fontSize: 11, background: 'transparent', border: 'none', borderBottom: `1px solid ${beat.color}`, color: beat.color, outline: 'none' }} />
                          ) : (
                            beat.chapter === 0 ? 'Prologue' : `Ch. ${beat.chapter}`
                          )}
                        </div>
                      )}
                      {/* Title */}
                      <div>
                        {isEditing ? (
                          <input value={beat.title} onClick={(e) => e.stopPropagation()}
                            onChange={(e) => updateBeat(beat.id, { title: e.target.value })}
                            placeholder='Title'
                            style={{ width: '100%', fontSize: 13, fontWeight: 700, background: 'transparent', border: 'none', borderBottom: `1px solid ${beat.color}`, color: t.textPrimary, outline: 'none' }} />
                        ) : (
                          <span style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>{beat.title}</span>
                        )}
                      </div>
                      {/* Summary */}
                      <div>
                        {isEditing ? (
                          <textarea value={beat.summary} onClick={(e) => e.stopPropagation()}
                            onChange={(e) => updateBeat(beat.id, { summary: e.target.value })}
                            placeholder='Summary'
                            rows={2}
                            style={{ width: '100%', fontSize: 11, background: 'transparent', border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 4, color: t.editorText, outline: 'none', resize: 'vertical', padding: '3px 5px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                        ) : (
                          <span style={{ fontSize: 11, color: t.textMuted, lineHeight: 1.5 }}>{beat.summary || <span style={{ fontStyle: 'italic' }}>No notes yet</span>}</span>
                        )}
                      </div>
                      {/* POV + Location (fantasy only) */}
                      {isFantasy && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {isEditing ? (
                            <>
                              <input value={beat.pov || ''} onChange={(e) => updateBeat(beat.id, { pov: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                placeholder='POV character'
                                style={{ width: '100%', fontSize: 11, background: 'transparent', border: 'none', borderBottom: `1px solid ${beat.color}44`, color: t.textPrimary, outline: 'none', padding: '1px 0' }} />
                              <input value={beat.location || ''} onChange={(e) => updateBeat(beat.id, { location: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                placeholder='Location'
                                style={{ width: '100%', fontSize: 11, background: 'transparent', border: 'none', borderBottom: `1px solid ${beat.color}44`, color: t.textPrimary, outline: 'none', padding: '1px 0' }} />
                            </>
                          ) : (
                            <>
                              {beat.pov && <span style={{ fontSize: 10, color: t.textMuted }}>👤 {beat.pov}</span>}
                              {beat.location && <span style={{ fontSize: 10, color: t.textMuted }}>📍 {beat.location}</span>}
                            </>
                          )}
                        </div>
                      )}
                      {/* Delete */}
                      <button type='button' onClick={(e) => { e.stopPropagation(); removeBeat(beat.id); }}
                        style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', opacity: 0.45, fontSize: 15, lineHeight: 1, padding: 0, alignSelf: 'center' }}>
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
