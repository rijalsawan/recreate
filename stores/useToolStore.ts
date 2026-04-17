import { create } from 'zustand';

interface ToolState {
  activeToolId: string;
  setActiveTool: (toolId: string) => void;
  // Shared generation config state
  model: string;
  setModel: (model: string) => void;
  size: string;
  setSize: (size: string) => void;
  style: string;
  setStyle: (style: string) => void;
}

export const useToolStore = create<ToolState>((set) => ({
  activeToolId: 'generate',
  setActiveTool: (activeToolId) => set({ activeToolId }),
  
  model: 'recraftv4',
  setModel: (model) => set({ model }),
  
  size: '1024x1024',
  setSize: (size) => set({ size }),
  
  style: 'any',
  setStyle: (style) => set({ style }),
}));
