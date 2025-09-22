import { 
  SpeechMessage, 
  SpeechResponse, 
  SpeechOptions,
  SpeechError,
  UserPreferences
} from '../types/interfaces';

/**
 * Content script for Leitor de Texto Simples
 * Handles text-to-speech functionality using the Web Speech API
 */

// Speech synthesis state
let currentUtterance: SpeechSynthesisUtterance | null = null;
let isPaused: boolean = false;
let speechSynthesis: SpeechSynthesis | null = null;

// User preferences (will be loaded from background)
let userPreferences: UserPreferences = {
  defaultRate: 1.0,
  defaultPitch: 1.0,
  defaultVolume: 1.0,
  preferredLanguage: 'pt-BR',
  showNotifications: true,
  autoStopOnNewSelection: true
};

/**
 * Initialize the content script
 */
function initialize(): void {
  console.log('Leitor de Texto Simples: Content script initialized');
  
  // Check if speech synthesis is supported
  if (!('speechSynthesis' in window)) {
    console.error('Speech synthesis not supported in this browser');
    sendResponse({ status: 'error', error: 'Speech synthesis not supported' });
    return;
  }

  speechSynthesis = window.speechSynthesis;
  
  // Load voices when they become available
  if (speechSynthesis.getVoices().length > 0) {
    loadVoices();
  } else {
    speechSynthesis.addEventListener('voiceschanged', loadVoices);
  }

  // Set up message listener
  chrome.runtime.onMessage.addListener(handleMessage);
  
  console.log('Content script ready for speech synthesis');
}

/**
 * Load available voices
 */
function loadVoices(): void {
  if (!speechSynthesis) return;
  
  const voices = speechSynthesis.getVoices();
  console.log(`Loaded ${voices.length} voices`);
  
  // Find preferred voice
  const preferredVoice = voices.find(voice => 
    voice.lang.startsWith(userPreferences.preferredLanguage)
  ) || voices.find(voice => voice.default) || voices[0];
  
  if (preferredVoice) {
    console.log('Using voice:', preferredVoice.name, preferredVoice.lang);
  }
}

/**
 * Handle messages from background script
 */
async function handleMessage(
  message: SpeechMessage, 
  sender: chrome.runtime.MessageSender, 
  sendResponse: (response: SpeechResponse) => void
): Promise<boolean> {
  console.log('Content script received message:', message);

  try {
    switch (message.command) {
      case 'speak':
        await handleSpeakCommand(message);
        break;
      case 'stop':
        await handleStopCommand();
        break;
      case 'pause':
        await handlePauseCommand();
        break;
      case 'resume':
        await handleResumeCommand();
        break;
      default:
        console.warn('Unknown command:', message.command);
        sendResponse({ status: 'error', error: 'Unknown command' });
        return false;
    }

    sendResponse({ status: 'started' });
    return true;
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return false;
  }
}

/**
 * Handle speak command
 */
async function handleSpeakCommand(message: SpeechMessage): Promise<void> {
  if (!message.text || !speechSynthesis) {
    throw new Error('No text provided or speech synthesis not available');
  }

  // Stop any current speech
  if (currentUtterance) {
    speechSynthesis.cancel();
  }

  // Create new utterance
  currentUtterance = new SpeechSynthesisUtterance(message.text);
  
  // Configure utterance with user preferences
  configureUtterance(currentUtterance, message.options);

  // Set up event listeners
  setupUtteranceEventListeners(currentUtterance);

  // Start speaking
  speechSynthesis.speak(currentUtterance);
  isPaused = false;
  
  console.log('Started speaking:', message.text.substring(0, 50) + '...');
}

/**
 * Handle stop command
 */
async function handleStopCommand(): Promise<void> {
  if (!speechSynthesis) {
    throw new Error('Speech synthesis not available');
  }

  // Cancel all speech
  speechSynthesis.cancel();
  currentUtterance = null;
  isPaused = false;
  
  console.log('Speech stopped');
  
  // Notify background script
  chrome.runtime.sendMessage({ status: 'stopped' });
}

/**
 * Handle pause command
 */
async function handlePauseCommand(): Promise<void> {
  if (!speechSynthesis || !currentUtterance) {
    throw new Error('No speech to pause');
  }

  // Pause speech
  speechSynthesis.pause();
  isPaused = true;
  
  console.log('Speech paused');
  
  // Notify background script
  chrome.runtime.sendMessage({ status: 'paused' });
}

/**
 * Handle resume command
 */
async function handleResumeCommand(): Promise<void> {
  if (!speechSynthesis || !currentUtterance) {
    throw new Error('No speech to resume');
  }

  // Resume speech
  speechSynthesis.resume();
  isPaused = false;
  
  console.log('Speech resumed');
  
  // Notify background script
  chrome.runtime.sendMessage({ status: 'resumed' });
}

/**
 * Configure utterance with user preferences
 */
function configureUtterance(utterance: SpeechSynthesisUtterance, options?: SpeechOptions): void {
  // Set basic properties
  utterance.rate = options?.rate ?? userPreferences.defaultRate;
  utterance.pitch = options?.pitch ?? userPreferences.defaultPitch;
  utterance.volume = options?.volume ?? userPreferences.defaultVolume;
  utterance.lang = options?.lang ?? userPreferences.preferredLanguage;

  // Set voice if available
  if (speechSynthesis && speechSynthesis.getVoices().length > 0) {
    const voices = speechSynthesis.getVoices();
    const preferredVoice = options?.voice || 
      voices.find(voice => voice.lang.startsWith(userPreferences.preferredLanguage)) ||
      voices.find(voice => voice.default) ||
      voices[0];
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
  }

  console.log('Utterance configured:', {
    rate: utterance.rate,
    pitch: utterance.pitch,
    volume: utterance.volume,
    lang: utterance.lang,
    voice: utterance.voice?.name
  });
}

/**
 * Set up event listeners for utterance
 */
function setupUtteranceEventListeners(utterance: SpeechSynthesisUtterance): void {
  // Handle speech start
  utterance.onstart = () => {
    console.log('Speech started');
    chrome.runtime.sendMessage({ status: 'started' });
  };

  // Handle speech end
  utterance.onend = () => {
    console.log('Speech ended naturally');
    currentUtterance = null;
    isPaused = false;
    chrome.runtime.sendMessage({ status: 'finished' });
  };

  // Handle speech error
  utterance.onerror = (event) => {
    console.error('Speech error:', event.error);
    currentUtterance = null;
    isPaused = false;
    chrome.runtime.sendMessage({ 
      status: 'error', 
      error: `Speech error: ${event.error}` 
    });
  };

  // Handle speech pause
  utterance.onpause = () => {
    console.log('Speech paused');
    isPaused = true;
    chrome.runtime.sendMessage({ status: 'paused' });
  };

  // Handle speech resume
  utterance.onresume = () => {
    console.log('Speech resumed');
    isPaused = false;
    chrome.runtime.sendMessage({ status: 'resumed' });
  };

  // Handle speech boundary (word boundaries)
  utterance.onboundary = (event) => {
    console.log('Speech boundary reached:', event.name, event.charIndex);
    // Could be used for highlighting text as it's being read
  };
}

/**
 * Send response to background script
 */
function sendResponse(response: SpeechResponse): void {
  chrome.runtime.sendMessage(response);
}

/**
 * Get current speech state
 */
function getSpeechState(): { isSpeaking: boolean; isPaused: boolean; currentText: string | null } {
  return {
    isSpeaking: currentUtterance !== null && speechSynthesis?.speaking === true,
    isPaused: isPaused,
    currentText: currentUtterance?.text || null
  };
}

/**
 * Check if speech synthesis is supported
 */
function isSpeechSynthesisSupported(): boolean {
  return 'speechSynthesis' in window;
}

/**
 * Get available voices
 */
function getAvailableVoices(): SpeechSynthesisVoice[] {
  return speechSynthesis?.getVoices() || [];
}

/**
 * Update user preferences
 */
function updatePreferences(newPreferences: Partial<UserPreferences>): void {
  userPreferences = { ...userPreferences, ...newPreferences };
  console.log('User preferences updated:', userPreferences);
}

/**
 * Handle page visibility change
 */
document.addEventListener('visibilitychange', () => {
  if (document.hidden && currentUtterance && speechSynthesis?.speaking) {
    console.log('Page hidden, pausing speech');
    speechSynthesis.pause();
  } else if (!document.hidden && currentUtterance && isPaused) {
    console.log('Page visible, resuming speech');
    speechSynthesis?.resume();
  }
});

/**
 * Handle page unload
 */
window.addEventListener('beforeunload', () => {
  if (currentUtterance && speechSynthesis?.speaking) {
    console.log('Page unloading, stopping speech');
    speechSynthesis.cancel();
  }
});

/**
 * Handle keyboard shortcuts
 */
document.addEventListener('keydown', (event) => {
  // Ctrl+Shift+S to stop speech
  if (event.ctrlKey && event.shiftKey && event.key === 'S') {
    event.preventDefault();
    if (currentUtterance && speechSynthesis?.speaking) {
      handleStopCommand();
    }
  }
  
  // Ctrl+Shift+P to pause/resume speech
  if (event.ctrlKey && event.shiftKey && event.key === 'P') {
    event.preventDefault();
    if (currentUtterance && speechSynthesis?.speaking) {
      if (isPaused) {
        handleResumeCommand();
      } else {
        handlePauseCommand();
      }
    }
  }
});

// Initialize the content script when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Export for testing purposes
export { 
  handleMessage, 
  getSpeechState, 
  isSpeechSynthesisSupported, 
  getAvailableVoices,
  updatePreferences 
};
