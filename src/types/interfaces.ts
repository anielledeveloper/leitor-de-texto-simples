/**
 * Speech state interface
 */
export interface SpeechState {
  /** Whether speech is currently active */
  isSpeaking: boolean;
  /** ID of the tab where speech is active */
  tabId: number | null;
  /** Selected text being spoken */
  selectedText: string | null;
  /** Timestamp when speech started */
  startTime: number | null;
}

/**
 * Context menu item interface
 */
export interface ContextMenuItem {
  /** Unique identifier for the menu item */
  id: string;
  /** Display title */
  title: string;
  /** Contexts where the item should appear */
  contexts: chrome.contextMenus.ContextType[];
  /** Whether the item is visible */
  visible: boolean;
  /** Parent menu item ID */
  parentId?: string;
}

/**
 * Speech message interface
 */
export interface SpeechMessage {
  /** Command type */
  command: 'speak' | 'stop' | 'pause' | 'resume';
  /** Text to be spoken */
  text?: string;
  /** Speech options */
  options?: SpeechOptions;
}

/**
 * Speech response interface
 */
export interface SpeechResponse {
  /** Response status */
  status: 'started' | 'finished' | 'stopped' | 'paused' | 'resumed' | 'error';
  /** Error message if status is error */
  error?: string;
  /** Additional data */
  data?: any;
}

/**
 * Speech options interface
 */
export interface SpeechOptions {
  /** Speech rate (0.1 to 10) */
  rate?: number;
  /** Speech pitch (0 to 2) */
  pitch?: number;
  /** Speech volume (0 to 1) */
  volume?: number;
  /** Voice to use */
  voice?: SpeechSynthesisVoice;
  /** Language code */
  lang?: string;
}

/**
 * Voice information interface
 */
export interface VoiceInfo {
  /** Voice name */
  name: string;
  /** Language code */
  lang: string;
  /** Whether it's a default voice */
  default: boolean;
  /** Whether it's a local voice */
  localService: boolean;
  /** Voice URI */
  voiceURI: string;
}

/**
 * Speech synthesis utterance interface
 */
export interface SpeechUtterance {
  /** Text to be spoken */
  text: string;
  /** Speech rate */
  rate: number;
  /** Speech pitch */
  pitch: number;
  /** Speech volume */
  volume: number;
  /** Language */
  lang: string;
  /** Voice */
  voice: SpeechSynthesisVoice | null;
}

/**
 * Extension state interface
 */
export interface ExtensionState {
  /** Current speech state */
  speechState: SpeechState;
  /** Available voices */
  voices: SpeechSynthesisVoice[];
  /** User preferences */
  preferences: UserPreferences;
  /** Error state */
  error: string | null;
}

/**
 * User preferences interface
 */
export interface UserPreferences {
  /** Default speech rate */
  defaultRate: number;
  /** Default speech pitch */
  defaultPitch: number;
  /** Default speech volume */
  defaultVolume: number;
  /** Preferred voice language */
  preferredLanguage: string;
  /** Whether to show notifications */
  showNotifications: boolean;
  /** Whether to auto-stop on new selection */
  autoStopOnNewSelection: boolean;
}

/**
 * Context menu configuration interface
 */
export interface ContextMenuConfig {
  /** Speak text menu item */
  speakText: ContextMenuItem;
  /** Stop speech menu item */
  stopSpeech: ContextMenuItem;
  /** Pause speech menu item */
  pauseSpeech: ContextMenuItem;
  /** Resume speech menu item */
  resumeSpeech: ContextMenuItem;
}

/**
 * Error interface
 */
export interface SpeechError {
  /** Error message */
  message: string;
  /** Error type */
  type: 'SPEECH' | 'CONTEXT_MENU' | 'TAB' | 'PERMISSION' | 'UNKNOWN';
  /** Error timestamp */
  timestamp: number;
  /** Stack trace */
  stack?: string;
  /** Error context */
  context?: Record<string, any>;
}

/**
 * Tab information interface
 */
export interface TabInfo {
  /** Tab ID */
  id: number;
  /** Tab URL */
  url: string;
  /** Tab title */
  title: string;
  /** Whether tab is active */
  active: boolean;
  /** Whether tab is audible */
  audible: boolean;
}

/**
 * Speech event interface
 */
export interface SpeechEvent {
  /** Event type */
  type: 'start' | 'end' | 'error' | 'pause' | 'resume' | 'boundary';
  /** Event timestamp */
  timestamp: number;
  /** Event data */
  data?: any;
}

/**
 * Notification interface
 */
export interface NotificationInfo {
  /** Notification type */
  type: 'info' | 'success' | 'warning' | 'error';
  /** Notification title */
  title: string;
  /** Notification message */
  message: string;
  /** Notification icon */
  iconUrl?: string;
  /** Notification duration */
  duration?: number;
}

/**
 * Storage keys interface
 */
export interface StorageKeys {
  /** Speech state storage key */
  SPEECH_STATE: string;
  /** User preferences storage key */
  PREFERENCES: string;
  /** Voices storage key */
  VOICES: string;
  /** Statistics storage key */
  STATISTICS: string;
}

/**
 * Statistics interface
 */
export interface SpeechStatistics {
  /** Total text spoken (characters) */
  totalCharactersSpoken: number;
  /** Total speech sessions */
  totalSessions: number;
  /** Average session duration */
  averageSessionDuration: number;
  /** Most used language */
  mostUsedLanguage: string;
  /** Last activity date */
  lastActivityDate: string;
}

/**
 * Voice detection interface
 */
export interface VoiceDetection {
  /** Whether voices are loaded */
  voicesLoaded: boolean;
  /** Number of available voices */
  voiceCount: number;
  /** Default voice */
  defaultVoice: SpeechSynthesisVoice | null;
  /** Preferred voice */
  preferredVoice: SpeechSynthesisVoice | null;
}

/**
 * Speech control interface
 */
export interface SpeechControl {
  /** Whether speech is currently active */
  isActive: boolean;
  /** Whether speech is paused */
  isPaused: boolean;
  /** Current utterance */
  currentUtterance: SpeechSynthesisUtterance | null;
  /** Speech start time */
  startTime: number | null;
  /** Speech duration */
  duration: number | null;
}

/**
 * Message handler interface
 */
export interface MessageHandler {
  /** Handle incoming messages */
  handleMessage: (message: SpeechMessage, sender: chrome.runtime.MessageSender) => Promise<SpeechResponse>;
  /** Handle context menu clicks */
  handleContextMenuClick: (info: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab) => Promise<void>;
  /** Handle tab updates */
  handleTabUpdate: (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => Promise<void>;
}

/**
 * Extension configuration interface
 */
export interface ExtensionConfig {
  /** Extension version */
  version: string;
  /** Minimum Chrome version */
  minChromeVersion: string;
  /** Required permissions */
  requiredPermissions: string[];
  /** Optional permissions */
  optionalPermissions: string[];
  /** Content security policy */
  contentSecurityPolicy: string;
}

/**
 * Debug information interface
 */
export interface DebugInfo {
  /** Extension state */
  state: ExtensionState;
  /** Available voices */
  voices: VoiceInfo[];
  /** Current tab */
  currentTab: TabInfo | null;
  /** Speech synthesis support */
  speechSynthesisSupported: boolean;
  /** Context menu items */
  contextMenuItems: ContextMenuItem[];
  /** Error log */
  errorLog: SpeechError[];
}
