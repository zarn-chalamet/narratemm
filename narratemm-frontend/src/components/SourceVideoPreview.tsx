import React from 'react';
import { Loader2, VideoOff } from 'lucide-react';
import { useSourceVideo } from '../components/hooks/userSourceVideo';

interface Props {
  projectId: string;
  isYoutube?: boolean;
}

export const SourceVideoPreview: React.FC<Props> = ({ projectId, isYoutube }) => {
  const { sourceUrl, state } = useSourceVideo(projectId);

  if (state === 'loading') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
        <div className="flex flex-col items-center gap-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-xs">Loading preview...</span>
        </div>
      </div>
    );
  }

  if (state === 'not-ready') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
        <div className="flex flex-col items-center gap-2 text-center px-4">
          <VideoOff className="w-6 h-6 text-gray-600" />
          <p className="text-xs text-gray-500">
            {isYoutube
              ? 'Downloading from YouTube...\nPreview will appear shortly'
              : 'No video preview available'}
          </p>
        </div>
      </div>
    );
  }

  if (state === 'ready' && sourceUrl) {
    return (
      <video
        src={sourceUrl}
        className="absolute inset-0 w-full h-full object-cover"
        muted
        loop
        autoPlay
        playsInline
      />
    );
  }

  return null; // error state - gradient background shows through
};