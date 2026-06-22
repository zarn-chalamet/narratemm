import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ArrowRight, Check, Upload, FileText, Mic, Scissors, Download,
  Play, Pause, RefreshCw, Loader2, Sparkles, Volume2, Image as ImageIcon,
  Type, Sliders, Wand2
} from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
// Services imported for workflow step components
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
    logoSize: 100, 
    logoOpacity: 80, 
    subtitleEnabled: true, 
    subtitleFont: 'Noto Serif Myanmar', 
    subtitleSize: 24, 
    audioMix: 70, 
    subtitleLanguage: 'burmese', });
  const [exportJob, setExportJob] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const setCurrentStep = (s: number) => setCurrentStepState(s);
  const nextStep = () => setCurrentStepState((s) => Math.min(s + 1, 6));
  const prevStep = () => setCurrentStepState((s) => Math.max(s - 1, 1));
  const updateExportProgress = (p: number) => setExportJob((job: any) => job ? { ...job, progress: p } : job);
  
  const project = projects.find((p: any) => p.id === id);

  useEffect(() => {
    if (!project) {
      navigate('/dashboard');
    }
  }, [project, navigate]);

  if (!project) return null;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <Step1Upload project={project} onNext={nextStep} />;
      case 2:
        return (
          <Step2Transcribe 
            project={project} 
            transcript={transcript}
            setTranscript={setTranscript}
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
            onNext={nextStep}
          />
        );
      case 3:
        return (
          <Step3Script 
            project={project}
            script={script}
            setScript={setScript}
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
            onNext={nextStep}
          />
        );
      case 4:
        return (
           <Step4VoiceOver 
            project={project}
            voiceOver={voiceOver}
            setVoiceOver={setVoiceOver}
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
            onNext={nextStep}
          />
        );
      case 5:
        return (
          <Step5Edit 
            exportSettings={exportSettings}
            setExportSettings={setExportSettings}
            onNext={nextStep}
            projectId={project.id}
            script={script}
          />
        );
      case 6:
        return (
          <Step6Export 
            project={project}
            exportSettings={exportSettings}
            exportJob={exportJob}
            setExportJob={setExportJob}
            updateProgress={updateExportProgress}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
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

      {/* Stepper */}
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
                  className={`
                    flex flex-col items-center gap-2 z-10 group
                    ${step.id <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed'}
                  `}
                >
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center transition-all
                    ${isActive 
                      ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30 scale-110' 
                      : isCompleted
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-[#1a1a24] text-gray-500 border border-[#2a2a3e]'
                    }
                    ${step.id <= currentStep && !isActive ? 'group-hover:border-violet-500/50' : ''}
                  `}>
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${
                    isActive ? 'text-violet-400' : isCompleted ? 'text-green-400' : 'text-gray-500'
                  }`}>
                    {step.name}
                  </span>
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

      {/* Step Content */}
      <Card className="p-6 sm:p-8">
        {renderStepContent()}
      </Card>

      {/* Navigation */}
      {currentStep < 6 && (
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={currentStep === 1}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Previous
          </Button>
          <div className="text-sm text-gray-500">
            {steps[currentStep - 1].description}
          </div>
          <Button
            onClick={nextStep}
            disabled={isProcessing}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            {currentStep === 5 ? 'Start Export' : 'Next Step'}
          </Button>
        </div>
      )}
    </div>
  );
};

// Step 1: Upload (already done)
const Step1Upload: React.FC<{ project: any; onNext: () => void }> = ({ project }) => {
  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-green-500/20 flex items-center justify-center">
        <Check className="w-10 h-10 text-green-400" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Video Ready</h2>
      <p className="text-gray-400 mb-6">
        {project.youtubeUrl ? `YouTube: ${project.youtubeUrl}` : `File: ${project.videoPath || 'Uploaded successfully'}`}
      </p>
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a24] rounded-lg">
        <span className="text-sm text-gray-400">Format:</span>
        <span className="text-sm text-white font-medium">{project.aspectRatio}</span>
      </div>
    </div>
  );
};

// Step 2: Transcribe
const Step2Transcribe: React.FC<{
  project: any;
  transcript: any;
  setTranscript: (t: any) => void;
  isProcessing: boolean;
  setIsProcessing: (p: boolean) => void;
  onNext: () => void;
}> = ({ project, transcript, setTranscript, isProcessing, setIsProcessing }) => {
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load existing transcript when component mounts
  useEffect(() => {
    const loadExisting = async () => {
      if (transcript || !project?.id) return;
      try {
        const existing = await transcriptService.get(project.id);
        if (existing) setTranscript(existing);
      } catch (err) {
        // No existing transcript — that's fine
      }
    };
    loadExisting();
  }, [project?.id]);

  const handleTranscribe = async () => {
    setIsProcessing(true);
    setError(null);
    setProgress(0);

    // Fake progress animation while backend processes
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
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Transcription failed';
      setError(message);
      console.error('Transcription error:', err);
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTranscript(null)}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Re-transcribe
          </Button>
        </div>

        <div className="bg-[#1a1a24] rounded-xl p-4 max-h-64 overflow-y-auto">
          <p className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
            {transcript.rawText}
          </p>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>Language: {transcript.language}</span>
          {transcript.durationSeconds && (
            <>
              <span>•</span>
              <span>
                Duration: {Math.floor(transcript.durationSeconds / 60)}:
                {String(transcript.durationSeconds % 60).padStart(2, '0')}
              </span>
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
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            Calling backend API. Please wait...
          </p>
        </div>
      ) : (
        <Button onClick={handleTranscribe} leftIcon={<Wand2 className="w-4 h-4" />}>
          Start Transcription
        </Button>
      )}
    </div>
  );
};


// Step 3: Script Generation
const Step3Script: React.FC<{
  project: any;
  script: any;
  setScript: (s: any) => void;
  isProcessing: boolean;
  setIsProcessing: (p: boolean) => void;
  onNext: () => void;
}> = ({ project, script, setScript, isProcessing, setIsProcessing }) => {
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

  // Load existing script when component mounts
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
      } catch {
        // No existing script — that's fine
      }
    };
    loadExisting();
  }, [project?.id]);

  // Debounced auto-save when content is edited
  useEffect(() => {
    if (!script || editedContent === script.content) return;

    const timer = setTimeout(async () => {
      setIsSaving(true);
      try {
        const updated = await scriptService.update(project.id, editedContent);
        setScript(updated);
      } catch (err) {
        console.error('Failed to save script edits', err);
      } finally {
        setIsSaving(false);
      }
    }, 1500); // Auto-save 1.5s after user stops typing

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
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Script generation failed';
      setError(message);
      console.error('Script generation error:', err);
    } finally {
      setIsProcessing(false);
    }
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
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => { setScript(null); setEditedContent(''); }}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Regenerate
          </Button>
        </div>
        
        <textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className="w-full h-64 bg-[#1a1a24] border border-[#2a2a3e] rounded-xl p-4 text-gray-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {isSaving ? '💾 Saving...' : 'Edit the script as needed before generating voice-over'}
          </span>
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
        <p className="text-gray-400 max-w-md mx-auto">
          AI will write an engaging recap script based on the transcript. Choose your preferred style.
        </p>
      </div>

      {/* Style Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">Script Style</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {styles.map((s) => (
            <button
              key={s.value}
              onClick={() => setStyle(s.value)}
              disabled={isProcessing}
              className={`p-4 rounded-xl border text-center transition-all ${
                style === s.value
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-[#2a2a3e] hover:border-gray-600'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="text-2xl mb-2 block">{s.emoji}</span>
              <span className={`text-sm font-medium ${
                style === s.value ? 'text-violet-400' : 'text-white'
              }`}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Language Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">Language</label>
        <div className="grid grid-cols-3 gap-3">
          {languages.map((l) => (
            <button
              key={l.value}
              onClick={() => setLanguage(l.value)}
              disabled={isProcessing}
              className={`p-4 rounded-xl border text-center transition-all ${
                language === l.value
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-[#2a2a3e] hover:border-gray-600'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="text-xl mb-1 block">{l.flag}</span>
              <span className={`text-sm font-medium ${
                language === l.value ? 'text-violet-400' : 'text-white'
              }`}>{l.label}</span>
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
          <Button onClick={handleGenerate} leftIcon={<Wand2 className="w-4 h-4" />}>
            Generate Script
          </Button>
        )}
      </div>
    </div>
  );
};

// Step 4: Voice-over (Real Implementation)
const Step4VoiceOver: React.FC<{
  project: any;
  voiceOver: any;
  setVoiceOver: (v: any) => void;
  isProcessing: boolean;
  setIsProcessing: (p: boolean) => void;
  onNext: () => void;
}> = ({ project, voiceOver, setVoiceOver, isProcessing, setIsProcessing }) => {
  const [selectedVoice, setSelectedVoice] = useState<'Aoede' | 'Puck' | 'Charon' | 'Kore'>('Aoede');
  const [stylePrompt, setStylePrompt] = useState('Speak in a warm, engaging tone suitable for drama storytelling');
  const [speed, setSpeed] = useState(1.0);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const voices = [
    { name: 'Aoede', gender: 'Female', desc: 'Warm, expressive', emoji: '👩' },
    { name: 'Puck', gender: 'Male', desc: 'Energetic, youthful', emoji: '👨' },
    { name: 'Charon', gender: 'Male', desc: 'Deep, dramatic', emoji: '🧔' },
    { name: 'Kore', gender: 'Female', desc: 'Soft, gentle', emoji: '👧' },
  ] as const;

  // Load existing voice-over when component mounts
  useEffect(() => {
    const loadExisting = async () => {
      if (!project?.id) return;
      try {
        const existing = await voiceService.get(project.id);
        if (existing) setVoiceOver(existing);
      } catch (err) {
        // No voice-over exists yet - normal
      }
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
      console.error('Voice generation error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const audioUrl = voiceService.getAudioUrl(project?.id || '');

  // If we have a voice-over, show player
  if (voiceOver?.audioPath) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Voice-over Ready</h2>
            <p className="text-sm text-gray-400">
              Voice: <span className="text-violet-400">{voiceOver.voiceName}</span> • 
              Speed: {voiceOver.speed}x
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVoiceOver(null)}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Regenerate
          </Button>
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

  // Generate form
  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-pink-500/20 flex items-center justify-center">
          <Mic className="w-10 h-10 text-pink-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Generate Voice-over</h2>
        <p className="text-gray-400 max-w-md mx-auto">
          Choose a voice and style for your narration using Gemini TTS.
        </p>
      </div>

      {/* Voice Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">Select Voice</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {voices.map((v) => (
            <button
              key={v.name}
              onClick={() => setSelectedVoice(v.name as any)}
              disabled={isProcessing}
              className={`p-4 rounded-xl border text-center transition-all ${
                selectedVoice === v.name
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-[#2a2a3e] hover:border-gray-600'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="text-2xl mb-2 block">{v.emoji}</span>
              <span className={`text-sm font-medium block ${
                selectedVoice === v.name ? 'text-violet-400' : 'text-white'
              }`}>{v.name}</span>
              <span className="text-xs text-gray-500">{v.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Style Prompt */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Delivery Style</label>
        <input
          type="text"
          value={stylePrompt}
          onChange={(e) => setStylePrompt(e.target.value)}
          disabled={isProcessing}
          className="w-full bg-[#1a1a24] border border-[#2a2a3e] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
          placeholder="Speak in a warm, engaging tone suitable for drama storytelling"
        />
      </div>

      {/* Speed */}
      <div>
        <div className="flex justify-between mb-2">
          <label className="text-sm font-medium text-gray-300">Speed</label>
          <span className="text-sm text-violet-400">{speed.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
          disabled={isProcessing}
          className="w-full accent-violet-500"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0.5x</span>
          <span>1.0x</span>
          <span>2.0x</span>
        </div>
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
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-violet-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <Button onClick={handleGenerate} leftIcon={<Mic className="w-4 h-4" />} size="lg">
            Generate Voice-over
          </Button>
        )}
      </div>
    </div>
  );
};

//Step 5 Edit

// ─────────────────────────────────────────────────────────────────────────
// FONT SIZE RECOMMENDATIONS PER ASPECT RATIO
// ─────────────────────────────────────────────────────────────────────────
const FONT_SIZE_RECOMMENDATIONS: Record<string, { 
  min: number; max: number; recommended: number; reason: string 
}> = {
  '9:16':  { min: 18, max: 32, recommended: 22, reason: 'TikTok/Reels - vertical, mobile-first' },
  '4:5':   { min: 20, max: 36, recommended: 26, reason: 'Instagram feed - balanced readability' },
  '1:1':   { min: 22, max: 38, recommended: 28, reason: 'Square - centered focus' },
  '16:9':  { min: 24, max: 48, recommended: 32, reason: 'YouTube/landscape - wider canvas' },
};

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

  const updateSetting = (key: string, value: any) => {
    setExportSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  // Get a meaningful preview line from the actual script
  const getPreviewText = (): string => {
    const fallbacks: Record<string, string> = {
      burmese:  'ဤသည် စာတမ်းထိုး နမူနာ ဖြစ်ပါသည်။',
      original: 'This is a sample subtitle preview.',
    };

    const lang = exportSettings.subtitleLanguage || 'burmese';

    if (script?.content) {
      const cleaned = script.content
        .replace(/^\s*[\.\*\-#]+\s*/gm, '')
        .replace(/\n+/g, ' ')
        .trim();

      const match = cleaned.match(/^[^။.!?]{10,80}[။.!?]/);
      if (match) {
        return match[0].trim();
      }

      if (cleaned.length > 10) {
        return cleaned.slice(0, 60).trim() + (cleaned.length > 60 ? '…' : '');
      }
    }

    return fallbacks[lang] || fallbacks.burmese;
  };

  const previewText = getPreviewText();

  // Get current recommendation based on aspect ratio
  const currentRatio = exportSettings.aspectRatio || '9:16';
  const fontRec = FONT_SIZE_RECOMMENDATIONS[currentRatio] || FONT_SIZE_RECOMMENDATIONS['9:16'];

  // ✅ Track previous aspect ratio to detect changes (no setState in effect)
  const prevRatioRef = useRef(currentRatio);

  useEffect(() => {
    // Only run when aspect ratio actually changes (not on mount)
    if (prevRatioRef.current === currentRatio) return;
    prevRatioRef.current = currentRatio;

    const rec = FONT_SIZE_RECOMMENDATIONS[currentRatio];
    if (!rec) return;

    const currentSize = exportSettings.subtitleSize || 24;
    if (currentSize < rec.min || currentSize > rec.max) {
      // Defer state update to next tick to avoid cascading renders
      queueMicrotask(() => updateSetting('subtitleSize', rec.recommended));
    }
  }, [currentRatio]);

  // Quality indicator for current size
  const getSizeQuality = (size: number) => {
    if (size === fontRec.recommended) return { label: '⭐ Recommended', color: 'text-green-400' };
    if (size >= fontRec.min && size <= fontRec.max) return { label: '✓ Good', color: 'text-blue-400' };
    if (size < fontRec.min) return { label: '⚠️ Too small', color: 'text-yellow-400' };
    return { label: '⚠️ Too large', color: 'text-orange-400' };
  };

  const sizeQuality = getSizeQuality(exportSettings.subtitleSize || 24);

  const positions = [
    'top-left', 'top-center', 'top-right',
    'center-left', 'center', 'center-right',
    'bottom-left', 'bottom-center', 'bottom-right',
  ];

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
    } finally {
      setIsUploadingLogo(false);
    }
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

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleLogoUpload}
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#2a2a3e] rounded-xl p-6 text-center 
                         hover:border-violet-500/50 cursor-pointer transition-colors relative"
            >
              {isUploadingLogo ? (
                <div className="flex items-center justify-center gap-2 text-violet-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Uploading...</span>
                </div>
              ) : logoPreview ? (
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-20 h-20 object-contain rounded-lg"
                  />
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

          {/* Logo Position */}
          {exportSettings.logoPath && (
            <div>
              <label className="text-sm font-medium text-gray-300 mb-3 block">
                Watermark Position
              </label>
              <div className="grid grid-cols-3 gap-2 w-[180px]">
                {positions.map((pos) => (
                  <button
                    key={pos}
                    onClick={() => updateSetting('logoPosition', pos)}
                    title={pos}
                    className={`w-12 h-12 rounded-lg border transition-all flex items-center justify-center ${
                      exportSettings.logoPosition === pos
                        ? 'border-violet-500 bg-violet-500/20'
                        : 'border-[#2a2a3e] hover:border-gray-600'
                    }`}
                  >
                    {exportSettings.logoPosition === pos && (
                      <Check className="w-4 h-4 text-violet-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Logo Size & Opacity */}
          {exportSettings.logoPath && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-gray-400">Size</label>
                  <span className="text-sm text-violet-400">{exportSettings.logoSize}%</span>
                </div>
                <input
                  type="range" min="30" max="200"
                  value={exportSettings.logoSize}
                  onChange={(e) => updateSetting('logoSize', parseInt(e.target.value))}
                  className="w-full accent-violet-500"
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-gray-400">Opacity</label>
                  <span className="text-sm text-violet-400">{exportSettings.logoOpacity}%</span>
                </div>
                <input
                  type="range" min="10" max="100"
                  value={exportSettings.logoOpacity}
                  onChange={(e) => updateSetting('logoOpacity', parseInt(e.target.value))}
                  className="w-full accent-violet-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Subtitles Toggle */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Type className="w-5 h-5 text-gray-400" />
                <label className="text-sm font-medium text-gray-300">
                  Subtitles (Burmese script)
                </label>
              </div>
              <button
                onClick={() => updateSetting('subtitleEnabled', !exportSettings.subtitleEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  exportSettings.subtitleEnabled ? 'bg-violet-500' : 'bg-[#2a2a3e]'
                }`}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  exportSettings.subtitleEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {exportSettings.subtitleEnabled && (
              <div className="space-y-4 mt-4 p-4 bg-[#1a1a24] rounded-xl">
                <p className="text-xs text-gray-500">
                  Subtitles are generated from your Burmese script
                </p>

                {/* Language */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Subtitle Language</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'burmese', label: '🇲🇲 Burmese Script', desc: 'From your AI script' },
                      { value: 'original', label: '🌐 Original', desc: 'From transcript' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => updateSetting('subtitleLanguage', opt.value)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          exportSettings.subtitleLanguage === opt.value
                            ? 'border-violet-500 bg-violet-500/10'
                            : 'border-[#2a2a3e] hover:border-gray-600'
                        }`}
                      >
                        <span className={`text-sm font-medium block ${
                          exportSettings.subtitleLanguage === opt.value
                            ? 'text-violet-400' : 'text-white'
                        }`}>
                          {opt.label}
                        </span>
                        <span className="text-xs text-gray-500">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Font</label>
                  <select
                    value={exportSettings.subtitleFont}
                    onChange={(e) => updateSetting('subtitleFont', e.target.value)}
                    className="w-full bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-3 py-2 text-white"
                  >
                    <option value="Noto Serif Myanmar">Noto Serif Myanmar</option>
                    <option value="Padauk">Padauk</option>
                    <option value="Pyidaungsu">Pyidaungsu</option>
                    <option value="Myanmar3">Myanmar3</option>
                    <option value="Arial">Arial (Latin only)</option>
                  </select>
                </div>

                {/* SMART FONT SIZE */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm text-gray-400">Size</label>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${sizeQuality.color}`}>
                        {sizeQuality.label}
                      </span>
                      <span className="text-sm text-violet-400 font-mono">
                        {exportSettings.subtitleSize}px
                      </span>
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      type="range"
                      min={fontRec.min - 4}
                      max={fontRec.max + 8}
                      value={exportSettings.subtitleSize}
                      onChange={(e) => updateSetting('subtitleSize', parseInt(e.target.value))}
                      className="w-full accent-violet-500"
                    />
                    <div className="relative h-1 -mt-1">
                      <div 
                        className="absolute w-0.5 h-3 bg-green-400"
                        style={{
                          left: `${((fontRec.recommended - (fontRec.min - 4)) / ((fontRec.max + 8) - (fontRec.min - 4))) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{fontRec.min - 4}px</span>
                    <span className="text-green-400">⭐ {fontRec.recommended}px</span>
                    <span>{fontRec.max + 8}px</span>
                  </div>

                  {/* Recommendation banner */}
                  <div className="mt-3 p-3 bg-gradient-to-r from-violet-500/10 to-purple-500/10 
                                  border border-violet-500/20 rounded-lg">
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
                        <button
                          onClick={() => updateSetting('subtitleSize', fontRec.recommended)}
                          className="text-xs px-2 py-1 bg-violet-500/20 text-violet-400 
                                     hover:bg-violet-500/30 rounded-md transition-colors whitespace-nowrap"
                        >
                          Use {fontRec.recommended}px
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Live preview using REAL script content */}
                  <div className="mt-3 p-4 bg-[#0d0d14] border border-[#2a2a3e] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-500">
                        {script?.content ? 'Live Preview (from your script)' : 'Preview (sample text)'}
                      </p>
                      <span className="text-xs text-gray-600 font-mono">
                        {exportSettings.subtitleSize}px
                      </span>
                    </div>

                    {/* Simulated video frame */}
                    <div 
                      className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-md 
                                 overflow-hidden mx-auto" 
                      style={{ 
                        aspectRatio: exportSettings.aspectRatio?.replace(':', '/') || '9/16',
                        maxHeight: '200px',
                        maxWidth: '100%',
                      }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center text-gray-700 text-xs">
                        🎬 Video Area
                      </div>

                      <div className="absolute bottom-3 left-2 right-2 text-center">
                        <p 
                          className="text-white inline-block px-2 py-1 leading-tight"
                          style={{ 
                            fontSize: `${Math.min(exportSettings.subtitleSize * 0.35, 16)}px`,
                            fontFamily: exportSettings.subtitleFont,
                            textShadow: '1px 1px 2px black, -1px -1px 2px black, 1px -1px 2px black, -1px 1px 2px black',
                          }}
                        >
                          {previewText}
                        </p>
                      </div>
                    </div>

                    {!script?.content && (
                      <p className="text-xs text-yellow-500/70 mt-2 text-center">
                        💡 Generate a script in Step 3 to see real preview
                      </p>
                    )}
                  </div>
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
            <input
              type="range" min="0" max="100"
              value={exportSettings.audioMix}
              onChange={(e) => updateSetting('audioMix', parseInt(e.target.value))}
              className="w-full accent-violet-500"
            />
            <div className="flex justify-between mt-1 text-xs">
              <span className="text-gray-500">{100 - exportSettings.audioMix}%</span>
              <span className="text-violet-400">{exportSettings.audioMix}%</span>
            </div>
          </div>

          {/* Preview Card */}
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
                <span className="text-white">
                  Orig {100 - exportSettings.audioMix}% / VO {exportSettings.audioMix}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

//Step6Export
const Step6Export: React.FC<{
  project: any;
  exportSettings: any;
  exportJob: any;
  setExportJob: (j: any) => void;
  updateProgress: (p: number) => void;
}> = ({ project, exportSettings, exportJob, setExportJob }) => {

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
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 2000);
  };

  // Elapsed time counter
  const isActiveRef = useRef(false);
  
  useEffect(() => {
    const shouldRun = exportJob?.status === 'processing' || isStarting;
    
    // Reset to 0 when stopping (deferred to avoid cascading render)
    if (!shouldRun) {
      if (isActiveRef.current) {
        isActiveRef.current = false;
        queueMicrotask(() => setElapsedTime(0));
      }
      return;
    }
    
    isActiveRef.current = true;
    const timer = setInterval(() => {
      setElapsedTime((t) => t + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [exportJob?.status, isStarting]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
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
      logoSize: exportSettings.logoSize,
      logoOpacity: exportSettings.logoOpacity,
      subtitleEnabled: exportSettings.subtitleEnabled,
      subtitleFont: exportSettings.subtitleFont,
      subtitleSize: exportSettings.subtitleSize,
      audioMix: exportSettings.audioMix,
      subtitleLanguage: exportSettings.subtitleLanguage || 'burmese',
    };

    console.log('🎬 EXPORT SETTINGS:', settingsToSend);

    try {
      const job = await exportService.start(project.id, settingsToSend);
      setExportJob(job);
      startPolling(job.id);
    } catch (err: any) {
      console.error('Export start failed:', err);
      setExportJob({
        status: 'failed',
        progress: 0,
        errorMessage: err.response?.data?.message || err.message || 'Export failed',
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleDownload = () => {
    if (!exportJob?.id) return;
    const url = exportService.getDownloadUrl(exportJob.id);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title || 'export'}.mp4`;
    a.click();
  };

  // ── DONE ──
  if (exportJob?.status === 'done') {
    return (
      <div className="text-center py-8">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-500/20 
                        flex items-center justify-center">
          <Check className="w-12 h-12 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Export Complete! 🎉</h2>
        <p className="text-gray-400 mb-8">Your Burmese recap video is ready</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            onClick={handleDownload}
            leftIcon={<Download className="w-5 h-5" />}
          >
            Download MP4
          </Button>
          <Button variant="outline" size="lg" onClick={() => setExportJob(null)}>
            Export Again
          </Button>
        </div>
      </div>
    );
  }

  // ── FAILED ──
  if (exportJob?.status === 'failed') {
    return (
      <div className="text-center py-8">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-500/20 
                        flex items-center justify-center">
          <RefreshCw className="w-10 h-10 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Export Failed</h2>
        <p className="text-red-400 mb-6 max-w-md mx-auto text-sm">
          {exportJob.errorMessage || 'Unknown error occurred'}
        </p>
        <Button onClick={() => setExportJob(null)} leftIcon={<RefreshCw className="w-4 h-4" />}>
          Try Again
        </Button>
      </div>
    );
  }

  // ── PROCESSING (includes both isStarting and actual processing) ──
  if (isStarting || exportJob?.status === 'processing') {
    const progress = exportJob?.progress ?? 0;
    const isInitializing = isStarting && !exportJob;

    return (
      <div className="text-center py-8">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-violet-500/20 
                        flex items-center justify-center relative">
          <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
        </div>
        
        <h2 className="text-xl font-bold text-white mb-2">
          {isInitializing ? 'Initializing Export...' : 'Rendering Video...'}
        </h2>
        
        <p className="text-gray-400 mb-2">
          {isInitializing
            ? 'Preparing FFmpeg pipeline and resources'
            : 'FFmpeg is combining your video, voice-over, and subtitles'}
        </p>

        <p className="text-xs text-yellow-400/80 mb-6 max-w-md mx-auto">
          ⏱️ This typically takes 2–5 minutes depending on video length.
          Please keep this tab open.
        </p>

        <div className="max-w-md mx-auto">
          <div className="flex justify-between mb-2 text-sm">
            <span className="text-gray-400">
              {isInitializing ? 'Status' : 'Progress'}
            </span>
            <span className="text-violet-400 font-mono">
              {isInitializing ? 'Starting...' : `${progress}%`}
            </span>
          </div>

          <div className="h-3 bg-[#1a1a24] rounded-full overflow-hidden">
            {isInitializing ? (
              <div className="h-full bg-gradient-to-r from-violet-500 via-purple-500 to-violet-500 
                              animate-pulse" style={{ width: '100%' }} />
            ) : (
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            )}
          </div>

          <div className="flex justify-between items-center mt-3 text-xs">
            <span className="text-gray-500">
              Elapsed: <span className="text-violet-400 font-mono">{formatElapsed(elapsedTime)}</span>
            </span>
            <span className="text-gray-500">
              {isInitializing
                ? '🚀 Booting render engine'
                : progress < 20
                  ? '📥 Loading source video'
                  : progress < 50
                    ? '🎙️ Mixing voice-over'
                    : progress < 80
                      ? '📝 Burning subtitles'
                      : '✨ Finalizing output'}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 mt-6">
            {[
              { label: 'Init', threshold: 0,  icon: '⚙️' },
              { label: 'Audio', threshold: 25, icon: '🎵' },
              { label: 'Subs', threshold: 50, icon: '💬' },
              { label: 'Render', threshold: 75, icon: '🎬' },
            ].map((stage) => {
              const reached = !isInitializing && progress >= stage.threshold;
              return (
                <div
                  key={stage.label}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    reached
                      ? 'border-violet-500/50 bg-violet-500/10'
                      : 'border-[#2a2a3e] bg-[#1a1a24]'
                  }`}
                >
                  <div className={`text-lg mb-1 ${reached ? '' : 'opacity-30'}`}>
                    {stage.icon}
                  </div>
                  <div className={`text-xs ${reached ? 'text-violet-400' : 'text-gray-600'}`}>
                    {stage.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── READY TO EXPORT ──
  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-orange-500/20 
                      flex items-center justify-center">
        <Download className="w-10 h-10 text-orange-400" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Ready to Export</h2>
      <p className="text-gray-400 mb-8 max-w-md mx-auto">
        FFmpeg will combine your original video with the Burmese voice-over,
        burn subtitles, and apply your watermark.
      </p>

      <div className="bg-[#1a1a24] rounded-xl p-4 max-w-sm mx-auto mb-8 text-left">
        <h3 className="font-medium text-white mb-3">Export Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Aspect Ratio</span>
            <span className="text-white">
              {exportSettings.aspectRatio || project.aspectRatio}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Subtitles</span>
            <span className={exportSettings.subtitleEnabled ? 'text-green-400' : 'text-gray-500'}>
              {exportSettings.subtitleEnabled
                ? `✓ ${exportSettings.subtitleFont} ${exportSettings.subtitleSize}px`
                : 'Disabled'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Watermark</span>
            <span className={exportSettings.logoPath ? 'text-green-400' : 'text-gray-500'}>
              {exportSettings.logoPath
                ? `✓ ${exportSettings.logoPosition}`
                : 'None'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Audio</span>
            <span className="text-white">
              Orig {100 - (exportSettings.audioMix || 70)}% 
              / VO {exportSettings.audioMix || 70}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Output</span>
            <span className="text-white">MP4 (H.264 + AAC)</span>
          </div>
        </div>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 
                      max-w-sm mx-auto mb-6">
        <p className="text-xs text-yellow-400">
          ⚠️ Export takes 2–5 minutes. Don't close this tab.
        </p>
      </div>

      <Button
        size="lg"
        onClick={handleStartExport}
        leftIcon={<Play className="w-5 h-5" />}
        disabled={isStarting}
      >
        Start Export
      </Button>
    </div>
  );
};
