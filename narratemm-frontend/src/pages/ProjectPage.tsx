import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ArrowRight, Check, Upload, FileText, Mic, Scissors, Download,
  Play, Pause, RefreshCw, Loader2, Sparkles, Volume2, Image as ImageIcon,
  Type, Sliders, Wand2
} from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
// Services imported for workflow step components
import { transcriptService } from '../services/transcriptService';
// import { scriptService } from '../services/scriptService';
// import { voiceService } from '../services/voiceService';
// import { exportService, type ExportSettings } from '../services/exportService';
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
  const [exportSettings, setExportSettings] = useState<any>({ aspectRatio: '9:16', logoPosition: 'bottom-right', logoSize: 100, logoOpacity: 80, subtitleEnabled: true, subtitleFont: 'Noto Serif Myanmar', subtitleSize: 24, audioMix: 70 });
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
          />
        );
      case 6:
        return (
          <Step6Export 
            project={project}
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
  script: any;
  setScript: (s: any) => void;
  isProcessing: boolean;
  setIsProcessing: (p: boolean) => void;
  onNext: () => void;
}> = ({ script, setScript, isProcessing, setIsProcessing }) => {
  const [style, setStyle] = useState<'dramatic' | 'casual' | 'spoiler' | 'hype'>('dramatic');
  const [language, setLanguage] = useState<'myanmar' | 'english' | 'both'>('myanmar');
  const [editedContent, setEditedContent] = useState('');

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

  const handleGenerate = async () => {
    setIsProcessing(true);
    
    await new Promise(r => setTimeout(r, 3000));
    
    const generatedScript = style === 'dramatic' 
      ? `🎬 ဒီအပိုင်းမှာ အရမ်းကို စိတ်လှုပ်ရှားစရာကောင်းပါတယ်!

မင်းသမီး ထိန်ထိန်က သူ့ရဲ့ ဆုံးရှုံးသွားတဲ့ အချစ်ကို ရှာဖွေဖို့ ရန်ကုန်မြို့ကို ပြန်လာခဲ့ပါတယ်။ နှစ်ပေါင်းများစွာ ကွဲကွာခဲ့ရပြီးနောက် သူတို့ ပြန်လည်ဆုံစည်းနိုင်ပါ့မလား?

💔 သူမရဲ့ မျက်ရည်တွေ၊ သူ့ရဲ့ နောင်တ... အားလုံးက ဒီအပိုင်းမှာ ပေါ်လွင်လာပါတယ်။

⚡ ဘာတွေဖြစ်သွားမလဲ? နောက်အပိုင်းမှာ ဆက်ကြည့်ကြရအောင်!`
      : `ဟေး အားလုံးပဲ! ဒီအပိုင်းက တော်တော်ကောင်းတယ်နော်...

မင်းသမီးက ပြန်လာပြီ။ သူ့ချစ်သူကို ရှာဖွေနေတယ်။ ဘာတွေဖြစ်မလဲဆိုတာ ကိုယ်တိုင်ကြည့်ကြည့်နော်!

👋 Like လုပ်ပြီး Subscribe လုပ်ဖို့ မမေ့နဲ့နော်!`;
    
    setScript({
      id: 'script-1',
      projectId: 'demo',
      content: generatedScript,
      style,
      language,
      segments: [],
    });
    setEditedContent(generatedScript);
    setIsProcessing(false);
  };

  if (script) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Generated Script</h2>
            <p className="text-sm text-gray-400">Style: {styles.find(s => s.value === script.style)?.label}</p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setScript(null)}
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
          <span className="text-gray-500">Edit the script as needed before generating voice-over</span>
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
              className={`p-4 rounded-xl border text-center transition-all ${
                style === s.value
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-[#2a2a3e] hover:border-gray-600'
              }`}
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
              className={`p-4 rounded-xl border text-center transition-all ${
                language === l.value
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-[#2a2a3e] hover:border-gray-600'
              }`}
            >
              <span className="text-xl mb-1 block">{l.flag}</span>
              <span className={`text-sm font-medium ${
                language === l.value ? 'text-violet-400' : 'text-white'
              }`}>{l.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="text-center">
        {isProcessing ? (
          <div className="flex items-center justify-center gap-2 text-violet-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Generating script with Gemini AI...</span>
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

// Step 4: Voice-over
const Step4VoiceOver: React.FC<{
  voiceOver: any;
  setVoiceOver: (v: any) => void;
  isProcessing: boolean;
  setIsProcessing: (p: boolean) => void;
  onNext: () => void;
}> = ({ voiceOver, setVoiceOver, isProcessing, setIsProcessing }) => {
  const [selectedVoice, setSelectedVoice] = useState<'Aoede' | 'Puck' | 'Charon' | 'Kore'>('Aoede');
  const [stylePrompt, setStylePrompt] = useState('Speak in a warm, engaging tone suitable for drama storytelling');
  const [speed, setSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  const voices = [
    { name: 'Aoede', gender: 'Female', desc: 'Warm, expressive', emoji: '👩' },
    { name: 'Puck', gender: 'Male', desc: 'Energetic, youthful', emoji: '👨' },
    { name: 'Charon', gender: 'Male', desc: 'Deep, dramatic', emoji: '🧔' },
    { name: 'Kore', gender: 'Female', desc: 'Soft, gentle', emoji: '👧' },
  ] as const;

  const handleGenerate = async () => {
    setIsProcessing(true);
    await new Promise(r => setTimeout(r, 4000));
    
    setVoiceOver({
      id: 'voice-1',
      projectId: 'demo',
      audioPath: '/demo-audio.mp3',
      voiceName: selectedVoice,
      stylePrompt,
      speed,
      durationSeconds: 45,
    });
    setIsProcessing(false);
  };

  if (voiceOver) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Voice-over Ready</h2>
            <p className="text-sm text-gray-400">Voice: {voiceOver.voiceName} • {voiceOver.durationSeconds}s</p>
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
        
        {/* Audio Player */}
        <div className="bg-[#1a1a24] rounded-xl p-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-14 h-14 rounded-full bg-violet-500 hover:bg-violet-400 flex items-center justify-center transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white ml-1" />
              )}
            </button>
            
            <div className="flex-1">
              <div className="h-2 bg-[#2a2a3e] rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-gradient-to-r from-violet-500 to-purple-500" />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>0:15</span>
                <span>0:45</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-gray-400" />
              <div className="w-20 h-2 bg-[#2a2a3e] rounded-full">
                <div className="h-full w-3/4 bg-gray-400 rounded-full" />
              </div>
            </div>
          </div>
        </div>
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
        <p className="text-gray-400 max-w-md mx-auto">
          Choose a voice and style for your narration. Powered by Gemini 2.5 Flash TTS.
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
              className={`p-4 rounded-xl border text-center transition-all ${
                selectedVoice === v.name
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-[#2a2a3e] hover:border-gray-600'
              }`}
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
          className="w-full bg-[#1a1a24] border border-[#2a2a3e] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
          placeholder="Describe how the voice should sound..."
        />
      </div>

      {/* Speed */}
      <div>
        <div className="flex justify-between mb-2">
          <label className="text-sm font-medium text-gray-300">Speed</label>
          <span className="text-sm text-violet-400">{speed}x</span>
        </div>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
          className="w-full accent-violet-500"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0.5x</span>
          <span>1x</span>
          <span>2x</span>
        </div>
      </div>

      <div className="text-center">
        {isProcessing ? (
          <div className="flex items-center justify-center gap-2 text-violet-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Generating voice-over...</span>
          </div>
        ) : (
          <Button onClick={handleGenerate} leftIcon={<Mic className="w-4 h-4" />}>
            Generate Voice-over
          </Button>
        )}
      </div>
    </div>
  );
};

// Step 5: Edit Settings
const Step5Edit: React.FC<{
  exportSettings: any;
  setExportSettings: (s: any) => void;
  onNext: () => void;
}> = ({ exportSettings, setExportSettings }) => {
  const positions = [
    'top-left', 'top-center', 'top-right',
    'center-left', 'center', 'center-right',
    'bottom-left', 'bottom-center', 'bottom-right',
  ];

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-white mb-2">Video Settings</h2>
        <p className="text-gray-400">Customize your final video before export</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Logo Watermark */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="w-5 h-5 text-gray-400" />
              <label className="text-sm font-medium text-gray-300">Logo Watermark</label>
            </div>
            <div className="border-2 border-dashed border-[#2a2a3e] rounded-xl p-6 text-center hover:border-violet-500/50 cursor-pointer transition-colors">
              <ImageIcon className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Click to upload PNG</p>
            </div>
          </div>

          {/* Logo Position */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-3 block">Position</label>
            <div className="grid grid-cols-3 gap-2 max-w-[180px]">
              {positions.map((pos) => (
                <button
                  key={pos}
                  onClick={() => setExportSettings({ logoPosition: pos })}
                  className={`w-12 h-12 rounded-lg border transition-all ${
                    exportSettings.logoPosition === pos
                      ? 'border-violet-500 bg-violet-500/20'
                      : 'border-[#2a2a3e] hover:border-gray-600'
                  }`}
                >
                  {exportSettings.logoPosition === pos && (
                    <Check className="w-4 h-4 text-violet-400 mx-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Logo Size & Opacity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-gray-400">Size</label>
                <span className="text-sm text-violet-400">{exportSettings.logoSize}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="200"
                value={exportSettings.logoSize}
                onChange={(e) => setExportSettings({ logoSize: parseInt(e.target.value) })}
                className="w-full accent-violet-500"
              />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-gray-400">Opacity</label>
                <span className="text-sm text-violet-400">{exportSettings.logoOpacity}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={exportSettings.logoOpacity}
                onChange={(e) => setExportSettings({ logoOpacity: parseInt(e.target.value) })}
                className="w-full accent-violet-500"
              />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Subtitles */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Type className="w-5 h-5 text-gray-400" />
                <label className="text-sm font-medium text-gray-300">Subtitles</label>
              </div>
              <button
                onClick={() => setExportSettings({ subtitleEnabled: !exportSettings.subtitleEnabled })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  exportSettings.subtitleEnabled ? 'bg-violet-500' : 'bg-[#2a2a3e]'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  exportSettings.subtitleEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            
            {exportSettings.subtitleEnabled && (
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Font</label>
                  <select
                    value={exportSettings.subtitleFont}
                    onChange={(e) => setExportSettings({ subtitleFont: e.target.value })}
                    className="w-full bg-[#1a1a24] border border-[#2a2a3e] rounded-lg px-3 py-2 text-white"
                  >
                    <option value="Noto Serif Myanmar">Noto Serif Myanmar</option>
                    <option value="Padauk">Padauk</option>
                    <option value="Arial">Arial</option>
                  </select>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm text-gray-400">Size</label>
                    <span className="text-sm text-violet-400">{exportSettings.subtitleSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="16"
                    max="48"
                    value={exportSettings.subtitleSize}
                    onChange={(e) => setExportSettings({ subtitleSize: parseInt(e.target.value) })}
                    className="w-full accent-violet-500"
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
            <div className="flex justify-between mb-2 text-sm">
              <span className="text-gray-400">Original</span>
              <span className="text-violet-400">{100 - exportSettings.audioMix}% / {exportSettings.audioMix}%</span>
              <span className="text-gray-400">Voice-over</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={exportSettings.audioMix}
              onChange={(e) => setExportSettings({ audioMix: parseInt(e.target.value) })}
              className="w-full accent-violet-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Step 6: Export
const Step6Export: React.FC<{
  project: any;
  exportJob: any;
  setExportJob: (j: any) => void;
  updateProgress: (p: number) => void;
}> = ({ project, exportJob, setExportJob, updateProgress }) => {
  const handleStartExport = async () => {
    setExportJob({
      id: 'export-1',
      projectId: project.id,
      status: 'processing',
      progress: 0,
    });

    // Simulate export progress
    for (let i = 0; i <= 100; i += 2) {
      await new Promise(r => setTimeout(r, 150));
      updateProgress(i);
    }

    setExportJob({
      id: 'export-1',
      projectId: project.id,
      status: 'done',
      progress: 100,
      outputPath: '/exports/final-video.mp4',
    });
  };

  if (exportJob?.status === 'done') {
    return (
      <div className="text-center py-8">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse-glow">
          <Check className="w-12 h-12 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Export Complete! 🎉</h2>
        <p className="text-gray-400 mb-8">Your video is ready to download and share</p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button 
            size="lg"
            leftIcon={<Download className="w-5 h-5" />}
          >
            Download MP4
          </Button>
          <Button 
            variant="outline"
            size="lg"
          >
            Share to TikTok
          </Button>
        </div>
      </div>
    );
  }

  if (exportJob?.status === 'processing') {
    return (
      <div className="text-center py-8">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-yellow-500/20 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-yellow-400 animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Rendering Video...</h2>
        <p className="text-gray-400 mb-6">This may take a few minutes. Don't close this page.</p>
        
        <div className="max-w-md mx-auto">
          <div className="flex justify-between mb-2 text-sm">
            <span className="text-gray-400">Progress</span>
            <span className="text-violet-400">{exportJob.progress}%</span>
          </div>
          <div className="h-3 bg-[#1a1a24] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-300"
              style={{ width: `${exportJob.progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Applying subtitles, logo watermark, and mixing audio...
          </p>
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
        Your video will be rendered with all settings applied. This process runs in the background using FFmpeg.
      </p>
      
      <div className="bg-[#1a1a24] rounded-xl p-4 max-w-sm mx-auto mb-8 text-left">
        <h3 className="font-medium text-white mb-3">Export Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Format</span>
            <span className="text-white">{project.aspectRatio}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Subtitles</span>
            <span className="text-white">Enabled</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Voice-over</span>
            <span className="text-white">Included</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Output</span>
            <span className="text-white">MP4 (H.264)</span>
          </div>
        </div>
      </div>
      
      <Button 
        size="lg"
        onClick={handleStartExport}
        leftIcon={<Play className="w-5 h-5" />}
      >
        Start Export
      </Button>
    </div>
  );
};
