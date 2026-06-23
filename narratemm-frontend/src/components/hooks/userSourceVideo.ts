import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';

export type SourceVideoState = 'loading' | 'ready' | 'not-ready' | 'error';

export const useSourceVideo = (projectId: string | null) => {

  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [state, setState] = useState<SourceVideoState>(
    projectId ? 'loading' : 'not-ready'
  );
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;

    const load = async () => {
      // Cleanup previous blob URL
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }

      setState('loading');
      setSourceUrl(null);

      try {
        const response = await api.get(`/export/source/${projectId}`, {
          responseType: 'blob',
          validateStatus: (status) => status < 500,
        });

        if (cancelled) return;

        if (response.status === 204 || response.status === 404) {
          setState('not-ready');
          return;
        }

        if (response.status === 200) {
          const blob = new Blob([response.data], { type: 'video/mp4' });
          if (blob.size < 1024) {
            setState('not-ready');
            return;
          }
          const url = URL.createObjectURL(blob);
          blobUrlRef.current = url;
          setSourceUrl(url);
          setState('ready');
          return;
        }

        setState('error');
      } catch {
        if (!cancelled) setState('error');
      }
    };

    load();

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [projectId]);

  return { sourceUrl, state };
};