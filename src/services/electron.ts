export interface DiscoveredDevice {
  name: string;
  host: string;
  ip: string;
  port: number;
  txt: Record<string, string>;
}

interface ElectronAPI {
  getDiscoveredDevices: () => Promise<DiscoveredDevice[]>;
  startDiscovery: () => Promise<boolean>;
  stopDiscovery: () => Promise<boolean>;
  onDeviceFound: (callback: (device: DiscoveredDevice) => void) => void;
  onDeviceLost: (callback: (device: { name: string }) => void) => void;
  removeDeviceFoundListener: () => void;
  removeDeviceLostListener: () => void;
  isElectron: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
}

export function getElectronAPI(): ElectronAPI | null {
  if (isElectron()) {
    return window.electronAPI!;
  }
  return null;
}
