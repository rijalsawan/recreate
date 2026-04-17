import { z } from 'zod';

export type ToolCategory = 'generate' | 'edit' | 'tool';

export interface ToolConfig {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name or svg import
  route: string;
  category: ToolCategory;
  supportedModels: string[];
  creditsPerGeneration: number;
  supportsPrompt: boolean;
  supportsFileUpload: boolean;
  supportsMask: boolean;
}

export type GenerationResponse = {
  id: string;
  url: string;
  creditsUsed: number;
  timestamp: string;
};
