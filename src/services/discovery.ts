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
  // Dynamically import to avoid issues on web/electron
  const Zeroconf = require('react-native-zeroconf').default;
  const zeroconf = new Zeroconf();
  
  const discoveredDevices = new Map<string, DiscoveredDevice>();
  let deviceFoundCallback: DeviceCallback | null = null;
  let deviceLostCallback: DeviceLostCallback | null = null;

  zeroconf.on('resolved', (service: any) => {
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
    discoveredDevices.delete(name);
    deviceLostCallback?.({ name });
  });

  return {
    startDiscovery: () => {
      zeroconf.scan('esphomelib', 'tcp', 'local.');
    },
    stopDiscovery: () => {
      zeroconf.stop();
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
      zeroconf.removeAllListeners();
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
