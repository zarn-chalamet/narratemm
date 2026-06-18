import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Upload, Link as LinkIcon, Film, Check, ArrowRight, X, FileVideo, AlertCircle } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { uploadService } from '../services/uploadService';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

type UploadMethod = 'file' | 'youtube';

const YoutubeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

export const NewProjectPage: React.FC = () => {
  const navigate = useNavigate();
  const { createProject } = useProjectStore();

  const [uploadMethod, setUploadMethod] = useState<UploadMethod>('file');
  const [title, setTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const aspectRatios = [
    { value: '9:16', label: 'TikTok / Reels', desc: '9:16' },
    { value: '16:9', label: 'YouTube', desc: '16:9' },
    { value: '4:5', label: 'Instagram', desc: '4:5' },
    { value: '1:1', label: 'Square', desc: '1:1' },
  ];

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (file.size > 500 * 1024 * 1024) {
        setError('File size must be less than 500MB');
        return;
      }
      setUploadedFile(file);
      setError('');
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  }, [title]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm'] },
    maxFiles: 1,
  });

  const handleCreate = async () => {
    setError('');

    if (!title.trim()) { setError('Please enter a project title'); return; }
    if (uploadMethod === 'file' && !uploadedFile) { setError('Please upload a video file'); return; }
    if (uploadMethod === 'youtube' && !youtubeUrl) { setError('Please enter a YouTube URL'); return; }

    setIsCreating(true);
    try {
      // Step 1: Create project in backend
      const project = await createProject(title.trim(), aspectRatio);

      // Step 2: Upload file or submit YouTube URL
      if (uploadMethod === 'file' && uploadedFile) {
        await uploadService.uploadFile(project.id, uploadedFile);
      } else {
        await uploadService.uploadYoutube(project.id, youtubeUrl);
      }

      navigate(`/project/${project.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
      setIsCreating(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 lg:space-y-8 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Create New Project</h1>
        <p className="text-sm sm:text-base text-gray-400 mt-1">Upload a drama video or paste a YouTube URL</p>
      </div>

      <Card className="p-4 sm:p-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">Project Title</label>
        <Input placeholder="e.g., Drama Title - Episode 15 Recap" value={title} onChange={(e) => setTitle(e.target.value)} />
      </Card>

      <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
        <Card className={`p-4 sm:p-6 cursor-pointer transition-all ${uploadMethod === 'file' ? 'border-violet-500 bg-violet-500/5' : 'hover:border-gray-600'}`} onClick={() => setUploadMethod('file')}>
          <div className="flex items-start gap-3 sm:gap-4">
            <div className={`p-2.5 sm:p-3 rounded-xl flex-shrink-0 ${uploadMethod === 'file' ? 'bg-violet-500/20' : 'bg-gray-800'}`}>
              <Upload className={`w-5 h-5 sm:w-6 sm:h-6 ${uploadMethod === 'file' ? 'text-violet-400' : 'text-gray-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-white text-sm sm:text-base">Upload File</h3>
                {uploadMethod === 'file' && <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0"><Check className="w-3 h-3 text-white" /></div>}
              </div>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">MP4, MOV, AVI up to 500MB</p>
            </div>
          </div>
        </Card>

        <Card className={`p-4 sm:p-6 cursor-pointer transition-all ${uploadMethod === 'youtube' ? 'border-violet-500 bg-violet-500/5' : 'hover:border-gray-600'}`} onClick={() => setUploadMethod('youtube')}>
          <div className="flex items-start gap-3 sm:gap-4">
            <div className={`p-2.5 sm:p-3 rounded-xl flex-shrink-0 ${uploadMethod === 'youtube' ? 'bg-red-500/20' : 'bg-gray-800'}`}>
              <YoutubeIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${uploadMethod === 'youtube' ? 'text-red-400' : 'text-gray-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-white text-sm sm:text-base">YouTube URL</h3>
                {uploadMethod === 'youtube' && <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0"><Check className="w-3 h-3 text-white" /></div>}
              </div>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">Paste any YouTube video link</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4 sm:p-6">
        {uploadMethod === 'file' ? (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3 sm:mb-4">Video File</label>
            {uploadedFile ? (
              <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-[#1a1a24] rounded-xl border border-[#2a2a3e]">
                <div className="p-2.5 sm:p-3 rounded-xl bg-violet-500/20 flex-shrink-0">
                  <FileVideo className="w-5 h-5 sm:w-6 sm:h-6 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate text-sm sm:text-base">{uploadedFile.name}</p>
                  <p className="text-xs sm:text-sm text-gray-400">{formatFileSize(uploadedFile.size)}</p>
                </div>
                <button onClick={() => setUploadedFile(null)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div {...getRootProps()} className={`relative border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all ${isDragActive ? 'border-violet-500 bg-violet-500/10' : 'border-[#2a2a3e] hover:border-violet-500/50 hover:bg-violet-500/5'}`}>
                <input {...getInputProps()} />
                <div className="flex flex-col items-center">
                  <div className={`p-3 sm:p-4 rounded-2xl mb-3 sm:mb-4 ${isDragActive ? 'bg-violet-500/20' : 'bg-[#1a1a24]'}`}>
                    <Film className={`w-7 h-7 sm:w-8 sm:h-8 ${isDragActive ? 'text-violet-400' : 'text-gray-500'}`} />
                  </div>
                  <p className="text-white font-medium mb-1 text-sm sm:text-base">{isDragActive ? 'Drop your video here' : 'Drag and drop your video'}</p>
                  <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">or click to browse files</p>
                  <p className="text-[10px] sm:text-xs text-gray-600">MP4, MOV, AVI, MKV, WebM • Max 500MB</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3 sm:mb-4">YouTube URL</label>
            <Input placeholder="https://www.youtube.com/watch?v=..." value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} leftIcon={<LinkIcon className="w-5 h-5" />} />
            <p className="text-xs text-gray-500 mt-2">We'll extract captions automatically using Supadata API</p>
          </div>
        )}
      </Card>

      <Card className="p-4 sm:p-6">
        <label className="block text-sm font-medium text-gray-300 mb-3 sm:mb-4">Output Format</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {aspectRatios.map((ratio) => (
            <button key={ratio.value} onClick={() => setAspectRatio(ratio.value)}
              className={`p-3 sm:p-4 rounded-xl border text-left transition-all ${aspectRatio === ratio.value ? 'border-violet-500 bg-violet-500/10' : 'border-[#2a2a3e] hover:border-gray-600 bg-[#1a1a24]'}`}>
              <div className="flex items-center gap-2 mb-1 sm:mb-2">
                <div className={`border-2 rounded flex items-center justify-center ${aspectRatio === ratio.value ? 'border-violet-400 bg-violet-400/10' : 'border-gray-600'}`}
                  style={{ width: ratio.value === '9:16' ? '14px' : '24px', height: ratio.value === '9:16' ? '24px' : ratio.value === '1:1' ? '24px' : ratio.value === '4:5' ? '20px' : '14px' }}>
                  {aspectRatio === ratio.value && <Check className="w-2.5 h-2.5 text-violet-400" />}
                </div>
                <span className={`text-xs font-medium ${aspectRatio === ratio.value ? 'text-violet-400' : 'text-gray-500'}`}>{ratio.desc}</span>
              </div>
              <p className={`font-medium text-sm ${aspectRatio === ratio.value ? 'text-violet-400' : 'text-white'}`}>{ratio.label}</p>
            </button>
          ))}
        </div>
      </Card>

      {error && (
        <div className="flex items-center gap-2 p-3 sm:p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} disabled={isCreating}>Cancel</Button>
        <Button onClick={handleCreate} isLoading={isCreating} rightIcon={<ArrowRight className="w-4 h-4" />}>
          {isCreating ? 'Creating...' : 'Create Project'}
        </Button>
      </div>
    </div>
  );
};
