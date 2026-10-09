export type SpaceType = 'personal' | 'shared' | 'cozy_stash' | 'travel';

export type CoverStyle =
  | 'kraft'
  | 'marble'
  | 'collage'
  | 'pattern'
  | 'linen'
  | 'obsidian'
  | 'klein'
  | 'electric'
  | 'ultramarine'
  | 'periwinkle'
  | 'alabaster';

export interface Space {

  id: string;
  name: string;
  type: SpaceType;
  description?: string;
  iconName: string;
  coverStyle?: CoverStyle;
  customColor?: string;
  fontChoice?: FontChoice;
  isShared: boolean;
  inviteCode?: string;
  partnerName?: string;
  membersCount?: number;
  createdAt: string;
}

export interface VoiceMemo {
  durationSeconds: number;
  audioUrl?: string;
}

export interface MarginaliaItem {
  id: string;
  content: string;
  citation?: string;
  targetSentence?: string;
  createdAt?: string;
}

export type HighlightStyle = 'graphite' | 'sepia' | 'cobalt';
export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type ImageFrameSize = 'compact' | 'editorial' | 'full';

export interface TextHighlight {
  id: string;
  startIndex: number;
  endIndex: number;
  selectedText: string;
  style: HighlightStyle;
  marginalia?: string;
  createdAt: string;
}

export type FilmFilter = 'natural' | 'silver' | 'trix' | 'sepia' | 'editorial';

export interface PhotoMeta {
  url?: string;
  filter?: FilmFilter;
  caption?: string;
  hasGrain?: boolean;
  frameMode?: 'polaroid' | 'borderless';
}

export interface FieldNote {
  id: string;
  spaceId: string;
  title?: string;
  content: string;
  textAlign?: TextAlign;
  fontChoice?: FontChoice;
  locationName?: string;
  photos?: string[];
  photosMeta?: PhotoMeta[];
  videos?: string[];
  voiceMemo?: VoiceMemo;
  tags?: string[];
  pinned?: boolean;
  archived?: boolean;
  photostripLayout?: 'polaroid' | 'strip' | 'grid';
  createdAt: string;
  marginalia?: string;
  marginaliaItems?: MarginaliaItem[];
  quoteSource?: string;
  highlights?: TextHighlight[];
  author?: {
    name: string;
    avatar?: string;
  };
}

export type ThemePalette =
  | 'alabaster'
  | 'clean_white'
  | 'sage'
  | 'obsidian'
  | 'espresso'
  | 'oxford';
export type ThemeMode = 'light' | 'dark';
export type FontChoice = 'editorial' | 'sans' | 'display';

export type FilterCategory = 'all' | 'photos' | 'videos' | 'voice' | 'marginalia' | 'pinned' | 'shared';
export type StreamSortOrder = 'newest' | 'oldest';
