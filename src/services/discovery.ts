import { Platform } from 'react-native';
import { isElectron, getElectronAPI, DiscoveredDevice } from './electron';

type DeviceCallback = (device: DiscoveredDevice) => void;
type DeviceLostCallback = (device: { name: string }) => void;

interface DiscoveryService {
  startDiscovery: () => void;
  stopDiscovery: () => void;
  getDiscoveredDevices: () => Promise<DiscoveredDevice[]>;
  onDeviceFound: (callback: DeviceCallback) => void;
  onDeviceLost: (callback: DeviceLostCallback) => void;
  removeListeners: () => void;
}

// Mobile discovery using react-native-zeroconf
function createMobileDiscovery(): DiscoveryService {
  let zeroconf: any = null;
  const discoveredDevices = new Map<string, DiscoveredDevice>();
  let deviceFoundCallback: DeviceCallback | null = null;
  let deviceLostCallback: DeviceLostCallback | null = null;

  try {
    // Dynamically import to avoid issues on web/electron
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
    getDiscoveredDevices: async () => {
      return Array.from(discoveredDevices.values());
    },
    onDeviceFound: (callback) => {
      deviceFoundCallback = callback;
    },
    onDeviceLost: (callback) => {
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

// Electron discovery using preload bridge
function createElectronDiscovery(): DiscoveryService {
  const api = getElectronAPI()!;
  
  return {
    startDiscovery: () => {
      api.startDiscovery();
    },
    stopDiscovery: () => {
      api.stopDiscovery();
    },
    getDiscoveredDevices: () => {
      return api.getDiscoveredDevices();
    },
    onDeviceFound: (callback) => {
      api.onDeviceFound(callback);
    },
    onDeviceLost: (callback) => {
      api.onDeviceLost(callback);
    },
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
    discoveryInstance = createElectronDiscovery();
  } else if (Platform.OS === 'android' || Platform.OS === 'ios') {
    discoveryInstance = createMobileDiscovery();
  } else {
    discoveryInstance = createNoopDiscovery();
  }

  return discoveryInstance;
}

export function isDiscoverySupported(): boolean {
  return isElectron() || Platform.OS === 'android' || Platform.OS === 'ios';
}
