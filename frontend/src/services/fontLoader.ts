/**
 * Custom Font Loading Service with Extended Timeout
 * Addresses the 6000ms timeout issue from expo-font's web loader
 * Extended to 37000ms for slow network conditions
 */
import * as Font from 'expo-font';
import { Platform } from 'react-native';

const FONT_LOADING_TIMEOUT = 37000; // 37 seconds

interface FontMap {
  [key: string]: any;
}

/**
 * Load fonts with extended timeout
 * Uses a race between font loading and timeout
 */
export const loadFontsWithTimeout = async (fonts: FontMap): Promise<boolean> => {
  return new Promise((resolve) => {
    // Timeout handler
    const timeoutId = setTimeout(() => {
      console.warn('[FontLoader] Font loading timeout after 37s - continuing without custom fonts');
      resolve(false);
    }, FONT_LOADING_TIMEOUT);

    // Attempt to load fonts
    Font.loadAsync(fonts)
      .then(() => {
        clearTimeout(timeoutId);
        console.log('[FontLoader] Fonts loaded successfully');
        resolve(true);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        console.warn('[FontLoader] Font loading failed:', error);
        resolve(false);
      });
  });
};

/**
 * Preload system fonts check
 * For web, this helps warm up the font loading system
 */
export const preloadFonts = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    // On web, we can use document.fonts API if available
    if (typeof document !== 'undefined' && document.fonts) {
      try {
        await Promise.race([
          document.fonts.ready,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Font ready timeout')), FONT_LOADING_TIMEOUT)
          )
        ]);
        console.log('[FontLoader] Document fonts ready');
      } catch (error) {
        console.warn('[FontLoader] Document fonts ready timeout');
      }
    }
  }
};

export default {
  loadFontsWithTimeout,
  preloadFonts,
  FONT_LOADING_TIMEOUT,
};
