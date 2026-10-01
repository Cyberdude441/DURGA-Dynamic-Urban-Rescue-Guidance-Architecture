/**
 * DURGA - Live Voice Navigation Service
 * Browser Web Speech API engine for deterministic, human-readable evacuation voice guidance.
 * 
 * Features:
 * - Natural language instruction speech
 * - Pitch, rate, and volume normalization
 * - Automatic voice selection (natural English voice)
 * - Anti-stutter milestone debouncing
 * - Clean sanitization: strictly no raw OSM IDs or graph node IDs are ever spoken
 * - Graceful browser error and unsupported device fallbacks
 */

class VoiceNavigationService {
  constructor() {
    this.synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
    this.voice = null;
    this.isEnabled = true;
    this.isSpeaking = false;
    this.isPaused = false;
    this.lastSpokenText = '';
    this.lastSpokenTime = 0;
    this.voicesLoaded = false;

    this.initVoices();
  }

  isSupported() {
    return Boolean(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }

  initVoices() {
    if (!this.synth) return;

    const pickBestVoice = () => {
      try {
        const voices = this.synth.getVoices();
        if (!voices || voices.length === 0) return;

        // Priority list for pleasant, natural navigation voices
        this.voice =
          voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Jenny') || v.name.includes('Aria'))) ||
          voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Zira') || v.name.includes('David') || v.name.includes('Guy'))) ||
          voices.find((v) => v.lang === 'en-US' || v.lang === 'en-GB' || v.lang === 'en-IN') ||
          voices.find((v) => v.lang.startsWith('en')) ||
          voices[0] ||
          null;

        this.voicesLoaded = true;
      } catch (err) {
        console.warn('Voice initialization warning:', err);
      }
    };

    pickBestVoice();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = pickBestVoice;
    }
  }

  /**
   * Sanitizes instructions so raw node IDs or OSM keys are NEVER read aloud.
   * e.g., "B01", "EZ02", "J07", "node/12345" -> cleanly removed or replaced with natural words.
   */
  sanitizeText(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      // Remove raw OSM node/way IDs
      .replace(/\b(node|way|relation)\/\d+\b/gi, '')
      // Remove graph node IDs like B01, EZ02, J07, EX01, H01, RC01
      .replace(/\b(B\d{2}|EZ\d{2}|J\d{2}|EX\d{2}|H\d{2}|RC\d{2})\b/gi, '')
      // Remove brackets, asterisks, hashes
      .replace(/[[\]()#*_`~]/g, '')
      // Remove double spaces
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Speak a navigation instruction.
   * 
   * @param {string} text - The instruction to speak
   * @param {Object} options
   * @param {boolean} [options.priority=false] - If true, immediately cancels current speech to announce (e.g. turn imminent, recalculation)
   * @param {boolean} [options.force=false] - Bypass duplicate check
   * @param {Function} [options.onEnd] - Callback when speech finishes
   * @param {Function} [options.onError] - Callback on error
   */
  speak(text, { priority = false, force = false, onEnd = null, onError = null } = {}) {
    if (!this.synth || !this.isEnabled) return;

    const cleaned = this.sanitizeText(text);
    if (!cleaned) return;

    const now = Date.now();
    // Prevent repeating the exact same message within 4 seconds unless forced or high priority
    if (!force && !priority && cleaned === this.lastSpokenText && now - this.lastSpokenTime < 4000) {
      return;
    }

    // Cancel current speech if priority or already speaking
    if (priority || this.synth.speaking) {
      this.cancel();
    }

    try {
      const utterance = new SpeechSynthesisUtterance(cleaned);
      if (this.voice) {
        utterance.voice = this.voice;
      }
      utterance.rate = 1.02; // Crisp, clear navigation cadence
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        this.isSpeaking = true;
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        if (onEnd) onEnd();
      };

      utterance.onerror = (event) => {
        this.isSpeaking = false;
        if (event.error !== 'canceled' && event.error !== 'interrupted') {
          console.warn('DURGA Speech synthesis notice:', event.error);
        }
        if (onError) onError(event);
      };

      this.lastSpokenText = cleaned;
      this.lastSpokenTime = now;
      this.synth.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis unavailable:', err);
      this.isSpeaking = false;
      if (onError) onError(err);
    }
  }

  cancel() {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {
        // Ignore
      }
    }
    this.isSpeaking = false;
  }

  stop() {
    this.cancel();
    this.lastSpokenText = '';
    this.lastSpokenTime = 0;
  }

  pause() {
    if (this.synth) {
      try {
        this.synth.pause();
      } catch {
        // Ignore
      }
    }
    this.isPaused = true;
    this.isSpeaking = false;
  }

  resume() {
    if (this.synth) {
      try {
        this.synth.resume();
      } catch {
        // Ignore
      }
    }
    this.isPaused = false;
  }

  setEnabled(enabled) {
    this.isEnabled = Boolean(enabled);
    if (!this.isEnabled) {
      this.cancel();
    }
  }
}

export const voiceNavigation = new VoiceNavigationService();
export default voiceNavigation;
