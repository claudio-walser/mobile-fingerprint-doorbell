const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // mDNS discovery
  getDiscoveredDevices: () => ipcRenderer.invoke('mdns:get-devices'),
  startDiscovery: () => ipcRenderer.invoke('mdns:start-discovery'),
  stopDiscovery: () => ipcRenderer.invoke('mdns:stop-discovery'),
  
  // Event listeners for real-time discovery updates
  onDeviceFound: (callback) => {
    ipcRenderer.on('mdns:device-found', (event, device) => callback(device));
  },
  onDeviceLost: (callback) => {
    ipcRenderer.on('mdns:device-lost', (event, device) => callback(device));
  },
  
  // Remove listeners
  removeDeviceFoundListener: () => {
    ipcRenderer.removeAllListeners('mdns:device-found');
  },
  removeDeviceLostListener: () => {
    ipcRenderer.removeAllListeners('mdns:device-lost');
  },
  
  // Platform detection
  isElectron: true,
});
