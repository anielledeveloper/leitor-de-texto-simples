import { 
  SpeechState, 
  ContextMenuItem, 
  SpeechMessage, 
  SpeechResponse, 
  ContextMenuConfig,
  SpeechError,
  StorageKeys,
  UserPreferences
} from '../types/interfaces';

/**
 * Background service worker for Leitor de Texto Simples
 * Manages context menu, speech state, and communication with content scripts
 */

// Storage keys
const STORAGE_KEYS: StorageKeys = {
  SPEECH_STATE: 'speechState',
  PREFERENCES: 'preferences',
  VOICES: 'voices',
  STATISTICS: 'statistics'
};

// Default user preferences
const DEFAULT_PREFERENCES: UserPreferences = {
  defaultRate: 1.0,
  defaultPitch: 1.0,
  defaultVolume: 1.0,
  preferredLanguage: 'pt-BR',
  showNotifications: true,
  autoStopOnNewSelection: true
};

// Speech state management
let speechState: SpeechState = {
  isSpeaking: false,
  tabId: null,
  selectedText: null,
  startTime: null
};

// Context menu configuration
const contextMenuConfig: ContextMenuConfig = {
  speakText: {
    id: 'speakText',
    title: 'Ouvir texto',
    contexts: ['selection'],
    visible: true
  },
  stopSpeech: {
    id: 'stopSpeech',
    title: 'Parar leitura',
    contexts: ['all'],
    visible: false
  },
  pauseSpeech: {
    id: 'pauseSpeech',
    title: 'Pausar leitura',
    contexts: ['all'],
    visible: false
  },
  resumeSpeech: {
    id: 'resumeSpeech',
    title: 'Continuar leitura',
    contexts: ['all'],
    visible: false
  }
};

/**
 * Initialize the extension
 */
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Leitor de Texto Simples: Extension installed');
  
  try {
    // Create context menu items
    await createContextMenuItems();
    
    // Load saved preferences
    await loadPreferences();
    
    // Initialize speech state
    await initializeSpeechState();
    
    console.log('Leitor de Texto Simples: Initialization complete');
  } catch (error) {
    console.error('Leitor de Texto Simples: Initialization error:', error);
  }
});

/**
 * Create context menu items
 */
async function createContextMenuItems(): Promise<void> {
  try {
    // Create speak text menu item
    await chrome.contextMenus.create({
      id: contextMenuConfig.speakText.id,
      title: contextMenuConfig.speakText.title,
      contexts: contextMenuConfig.speakText.contexts,
      visible: contextMenuConfig.speakText.visible
    });

    // Create stop speech menu item (initially hidden)
    await chrome.contextMenus.create({
      id: contextMenuConfig.stopSpeech.id,
      title: contextMenuConfig.stopSpeech.title,
      contexts: contextMenuConfig.stopSpeech.contexts,
      visible: contextMenuConfig.stopSpeech.visible
    });

    // Create pause speech menu item (initially hidden)
    await chrome.contextMenus.create({
      id: contextMenuConfig.pauseSpeech.id,
      title: contextMenuConfig.pauseSpeech.title,
      contexts: contextMenuConfig.pauseSpeech.contexts,
      visible: contextMenuConfig.pauseSpeech.visible
    });

    // Create resume speech menu item (initially hidden)
    await chrome.contextMenus.create({
      id: contextMenuConfig.resumeSpeech.id,
      title: contextMenuConfig.resumeSpeech.title,
      contexts: contextMenuConfig.resumeSpeech.contexts,
      visible: contextMenuConfig.resumeSpeech.visible
    });

    console.log('Context menu items created successfully');
  } catch (error) {
    console.error('Error creating context menu items:', error);
    throw error;
  }
}

/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.id) {
    console.error('No tab information available');
    return;
  }

  try {
    switch (info.menuItemId) {
      case 'speakText':
        await handleSpeakText(info, tab);
        break;
      case 'stopSpeech':
        await handleStopSpeech(tab);
        break;
      case 'pauseSpeech':
        await handlePauseSpeech(tab);
        break;
      case 'resumeSpeech':
        await handleResumeSpeech(tab);
        break;
      default:
        console.warn('Unknown menu item clicked:', info.menuItemId);
    }
  } catch (error) {
    console.error('Error handling context menu click:', error);
    await showError('Erro ao processar comando de voz');
  }
});

/**
 * Handle speak text command
 */
async function handleSpeakText(info: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab): Promise<void> {
  if (!info.selectionText || !tab.id) {
    console.warn('No text selected or tab ID missing');
    return;
  }

  try {
    // Update speech state
    speechState = {
      isSpeaking: true,
      tabId: tab.id,
      selectedText: info.selectionText,
      startTime: Date.now()
    };

    // Update context menu visibility
    await updateContextMenuVisibility(true);

    // Inject content script if not already injected
    await injectContentScript(tab.id);

    // Send speak command to content script
    const message: SpeechMessage = {
      command: 'speak',
      text: info.selectionText
    };

    await chrome.tabs.sendMessage(tab.id, message);
    
    console.log('Speak command sent for text:', info.selectionText.substring(0, 50) + '...');
  } catch (error) {
    console.error('Error handling speak text:', error);
    await resetSpeechState();
    throw error;
  }
}

/**
 * Handle stop speech command
 */
async function handleStopSpeech(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.id) {
    console.warn('No tab ID available');
    return;
  }

  try {
    // Send stop command to content script
    const message: SpeechMessage = {
      command: 'stop'
    };

    await chrome.tabs.sendMessage(tab.id, message);
    
    // Reset speech state
    await resetSpeechState();
    
    console.log('Stop command sent');
  } catch (error) {
    console.error('Error handling stop speech:', error);
    await resetSpeechState();
    throw error;
  }
}

/**
 * Handle pause speech command
 */
async function handlePauseSpeech(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.id) {
    console.warn('No tab ID available');
    return;
  }

  try {
    // Send pause command to content script
    const message: SpeechMessage = {
      command: 'pause'
    };

    await chrome.tabs.sendMessage(tab.id, message);
    
    // Update context menu visibility
    await updateContextMenuVisibility(true, true);
    
    console.log('Pause command sent');
  } catch (error) {
    console.error('Error handling pause speech:', error);
    throw error;
  }
}

/**
 * Handle resume speech command
 */
async function handleResumeSpeech(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.id) {
    console.warn('No tab ID available');
    return;
  }

  try {
    // Send resume command to content script
    const message: SpeechMessage = {
      command: 'resume'
    };

    await chrome.tabs.sendMessage(tab.id, message);
    
    // Update context menu visibility
    await updateContextMenuVisibility(true, false);
    
    console.log('Resume command sent');
  } catch (error) {
    console.error('Error handling resume speech:', error);
    throw error;
  }
}

/**
 * Handle messages from content scripts
 */
chrome.runtime.onMessage.addListener((message: SpeechResponse, sender, sendResponse) => {
  console.log('Message received from content script:', message);

  switch (message.status) {
    case 'finished':
      handleSpeechFinished();
      break;
    case 'stopped':
      handleSpeechStopped();
      break;
    case 'error':
      handleSpeechError(message.error || 'Unknown speech error');
      break;
    case 'paused':
      handleSpeechPaused();
      break;
    case 'resumed':
      handleSpeechResumed();
      break;
    default:
      console.warn('Unknown message status:', message.status);
  }

  // Send response back
  sendResponse({ success: true });
});

/**
 * Handle speech finished
 */
async function handleSpeechFinished(): Promise<void> {
  console.log('Speech finished naturally');
  await resetSpeechState();
}

/**
 * Handle speech stopped
 */
async function handleSpeechStopped(): Promise<void> {
  console.log('Speech stopped by user');
  await resetSpeechState();
}

/**
 * Handle speech error
 */
async function handleSpeechError(error: string): Promise<void> {
  console.error('Speech error:', error);
  await resetSpeechState();
  await showError(`Erro na leitura: ${error}`);
}

/**
 * Handle speech paused
 */
async function handleSpeechPaused(): Promise<void> {
  console.log('Speech paused');
  await updateContextMenuVisibility(true, true);
}

/**
 * Handle speech resumed
 */
async function handleSpeechResumed(): Promise<void> {
  console.log('Speech resumed');
  await updateContextMenuVisibility(true, false);
}

/**
 * Inject content script into tab
 */
async function injectContentScript(tabId: number): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/speaker.js']
    });
    console.log('Content script injected into tab:', tabId);
  } catch (error) {
    console.error('Error injecting content script:', error);
    throw error;
  }
}

/**
 * Update context menu visibility
 */
async function updateContextMenuVisibility(isSpeaking: boolean, isPaused: boolean = false): Promise<void> {
  try {
    // Update speak text menu item
    await chrome.contextMenus.update('speakText', {
      visible: !isSpeaking
    });

    // Update stop speech menu item
    await chrome.contextMenus.update('stopSpeech', {
      visible: isSpeaking && !isPaused
    });

    // Update pause speech menu item
    await chrome.contextMenus.update('pauseSpeech', {
      visible: isSpeaking && !isPaused
    });

    // Update resume speech menu item
    await chrome.contextMenus.update('resumeSpeech', {
      visible: isSpeaking && isPaused
    });

    console.log('Context menu visibility updated');
  } catch (error) {
    console.error('Error updating context menu visibility:', error);
    throw error;
  }
}

/**
 * Reset speech state
 */
async function resetSpeechState(): Promise<void> {
  speechState = {
    isSpeaking: false,
    tabId: null,
    selectedText: null,
    startTime: null
  };

  await updateContextMenuVisibility(false);
  console.log('Speech state reset');
}

/**
 * Load user preferences
 */
async function loadPreferences(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.PREFERENCES);
    const preferences = result[STORAGE_KEYS.PREFERENCES] || DEFAULT_PREFERENCES;
    
    // Store preferences in memory for quick access
    (globalThis as any).userPreferences = preferences;
    
    console.log('User preferences loaded');
  } catch (error) {
    console.error('Error loading preferences:', error);
    (globalThis as any).userPreferences = DEFAULT_PREFERENCES;
  }
}

/**
 * Initialize speech state
 */
async function initializeSpeechState(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SPEECH_STATE);
    if (result[STORAGE_KEYS.SPEECH_STATE]) {
      speechState = result[STORAGE_KEYS.SPEECH_STATE];
    }
    
    console.log('Speech state initialized');
  } catch (error) {
    console.error('Error initializing speech state:', error);
  }
}

/**
 * Show error notification
 */
async function showError(message: string): Promise<void> {
  try {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-48.svg',
      title: 'Leitor de Texto Simples',
      message: message
    });
  } catch (error) {
    console.error('Error showing notification:', error);
  }
}

/**
 * Handle tab updates
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // If the tab where speech is active is being updated, stop speech
  if (speechState.isSpeaking && speechState.tabId === tabId) {
    if (changeInfo.status === 'loading' || changeInfo.url) {
      console.log('Tab updated during speech, stopping speech');
      await resetSpeechState();
    }
  }
});

/**
 * Handle tab removal
 */
chrome.tabs.onRemoved.addListener(async (tabId) => {
  // If the tab where speech is active is removed, stop speech
  if (speechState.isSpeaking && speechState.tabId === tabId) {
    console.log('Tab removed during speech, stopping speech');
    await resetSpeechState();
  }
});

/**
 * Handle extension startup
 */
chrome.runtime.onStartup.addListener(async () => {
  console.log('Leitor de Texto Simples: Extension started');
  await resetSpeechState();
});

/**
 * Handle extension suspend
 */
chrome.runtime.onSuspend.addListener(async () => {
  console.log('Leitor de Texto Simples: Extension suspending');
  await resetSpeechState();
});

// Export for testing purposes
export { speechState, resetSpeechState, updateContextMenuVisibility };
