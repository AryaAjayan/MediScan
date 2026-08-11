import { useState, useEffect } from 'react';
import { SAMPLE_XRAYS } from './data/samples';
import { SampleXray, PreprocessingConfig, GradCamConfig, InferenceResult, DockerStatus } from './types';
import { AnatomyChart } from './components/AnatomyChart';
import { PreprocessPanel } from './components/PreprocessPanel';
import { GradCamVisualizer } from './components/GradCamVisualizer';
import { ModelBench } from './components/ModelBench';
import { FastApiSandbox } from './components/FastApiSandbox';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, ShieldCheck, Heart, Terminal, Layers, Brain, Sliders, Hexagon, Zap } from 'lucide-react';

export default function App() {
  // Model and view states
  const [currentTab, setCurrentTab] = useState<'diagnostics' | 'xai' | 'mlops'>('diagnostics');
  const [selectedXray, setSelectedXray] = useState<SampleXray>(SAMPLE_XRAYS[0]);
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [customImageSrc, setCustomImageSrc] = useState<string | null>(null);
  
  const [prepConfig, setPrepConfig] = useState<PreprocessingConfig>({
    rotation: 0,
    horizontalFlip: false,
    brightness: 1.0,
    contrast: 1.0,
    resize: 224,
    normMean: [0.485, 0.456, 0.406],
    normStd: [0.229, 0.224, 0.225],
    gaussianNoise: 0.0,
  });

  const [gradCamConfig, setGradCamConfig] = useState<GradCamConfig>({
    opacity: 0.55,
    layer: 'layer4.2.conv3',
    colormap: 'jet',
  });

  const [showGradCam, setShowGradCam] = useState<boolean>(true);
  const [inferenceResult, setInferenceResult] = useState<InferenceResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedAreaIndex, setSelectedAreaIndex] = useState<number | null>(null);

  // Simulated Docker Status (gets updated by server routes)
  const [dockerStatus, setDockerStatus] = useState<DockerStatus>({
    state: 'running',
    uptimeSeconds: 3600,
    cpuPercent: 8,
    memoryMb: 382,
    logs: [],
  });

  const fetchDockerStatus = async () => {
    try {
      const res = await fetch('/api/docker-status');
      if (res.ok) {
        const data = await res.json();
        setDockerStatus(data);
      }
    } catch (err) {
      console.error('Failed to sync backend status:', err);
    }
  };

  useEffect(() => {
    fetchDockerStatus();
    const interval = setInterval(fetchDockerStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleControlContainer = async (action: 'start' | 'stop' | 'restart') => {
    try {
      setDockerStatus(prev => ({
        ...prev,
        state: action === 'stop' ? 'stopped' : 'restarting'
      }));
      
      const res = await fetch('/api/docker-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        await fetchDockerStatus();
      }
    } catch (err) {
      console.error('Failed to control backend service:', err);
    }
  };

  const handleClearLogs = async () => {
    try {
      const res = await fetch('/api/docker-logs/clear', { method: 'POST' });
      if (res.ok) {
        await fetchDockerStatus();
      }
    } catch (err) {
      console.error('Failed to clear logs:', err);
    }
  };

  // Run server inference pipeline
  const handleRunInference = async (
    xray: SampleXray,
    custom: boolean,
    customSrc: string | null,
    onSuccess?: (res: InferenceResult) => void
  ) => {
    if (dockerStatus.state !== 'running') {
      alert('Cannot execute inference. The backend service is offline.');
      return;
    }

    setLoading(true);
    setInferenceResult(null);
    setSelectedAreaIndex(null);

    try {
      const response = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: xray.id,
          name: xray.name,
          isCustom: custom,
          base64ImageData: custom ? customSrc : null,
          prepConfig: prepConfig,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Inference call failed');
      }

      const result: InferenceResult = await response.json();
      setInferenceResult(result);
      if (onSuccess) onSuccess(result);

    } catch (err: any) {
      alert(`API Inference Execution Error: ${err.message || err}`);
    } finally {
      setLoading(false);
      fetchDockerStatus();
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans select-none antialiased relative overflow-hidden">
      
      {/* Ambient Background Glowing Orbs for Premium Depth */}
      <div className="absolute top-[-10%] left-[-5%] w-[40rem] h-[40rem] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[50rem] h-[50rem] bg-cyan-600/10 rounded-full blur-[150px] pointer-events-none z-0"></div>

      {/* Premium Header */}
      <header className="border-b border-white/[0.05] bg-[#030712]/60 backdrop-blur-2xl sticky top-0 z-50 py-4 px-8 flex justify-between items-center shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-cyan-500 rounded-xl blur-[10px] opacity-40 group-hover:opacity-70 transition-opacity duration-500"></div>
            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center shadow-2xl">
              <Hexagon className="w-6 h-6 text-cyan-400 stroke-[2]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                MediScan
              </h1>
              <span className="text-[9px] font-mono tracking-widest bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 px-2.5 py-0.5 rounded-full uppercase">
                Clinical Grade
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500 mt-0.5">
              PyTorch ResNet-50 Diagnostic Engine
            </p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/[0.02] border border-white/[0.05] shadow-inner backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold leading-tight">Validation</span>
              <span className="text-sm font-mono font-bold text-white leading-tight">86.9% Acc</span>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/[0.02] border border-white/[0.05] shadow-inner backdrop-blur-md">
            <Zap className={`w-4 h-4 ${dockerStatus.state === 'running' ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'text-rose-400'}`} />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold leading-tight">Inference API</span>
              <span className={`text-sm font-mono font-bold leading-tight ${dockerStatus.state === 'running' ? 'text-cyan-300' : 'text-rose-300'}`}>
                {dockerStatus.state === 'running' ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs - Floating Island Style */}
      <div className="w-full flex justify-center mt-8 relative z-10">
        <nav className="bg-white/[0.03] border border-white/[0.05] p-1.5 rounded-2xl flex gap-1 backdrop-blur-xl shadow-2xl">
          <button
            onClick={() => setCurrentTab('diagnostics')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-300 ${
              currentTab === 'diagnostics'
                ? 'bg-gradient-to-b from-cyan-500 to-cyan-600 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.3)] scale-100'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05] scale-95'
            }`}
          >
            <Brain className="w-4 h-4" />
            DIAGNOSTICS
          </button>
          <button
            onClick={() => setCurrentTab('xai')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-300 ${
              currentTab === 'xai'
                ? 'bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] scale-100'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05] scale-95'
            }`}
          >
            <Sliders className="w-4 h-4" />
            XAI WORKBENCH
          </button>
          <button
            onClick={() => setCurrentTab('mlops')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-300 ${
              currentTab === 'mlops'
                ? 'bg-gradient-to-b from-slate-700 to-slate-800 text-white shadow-[0_0_20px_rgba(100,116,139,0.3)] scale-100'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05] scale-95'
            }`}
          >
            <Terminal className="w-4 h-4" />
            SYSTEM LOGS
          </button>
        </nav>
      </div>

      {/* Main Workspace Stage */}
      <main className="flex-grow max-w-[1500px] w-full mx-auto p-4 lg:p-8 mt-4 relative z-10">
        <AnimatePresence mode="wait">
          {currentTab === 'diagnostics' && (
            <motion.div
              key="diagnostics-tab"
              initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start"
            >
              {/* Left Column: Visual Diagnostic Viewer */}
              <section className="xl:col-span-5 space-y-6 xl:sticky xl:top-[120px]">
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
                  <div className="bg-[#030712]/50 rounded-[1.25rem] p-6 border border-white/[0.02]">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                          <Activity className="w-4 h-4 text-cyan-400" />
                        </div>
                        <span className="text-base font-bold text-slate-100 tracking-tight">
                          Radiography Viewer
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-slate-500 bg-white/[0.03] px-2 py-1 rounded-md">
                          INPUT STAGE
                        </span>
                      </div>
                    </div>

                    <AnatomyChart
                      xray={selectedXray}
                      isCustom={isCustom}
                      customImageSrc={customImageSrc}
                      prepConfig={prepConfig}
                      gradCamConfig={gradCamConfig}
                      showGradCam={showGradCam}
                      inferenceResult={inferenceResult}
                      selectedAreaIndex={selectedAreaIndex}
                      setSelectedAreaIndex={setSelectedAreaIndex}
                    />
                  </div>
                </div>
              </section>

              {/* Right Column: Case selector & Classification reports */}
              <section className="xl:col-span-7">
                <ModelBench
                  onRunInference={handleRunInference}
                  selectedXray={selectedXray}
                  setSelectedXray={setSelectedXray}
                  isCustom={isCustom}
                  setIsCustom={setIsCustom}
                  customImageSrc={customImageSrc}
                  setCustomImageSrc={setCustomImageSrc}
                  inferenceResult={inferenceResult}
                  loading={loading}
                />
              </section>
            </motion.div>
          )}

          {currentTab === 'xai' && (
            <motion.div
              key="xai-tab"
              initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* Left Column: Parameter controls */}
              <section className="lg:col-span-7 space-y-6">
                <GradCamVisualizer
                  config={gradCamConfig}
                  onChange={setGradCamConfig}
                  showGradCam={showGradCam}
                  onToggleShow={setShowGradCam}
                  disabled={!inferenceResult}
                />
                <PreprocessPanel
                  config={prepConfig}
                  onChange={setPrepConfig}
                />
              </section>

              {/* Right Column: Visual Preview */}
              <section className="lg:col-span-5 space-y-6 lg:sticky lg:top-[120px]">
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
                  <div className="bg-[#030712]/50 rounded-[1.25rem] p-6 border border-white/[0.02]">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                          <Layers className="w-4 h-4 text-indigo-400" />
                        </div>
                        <span className="text-base font-bold text-slate-100 tracking-tight">
                          Explainability Viewer
                        </span>
                      </div>
                    </div>

                    <AnatomyChart
                      xray={selectedXray}
                      isCustom={isCustom}
                      customImageSrc={customImageSrc}
                      prepConfig={prepConfig}
                      gradCamConfig={gradCamConfig}
                      showGradCam={showGradCam}
                      inferenceResult={inferenceResult}
                      selectedAreaIndex={selectedAreaIndex}
                      setSelectedAreaIndex={setSelectedAreaIndex}
                    />
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {currentTab === 'mlops' && (
            <motion.div
              key="mlops-tab"
              initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="max-w-[1200px] mx-auto w-full"
            >
              <FastApiSandbox
                dockerStatus={dockerStatus}
                onControlContainer={handleControlContainer}
                onClearLogs={handleClearLogs}
                inferenceResult={inferenceResult}
                prepConfig={prepConfig}
                selectedSampleName={isCustom ? 'Uploaded_Diagnosis_File.png' : selectedXray.name}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Global Footer */}
      <footer className="border-t border-white/[0.05] mt-auto py-6 px-8 text-center text-slate-500 bg-[#030712]/80 backdrop-blur-md flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
        <div className="flex items-center gap-2 font-medium text-xs">
          <Heart className="w-4 h-4 text-rose-500 animate-pulse drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
          <span className="text-slate-400">Clinical AI Interpretability Engine</span>
        </div>
        <div className="font-mono text-[10px] text-slate-500 tracking-widest uppercase flex gap-4">
          <span>PyTorch 2.1.2</span>
          <span>Node.js</span>
          <span>ResNet-50</span>
        </div>
      </footer>
    </div>
  );
}
