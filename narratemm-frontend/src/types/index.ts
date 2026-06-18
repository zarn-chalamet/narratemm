export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: 'google' | 'facebook' | 'email';
  role?: string;
  createdAt: Date | string;
}

export interface Project {
  id: string;
  userId?: string;
  title: string;
  status: 'draft' | 'transcribing' | 'scripting' | 'voiceover' | 'editing' | 'exporting' | 'done' | 'failed';
  thumbnail?: string;
  videoPath?: string;
  youtubeUrl?: string;
  aspectRatio: '9:16' | '16:9' | '4:5' | '1:1';
  durationSeconds?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Transcript {
  id: string;
  projectId: string;
  rawText: string;
  srtContent: string;
  language: string;
  source: 'groq' | 'supadata';
}

export interface Script {
  id: string;
  projectId: string;
  content: string;
  style: 'dramatic' | 'casual' | 'spoiler' | 'hype';
  language: 'myanmar' | 'english' | 'both';
  segments: ScriptSegment[];
}

export interface ScriptSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

export interface VoiceOver {
  id: string;
  projectId: string;
  audioPath: string;
  voiceName: 'Aoede' | 'Puck' | 'Charon' | 'Kore';
  stylePrompt: string;
  speed: number;
  durationSeconds: number;
}

export interface ExportSettings {
  aspectRatio: '9:16' | '16:9' | '4:5' | '1:1';
  logoPath?: string;
  logoPosition: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  logoSize: number;
  logoOpacity: number;
  subtitleEnabled: boolean;
  subtitleFont: string;
  subtitleSize: number;
  audioMix: number; // 0 = all original, 100 = all voiceover
}

export interface ExportJob {
  id: string;
  projectId: string;
  status: 'queued' | 'processing' | 'done' | 'failed';
  progress: number;
  outputPath?: string;
  errorMessage?: string;
}
