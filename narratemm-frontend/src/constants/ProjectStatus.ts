export interface StatusStyle {
  label: string;
  color: string;
  bg: string;
  dot: string;
}

export const STATUS_STYLES: Record<string, StatusStyle> = {
  draft:        { label: 'Draft',            color: 'text-gray-400',   bg: 'bg-gray-500/10',   dot: 'bg-gray-400'   },
  transcribing: { label: 'Transcribing',     color: 'text-blue-400',   bg: 'bg-blue-500/10',   dot: 'bg-blue-400'   },
  scripting:    { label: 'Writing Script',   color: 'text-purple-400', bg: 'bg-purple-500/10', dot: 'bg-purple-400' },
  voiceover:    { label: 'Generating Voice', color: 'text-pink-400',   bg: 'bg-pink-500/10',   dot: 'bg-pink-400'   },
  editing:      { label: 'Editing',          color: 'text-orange-400', bg: 'bg-orange-500/10', dot: 'bg-orange-400' },
  exporting:    { label: 'Exporting',        color: 'text-yellow-400', bg: 'bg-yellow-500/10', dot: 'bg-yellow-400' },
  done:         { label: 'Completed',        color: 'text-green-400',  bg: 'bg-green-500/10',  dot: 'bg-green-400'  },
  failed:       { label: 'Failed',           color: 'text-red-400',    bg: 'bg-red-500/10',    dot: 'bg-red-400'    },
};

export const STATUS_OPTIONS = [
  { value: 'all',          label: 'All Status'   },
  { value: 'done',         label: 'Completed'    },
  { value: 'exporting',    label: 'Exporting'    },
  { value: 'voiceover',    label: 'Voice-over'   },
  { value: 'scripting',    label: 'Scripting'    },
  { value: 'transcribing', label: 'Transcribing' },
  { value: 'editing',      label: 'Editing'      },
  { value: 'draft',        label: 'Draft'        },
  { value: 'failed',       label: 'Failed'       },
] as const;

export const getStatusStyle = (status: string): StatusStyle =>
  STATUS_STYLES[status] ?? STATUS_STYLES.draft;