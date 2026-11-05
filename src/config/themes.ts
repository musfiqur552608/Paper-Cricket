/**
 * Paper and pen theme definitions for the match canvas.
 * Each paper theme carries a palette for the sheet, ink, board wedges,
 * border and scribble colours. Pen styles carry a distinct colourway
 * for the barrel, grip, cap, clip, metal nib and ink tube.
 *
 * These are rendered client-side only; nothing is shipped as an asset file.
 */

export type PaperThemeId =
  | 'notebook'
  | 'newsprint'
  | 'blueprint'
  | 'khadi'
  | 'midnight'
  | 'rose'
  | 'mint'
  | 'lavender'
  | 'sandstone'
  | 'slate'
  | 'ochre'
  | 'sky'
  | 'forest'
  | 'terracotta'
  | 'peach'
  | 'cream'
  | 'graphite'
  | 'mustard'
  | 'teal'
  | 'sepia'

export type PenStyleId =
  | 'clear'
  | 'bluebarrel'
  | 'blackbarrel'
  | 'redbarrel'
  | 'greenbarrel'
  | 'goldbarrel'
  | 'silverbarrel'
  | 'copper'
  | 'neon'
  | 'pastelpink'
  | 'pastelblue'
  | 'pastelgreen'
  | 'olive'
  | 'navy'
  | 'maroon'
  | 'violet'
  | 'charcoal'
  | 'sunset'
  | 'mintgreen'
  | 'lavenderblue'

export interface PaperTheme {
  id: PaperThemeId
  name: string
  sheetBg: string
  sheetBorder: string
  sheetText: string
  wedgeEven: string
  wedgeOdd: string
  wedgeHighlight: string
  wedgeStroke: string
  spoke: string
  label: string
  labelStroke: string
  hubOuter: string
  hubInner: string
  dot: string
  aimLine: string
  aimGlow: string
  scribble: string
  hintText: string
}

export interface PenStyle {
  id: PenStyleId
  name: string
  barrelStart: string
  barrelEnd: string
  ink: string
  gripDark: string
  gripLight: string
  metal: string
  cap: string
  clip: string
  spring: string
  shadow: string
  text: string
}

/* -------------------------------------------------------------------------- */
/* Paper themes (20)                                                          */
/* -------------------------------------------------------------------------- */

export const PAPER_THEMES: PaperTheme[] = [
  {
    id: 'notebook',
    name: 'Notebook',
    sheetBg: '#fffdf6',
    sheetBorder: '#d6c7a9',
    sheetText: '#234e8b',
    wedgeEven: '#fffdf7',
    wedgeOdd: '#f6f1e6',
    wedgeHighlight: '#f6cf72',
    wedgeStroke: '#b87812',
    spoke: '#234e8b',
    label: '#234e8b',
    labelStroke: '#234e8b',
    hubOuter: '#fffdf7',
    hubInner: '#fffdf7',
    dot: '#234e8b',
    aimLine: '#c8544a',
    aimGlow: '#e9a23b',
    scribble: '#7a4b0a',
    hintText: '#7a4b0a',
  },
  {
    id: 'newsprint',
    name: 'Newsprint',
    sheetBg: '#f4f1e9',
    sheetBorder: '#bfb396',
    sheetText: '#1a1a18',
    wedgeEven: '#f7f4e7',
    wedgeOdd: '#ede6cf',
    wedgeHighlight: '#e8c56e',
    wedgeStroke: '#8a7d5f',
    spoke: '#4a443d',
    label: '#4a443d',
    labelStroke: '#4a443d',
    hubOuter: '#f7f4e7',
    hubInner: '#ede6cf',
    dot: '#2a2418',
    aimLine: '#a64d3c',
    aimGlow: '#b8945a',
    scribble: '#5c5244',
    hintText: '#5c5244',
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    sheetBg: '#e3eef5',
    sheetBorder: '#7ea0c7',
    sheetText: '#16324c',
    wedgeEven: '#eaf4fa',
    wedgeOdd: '#d6e6f1',
    wedgeHighlight: '#c7dff0',
    wedgeStroke: '#5b8bb3',
    spoke: '#3d6b99',
    label: '#3d6b99',
    labelStroke: '#3d6b99',
    hubOuter: '#eaf4fa',
    hubInner: '#d6e6f1',
    dot: '#1e3a59',
    aimLine: '#d97706',
    aimGlow: '#fbbf24',
    scribble: '#2f5d88',
    hintText: '#2f5d88',
  },
  {
    id: 'khadi',
    name: 'Khadi',
    sheetBg: '#f7efe2',
    sheetBorder: '#c9ad6c',
    sheetText: '#6b4a1f',
    wedgeEven: '#f9f3e5',
    wedgeOdd: '#efe0c6',
    wedgeHighlight: '#f0c97c',
    wedgeStroke: '#9a701c',
    spoke: '#8a6019',
    label: '#8a6019',
    labelStroke: '#8a6019',
    hubOuter: '#f9f3e5',
    hubInner: '#efe0c6',
    dot: '#5a4012',
    aimLine: '#b45309',
    aimGlow: '#d97706',
    scribble: '#7a4b0a',
    hintText: '#7a4b0a',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    sheetBg: '#0f172a',
    sheetBorder: '#334155',
    sheetText: '#cbd5e1',
    wedgeEven: '#1e293b',
    wedgeOdd: '#0f172a',
    wedgeHighlight: '#374151',
    wedgeStroke: '#64748b',
    spoke: '#475569',
    label: '#cbd5e1',
    labelStroke: '#94a3b8',
    hubOuter: '#1e293b',
    hubInner: '#0f172a',
    dot: '#94a3b8',
    aimLine: '#fbbf24',
    aimGlow: '#f59e0b',
    scribble: '#94a3b8',
    hintText: '#94a3b8',
  },
  {
    id: 'rose',
    name: 'Rose',
    sheetBg: '#fff1f2',
    sheetBorder: '#e87f89',
    sheetText: '#7f1d1d',
    wedgeEven: '#fff3f4',
    wedgeOdd: '#fde2e6',
    wedgeHighlight: '#fecaca',
    wedgeStroke: '#b91c1c',
    spoke: '#be123c',
    label: '#be123c',
    labelStroke: '#be123c',
    hubOuter: '#fff3f4',
    hubInner: '#fde2e6',
    dot: '#7f1d1d',
    aimLine: '#dc2626',
    aimGlow: '#f472b6',
    scribble: '#9d174d',
    hintText: '#9d174d',
  },
  {
    id: 'mint',
    name: 'Mint',
    sheetBg: '#f0fdf4',
    sheetBorder: '#4ade80',
    sheetText: '#14532d',
    wedgeEven: '#f4fdf7',
    wedgeOdd: '#d1fae5',
    wedgeHighlight: '#bbf7d0',
    wedgeStroke: '#15803d',
    spoke: '#166534',
    label: '#166534',
    labelStroke: '#166534',
    hubOuter: '#f4fdf7',
    hubInner: '#d1fae5',
    dot: '#14532d',
    aimLine: '#16a34a',
    aimGlow: '#86efac',
    scribble: '#14532d',
    hintText: '#14532d',
  },
  {
    id: 'lavender',
    name: 'Lavender',
    sheetBg: '#f5f3ff',
    sheetBorder: '#a78bfa',
    sheetText: '#3730a3',
    wedgeEven: '#f8f8ff',
    wedgeOdd: '#ede9fe',
    wedgeHighlight: '#c4b5fd',
    wedgeStroke: '#4f46e5',
    spoke: '#4338ca',
    label: '#4338ca',
    labelStroke: '#4338ca',
    hubOuter: '#f8f8ff',
    hubInner: '#ede9fe',
    dot: '#3730a3',
    aimLine: '#7c3aed',
    aimGlow: '#d8b4fe',
    scribble: '#4f46e5',
    hintText: '#4f46e5',
  },
  {
    id: 'sandstone',
    name: 'Sandstone',
    sheetBg: '#faf3e9',
    sheetBorder: '#d6a95e',
    sheetText: '#78350f',
    wedgeEven: '#faf7ee',
    wedgeOdd: '#f2d9a8',
    wedgeHighlight: '#fcd34d',
    wedgeStroke: '#a16207',
    spoke: '#b45309',
    label: '#b45309',
    labelStroke: '#b45309',
    hubOuter: '#faf7ee',
    hubInner: '#f2d9a8',
    dot: '#78350f',
    aimLine: '#d97706',
    aimGlow: '#fcd34d',
    scribble: '#92400e',
    hintText: '#92400e',
  },
  {
    id: 'slate',
    name: 'Slate',
    sheetBg: '#f1f5f9',
    sheetBorder: '#64748b',
    sheetText: '#0f172a',
    wedgeEven: '#f8fafc',
    wedgeOdd: '#e2e8f0',
    wedgeHighlight: '#cbd5e1',
    wedgeStroke: '#334155',
    spoke: '#475569',
    label: '#334155',
    labelStroke: '#475569',
    hubOuter: '#f8fafc',
    hubInner: '#e2e8f0',
    dot: '#0f172a',
    aimLine: '#64748b',
    aimGlow: '#94a3b8',
    scribble: '#334155',
    hintText: '#334155',
  },
  {
    id: 'ochre',
    name: 'Ochre',
    sheetBg: '#fef3c7',
    sheetBorder: '#d97706',
    sheetText: '#713f12',
    wedgeEven: '#fef7d0',
    wedgeOdd: '#fde68a',
    wedgeHighlight: '#fde047',
    wedgeStroke: '#b45309',
    spoke: '#a16207',
    label: '#a16207',
    labelStroke: '#a16207',
    hubOuter: '#fef7d0',
    hubInner: '#fde68a',
    dot: '#78350f',
    aimLine: '#d97706',
    aimGlow: '#fef08a',
    scribble: '#92400e',
    hintText: '#92400e',
  },
  {
    id: 'sky',
    name: 'Sky',
    sheetBg: '#eff6ff',
    sheetBorder: '#3b82f6',
    sheetText: '#1e3a8a',
    wedgeEven: '#f0f9ff',
    wedgeOdd: '#bfdbfe',
    wedgeHighlight: '#93c5fd',
    wedgeStroke: '#2563eb',
    spoke: '#1d4ed8',
    label: '#1d4ed8',
    labelStroke: '#1d4ed8',
    hubOuter: '#f0f9ff',
    hubInner: '#bfdbfe',
    dot: '#1e3a8a',
    aimLine: '#3b82f6',
    aimGlow: '#60a5fa',
    scribble: '#2563eb',
    hintText: '#2563eb',
  },
  {
    id: 'forest',
    name: 'Forest',
    sheetBg: '#ecfdf5',
    sheetBorder: '#22c55e',
    sheetText: '#14532d',
    wedgeEven: '#f0fdf4',
    wedgeOdd: '#86efac',
    wedgeHighlight: '#bbf7d0',
    wedgeStroke: '#15803d',
    spoke: '#166534',
    label: '#166534',
    labelStroke: '#166534',
    hubOuter: '#f0fdf4',
    hubInner: '#86efac',
    dot: '#14532d',
    aimLine: '#15803d',
    aimGlow: '#34d399',
    scribble: '#14532d',
    hintText: '#14532d',
  },
  {
    id: 'terracotta',
    name: 'Terracotta',
    sheetBg: '#fdf2f0',
    sheetBorder: '#c2410c',
    sheetText: '#7c2d12',
    wedgeEven: '#fdf4f1',
    wedgeOdd: '#fee2e2',
    wedgeHighlight: '#fca5a5',
    wedgeStroke: '#c2410c',
    spoke: '#9a3412',
    label: '#9a3412',
    labelStroke: '#9a3412',
    hubOuter: '#fdf4f1',
    hubInner: '#fee2e2',
    dot: '#7c2d12',
    aimLine: '#c2410c',
    aimGlow: '#fca5a5',
    scribble: '#9a3412',
    hintText: '#9a3412',
  },
  {
    id: 'peach',
    name: 'Peach',
    sheetBg: '#fff7ed',
    sheetBorder: '#fb923c',
    sheetText: '#9a3412',
    wedgeEven: '#fff7ed',
    wedgeOdd: '#fdba74',
    wedgeHighlight: '#fed7aa',
    wedgeStroke: '#c2410c',
    spoke: '#c2410c',
    label: '#c2410c',
    labelStroke: '#c2410c',
    hubOuter: '#fff7ed',
    hubInner: '#fdba74',
    dot: '#7c2d12',
    aimLine: '#ea580c',
    aimGlow: '#ffedd5',
    scribble: '#c2410c',
    hintText: '#c2410c',
  },
  {
    id: 'cream',
    name: 'Cream',
    sheetBg: '#fffbeb',
    sheetBorder: '#d97706',
    sheetText: '#78350f',
    wedgeEven: '#fffbeb',
    wedgeOdd: '#fef3c7',
    wedgeHighlight: '#fcd34d',
    wedgeStroke: '#b45309',
    spoke: '#a16207',
    label: '#a16207',
    labelStroke: '#a16207',
    hubOuter: '#fffbeb',
    hubInner: '#fef3c7',
    dot: '#78350f',
    aimLine: '#d97706',
    aimGlow: '#fef08a',
    scribble: '#92400e',
    hintText: '#92400e',
  },
  {
    id: 'graphite',
    name: 'Graphite',
    sheetBg: '#1f2937',
    sheetBorder: '#4b5563',
    sheetText: '#f9fafb',
    wedgeEven: '#374151',
    wedgeOdd: '#1f2937',
    wedgeHighlight: '#4b5563',
    wedgeStroke: '#6b7280',
    spoke: '#374151',
    label: '#f9fafb',
    labelStroke: '#9ca3af',
    hubOuter: '#374151',
    hubInner: '#1f2937',
    dot: '#d1d5db',
    aimLine: '#fbbf24',
    aimGlow: '#9ca3af',
    scribble: '#374151',
    hintText: '#374151',
  },
  {
    id: 'mustard',
    name: 'Mustard',
    sheetBg: '#fef3c7',
    sheetBorder: '#b45309',
    sheetText: '#713f12',
    wedgeEven: '#fde68a',
    wedgeOdd: '#fcd34d',
    wedgeHighlight: '#fbbf24',
    wedgeStroke: '#92400e',
    spoke: '#a16207',
    label: '#a16207',
    labelStroke: '#a16207',
    hubOuter: '#fde68a',
    hubInner: '#fcd34d',
    dot: '#78350f',
    aimLine: '#d97706',
    aimGlow: '#fef08a',
    scribble: '#92400e',
    hintText: '#92400e',
  },
  {
    id: 'teal',
    name: 'Teal',
    sheetBg: '#f0fdfa',
    sheetBorder: '#14b8a6',
    sheetText: '#115e59',
    wedgeEven: '#ccfbf1',
    wedgeOdd: '#99f6e4',
    wedgeHighlight: '#5eead4',
    wedgeStroke: '#0f766e',
    spoke: '#115e59',
    label: '#115e59',
    labelStroke: '#115e59',
    hubOuter: '#ccfbf1',
    hubInner: '#99f6e4',
    dot: '#115e59',
    aimLine: '#0d9488',
    aimGlow: '#67e8f9',
    scribble: '#0f766e',
    hintText: '#0f766e',
  },
  {
    id: 'sepia',
    name: 'Sepia',
    sheetBg: '#f5e6d3',
    sheetBorder: '#a16207',
    sheetText: '#4c2f1f',
    wedgeEven: '#f7e8d6',
    wedgeOdd: '#e7cbaf',
    wedgeHighlight: '#d9a85a',
    wedgeStroke: '#78350f',
    spoke: '#78350f',
    label: '#78350f',
    labelStroke: '#78350f',
    hubOuter: '#f7e8d6',
    hubInner: '#e7cbaf',
    dot: '#4c2f1f',
    aimLine: '#a16207',
    aimGlow: '#d97706',
    scribble: '#78350f',
    hintText: '#78350f',
  },
]

/* -------------------------------------------------------------------------- */
/* Pen styles (20)                                                            */
/* -------------------------------------------------------------------------- */

export const PEN_STYLES: PenStyle[] = [
  {
    id: 'clear',
    name: 'Clear Barrel',
    barrelStart: '#ffffff',
    barrelEnd: '#d5e7f5',
    ink: '#7fb8e8',
    gripDark: '#263f58',
    gripLight: '#b9d4e9',
    metal: '#c5d3e0',
    cap: '#7db3e2',
    clip: '#9cc9ee',
    spring: '#a7b9cb',
    shadow: '#10263e',
    text: '#d8ecfb',
  },
  {
    id: 'bluebarrel',
    name: 'Royal Blue',
    barrelStart: '#1e3a8a',
    barrelEnd: '#3b82f6',
    ink: '#0c2a4b',
    gripDark: '#1e3a8a',
    gripLight: '#60a5fa',
    metal: '#93c5fd',
    cap: '#1d4ed8',
    clip: '#3b82f6',
    spring: '#bfdbfe',
    shadow: '#0f172a',
    text: '#eff6ff',
  },
  {
    id: 'blackbarrel',
    name: 'Midnight Black',
    barrelStart: '#0f172a',
    barrelEnd: '#334155',
    ink: '#020617',
    gripDark: '#0f172a',
    gripLight: '#475569',
    metal: '#94a3b8',
    cap: '#334155',
    clip: '#475569',
    spring: '#64748b',
    shadow: '#020617',
    text: '#f1f5f9',
  },
  {
    id: 'redbarrel',
    name: 'Pencil Red',
    barrelStart: '#c8544a',
    barrelEnd: '#dc2626',
    ink: '#7f1d1d',
    gripDark: '#991b1b',
    gripLight: '#fca5a5',
    metal: '#fca5a5',
    cap: '#b91c1c',
    clip: '#ef4444',
    spring: '#fecaca',
    shadow: '#450a0a',
    text: '#fff1f2',
  },
  {
    id: 'greenbarrel',
    name: 'Forest Green',
    barrelStart: '#14532d',
    barrelEnd: '#16a34a',
    ink: '#14532d',
    gripDark: '#15803d',
    gripLight: '#86efac',
    metal: '#6ee7b7',
    cap: '#15803d',
    clip: '#22c55e',
    spring: '#a7f3d0',
    shadow: '#022c22',
    text: '#ecfdf5',
  },
  {
    id: 'goldbarrel',
    name: 'Gold Leaf',
    barrelStart: '#b45309',
    barrelEnd: '#f59e0b',
    ink: '#78350f',
    gripDark: '#92400e',
    gripLight: '#fef08a',
    metal: '#fcd34d',
    cap: '#d97706',
    clip: '#fbbf24',
    spring: '#fde047',
    shadow: '#451a03',
    text: '#fff7ed',
  },
  {
    id: 'silverbarrel',
    name: 'Silver',
    barrelStart: '#374151',
    barrelEnd: '#9ca3af',
    ink: '#1f2937',
    gripDark: '#4b5563',
    gripLight: '#d1d5db',
    metal: '#e5e7eb',
    cap: '#6b7280',
    clip: '#9ca3af',
    spring: '#f3f4f6',
    shadow: '#111827',
    text: '#f9fafb',
  },
  {
    id: 'copper',
    name: 'Copper',
    barrelStart: '#a16207',
    barrelEnd: '#c2410c',
    ink: '#7c2d12',
    gripDark: '#9a3412',
    gripLight: '#fdba74',
    metal: '#fda4a1',
    cap: '#c2410c',
    clip: '#ea580c',
    spring: '#fed7aa',
    shadow: '#7c2d12',
    text: '#fff1ed',
  },
  {
    id: 'neon',
    name: 'Neon',
    barrelStart: '#22c55e',
    barrelEnd: '#a3e635',
    ink: '#14532d',
    gripDark: '#15803d',
    gripLight: '#bef264',
    metal: '#bef264',
    cap: '#16a34a',
    clip: '#4ade80',
    spring: '#d9f99d',
    shadow: '#064e3b',
    text: '#ecfdf5',
  },
  {
    id: 'pastelpink',
    name: 'Pastel Pink',
    barrelStart: '#fecaca',
    barrelEnd: '#fda4af',
    ink: '#9f1239',
    gripDark: '#be185d',
    gripLight: '#fce7f3',
    metal: '#fce7f3',
    cap: '#e879f9',
    clip: '#f472b6',
    spring: '#f9a8d4',
    shadow: '#881337',
    text: '#fff1f2',
  },
  {
    id: 'pastelblue',
    name: 'Pastel Blue',
    barrelStart: '#93c5fd',
    barrelEnd: '#bfdbfe',
    ink: '#1e3a8a',
    gripDark: '#1d4ed8',
    gripLight: '#eff6ff',
    metal: '#bfdbfe',
    cap: '#60a5fa',
    clip: '#3b82f6',
    spring: '#bfdbfe',
    shadow: '#1e3a8a',
    text: '#eff6ff',
  },
  {
    id: 'pastelgreen',
    name: 'Pastel Green',
    barrelStart: '#86efac',
    barrelEnd: '#6ee7b7',
    ink: '#14532d',
    gripDark: '#15803d',
    gripLight: '#d1fae5',
    metal: '#a7f3d0',
    cap: '#34d399',
    clip: '#4ade80',
    spring: '#bbf7d0',
    shadow: '#064e3b',
    text: '#ecfdf5',
  },
  {
    id: 'olive',
    name: 'Olive',
    barrelStart: '#4d7c0f',
    barrelEnd: '#65a30d',
    ink: '#365314',
    gripDark: '#3f6212',
    gripLight: '#bef264',
    metal: '#a3e635',
    cap: '#4d7c0f',
    clip: '#84cc16',
    spring: '#bbf7d0',
    shadow: '#14532d',
    text: '#f0fdf4',
  },
  {
    id: 'navy',
    name: 'Navy',
    barrelStart: '#1e3a8a',
    barrelEnd: '#1d4ed8',
    ink: '#1e1b4b',
    gripDark: '#1e3a8a',
    gripLight: '#3b82f6',
    metal: '#bfdbfe',
    cap: '#2563eb',
    clip: '#1d4ed8',
    spring: '#dbeafe',
    shadow: '#1e1b4b',
    text: '#eff6ff',
  },
  {
    id: 'maroon',
    name: 'Maroon',
    barrelStart: '#7f1d1d',
    barrelEnd: '#dc2626',
    ink: '#450a0a',
    gripDark: '#7f1d1d',
    gripLight: '#fca5a5',
    metal: '#fecaca',
    cap: '#991b1b',
    clip: '#b91c1c',
    spring: '#fecaca',
    shadow: '#450a0a',
    text: '#fef2f2',
  },
  {
    id: 'violet',
    name: 'Violet',
    barrelStart: '#4338ca',
    barrelEnd: '#8b5cf6',
    ink: '#312e81',
    gripDark: '#4338ca',
    gripLight: '#ddd6fe',
    metal: '#c4b5fd',
    cap: '#7c3aed',
    clip: '#a78bfa',
    spring: '#e9d5ff',
    shadow: '#312e81',
    text: '#f5f3ff',
  },
  {
    id: 'charcoal',
    name: 'Charcoal',
    barrelStart: '#1f2937',
    barrelEnd: '#4b5563',
    ink: '#111827',
    gripDark: '#374151',
    gripLight: '#d1d5db',
    metal: '#e5e7eb',
    cap: '#6b7280',
    clip: '#9ca3af',
    spring: '#f3f4f6',
    shadow: '#111827',
    text: '#f9fafb',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    barrelStart: '#ea580c',
    barrelEnd: '#f97316',
    ink: '#7c2d12',
    gripDark: '#c2410c',
    gripLight: '#fed7aa',
    metal: '#fdba74',
    cap: '#c2410c',
    clip: '#fb923c',
    spring: '#ffedd5',
    shadow: '#7c2d12',
    text: '#fff7ed',
  },
  {
    id: 'mintgreen',
    name: 'Mint Green',
    barrelStart: '#86efac',
    barrelEnd: '#34d399',
    ink: '#14532d',
    gripDark: '#15803d',
    gripLight: '#bbf7d0',
    metal: '#a7f3d0',
    cap: '#10b981',
    clip: '#22c55e',
    spring: '#d1fae5',
    shadow: '#064e3b',
    text: '#ecfdf5',
  },
  {
    id: 'lavenderblue',
    name: 'Lavender Blue',
    barrelStart: '#818cf8',
    barrelEnd: '#a78bfa',
    ink: '#3730a3',
    gripDark: '#4338ca',
    gripLight: '#e0e7ff',
    metal: '#ddd6fe',
    cap: '#7c3aed',
    clip: '#8b5cf6',
    spring: '#c4b5fd',
    shadow: '#312e81',
    text: '#f5f3ff',
  },
]

export const DEFAULT_PAPER_THEME: PaperThemeId = 'notebook'
export const DEFAULT_PEN_STYLE: PenStyleId = 'clear'

/** Mix a hex colour towards white (`amount` 0..1) or another hex colour. */
export function mixHex(from: string, to: string, amount: number): string {
  const parse = (hex: string): [number, number, number] => {
    const clean = hex.replace('#', '')
    const full = clean.length === 3 ? clean.split('').map((char) => char + char).join('') : clean.slice(0, 6)
    const value = Number.parseInt(full, 16)
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
  }
  const [fr, fg, fb] = parse(from)
  const [tr, tg, tb] = parse(to)
  const blend = (a: number, b: number) => Math.round(a + (b - a) * amount)
  const channel = (value: number) => value.toString(16).padStart(2, '0')
  return `#${channel(blend(fr, tr))}${channel(blend(fg, tg))}${channel(blend(fb, tb))}`
}

export function lighten(hex: string, amount: number): string {
  return mixHex(hex, '#ffffff', amount)
}

export function darken(hex: string, amount: number): string {
  return mixHex(hex, '#000000', amount)
}

export function getPaperTheme(id?: PaperThemeId | null): PaperTheme {
  return PAPER_THEMES.find((theme) => theme.id === id) ?? PAPER_THEMES[0]!
}

export function getPenStyle(id?: PenStyleId | null): PenStyle {
  return PEN_STYLES.find((style) => style.id === id) ?? PEN_STYLES[0]!
}

export function isPaperThemeId(value: unknown): value is PaperThemeId {
  return typeof value === 'string' && PAPER_THEMES.some((theme) => theme.id === value)
}

export function isPenStyleId(value: unknown): value is PenStyleId {
  return typeof value === 'string' && PEN_STYLES.some((style) => style.id === value)
}
