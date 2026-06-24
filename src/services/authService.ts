// src/services/authService.ts
// Handles Face ID, Touch ID, fingerprint, and PIN fallback.
// Nothing here touches the network — all local device security.

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

const PIN_KEY        = 'nepsis_pin_hash';
const SESSION_KEY    = 'nepsis_last_auth';
const TIMEOUT_SECS   = 60;            // re-lock after 60s in background

// ─── Biometric capability ────────────────────────────────────────────────────

export async function getBiometricCapability(): Promise<{
  available: boolean;
  type: 'face' | 'fingerprint' | 'none';
}> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return { available: false, type: 'none' };

  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!enrolled) return { available: false, type: 'none' };

  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

  const hasFace = types.includes(
    LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
  );
  const hasFingerprint = types.includes(
    LocalAuthentication.AuthenticationType.FINGERPRINT,
  );

  return {
    available: true,
    type: hasFace ? 'face' : hasFingerprint ? 'fingerprint' : 'none',
  };
}

// ─── Biometric authentication ─────────────────────────────────────────────────

export async function authenticateWithBiometrics(
  reason = 'Unlock Nepsis',
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Use PIN instead',
      disableDeviceFallback: false,   // allow device PIN/password as fallback
      fallbackLabel: 'Use PIN',
    });

    if (result.success) {
      await markSessionAuthenticated();
      return { success: true };
    }

    return {
      success: false,
      error: result.error === 'user_cancel' ? 'cancelled' : result.error,
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ─── PIN management ────────────────────────────────────────────────────────────

// SHA-256 hash of the PIN using expo-crypto (Hermes has no Web Crypto API).
async function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    pin + 'nepsis_salt_v1',
  );
}

export async function setPIN(pin: string): Promise<void> {
  const hash = await hashPin(pin);
  await SecureStore.setItemAsync(PIN_KEY, hash, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function verifyPIN(pin: string): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PIN_KEY);
  if (!stored) return false;
  const hash = await hashPin(pin);
  const match = hash === stored;
  if (match) await markSessionAuthenticated();
  return match;
}

export async function hasPINSet(): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PIN_KEY);
  return !!stored;
}

// ─── Session management ────────────────────────────────────────────────────────

export async function markSessionAuthenticated(): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, String(Date.now()));
}

export async function isSessionValid(): Promise<boolean> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return false;
  const last    = parseInt(raw, 10);
  const elapsed = (Date.now() - last) / 1000;
  return elapsed < TIMEOUT_SECS;
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

// ─── Full authentication flow ─────────────────────────────────────────────────
// Call this from the lock screen component. Tries biometrics first, falls back
// to PIN entry UI (caller must handle the PIN UI).

export async function attemptUnlock(): Promise<
  'success' | 'biometric_failed' | 'needs_pin' | 'no_auth_set'
> {
  const pinSet = await hasPINSet();
  if (!pinSet) return 'no_auth_set';

  const { available } = await getBiometricCapability();

  if (available) {
    const result = await authenticateWithBiometrics('Unlock Nepsis');
    if (result.success) return 'success';
    if (result.error === 'cancelled') return 'needs_pin';
    return 'biometric_failed';
  }

  return 'needs_pin';
}

// ─── Confession journal re-auth ───────────────────────────────────────────────
// The journal requires a fresh biometric/PIN challenge even within an active
// session — an extra layer of privacy for the most sensitive content.

export async function authenticateForJournal(): Promise<boolean> {
  const { available } = await getBiometricCapability();

  if (available) {
    const result = await authenticateWithBiometrics(
      'Authenticate to open your confession journal',
    );
    return result.success;
  }

  // Caller must show PIN screen if biometrics unavailable
  return false;
}
