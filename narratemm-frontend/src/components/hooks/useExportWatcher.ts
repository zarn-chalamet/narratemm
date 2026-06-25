import { useEffect } from 'react';
import { exportService } from '../../services/exportService';
import { useNotificationStore, showBrowserNotification } from '../../store/notificationStore';

// Track active polling intervals globally (survives component unmount)
const activePolls: Record<string, ReturnType<typeof setInterval>> = {};

/**
 * Start watching an export job in the background.
 * Call this once when export starts — it keeps polling even if user navigates away.
 */
export function startExportWatcher(
  jobId: string,
  projectId: string,
  projectTitle: string
) {
  // Don't double-poll
  if (activePolls[jobId]) return;

  const store = useNotificationStore.getState();

  // Add notification immediately (shows in bell)
  store.addNotification({
    id: jobId, // use jobId as the notification id
    type: 'export-progress',
    title: 'Rendering Video',
    message: `"${projectTitle}" — Starting...`,
    link: `/project/${projectId}`,
    metadata: { jobId, projectId, projectTitle, progress: 0 },
    persistent: true,
  });

  // Poll every 3 seconds
  const interval = setInterval(async () => {
    try {
      const status = await exportService.getStatus(jobId);
      const currentStore = useNotificationStore.getState();

      if (status.status === 'processing') {
        currentStore.updateNotification(jobId, {
          message: `"${projectTitle}" — ${status.progress}% complete`,
          metadata: { jobId, projectId, projectTitle, progress: status.progress },
        });
      } else if (status.status === 'done') {
        currentStore.updateNotification(jobId, {
          type: 'export-done',
          title: 'Export Complete',
          message: `"${projectTitle}" is ready to download`,
          metadata: { jobId, projectId, projectTitle, progress: 100 },
          read: false,
        });
        showBrowserNotification('✅ Export Complete!', `"${projectTitle}" is ready.`);
        stopExportWatcher(jobId);
      } else if (status.status === 'failed') {
        currentStore.updateNotification(jobId, {
          type: 'export-failed',
          title: 'Export Failed',
          message: status.errorMessage || `"${projectTitle}" — Unknown error`,
          read: false,
        });
        showBrowserNotification('❌ Export Failed', `"${projectTitle}" failed.`);
        stopExportWatcher(jobId);
      }
    } catch (err) {
      console.error('Export polling error:', err);
    }
  }, 3000);

  activePolls[jobId] = interval;
}

export function stopExportWatcher(jobId: string) {
  if (activePolls[jobId]) {
    clearInterval(activePolls[jobId]);
    delete activePolls[jobId];
  }
}

/**
 * Resume all in-progress exports after page reload.
 * Call this once on app startup.
 */
export function resumeActiveExports() {
  const store = useNotificationStore.getState();
  const inProgress = store.getByType('export-progress');

  inProgress.forEach((notif) => {
    const { jobId, projectId, projectTitle } = notif.metadata || {};
    if (jobId && projectId) {
      startExportWatcher(jobId, projectId, projectTitle || 'Untitled');
    }
  });
}

/**
 * Hook: Subscribe to live updates for a specific export job.
 * Use this in Step6Export to get reactive status updates.
 */
export function useExportStatus(jobId: string | undefined) {
  return useNotificationStore((s) =>
    jobId ? s.notifications[jobId] : null
  );
}