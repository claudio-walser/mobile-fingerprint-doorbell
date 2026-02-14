import { Platform } from 'react-native';
import { isElectron, getElectronAPI, DiscoveredDevice } from './electron';

type DeviceCallback = (device: DiscoveredDevice) => void;
type DeviceLostCallback = (device: { name: string }) => void;

// Raw discovery service - platform-specific, no validation
interface RawDiscoveryService {
  startDiscovery: () => void;
  stopDiscovery: () => void;
  getRawDevices: () => Promise<DiscoveredDevice[]>;
  onRawDeviceFound: (callback: DeviceCallback) => void;
  onRawDeviceLost: (callback: DeviceLostCallback) => void;
  removeListeners: () => void;
}

// Public discovery service - with validation
interface DiscoveryService {
  startDiscovery: () => void;
  stopDiscovery: () => void;
  getDiscoveredDevices: () => Promise<DiscoveredDevice[]>;
  onDeviceFound: (callback: DeviceCallback) => void;
  onDeviceLost: (callback: DeviceLostCallback) => void;
  removeListeners: () => void;
}

// Validate if a device is a fingerprint doorbell by checking the /fingerprint/status endpoint
async function isFingerprintDoorbell(ip: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`http://${ip}/fingerprint/status`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    // Any response other than 404 indicates the endpoint exists (fingerprint doorbell)
    // 200 = valid, 401/403 = auth required, 405 = method not allowed
    return response.status !== 404;
  } catch (error) {
    console.log('[Discovery] Device validation failed:', ip, error);
    return false;
  }
}

// Wrap a raw discovery service with validation logic
function createValidatingDiscovery(raw: RawDiscoveryService): DiscoveryService {
  const validatedDevices = new Map<string, DiscoveredDevice>();
  let deviceFoundCallback: DeviceCallback | null = null;
  let deviceLostCallback: DeviceLostCallback | null = null;

  raw.onRawDeviceFound(async (device: DiscoveredDevice) => {
    console.log('[Discovery] Raw device found:', device.name, device.ip);
    const isValid = await isFingerprintDoorbell(device.ip);
    if (isValid) {
      console.log('[Discovery] Validated fingerprint doorbell:', device.name);
      validatedDevices.set(device.name, device);
      deviceFoundCallback?.(device);
    } else {
      console.log('[Discovery] Not a fingerprint doorbell:', device.name);
    }
  });

  raw.onRawDeviceLost((device: { name: string }) => {
    console.log('[Discovery] Raw device lost:', device.name);
    if (validatedDevices.has(device.name)) {
      validatedDevices.delete(device.name);
      deviceLostCallback?.(device);
    }
  });

  return {
    startDiscovery: () => raw.startDiscovery(),
    stopDiscovery: () => raw.stopDiscovery(),
    getDiscoveredDevices: async () => Array.from(validatedDevices.values()),
    onDeviceFound: (callback) => { deviceFoundCallback = callback; },
    onDeviceLost: (callback) => { deviceLostCallback = callback; },
    removeListeners: () => {
      deviceFoundCallback = null;
      deviceLostCallback = null;
      raw.removeListeners();
    },
  };
}

// Mobile discovery using react-native-zeroconf (raw devices, no validation)
function createMobileDiscovery(): RawDiscoveryService {
  let zeroconf: any = null;
  const discoveredDevices = new Map<string, DiscoveredDevice>();
  let deviceFoundCallback: DeviceCallback | null = null;
  let deviceLostCallback: DeviceLostCallback | null = null;

  try {
    const Zeroconf = require('react-native-zeroconf').default;
    zeroconf = new Zeroconf();

    zeroconf.on('resolved', (service: any) => {
      console.log('[Discovery] Resolved service:', service.name, service.addresses);
      const device: DiscoveredDevice = {
        name: service.name,
        host: service.host,
        ip: service.addresses?.[0] || service.host,
        port: service.port,
        txt: service.txt || {},
      };
      discoveredDevices.set(service.name, device);
      deviceFoundCallback?.(device);
    });

    zeroconf.on('removed', (name: string) => {
      console.log('[Discovery] Service removed:', name);
      discoveredDevices.delete(name);
      deviceLostCallback?.({ name });
    });

    zeroconf.on('error', (error: any) => {
      console.error('[Discovery] Error:', error);
    });

    zeroconf.on('start', () => {
      console.log('[Discovery] Scan started');
    });

    zeroconf.on('stop', () => {
      console.log('[Discovery] Scan stopped');
    });

    zeroconf.on('found', (name: string) => {
      console.log('[Discovery] Found service (not yet resolved):', name);
    });
  } catch (error) {
    console.error('[Discovery] Failed to initialize Zeroconf:', error);
  }

  return {
    startDiscovery: () => {
      if (!zeroconf) {
        console.error('[Discovery] Zeroconf not initialized');
        return;
      }
      console.log('[Discovery] Starting scan for esphomelib._tcp');
      zeroconf.scan('esphomelib', 'tcp', 'local.');
    },
    stopDiscovery: () => {
      if (zeroconf) {
        zeroconf.stop();
      }
    },
    getRawDevices: async () => {
      return Array.from(discoveredDevices.values());
    },
    onRawDeviceFound: (callback) => {
      deviceFoundCallback = callback;
    },
    onRawDeviceLost: (callback) => {
      deviceLostCallback = callback;
    },
    removeListeners: () => {
      deviceFoundCallback = null;
      deviceLostCallback = null;
      if (zeroconf) {
        zeroconf.removeAllListeners();
      }
    },
  };
}

// Electron discovery using preload bridge (raw devices, no validation)
function createElectronDiscovery(): RawDiscoveryService {
  const api = getElectronAPI()!;

  return {
    startDiscovery: () => api.startDiscovery(),
    stopDiscovery: () => api.stopDiscovery(),
    getRawDevices: () => api.getDiscoveredDevices(),
    onRawDeviceFound: (callback) => api.onDeviceFound(callback),
    onRawDeviceLost: (callback) => api.onDeviceLost(callback),
    removeListeners: () => {
      api.removeDeviceFoundListener();
      api.removeDeviceLostListener();
    },
  };
}

// No-op discovery for web (non-electron)
function createNoopDiscovery(): DiscoveryService {
  return {
    startDiscovery: () => {},
    stopDiscovery: () => {},
    getDiscoveredDevices: async () => [],
    onDeviceFound: () => {},
    onDeviceLost: () => {},
    removeListeners: () => {},
  };
}

let discoveryInstance: DiscoveryService | null = null;

export function getDiscoveryService(): DiscoveryService {
  if (discoveryInstance) {
    return discoveryInstance;
  }

  if (isElectron()) {
    discoveryInstance = createValidatingDiscovery(createElectronDiscovery());
  } else if (Platform.OS === 'android' || Platform.OS === 'ios') {
    discoveryInstance = createValidatingDiscovery(createMobileDiscovery());
  } else {
    discoveryInstance = createNoopDiscovery();
  }

  return discoveryInstance;
}

export function isDiscoverySupported(): boolean {
  return isElectron() || Platform.OS === 'android' || Platform.OS === 'ios';
}
