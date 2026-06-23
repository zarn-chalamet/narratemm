import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ArrowRight, Check, Upload, FileText, Mic, Scissors, Download,
  Play, Pause, RefreshCw, Loader2, Sparkles, Volume2, Image as ImageIcon,
  Type, Sliders, Wand2
} from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { transcriptService } from '../services/transcriptService';
import { scriptService } from '../services/scriptService';
import { voiceService } from '../services/voiceService';
import { exportService, type ExportSettings } from '../services/exportService';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const steps = [
  { id: 1, name: 'Upload', icon: Upload, description: 'Video uploaded' },
  { id: 2, name: 'Transcribe', icon: FileText, description: 'Generate transcript' },
  { id: 3, name: 'Script', icon: Sparkles, description: 'AI writes recap' },
  { id: 4, name: 'Voice-over', icon: Mic, description: 'Generate narration' },
  { id: 5, name: 'Edit', icon: Scissors, description: 'Customize video' },
  { id: 6, name: 'Export', icon: Download, description: 'Download final' },
];

export const ProjectPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects } = useProjectStore();
  const [currentStep, setCurrentStepState] = useState(1);
  const [transcript, setTranscript] = useState<any>(null);
  const [script, setScript] = useState<any>(null);
  const [voiceOver, setVoiceOver] = useState<any>(null);
  const [exportSettings, setExportSettings] = useState<any>({ 
    aspectRatio: '9:16', 
    logoPosition: 'bottom-right', 
    logoX: 0.95,
    logoY: 0.95,
    logoSize: 100, 
    logoOpacity: 80, 
    subtitleEnabled: true, 
    subtitleFont: 'Noto Serif Myanmar', 
    subtitleSize: 56, 
    audioMix: 70, 
    subtitleLanguage: 'burmese',
    subtitleX: 0.5,
    subtitleY: 0.85,
    subtitleWidth: 80,
    subtitleFontColor: '#FFFFFF',
    subtitleBgColor: '#CC000000',
    subtitleBorderStyle: 'outline',
    subtitleOutlineColor: '#000000',
    subtitleOutlineWidth: 2,
  });
  const [exportJob, setExportJob] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const setCurrentStep = (s: number) => setCurrentStepState(s);
  const nextStep = () => setCurrentStepState((s) => Math.min(s + 1, 6));
  const prevStep = () => setCurrentStepState((s) => Math.max(s - 1, 1));
  const updateExportProgress = (p: number) => setExportJob((job: any) => job ? { ...job, progress: p } : job);
  
  const project = projects.find((p: any) => p.id === id);

  useEffect(() => {
    if (!project) navigate('/dashboard');
  }, [project, navigate]);

  if (!project) return null;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return <Step1Upload project={project} onNext={nextStep} />;
      case 2: return (
        <Step2Transcribe 
          project={project} transcript={transcript} setTranscript={setTranscript}
          isProcessing={isProcessing} setIsProcessing={setIsProcessing} onNext={nextStep}
        />
      );
      case 3: return (
        <Step3Script 
          project={project} script={script} setScript={setScript}
          isProcessing={isProcessing} setIsProcessing={setIsProcessing} onNext={nextStep}
        />
      );
      case 4: return (
        <Step4VoiceOver 
          project={project} voiceOver={voiceOver} setVoiceOver={setVoiceOver}
          isProcessing={isProcessing} setIsProcessing={setIsProcessing} onNext={nextStep}
        />
      );
      case 5: return (
        <Step5Edit 
          exportSettings={exportSettings} setExportSettings={setExportSettings}
          onNext={nextStep} projectId={project.id} script={script}
        />
      );
      case 6: return (
        <Step6Export 
          project={project} exportSettings={exportSettings}
          exportJob={exportJob} setExportJob={setExportJob}
          updateProgress={updateExportProgress}
        />
      );
      default: return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">{project.title}</h1>
          <p className="text-sm text-gray-400">Step {currentStep} of 6</p>
        </div>
      </div>

      <div className="relative">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
                  disabled={step.id > currentStep}
                  className={`flex flex-col items-center gap-2 z-10 group ${
                    step.id <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                    isActive 
                      ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30 scale-110' 
                      : isCompleted
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-[#1a1a24] text-gray-500 border border-[#2a2a3e]'
                  } ${step.id <= currentStep && !isActive ? 'group-hover:border-violet-500/50' : ''}`}>
                    {isCompleted ? <Check className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${
                    isActive ? 'text-violet-400' : isCompleted ? 'text-green-400' : 'text-gray-500'
                  }`}>{step.name}</span>
                </button>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    currentStep > step.id ? 'bg-green-500/50' : 'bg-[#2a2a3e]'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <Card className="p-6 sm:p-8">{renderStepContent()}</Card>

      {currentStep < 6 && (
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={prevStep} disabled={currentStep === 1}
            leftIcon={<ArrowLeft className="w-4 h-4" />}>Previous</Button>
          <div className="text-sm text-gray-500">{steps[currentStep - 1].description}</div>
          <Button onClick={nextStep} disabled={isProcessing}
            rightIcon={<ArrowRight className="w-4 h-4" />}>
            {currentStep === 5 ? 'Start Export' : 'Next Step'}
          </Button>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// STEP 1: UPLOAD
// ─────────────────────────────────────────────────────────────────────────
const Step1Upload: React.FC<{ project: any; onNext: () => void }> = ({ project }) => {
  // File uploads: videoPath already set → immediately ready
  const [videoReady, setVideoReady] = useState(!!project.videoPath);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {

    if (project.videoPath || !project.youtubeUrl) return;

    const check = async () => {
      try {
        const response = await api.get(`/export/source/${project.id}`, {
          responseType: 'blob',
          validateStatus: (s) => s < 500,
        });

        if (response.status === 200 && response.data?.size > 1024) {
          setVideoReady(true);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch { /* keep polling */ }
    };

    check();
    pollRef.current = setInterval(check, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [project.id, project.videoPath, project.youtubeUrl]);

  return (
    <div className="text-center py-8">
      <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center ${
        videoReady ? 'bg-green-500/20' : 'bg-blue-500/20'
      }`}>
        {videoReady
          ? <Check className="w-10 h-10 text-green-400" />
          : <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
        }
      </div>

      <h2 className="text-xl font-bold text-white mb-2">
        {videoReady ? 'Video Ready' : 'Preparing Video...'}
      </h2>

      <p className="text-gray-400 mb-6">
        {project.youtubeUrl
          ? `YouTube: ${project.youtubeUrl}`
          : 'File uploaded successfully'}
      </p>

      {/* Show downloading status for YouTube */}
      {project.youtubeUrl && !videoReady && (
        <div className="max-w-sm mx-auto mb-6 p-4 bg-[#1a1a24] rounded-xl border border-[#2a2a3e]">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-violet-400 animate-spin flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm text-white font-medium">Downloading from YouTube</p>
              <p className="text-xs text-gray-400 mt-0.5">This may take 1–2 minutes...</p>
            </div>
          </div>
        </div>
      )}

      {videoReady && (
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a24] rounded-lg">
          <Check className="w-4 h-4 text-green-400" />
          <span className="text-sm text-gray-400">Format:</span>
          <span className="text-sm text-white font-medium">{project.aspectRatio}</span>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// STEP 2: TRANSCRIBE
// ─────────────────────────────────────────────────────────────────────────
const Step2Transcribe: React.FC<any> = ({ project, transcript, setTranscript, isProcessing, setIsProcessing }) => {
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadExisting = async () => {
      if (transcript || !project?.id) return;
      try {
        const existing = await transcriptService.get(project.id);
        if (existing) setTranscript(existing);
      } catch (err) {}
    };
    loadExisting();
  }, [project?.id]);

  const handleTranscribe = async () => {
    setIsProcessing(true);
    setError(null);
    setProgress(0);
    const progressInterval = setInterval(() => {
      setProgress((p) => (p < 90 ? p + 2 : p));
    }, 500);
    try {
      const response = await transcriptService.transcribe(project.id);
      clearInterval(progressInterval);
      setProgress(100);
      setTranscript(response.transcript);
    } catch (err: any) {
      clearInterval(progressInterval);
      setProgress(0);
      setError(err.response?.data?.message || err.message || 'Transcription failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (transcript) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Transcript Ready</h2>
            <p className="text-sm text-gray-400">
              Source: {transcript.source === 'groq' ? 'Groq Whisper API' : 'Supadata (YouTube)'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setTranscript(null)}
            leftIcon={<RefreshCw className="w-4 h-4" />}>Re-transcribe</Button>
        </div>
        <div className="bg-[#1a1a24] rounded-xl p-4 max-h-64 overflow-y-auto">
          <p className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">{transcript.rawText}</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>Language: {transcript.language}</span>
          {transcript.durationSeconds && (
            <>
              <span>•</span>
              <span>Duration: {Math.floor(transcript.durationSeconds / 60)}:{String(transcript.durationSeconds % 60).padStart(2, '0')}</span>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-blue-500/20 flex items-center justify-center">
        <FileText className="w-10 h-10 text-blue-400" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Transcribe Audio</h2>
      <p className="text-gray-400 mb-6 max-w-md mx-auto">
        We'll use AI to convert the audio into text with timestamps. This usually takes 1-2 minutes.
      </p>
      {error && (
        <div className="max-w-md mx-auto mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
      {isProcessing ? (
        <div className="space-y-4 max-w-xs mx-auto">
          <div className="flex items-center justify-center gap-2 text-violet-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Transcribing... {progress}%</span>
          </div>
          <div className="h-2 bg-[#1a1a24] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-300"
              style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : (
        <Button onClick={handleTranscribe} leftIcon={<Wand2 className="w-4 h-4" />}>Start Transcription</Button>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// STEP 3: SCRIPT
// ─────────────────────────────────────────────────────────────────────────
const Step3Script: React.FC<any> = ({ project, script, setScript, isProcessing, setIsProcessing }) => {
  const [style, setStyle] = useState<'dramatic' | 'casual' | 'spoiler' | 'hype'>('dramatic');
  const [language, setLanguage] = useState<'myanmar' | 'english' | 'both'>('myanmar');
  const [editedContent, setEditedContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const styles = [
    { value: 'dramatic', label: 'Dramatic', emoji: '🎭' },
    { value: 'casual', label: 'Casual', emoji: '💬' },
    { value: 'spoiler', label: 'Spoiler', emoji: '🤫' },
    { value: 'hype', label: 'Hype', emoji: '🔥' },
  ] as const;

  const languages = [
    { value: 'myanmar', label: 'မြန်မာ', flag: '🇲🇲' },
    { value: 'english', label: 'English', flag: '🇬🇧' },
    { value: 'both', label: 'Both', flag: '🌐' },
  ] as const;

  useEffect(() => {
    const loadExisting = async () => {
      if (script || !project?.id) return;
      try {
        const existing = await scriptService.get(project.id);
        if (existing) {
          setScript(existing);
          setEditedContent(existing.content);
          setStyle(existing.style as any);
          setLanguage(existing.language as any);
        }
      } catch {}
    };
    loadExisting();
  }, [project?.id]);

  useEffect(() => {
    if (!script || editedContent === script.content) return;
    const timer = setTimeout(async () => {
      setIsSaving(true);
      try {
        const updated = await scriptService.update(project.id, editedContent);
        setScript(updated);
      } catch (err) {} finally { setIsSaving(false); }
    }, 1500);
    return () => clearTimeout(timer);
  }, [editedContent, project?.id]);

  const handleGenerate = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const generated = await scriptService.generate(project.id, style, language);
      setScript(generated);
      setEditedContent(generated.content);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Script generation failed');
    } finally { setIsProcessing(false); }
  };

  if (script) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Generated Script</h2>
            <p className="text-sm text-gray-400">
              Style: {styles.find(s => s.value === script.style)?.label} •{' '}
              Language: {languages.find(l => l.value === script.language)?.label}
            </p>
          </div>
          <Button variant="outline" size="sm"
            onClick={() => { setScript(null); setEditedContent(''); }}
            leftIcon={<RefreshCw className="w-4 h-4" />}>Regenerate</Button>
        </div>
        <textarea value={editedContent} onChange={(e) => setEditedContent(e.target.value)}
          className="w-full h-64 bg-[#1a1a24] border border-[#2a2a3e] rounded-xl p-4 text-gray-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500" />
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">{isSaving ? '💾 Saving...' : 'Edit before generating voice-over'}</span>
          <span className="text-gray-400">{editedContent.length} characters</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-purple-500/20 flex items-center justify-center">
          <Sparkles className="w-10 h-10 text-purple-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Generate Recap Script</h2>
        <p className="text-gray-400 max-w-md mx-auto">AI will write an engaging recap script.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">Script Style</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {styles.map((s) => (
            <button key={s.value} onClick={() => setStyle(s.value)} disabled={isProcessing}
              className={`p-4 rounded-xl border text-center transition-all ${
                style === s.value ? 'border-violet-500 bg-violet-500/10' : 'border-[#2a2a3e] hover:border-gray-600'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <span className="text-2xl mb-2 block">{s.emoji}</span>
              <span className={`text-sm font-medium ${style === s.value ? 'text-violet-400' : 'text-white'}`}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">Language</label>
        <div className="grid grid-cols-3 gap-3">
          {languages.map((l) => (
            <button key={l.value} onClick={() => setLanguage(l.value)} disabled={isProcessing}
              className={`p-4 rounded-xl border text-center transition-all ${
                language === l.value ? 'border-violet-500 bg-violet-500/10' : 'border-[#2a2a3e] hover:border-gray-600'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <span className="text-xl mb-1 block">{l.flag}</span>
              <span className={`text-sm font-medium ${language === l.value ? 'text-violet-400' : 'text-white'}`}>{l.label}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="max-w-md mx-auto p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-sm text-red-400 text-center">{error}</p>
        </div>
      )}

      <div className="text-center">
        {isProcessing ? (
          <div className="flex items-center justify-center gap-2 text-violet-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Generating script with Gemini AI... </span>
          </div>
        ) : (
          <Button onClick={handleGenerate} leftIcon={<Wand2 className="w-4 h-4" />}>Generate Script</Button>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// STEP 4: VOICE-OVER
// ─────────────────────────────────────────────────────────────────────────
const Step4VoiceOver: React.FC<any> = ({ project, voiceOver, setVoiceOver, isProcessing, setIsProcessing }) => {
  const [selectedVoice, setSelectedVoice] = useState<'Aoede' | 'Puck' | 'Charon' | 'Kore'>('Aoede');
  const [stylePrompt, setStylePrompt] = useState('Speak in a warm, engaging tone suitable for drama storytelling');
  const [speed, setSpeed] = useState(1.0);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const voices = [
    { name: 'Aoede', desc: 'Warm, expressive', emoji: '👩' },
    { name: 'Puck', desc: 'Energetic, youthful', emoji: '👨' },
    { name: 'Charon', desc: 'Deep, dramatic', emoji: '🧔' },
    { name: 'Kore', desc: 'Soft, gentle', emoji: '👧' },
  ] as const;

  useEffect(() => {
    const loadExisting = async () => {
      if (!project?.id) return;
      try {
        const existing = await voiceService.get(project.id);
        if (existing) setVoiceOver(existing);
      } catch (err) {}
    };
    loadExisting();
  }, [project?.id]);

  const handleGenerate = async () => {
    setIsProcessing(true);
    setError(null);
    setProgress(0);
    const progressInterval = setInterval(() => {
      setProgress((p) => (p < 90 ? p + 5 : p));
    }, 350);
    try {
      const result = await voiceService.generate(project.id, {
        voiceName: selectedVoice,
        stylePrompt: stylePrompt.trim(),
        speed: parseFloat(speed.toFixed(1)),
      });
      clearInterval(progressInterval);
      setProgress(100);
      setVoiceOver(result);
    } catch (err: any) {
      clearInterval(progressInterval);
      setProgress(0);
      setError(err.response?.data?.message || err.message || 'Failed to generate voice-over');
    } finally { setIsProcessing(false); }
  };

  const audioUrl = voiceService.getAudioUrl(project?.id || '');

  if (voiceOver?.audioPath) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Voice-over Ready</h2>
            <p className="text-sm text-gray-400">
              Voice: <span className="text-violet-400">{voiceOver.voiceName}</span> • Speed: {voiceOver.speed}x
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setVoiceOver(null)}
            leftIcon={<RefreshCw className="w-4 h-4" />}>Regenerate</Button>
        </div>
        <div className="bg-[#1a1a24] rounded-2xl p-6">
          <audio ref={audioRef} src={audioUrl} controls className="w-full" />
        </div>
        {voiceOver.stylePrompt && (
          <div className="bg-[#1a1a24] rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Style Prompt Used:</p>
            <p className="text-sm text-gray-300 italic">"{voiceOver.stylePrompt}"</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-pink-500/20 flex items-center justify-center">
          <Mic className="w-10 h-10 text-pink-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Generate Voice-over</h2>
        <p className="text-gray-400 max-w-md mx-auto">Choose a voice and style.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">Select Voice</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {voices.map((v) => (
            <button key={v.name} onClick={() => setSelectedVoice(v.name as any)} disabled={isProcessing}
              className={`p-4 rounded-xl border text-center transition-all ${
                selectedVoice === v.name ? 'border-violet-500 bg-violet-500/10' : 'border-[#2a2a3e] hover:border-gray-600'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <span className="text-2xl mb-2 block">{v.emoji}</span>
              <span className={`text-sm font-medium block ${selectedVoice === v.name ? 'text-violet-400' : 'text-white'}`}>{v.name}</span>
              <span className="text-xs text-gray-500">{v.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Delivery Style</label>
        <input type="text" value={stylePrompt} onChange={(e) => setStylePrompt(e.target.value)} disabled={isProcessing}
          className="w-full bg-[#1a1a24] border border-[#2a2a3e] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50" />
      </div>

      <div>
        <div className="flex justify-between mb-2">
          <label className="text-sm font-medium text-gray-300">Speed</label>
          <span className="text-sm text-violet-400">{speed.toFixed(1)}x</span>
        </div>
        <input type="range" min="0.5" max="2.0" step="0.1" value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))} disabled={isProcessing}
          className="w-full accent-violet-500" />
      </div>

      {error && (
        <div className="max-w-md mx-auto p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-sm text-red-400 text-center">{error}</p>
        </div>
      )}

      <div className="text-center pt-6">
        {isProcessing ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-violet-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Generating voice-over... {progress}%</span>
            </div>
            <div className="h-2.5 bg-[#1a1a24] rounded-full overflow-hidden w-64 mx-auto">
              <div className="h-full bg-gradient-to-r from-pink-500 to-violet-500 transition-all duration-300"
                style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : (
          <Button onClick={handleGenerate} leftIcon={<Mic className="w-4 h-4" />} size="lg">Generate Voice-over</Button>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// FONT SIZE RECOMMENDATIONS
// ─────────────────────────────────────────────────────────────────────────
const FONT_SIZE_RECOMMENDATIONS: Record<string, { 
  min: number; max: number; recommended: number; reason: string 
}> = {
  '9:16':  { min: 42, max: 80, recommended: 56, reason: 'TikTok/Reels - vertical, mobile-first' },
  '4:5':   { min: 44, max: 84, recommended: 60, reason: 'Instagram feed - balanced readability' },
  '1:1':   { min: 46, max: 88, recommended: 64, reason: 'Square - centered focus' },
  '16:9':  { min: 48, max: 96, recommended: 72, reason: 'YouTube/landscape - wider canvas' },
};

// ─────────────────────────────────────────────────────────────────────────
// STEP 5: EDIT
// ─────────────────────────────────────────────────────────────────────────
const Step5Edit: React.FC<{
  exportSettings: any;
  setExportSettings: (s: any) => void;
  onNext: () => void;
  projectId: string;
  script: any;
}> = ({ exportSettings, setExportSettings, projectId, script }) => {

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  console.log('🟢 Step5Edit MOUNTED with projectId:', projectId);

  useEffect(() => {
    let cancelled = false;
     console.log('🔵 Step5Edit useEffect FIRED, projectId:', projectId);
    const loadExistingSettings = async () => {
      if (!projectId) return;
      try {
        const latestJob = await exportService.getLatest(projectId);
        if (cancelled || !latestJob) return;
        
        console.log('📥 Restored settings from previous export:', latestJob);
        setExportSettings((prev: any) => ({
          ...prev,
          aspectRatio:       latestJob.aspectRatio       ?? prev.aspectRatio,
          logoPath:          latestJob.logoPath          ?? prev.logoPath,
          logoPosition:      latestJob.logoPosition      ?? prev.logoPosition,
          logoX:             latestJob.logoX             ?? prev.logoX,
          logoY:             latestJob.logoY             ?? prev.logoY,
          logoSize:          latestJob.logoSize          ?? prev.logoSize,
          logoOpacity:       latestJob.logoOpacity       ?? prev.logoOpacity,
          subtitleEnabled:   latestJob.subtitleEnabled   ?? prev.subtitleEnabled,
          subtitleFont:      latestJob.subtitleFont      ?? prev.subtitleFont,
          subtitleSize:      latestJob.subtitleSize      ?? prev.subtitleSize,
          audioMix:          latestJob.audioMix          ?? prev.audioMix,
          subtitleLanguage:  latestJob.subtitleLanguage  ?? prev.subtitleLanguage,
          subtitleX:           latestJob.subtitleX           ?? prev.subtitleX,
          subtitleY:           latestJob.subtitleY           ?? prev.subtitleY,
          subtitleWidth:       latestJob.subtitleWidth       ?? prev.subtitleWidth,
          subtitleFontColor:   latestJob.subtitleFontColor   ?? prev.subtitleFontColor,
          subtitleBgColor:     latestJob.subtitleBgColor     ?? prev.subtitleBgColor,
          subtitleBorderStyle: latestJob.subtitleBorderStyle ?? prev.subtitleBorderStyle,
          subtitleOutlineColor:latestJob.subtitleOutlineColor?? prev.subtitleOutlineColor,
          subtitleOutlineWidth:latestJob.subtitleOutlineWidth?? prev.subtitleOutlineWidth,
        }));
      } catch (err) {
        console.log('No previous export settings found');
      }
    };
    loadExistingSettings();
    return () => { cancelled = true; };
  }, [projectId]);

  // Restore logo preview from backend when returning to step
  useEffect(() => {
    if (exportSettings.logoPath && !logoPreview) {
      const token = localStorage.getItem('narratemm-token');
      fetch(`http://localhost:8080/api/upload/logo/${projectId}?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.blob() : null))
        .then((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            setLogoPreview(url);
          }
        })
        .catch(() => {});
    }
  }, [exportSettings.logoPath, projectId]);

  const updateSetting = (key: string, value: any) => {
    setExportSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  const updateMultipleSettings = (updates: Record<string, any>) => {
    setExportSettings((prev: any) => ({ ...prev, ...updates }));
  };

  const getPreviewText = (): string => {
    const fallbacks: Record<string, string> = {
      burmese: 'ဤသည် စာတမ်းထိုး နမူနာ ဖြစ်ပါသည်။',
      original: 'This is a sample subtitle preview.',
    };
    const lang = exportSettings.subtitleLanguage || 'burmese';
    if (script?.content) {
      const cleaned = script.content.replace(/^\s*[\.\*\-#]+\s*/gm, '').replace(/\n+/g, ' ').trim();
      const match = cleaned.match(/^[^။.!?]{10,80}[။.!?]/);
      if (match) return match[0].trim();
      if (cleaned.length > 10) return cleaned.slice(0, 60).trim() + (cleaned.length > 60 ? '…' : '');
    }
    return fallbacks[lang] || fallbacks.burmese;
  };

  const previewText = getPreviewText();
  const currentRatio = exportSettings.aspectRatio || '9:16';
  const fontRec = FONT_SIZE_RECOMMENDATIONS[currentRatio] || FONT_SIZE_RECOMMENDATIONS['9:16'];

  const prevRatioRef = useRef(currentRatio);
  useEffect(() => {
    if (prevRatioRef.current === currentRatio) return;
    prevRatioRef.current = currentRatio;
    const rec = FONT_SIZE_RECOMMENDATIONS[currentRatio];
    if (!rec) return;
    const currentSize = exportSettings.subtitleSize || 24;
    if (currentSize < rec.min || currentSize > rec.max) {
      queueMicrotask(() => updateSetting('subtitleSize', rec.recommended));
    }
  }, [currentRatio]);

  const getSizeQuality = (size: number) => {
    if (size === fontRec.recommended) return { label: '⭐ Recommended', color: 'text-green-400' };
    if (size >= fontRec.min && size <= fontRec.max) return { label: '✓ Good', color: 'text-blue-400' };
    if (size < fontRec.min) return { label: '⚠️ Too small', color: 'text-yellow-400' };
    return { label: '⚠️ Too large', color: 'text-orange-400' };
  };
  const sizeQuality = getSizeQuality(exportSettings.subtitleSize || 24);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setIsUploadingLogo(true);
    try {
      const { logoPath } = await exportService.uploadLogo(projectId, file);
      updateSetting('logoPath', logoPath);
    } catch (err) {
      console.error('Logo upload failed:', err);
    } finally { setIsUploadingLogo(false); }
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-white mb-2">Video Settings</h2>
        <p className="text-gray-400">Customize your final video before export</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Logo Upload */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="w-5 h-5 text-gray-400" />
              <label className="text-sm font-medium text-gray-300">Logo Watermark</label>
            </div>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp"
              className="hidden" onChange={handleLogoUpload} />
            <div onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#2a2a3e] rounded-xl p-6 text-center hover:border-violet-500/50 cursor-pointer transition-colors relative">
              {isUploadingLogo ? (
                <div className="flex items-center justify-center gap-2 text-violet-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Uploading...</span>
                </div>
              ) : logoPreview ? (
                <div className="flex flex-col items-center gap-2">
                  <img src={logoPreview} alt="Logo preview" className="w-20 h-20 object-contain rounded-lg" />
                  <span className="text-xs text-violet-400">Click to change</span>
                </div>
              ) : (
                <>
                  <ImageIcon className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Click to upload PNG/JPG</p>
                  <p className="text-xs text-gray-600 mt-1">Transparent PNG recommended</p>
                </>
              )}
            </div>
          </div>

          {/* Interactive Logo Position Editor */}
          {exportSettings.logoPath && logoPreview && (
            <LogoPositionEditor
              logoPreview={logoPreview}
              aspectRatio={exportSettings.aspectRatio || '9:16'}
              position={exportSettings.logoPosition || 'bottom-right'}
              logoX={exportSettings.logoX}
              logoY={exportSettings.logoY}
              size={exportSettings.logoSize || 100}
              opacity={exportSettings.logoOpacity || 80}
              projectId={projectId} 
              onChange={updateMultipleSettings}
            />
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Subtitles */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Type className="w-5 h-5 text-gray-400" />
                <label className="text-sm font-medium text-gray-300">Subtitles (Burmese script)</label>
              </div>
              <button onClick={() => updateSetting('subtitleEnabled', !exportSettings.subtitleEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  exportSettings.subtitleEnabled ? 'bg-violet-500' : 'bg-[#2a2a3e]'
                }`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  exportSettings.subtitleEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {exportSettings.subtitleEnabled && (
              <div className="space-y-4 mt-4 p-4 bg-[#1a1a24] rounded-xl">
                <p className="text-xs text-gray-500">Subtitles are generated from your Burmese script</p>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Subtitle Language</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'burmese', label: '🇲🇲 Burmese Script', desc: 'From your AI script' },
                      { value: 'original', label: '🌐 Original', desc: 'From transcript' },
                    ].map((opt) => (
                      <button key={opt.value} onClick={() => updateSetting('subtitleLanguage', opt.value)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          exportSettings.subtitleLanguage === opt.value
                            ? 'border-violet-500 bg-violet-500/10'
                            : 'border-[#2a2a3e] hover:border-gray-600'
                        }`}>
                        <span className={`text-sm font-medium block ${
                          exportSettings.subtitleLanguage === opt.value ? 'text-violet-400' : 'text-white'
                        }`}>{opt.label}</span>
                        <span className="text-xs text-gray-500">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Font</label>
                  <select value={exportSettings.subtitleFont}
                    onChange={(e) => updateSetting('subtitleFont', e.target.value)}
                    className="w-full bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-3 py-2 text-white">
                    <option value="Noto Serif Myanmar">Noto Serif Myanmar</option>
                    <option value="Padauk">Padauk</option>
                    <option value="Pyidaungsu">Pyidaungsu</option>
                    <option value="Myanmar3">Myanmar3</option>
                    <option value="Arial">Arial (Latin only)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm text-gray-400">Size</label>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${sizeQuality.color}`}>{sizeQuality.label}</span>
                      <span className="text-sm text-violet-400 font-mono">{exportSettings.subtitleSize}px</span>
                    </div>
                  </div>
                  <input type="range" min={fontRec.min - 4} max={fontRec.max + 8}
                    value={exportSettings.subtitleSize}
                    onChange={(e) => updateSetting('subtitleSize', parseInt(e.target.value))}
                    className="w-full accent-violet-500" />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{fontRec.min - 4}px</span>
                    <span className="text-green-400">⭐ {fontRec.recommended}px</span>
                    <span>{fontRec.max + 8}px</span>
                  </div>

                  <div className="mt-3 p-3 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className="text-violet-400 text-sm">💡</span>
                      <div className="flex-1">
                        <p className="text-xs text-gray-300">
                          <span className="text-violet-400 font-medium">{currentRatio}</span> recommended:{' '}
                          <span className="text-white font-mono">{fontRec.min}–{fontRec.max}px</span>{' '}
                          (ideal: <span className="text-green-400">{fontRec.recommended}px</span>)
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{fontRec.reason}</p>
                      </div>
                      {exportSettings.subtitleSize !== fontRec.recommended && (
                        <button onClick={() => updateSetting('subtitleSize', fontRec.recommended)}
                          className="text-xs px-2 py-1 bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 rounded-md transition-colors whitespace-nowrap">
                          Use {fontRec.recommended}px
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* transcript style editor */}
                  <SubtitleStyleEditor
                    aspectRatio={exportSettings.aspectRatio || '9:16'}
                    settings={exportSettings}
                    previewText={previewText}
                    projectId={projectId}
                    onChange={updateMultipleSettings}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Audio Mix */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sliders className="w-5 h-5 text-gray-400" />
              <label className="text-sm font-medium text-gray-300">Audio Mix</label>
            </div>
            <div className="flex justify-between mb-2 text-xs text-gray-400">
              <span>🎬 Original Audio</span>
              <span>🎙️ Voice-over</span>
            </div>
            <input type="range" min="0" max="100" value={exportSettings.audioMix}
              onChange={(e) => updateSetting('audioMix', parseInt(e.target.value))}
              className="w-full accent-violet-500" />
            <div className="flex justify-between mt-1 text-xs">
              <span className="text-gray-500">{100 - exportSettings.audioMix}%</span>
              <span className="text-violet-400">{exportSettings.audioMix}%</span>
            </div>
          </div>

          {/* Export Preview Card */}
          <div className="bg-[#1a1a24] rounded-xl p-4">
            <h4 className="text-sm font-medium text-white mb-3">Export Preview</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Aspect Ratio</span>
                <span className="text-white font-mono">{exportSettings.aspectRatio}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Subtitles</span>
                <span className={exportSettings.subtitleEnabled ? 'text-green-400' : 'text-gray-500'}>
                  {exportSettings.subtitleEnabled
                    ? `✓ ${exportSettings.subtitleFont} ${exportSettings.subtitleSize}px`
                    : 'Off'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Logo</span>
                <span className={exportSettings.logoPath ? 'text-green-400' : 'text-gray-500'}>
                  {exportSettings.logoPath ? `✓ ${exportSettings.logoPosition}` : 'None'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Audio Mix</span>
                <span className="text-white">Orig {100 - exportSettings.audioMix}% / VO {exportSettings.audioMix}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// STEP 6: EXPORT
// ─────────────────────────────────────────────────────────────────────────
const Step6Export: React.FC<any> = ({ project, exportSettings, exportJob, setExportJob }) => {
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  const startPolling = (jobId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const status = await exportService.getStatus(jobId);
        setExportJob(status);
        if (status.status === 'done' || status.status === 'failed') {
          clearInterval(pollRef.current!);
        }
      } catch (err) { console.error('Poll error:', err); }
    }, 2000);
  };

  //Restore previous completed export
  useEffect(() => {
    let cancelled = false;
    const loadExistingJob = async () => {
      if (!project?.id || exportJob) return;
      try {
        const latestJob = await exportService.getLatest(project.id);
        if (cancelled) return;
        
        if (latestJob && latestJob.status === 'done') {
          console.log('📥 Restored previous export job:', latestJob);
          setExportJob(latestJob);
        }
      } catch (err) {
        console.log('No previous export found');
      }
    };
    loadExistingJob();
    return () => { cancelled = true; };
  }, [project?.id]);

  const isActiveRef = useRef(false);
  useEffect(() => {
    const shouldRun = exportJob?.status === 'processing' || isStarting;
    if (!shouldRun) {
      if (isActiveRef.current) {
        isActiveRef.current = false;
        queueMicrotask(() => setElapsedTime(0));
      }
      return;
    }
    isActiveRef.current = true;
    const timer = setInterval(() => setElapsedTime((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [exportJob?.status, isStarting]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const handleStartExport = async () => {
    setIsStarting(true);
    const settingsToSend: ExportSettings = {
      aspectRatio: exportSettings.aspectRatio || project.aspectRatio || '9:16',
      logoPath: exportSettings.logoPath,
      logoPosition: exportSettings.logoPosition,
      logoX: exportSettings.logoX,
      logoY: exportSettings.logoY,
      logoSize: exportSettings.logoSize,
      logoOpacity: exportSettings.logoOpacity,
      subtitleEnabled: exportSettings.subtitleEnabled,
      subtitleFont: exportSettings.subtitleFont,
      subtitleSize: exportSettings.subtitleSize,
      audioMix: exportSettings.audioMix,
      subtitleLanguage: exportSettings.subtitleLanguage || 'burmese',
      subtitleX: exportSettings.subtitleX,
      subtitleY: exportSettings.subtitleY,
      subtitleWidth: exportSettings.subtitleWidth,
      subtitleFontColor: exportSettings.subtitleFontColor,
      subtitleBgColor: exportSettings.subtitleBgColor,
      subtitleBorderStyle: exportSettings.subtitleBorderStyle,
      subtitleOutlineColor: exportSettings.subtitleOutlineColor,
      subtitleOutlineWidth: exportSettings.subtitleOutlineWidth,
    };
    console.log('🎬 EXPORT SETTINGS:', settingsToSend);
    try {
      const job = await exportService.start(project.id, settingsToSend);
      setExportJob(job);
      startPolling(job.id);
    } catch (err: any) {
      setExportJob({
        status: 'failed', progress: 0,
        errorMessage: err.response?.data?.message || err.message || 'Export failed',
      });
    } finally { setIsStarting(false); }
  };


  const handleDownload = () => {
    if (!exportJob?.id) return;
    const url = exportService.getDownloadUrl(exportJob.id);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title || 'export'}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (exportJob?.status === 'done') {
    return (
      <ExportDoneView
        exportJob={exportJob}
        exportSettings={exportSettings}
        project={project}
        onDownload={handleDownload}
        onReExport={() => setExportJob(null)}
      />
    );
  }

  if (exportJob?.status === 'failed') {
    return (
      <div className="text-center py-8">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-500/20 flex items-center justify-center">
          <RefreshCw className="w-10 h-10 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Export Failed</h2>
        <p className="text-red-400 mb-6 max-w-md mx-auto text-sm">
          {exportJob.errorMessage || 'Unknown error occurred'}
        </p>
        <Button onClick={() => setExportJob(null)} leftIcon={<RefreshCw className="w-4 h-4" />}>Try Again</Button>
      </div>
    );
  }

  if (isStarting || exportJob?.status === 'processing') {
    const progress = exportJob?.progress ?? 0;
    const isInitializing = isStarting && !exportJob;
    return (
      <div className="text-center py-8">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-violet-500/20 flex items-center justify-center relative">
          <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">
          {isInitializing ? 'Initializing Export...' : 'Rendering Video...'}
        </h2>
        <p className="text-gray-400 mb-2">
          {isInitializing ? 'Preparing FFmpeg pipeline' : 'FFmpeg is combining everything'}
        </p>
        <p className="text-xs text-yellow-400/80 mb-6 max-w-md mx-auto">
          ⏱️ This typically takes 2–5 minutes. Please keep this tab open.
        </p>
        <div className="max-w-md mx-auto">
          <div className="flex justify-between mb-2 text-sm">
            <span className="text-gray-400">{isInitializing ? 'Status' : 'Progress'}</span>
            <span className="text-violet-400 font-mono">{isInitializing ? 'Starting...' : `${progress}%`}</span>
          </div>
          <div className="h-3 bg-[#1a1a24] rounded-full overflow-hidden">
            {isInitializing ? (
              <div className="h-full bg-gradient-to-r from-violet-500 via-purple-500 to-violet-500 animate-pulse" style={{ width: '100%' }} />
            ) : (
              <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
                style={{ width: `${progress}%` }} />
            )}
          </div>
          <div className="flex justify-between items-center mt-3 text-xs">
            <span className="text-gray-500">
              Elapsed: <span className="text-violet-400 font-mono">{formatElapsed(elapsedTime)}</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-orange-500/20 flex items-center justify-center">
        <Download className="w-10 h-10 text-orange-400" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Ready to Export</h2>
      <p className="text-gray-400 mb-8 max-w-md mx-auto">
        FFmpeg will combine your video with voice-over, subtitles, and watermark.
      </p>
      <div className="bg-[#1a1a24] rounded-xl p-4 max-w-sm mx-auto mb-8 text-left">
        <h3 className="font-medium text-white mb-3">Export Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Aspect Ratio</span>
            <span className="text-white">{exportSettings.aspectRatio || project.aspectRatio}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Subtitles</span>
            <span className={exportSettings.subtitleEnabled ? 'text-green-400' : 'text-gray-500'}>
              {exportSettings.subtitleEnabled ? `✓ ${exportSettings.subtitleFont} ${exportSettings.subtitleSize}px` : 'Disabled'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Watermark</span>
            <span className={exportSettings.logoPath ? 'text-green-400' : 'text-gray-500'}>
              {exportSettings.logoPath ? `✓ ${exportSettings.logoPosition}` : 'None'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Audio</span>
            <span className="text-white">Orig {100 - (exportSettings.audioMix || 70)}% / VO {exportSettings.audioMix || 70}%</span>
          </div>
        </div>
      </div>
      <Button size="lg" onClick={handleStartExport} leftIcon={<Play className="w-5 h-5" />} disabled={isStarting}>
        Start Export
      </Button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// LOGO POSITION EDITOR (Drag-anywhere with optional snap)
// ─────────────────────────────────────────────────────────────────────────
interface LogoPositionEditorProps {
  logoPreview: string;
  aspectRatio: string;
  position: string;
  logoX?: number;
  logoY?: number;
  size: number;
  opacity: number;
  projectId: string; 
  onChange: (updates: {
    logoPosition?: string;
    logoX?: number;
    logoY?: number;
    logoSize?: number;
    logoOpacity?: number;
  }) => void;
}

import { SourceVideoPreview } from '../components/SourceVideoPreview';

import { api } from '../services/api.ts';
const LogoPositionEditor: React.FC<LogoPositionEditorProps> = ({
  logoPreview, aspectRatio, position, logoX, logoY, size, opacity,projectId, onChange,
}) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [snapMode, setSnapMode] = useState(false);

  const SNAP_POSITIONS: Record<string, { x: number; y: number }> = {
    'top-left':      { x: 0.05, y: 0.05 },
    'top-center':    { x: 0.5,  y: 0.05 },
    'top-right':     { x: 0.95, y: 0.05 },
    'center-left':   { x: 0.05, y: 0.5 },
    'center':        { x: 0.5,  y: 0.5 },
    'center-right':  { x: 0.95, y: 0.5 },
    'bottom-left':   { x: 0.05, y: 0.95 },
    'bottom-center': { x: 0.5,  y: 0.95 },
    'bottom-right':  { x: 0.95, y: 0.95 },
  };

  const findNearestSnap = (relX: number, relY: number): string => {
    let nearest = 'bottom-right';
    let minDist = Infinity;
    Object.entries(SNAP_POSITIONS).forEach(([name, pos]) => {
      const d = Math.sqrt((pos.x - relX) ** 2 + (pos.y - relY) ** 2);
      if (d < minDist) { minDist = d; nearest = name; }
    });
    return nearest;
  };

  const getCurrentPos = (): { x: number; y: number } => {
    if (isDragging && dragPos) return dragPos;
    if (logoX !== undefined && logoY !== undefined) return { x: logoX, y: logoY };
    return SNAP_POSITIONS[position] || SNAP_POSITIONS['bottom-right'];
  };

  const currentRel = getCurrentPos();
  const cssAspectRatio = aspectRatio.replace(':', ' / ');
  const logoSizePercent = (size / 100) * 18.5;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      if (!frameRef.current) return;
      const rect = frameRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      setDragPos({ x, y });
    };
    const handleUp = () => {
      if (dragPos) {
        if (snapMode) {
          const snapped = findNearestSnap(dragPos.x, dragPos.y);
          const snapPos = SNAP_POSITIONS[snapped];
          onChange({ logoPosition: snapped, logoX: snapPos.x, logoY: snapPos.y });
        } else {
          onChange({
            logoPosition: 'custom',
            logoX: parseFloat(dragPos.x.toFixed(4)),
            logoY: parseFloat(dragPos.y.toFixed(4)),
          });
        }
      }
      setIsDragging(false);
      setDragPos(null);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, dragPos, onChange, snapMode]);

  const handlePresetClick = (presetName: string) => {
    const pos = SNAP_POSITIONS[presetName];
    onChange({ logoPosition: presetName, logoX: pos.x, logoY: pos.y });
  };

  const formatCoord = (v: number) => `${(v * 100).toFixed(1)}%`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <label className="text-sm font-medium text-gray-300">Position & Preview</label>
        <span className="text-xs text-violet-400 bg-violet-500/10 px-2 py-1 rounded font-mono">
          {position === 'custom'
            ? `X:${formatCoord(currentRel.x)} Y:${formatCoord(currentRel.y)}`
            : position}
        </span>
      </div>

      <div className="flex items-center justify-between p-3 bg-[#1a1a24] rounded-lg">
        <div>
          <p className="text-xs font-medium text-white">
            {snapMode ? '🧲 Snap to Zones' : '🎯 Free Positioning'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {snapMode ? 'Logo snaps to nearest zone' : 'Drag logo anywhere — pixel perfect'}
          </p>
        </div>
        <button onClick={() => setSnapMode(!snapMode)}
          className={`w-12 h-6 rounded-full transition-colors relative ${
            snapMode ? 'bg-violet-500' : 'bg-[#2a2a3e]'
          }`}>
          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            snapMode ? 'translate-x-6' : 'translate-x-0.5'
          }`} />
        </button>
      </div>

      <div className="bg-[#0d0d14] border border-[#2a2a3e] rounded-xl p-4">
        <div className="flex items-center justify-center">
          <div ref={frameRef}
            className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden shadow-2xl"
            style={{
              aspectRatio: cssAspectRatio,
              maxHeight: '400px', maxWidth: '100%',
              height: aspectRatio === '16:9' ? 'auto' : '400px',
              width:  aspectRatio === '16:9' ? '100%' : 'auto',
            }}>

            {/* video background */}
            <SourceVideoPreview 
              projectId={projectId} 
              isYoutube={false} // or pass project prop if available
            />

            {/* Grid overlay */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-white/10" />
              ))}
            </div>

            {/* Dark overlay for better logo visibility */}
            <div className="absolute inset-0 bg-black/20 pointer-events-none" />

            {snapMode && Object.entries(SNAP_POSITIONS).map(([name, pos]) => (
              <div key={name}
                className={`absolute w-2 h-2 rounded-full pointer-events-none transition-all ${
                  position === name && !isDragging ? 'bg-violet-500' : 'bg-white/20'
                }`}
                style={{
                  left: `${pos.x * 100}%`,
                  top: `${pos.y * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }} />
            ))}

            {isDragging && dragPos && !snapMode && (
              <div className="absolute bg-violet-500 text-white text-xs px-2 py-1 rounded pointer-events-none font-mono shadow-lg z-10"
                style={{
                  left: `${dragPos.x * 100}%`,
                  top: `${dragPos.y * 100}%`,
                  transform: 'translate(-50%, calc(-100% - 20px))',
                }}>
                {formatCoord(dragPos.x)}, {formatCoord(dragPos.y)}
              </div>
            )}

            <div onMouseDown={handleMouseDown}
              className={`absolute select-none ${
                isDragging
                  ? 'cursor-grabbing ring-2 ring-violet-500 ring-offset-2 ring-offset-gray-900'
                  : 'cursor-grab hover:ring-1 hover:ring-violet-400/50'
              }`}
              style={{
                left: `${currentRel.x * 100}%`,
                top: `${currentRel.y * 100}%`,
                transform: `translate(-${currentRel.x * 100}%, -${currentRel.y * 100}%)`,
                width: `${logoSizePercent}%`,
                opacity: opacity / 100,
                transition: isDragging ? 'none' : 'left 0.25s ease, top 0.25s ease, transform 0.25s ease',
              }}>
              <img src={logoPreview} alt="Logo" className="w-full h-auto pointer-events-none" draggable={false} />
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 text-center mt-3">
          {snapMode ? '💡 Drag the logo — snaps to nearest zone' : '💡 Drag the logo anywhere'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-gray-400">Size</label>
            <span className="text-sm text-violet-400 font-mono">{size}%</span>
          </div>
          <input type="range" min="30" max="200" value={size}
            onChange={(e) => onChange({ logoSize: parseInt(e.target.value) })}
            className="w-full accent-violet-500" />
        </div>
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-gray-400">Opacity</label>
            <span className="text-sm text-violet-400 font-mono">{opacity}%</span>
          </div>
          <input type="range" min="10" max="100" value={opacity}
            onChange={(e) => onChange({ logoOpacity: parseInt(e.target.value) })}
            className="w-full accent-violet-500" />
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-2">Quick positions:</p>
        <div className="grid grid-cols-3 gap-1.5 max-w-[200px]">
          {Object.keys(SNAP_POSITIONS).map((pos) => (
            <button key={pos} onClick={() => handlePresetClick(pos)} title={pos.replace('-', ' ')}
              className={`h-8 rounded-md border text-xs transition-all ${
                position === pos
                  ? 'border-violet-500 bg-violet-500/20 text-violet-400'
                  : 'border-[#2a2a3e] text-gray-500 hover:border-gray-600'
              }`}>•</button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// EXPORT DONE VIEW - Side-by-side layout
// ─────────────────────────────────────────────────────────────────────────
interface ExportDoneViewProps {
  exportJob: any;
  exportSettings: any;
  project: any;
  onDownload: () => void;
  onReExport: () => void;
}

const ExportDoneView: React.FC<ExportDoneViewProps> = ({
  exportJob, exportSettings, project, onDownload, onReExport,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);

  const aspectRatio = exportSettings?.aspectRatio || project?.aspectRatio || '9:16';
  const cssAspectRatio = aspectRatio.replace(':', ' / ');
  const previewUrl = exportService.getPreviewUrl(exportJob.id);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── Success Header ─────────────────────────────────────── */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 mb-3 rounded-2xl 
                        bg-gradient-to-br from-green-500/20 to-emerald-500/20 
                        border border-green-500/30 shadow-lg shadow-green-500/10">
          <Check className="w-7 h-7 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 
                       bg-clip-text text-transparent mb-1">
          Export Complete! 🎉
        </h2>
        <p className="text-sm text-gray-400">
          Watch the preview, then save your video
        </p>
      </div>

      {/* ─── Two Column Layout ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* ═══════════ LEFT: Video Preview (3 cols) ═══════════ */}
        <div className="lg:col-span-3">
          <div className="bg-gradient-to-br from-[#0d0d14] to-[#13131a] 
                          border border-[#2a2a3e] rounded-2xl p-4 
                          shadow-2xl shadow-violet-500/5 h-full">
            <div className="flex items-center justify-center h-full">
              <div
                className="relative bg-black rounded-xl overflow-hidden shadow-2xl 
                           ring-1 ring-violet-500/20 w-full"
                style={{
                  aspectRatio: cssAspectRatio,
                  maxHeight: '550px',
                  maxWidth: aspectRatio === '9:16' || aspectRatio === '4:5' ? '350px' : '100%',
                  margin: '0 auto',
                }}
              >
                {/* Loading state */}
                {!videoLoaded && !videoError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center 
                                  bg-gradient-to-br from-gray-900 to-black z-10">
                    <div className="relative">
                      <div className="absolute inset-0 bg-violet-500/30 blur-xl rounded-full" />
                      <Loader2 className="relative w-10 h-10 text-violet-400 animate-spin" />
                    </div>
                    <p className="text-sm text-gray-400 mt-3 font-medium">Loading...</p>
                  </div>
                )}

                {/* Error state */}
                {videoError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center 
                                  bg-gradient-to-br from-red-900/30 to-black z-10 p-6">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 
                                    flex items-center justify-center mb-3">
                      <RefreshCw className="w-6 h-6 text-red-400" />
                    </div>
                    <p className="text-sm text-red-400 text-center font-medium">{videoError}</p>
                    <p className="text-xs text-gray-500 text-center mt-1">
                      You can still save the file
                    </p>
                  </div>
                )}

                {/* Video player */}
                <video
                  ref={videoRef}
                  src={previewUrl}
                  controls
                  playsInline
                  className="w-full h-full bg-black"
                  onLoadedData={() => setVideoLoaded(true)}
                  onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)}
                  onError={() => {
                    setVideoError('Failed to load preview');
                    setVideoLoaded(true);
                  }}
                >
                  Your browser does not support video playback.
                </video>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════ RIGHT: Info + Actions (2 cols) ═══════════ */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Video Info Card */}
          <div className="bg-gradient-to-br from-[#0d0d14] to-[#13131a] 
                          border border-[#2a2a3e] rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-violet-500 rounded-full" />
              Video Details
            </h3>

            <div className="space-y-3">
              {/* Format */}
              <div className="flex items-center justify-between py-2 border-b border-[#2a2a3e]/50">
                <span className="text-xs text-gray-500">Format</span>
                <span className="text-sm font-mono font-medium text-violet-300">
                  {aspectRatio}
                </span>
              </div>

              {/* Duration */}
              {videoDuration > 0 && (
                <div className="flex items-center justify-between py-2 border-b border-[#2a2a3e]/50">
                  <span className="text-xs text-gray-500">Duration</span>
                  <span className="text-sm font-mono font-medium text-blue-300">
                    {formatDuration(videoDuration)}
                  </span>
                </div>
              )}

              {/* Subtitles */}
              <div className="flex items-center justify-between py-2 border-b border-[#2a2a3e]/50">
                <span className="text-xs text-gray-500">Subtitles</span>
                <span className={`text-sm font-medium ${
                  exportSettings?.subtitleEnabled ? 'text-green-400' : 'text-gray-500'
                }`}>
                  {exportSettings?.subtitleEnabled ? '✓ On' : '✗ Off'}
                </span>
              </div>

              {/* Watermark */}
              <div className="flex items-center justify-between py-2 border-b border-[#2a2a3e]/50">
                <span className="text-xs text-gray-500">Watermark</span>
                <span className={`text-sm font-medium ${
                  exportSettings?.logoPath ? 'text-pink-400' : 'text-gray-500'
                }`}>
                  {exportSettings?.logoPath ? '✓ Added' : '✗ None'}
                </span>
              </div>

              {/* Voice Mix */}
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-gray-500">Voice Mix</span>
                <span className="text-sm font-medium text-orange-300">
                  {exportSettings?.audioMix || 70}%
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* ✅ Save Video (Download) */}
            <button
              onClick={onDownload}
              className="group w-full relative overflow-hidden p-4 rounded-2xl
                         bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-green-500/5
                         border border-green-500/30 hover:border-green-400/60
                         transition-all duration-300 hover:scale-[1.02] hover:shadow-xl 
                         hover:shadow-green-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 to-emerald-500/10 
                              opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl 
                                bg-gradient-to-br from-green-500/20 to-emerald-500/20
                                border border-green-500/30 flex items-center justify-center
                                group-hover:scale-110 transition-transform">
                  <Download className="w-5 h-5 text-green-400" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="font-bold text-green-400 group-hover:text-green-300 transition-colors">
                    Save Video
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Download to your device
                  </p>
                </div>
              </div>
            </button>

            {/* 🔄 Try Again (Re-export) */}
            <button
              onClick={onReExport}
              className="group w-full relative overflow-hidden p-4 rounded-2xl
                         bg-gradient-to-br from-orange-500/10 via-amber-500/10 to-orange-500/5
                         border border-orange-500/30 hover:border-orange-400/60
                         transition-all duration-300 hover:scale-[1.02] hover:shadow-xl 
                         hover:shadow-orange-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-amber-500/10 
                              opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl 
                                bg-gradient-to-br from-orange-500/20 to-amber-500/20
                                border border-orange-500/30 flex items-center justify-center
                                group-hover:scale-110 transition-transform">
                  <RefreshCw className="w-5 h-5 text-orange-400" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="font-bold text-orange-400 group-hover:text-orange-300 transition-colors">
                    Try Again
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Change settings and re-make
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Helper Note */}
          <div className="bg-[#1a1a24]/50 border border-[#2a2a3e]/50 rounded-xl p-3">
            <p className="text-xs text-gray-500 text-center leading-relaxed">
              💡 Your video is saved on the server.<br />
              You can preview it anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// SUBTITLE STYLE EDITOR — drag position + resize width
// ─────────────────────────────────────────────────────────────────────────
interface SubtitleStyleEditorProps {
  aspectRatio: string;
  settings: any;
  previewText: string;
  projectId: string;
  onChange: (updates: Record<string, any>) => void;
}

const SubtitleStyleEditor: React.FC<SubtitleStyleEditorProps> = ({
  aspectRatio, settings, previewText, projectId, onChange,
}) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'idle' | 'drag' | 'resize-left' | 'resize-right'>('idle');
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; width: number; mouseX: number } | null>(null);

  const subX = settings.subtitleX ?? 0.5;
  const subY = settings.subtitleY ?? 0.85;
  const width = settings.subtitleWidth ?? 80;
  const fontColor = settings.subtitleFontColor ?? '#FFFFFF';
  const bgColor = settings.subtitleBgColor ?? '#80000000';
  const borderStyle = settings.subtitleBorderStyle ?? 'outline';
  const outlineColor = settings.subtitleOutlineColor ?? '#000000';
  const outlineWidth = settings.subtitleOutlineWidth ?? 2;

  const currentY = mode === 'drag' && dragPos ? dragPos.y : subY;
  const currentX = mode === 'drag' && dragPos ? dragPos.x : subX;
  const currentWidth = (mode === 'resize-left' || mode === 'resize-right') && dragWidth !== null
    ? dragWidth : width;
  const cssAspectRatio = aspectRatio.replace(':', ' / ');

  // ─── Mouse Down Handlers ─────────────────────────────────────
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMode('drag');
  };

  const handleResizeStart = (side: 'left' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!frameRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    dragStartRef.current = {
      x: currentX,
      y: currentY,
      width: currentWidth,
      mouseX: e.clientX - rect.left,
    };
    setMode(side === 'left' ? 'resize-left' : 'resize-right');
  };

  // ─── Mouse Move + Up ─────────────────────────────────────────
  useEffect(() => {
    if (mode === 'idle') return;

    const handleMove = (e: MouseEvent) => {
      if (!frameRef.current) return;
      const rect = frameRef.current.getBoundingClientRect();
      const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const relY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

      if (mode === 'drag') {
        setDragPos({ x: relX, y: relY });
      } else if (mode === 'resize-left' || mode === 'resize-right') {
        if (!dragStartRef.current) return;
        const startMouseRel = dragStartRef.current.mouseX / rect.width;
        const currentMouseRel = relX;
        const delta = currentMouseRel - startMouseRel;
        
        // Resizing changes width by 2x delta (both sides move opposite)
        const sign = mode === 'resize-right' ? 1 : -1;
        const newWidthPct = Math.max(30, Math.min(100, 
          dragStartRef.current.width + sign * delta * 200
        ));
        setDragWidth(Math.round(newWidthPct));
      }
    };

    const handleUp = () => {
      if (mode === 'drag' && dragPos) {
        onChange({
          subtitleX: parseFloat(dragPos.x.toFixed(4)),
          subtitleY: parseFloat(dragPos.y.toFixed(4)),
        });
      } else if ((mode === 'resize-left' || mode === 'resize-right') && dragWidth !== null) {
        onChange({ subtitleWidth: dragWidth });
      }
      setMode('idle');
      setDragPos(null);
      setDragWidth(null);
      dragStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [mode, dragPos, dragWidth, onChange]);

  // ─── Build CSS preview style ─────────────────────────────────
  const getCaptionStyle = (): React.CSSProperties => {
    // Preview frame is ~400px tall, real video is 1920px (for 9:16)
    // Scale ratio: 400/1920 ≈ 0.208
    // So 56px real → ~12px preview, 80px real → ~17px preview
    
    // Get scale based on aspect ratio
    const previewHeight = 400; // matches our preview frame max height
    const videoHeights: Record<string, number> = {
      '9:16': 1920,
      '4:5':  1350,
      '1:1':  1080,
      '16:9': 1080,
    };
    const realHeight = videoHeights[aspectRatio] || 1920;
    const scale = previewHeight / realHeight;
    
    const realFontSize = settings.subtitleSize || 56;
    const previewFontSize = Math.max(8, realFontSize * scale);
    
    const base: React.CSSProperties = {
      fontSize: `${previewFontSize}px`,
      fontFamily: settings.subtitleFont || 'Pyidaungsu',
      color: fontColor,
      padding: '4px 10px',
      borderRadius: '2px',
      lineHeight: 1.3,
      display: 'inline-block',
      maxWidth: '100%',
      wordBreak: 'break-word',
    };
    
    switch (borderStyle) {
      case 'box':
        return { ...base, backgroundColor: bgColor };
      case 'shadow':
        return { ...base, textShadow: '2px 2px 4px rgba(0,0,0,0.85)' };
      case 'none':
        return base;
      case 'outline':
      default: {
          const o = Math.max(1, outlineWidth * scale * 4);
          const c = outlineColor;
          return {
            ...base,
            textShadow: `${o}px ${o}px 0 ${c}, -${o}px -${o}px 0 ${c}, ${o}px -${o}px 0 ${c}, -${o}px ${o}px 0 ${c}, ${o}px 0 0 ${c}, -${o}px 0 0 ${c}, 0 ${o}px 0 ${c}, 0 -${o}px 0 ${c}`,
          };
      }
    }
};

  const isInteracting = mode !== 'idle';

  return (
    <div className="space-y-5">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <label className="text-sm font-medium text-gray-300">Caption Position & Style</label>
        <span className="text-xs text-violet-400 bg-violet-500/10 px-2 py-1 rounded font-mono">
          X:{(currentX * 100).toFixed(0)}% Y:{(currentY * 100).toFixed(0)}% W:{currentWidth}%
        </span>
      </div>

      {/* ─── Preview Frame ──────────────────────────────────── */}
      <div className="bg-[#0d0d14] border border-[#2a2a3e] rounded-xl p-4">
        <div className="flex items-center justify-center">
          <div
            ref={frameRef}
            className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden shadow-2xl select-none"
            style={{
              aspectRatio: cssAspectRatio,
              maxHeight: '400px',
              maxWidth: '100%',
              height: aspectRatio === '16:9' ? 'auto' : '400px',
              width: aspectRatio === '16:9' ? '100%' : 'auto',
            }}
          >
            {/* Video preview */}
            <SourceVideoPreview projectId={projectId} />

            {/* Grid overlay */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-white/10" />
              ))}
            </div>

            {/* Slight dark overlay for caption visibility */}
            <div className="absolute inset-0 bg-black/20 pointer-events-none" />

            {/* Caption box with resize handles */}
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${currentX * 100}%`,
                top: `${currentY * 100}%`,
                transform: 'translate(-50%, -50%)',
                width: `${currentWidth}%`,
                textAlign: 'center',
                transition: isInteracting ? 'none' : 'left 0.2s, top 0.2s, width 0.2s',
              }}
            >
              {/* Selection frame (visible while interacting or hovering) */}
              <div className="relative group">
                {/* Border ring shown on hover */}
                <div
                  className={`absolute inset-0 -m-1 rounded-md transition-all ${
                    isInteracting
                      ? 'ring-2 ring-violet-500 bg-violet-500/5'
                      : 'ring-1 ring-violet-400/0 group-hover:ring-violet-400/60 group-hover:bg-violet-500/5'
                  }`}
                />

                {/* The caption text (this is the drag handle) */}
                <div
                  onMouseDown={handleDragStart}
                  className={`relative pointer-events-auto ${
                    mode === 'drag' ? 'cursor-grabbing' : 'cursor-grab'
                  }`}
                >
                  <span style={getCaptionStyle()}>{previewText}</span>
                </div>

                {/* LEFT resize handle */}
                <div
                  onMouseDown={handleResizeStart('left')}
                  className={`absolute top-1/2 -left-2 -translate-y-1/2 w-3 h-8 
                              bg-violet-500 rounded-sm cursor-ew-resize pointer-events-auto
                              transition-opacity shadow-lg ${
                                isInteracting || 'opacity-0 group-hover:opacity-100'
                              }`}
                  title="Drag to resize width"
                >
                  <div className="w-full h-full flex items-center justify-center text-white text-xs">⋮</div>
                </div>

                {/* RIGHT resize handle */}
                <div
                  onMouseDown={handleResizeStart('right')}
                  className={`absolute top-1/2 -right-2 -translate-y-1/2 w-3 h-8 
                              bg-violet-500 rounded-sm cursor-ew-resize pointer-events-auto
                              transition-opacity shadow-lg ${
                                isInteracting || 'opacity-0 group-hover:opacity-100'
                              }`}
                  title="Drag to resize width"
                >
                  <div className="w-full h-full flex items-center justify-center text-white text-xs">⋮</div>
                </div>
              </div>
            </div>

            {/* Floating coordinate hint */}
            {mode === 'drag' && dragPos && (
              <div
                className="absolute bg-violet-500 text-white text-xs px-2 py-1 rounded pointer-events-none font-mono shadow-lg z-10"
                style={{
                  left: `${dragPos.x * 100}%`,
                  top: `${dragPos.y * 100}%`,
                  transform: 'translate(-50%, calc(-100% - 30px))',
                }}
              >
                {(dragPos.x * 100).toFixed(0)}%, {(dragPos.y * 100).toFixed(0)}%
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-500 text-center mt-3">
          💡 <span className="text-violet-400">Drag the text</span> to move •{' '}
          <span className="text-violet-400">Drag the handles</span> to resize width
        </p>
      </div>

      {/* ─── Width Slider (precise control) ─────────────────── */}
      <div>
        <div className="flex justify-between mb-2">
          <label className="text-sm text-gray-400">Caption Box Width</label>
          <span className="text-sm text-violet-400 font-mono">{width}%</span>
        </div>
        <input
          type="range"
          min="30"
          max="100"
          value={width}
          onChange={(e) => onChange({ subtitleWidth: parseInt(e.target.value) })}
          className="w-full accent-violet-500"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Narrow (30%)</span>
          <span>Full (100%)</span>
        </div>
      </div>

      {/* ─── Color Pickers ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Font Color</label>
          <div className="flex items-center gap-2 bg-[#0d0d14] border border-[#2a2a3e] rounded-lg p-2">
            <input
              type="color"
              value={fontColor}
              onChange={(e) => onChange({ subtitleFontColor: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
            />
            <span className="text-xs text-gray-300 font-mono">{fontColor.toUpperCase()}</span>
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-2 block">
            {borderStyle === 'box' ? 'Background' : 'Outline Color'}
          </label>
          <div className="flex items-center gap-2 bg-[#0d0d14] border border-[#2a2a3e] rounded-lg p-2">
            <input
              type="color"
              value={
                borderStyle === 'box' 
                  ? (bgColor.length === 9 ? '#' + bgColor.slice(3, 9) : bgColor.slice(0, 7))
                  : outlineColor
              }
              onChange={(e) => {
                if (borderStyle === 'box') {
                  // Format: #AARRGGBB → alpha goes FIRST (CC = 80% opacity)
                  const colorHex = e.target.value.replace('#', '');
                  onChange({ subtitleBgColor: '#CC' + colorHex });
                } else {
                  onChange({ subtitleOutlineColor: e.target.value });
                }
              }}
              className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
            />
            <span className="text-xs text-gray-300 font-mono">
              {(borderStyle === 'box' 
                ? (bgColor.length === 9 ? '#' + bgColor.slice(3, 9) : bgColor.slice(0, 7))
                : outlineColor
              ).toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Border Style ───────────────────────────────────── */}
      <div>
        <label className="text-sm text-gray-400 mb-2 block">Border Style</label>
        <div className="grid grid-cols-4 gap-2">
          {[
            { value: 'outline', label: 'Outline', icon: '◉' },
            { value: 'box',     label: 'Box',     icon: '▣' },
            { value: 'shadow',  label: 'Shadow',  icon: '◐' },
            { value: 'none',    label: 'None',    icon: '○' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange({ subtitleBorderStyle: opt.value })}
              className={`p-3 rounded-lg border text-center transition-all ${
                borderStyle === opt.value
                  ? 'border-violet-500 bg-violet-500/10 text-violet-400'
                  : 'border-[#2a2a3e] text-gray-400 hover:border-gray-600'
              }`}
            >
              <div className="text-xl mb-1">{opt.icon}</div>
              <div className="text-xs">{opt.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Outline Thickness (only if outline mode) ─────── */}
      {borderStyle === 'outline' && (
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-gray-400">Outline Thickness</label>
            <span className="text-sm text-violet-400 font-mono">{outlineWidth}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="5"
            value={outlineWidth}
            onChange={(e) => onChange({ subtitleOutlineWidth: parseInt(e.target.value) })}
            className="w-full accent-violet-500"
          />
        </div>
      )}
    </div>
  );
};