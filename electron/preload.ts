import { contextBridge } from 'electron';

// Expose safe desktop environment details to renderer if needed
contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  platform: process.platform,
});
