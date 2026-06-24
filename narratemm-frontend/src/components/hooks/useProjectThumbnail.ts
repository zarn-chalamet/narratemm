import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';

export const useProjectThumbnail = (projectId: string) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;

    const load = async () => {
      try {
        const response = await api.get(`/projects/${projectId}/thumbnail`, {
          responseType: 'blob',
          validateStatus: (s) => s < 500,
        });

        if (cancelled) return;

        if (response.status === 200 && response.data?.size > 100) {
          const blob = new Blob([response.data], { type: 'image/jpeg' });
          const url = URL.createObjectURL(blob);
          blobUrlRef.current = url;
          setThumbnailUrl(url);
        }
      } catch { /* fail silently */ }
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

  return thumbnailUrl;
};