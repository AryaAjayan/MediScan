import { useState, useEffect } from 'react';
import { SAMPLE_XRAYS } from './data/samples';
import { SampleXray, PreprocessingConfig, GradCamConfig, InferenceResult, DockerStatus } from './types';
import { AnatomyChart } from './components/AnatomyChart';
import { PreprocessPanel } from './components/PreprocessPanel';
import { GradCamVisualizer } from './components/GradCamVisualizer';
import { ModelBench } from './components/ModelBench';
import { FastApiSandbox } from './components/FastApiSandbox';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, ShieldCheck, Heart, Info, Terminal, RefreshCw, Layers, Brain, Sliders } from 'lucide-react';

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

  // Fetch Docker status and logs periodically from express backend
  const fetchDockerStatus = async () => {
    try {
      const res = await fetch('/api/docker-status');
      if (res.ok) {
        const data = await res.json();
        setDockerStatus(data);
      }
    } catch (err) {
      console.error('Failed to sync FastAPI docker status:', err);
    }
  };

  useEffect(() => {
    fetchDockerStatus();
    const interval = setInterval(fetchDockerStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Post docker control commands to backend
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
      console.error('Failed to control docker microservice:', err);
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
      alert('Cannot execute inference. The self-hosted FastAPI Docker container is offline. Please start the container first.');
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

      // Scroll smoothly to results view if in viewport
      setTimeout(() => {
        document.getElementById('xray-augmentation-stage')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    } catch (err: any) {
      alert(`API Inference Execution Error: ${err.message || err}`);
    } finally {
      setLoading(false);
      // Refresh logs right away to show details
      fetchDockerStatus();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased animate-fade-in">
      {/* 1. System Navigation Top Banner */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 py-3 px-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/15">
            <Layers className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-slate-100 font-sans">
                MediScan - Chest X-Ray AI
              </h1>
              <span className="text-[10px] font-mono tracking-wider bg-cyan-950/80 border border-cyan-800 text-cyan-400 px-2 py-0.5 rounded-full font-bold">
                PRO v1.2
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Fine-Tuned Transfer Learning, OpenCV Preprocessing & Grad-CAM Model Attribution
            </p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>ResNet Model Status:</span>
            <span className="text-white font-bold">94.2% Acc Validated</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-800">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>CUDA Server:</span>
            <span className={dockerStatus.state === 'running' ? 'text-emerald-450 font-bold animate-pulse' : 'text-rose-450 font-bold'}>
              {dockerStatus.state === 'running' ? 'CONNECTED' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </header>

      {/* 2. Web App Navigation Workspace Tabs */}
      <nav className="bg-slate-900/30 border-b border-slate-900/60 py-2 px-6 flex gap-3 backdrop-blur-sm">
        <button
          onClick={() => setCurrentTab('diagnostics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all border cursor-pointer ${
            currentTab === 'diagnostics'
              ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-[0_0_12px_rgba(6,182,212,0.25)]'
              : 'bg-slate-950/40 text-slate-400 border-slate-900 hover:text-white hover:bg-slate-900/50'
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          DIAGNOSTIC HUB
        </button>
        <button
          onClick={() => setCurrentTab('xai')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all border cursor-pointer ${
            currentTab === 'xai'
              ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-[0_0_12px_rgba(6,182,212,0.25)]'
              : 'bg-slate-950/40 text-slate-400 border-slate-900 hover:text-white hover:bg-slate-900/50'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          XAI WORKBENCH
        </button>
        <button
          onClick={() => setCurrentTab('mlops')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all border cursor-pointer ${
            currentTab === 'mlops'
              ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-[0_0_12px_rgba(6,182,212,0.25)]'
              : 'bg-slate-950/40 text-slate-400 border-slate-900 hover:text-white hover:bg-slate-900/50'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          MLOPS SANDBOX
        </button>
      </nav>

      {/* 3. Primary Workspace Container */}
      <main className="flex-grow max-w-[1440px] w-full mx-auto p-4 lg:p-6">
        <AnimatePresence mode="wait">
          {currentTab === 'diagnostics' && (
            <motion.div
              key="diagnostics-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
            >
              {/* Left Column: Visual Diagnostic Viewer */}
              <section className="lg:col-span-5 space-y-6 lg:sticky lg:top-[80px]">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm font-semibold text-slate-200 tracking-tight">
                        Thoracic Diagnostic Viewer
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-slate-500">
                        REF: CTX-RN50
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

                  <AnimatePresence mode="wait">
                    {selectedAreaIndex !== null && !isCustom && selectedXray.pathologicalAreas[selectedAreaIndex] && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="bg-cyan-950/40 border border-cyan-800/40 rounded-xl p-3 flex gap-2.5 items-start"
                      >
                        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-bold text-cyan-200 block">
                            Pathological Focus: {selectedXray.pathologicalAreas[selectedAreaIndex].description}
                          </span>
                          <span className="text-[11px] text-slate-400 mt-0.5 block leading-relaxed">
                            Highlighted area corresponds to the focal fluid infiltration or lobar consolidation in the thorax. Grad-CAM visual overlay reveals matching extreme gradient-activation centers around these exact coordinates.
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {inferenceResult && (
                    <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">Toggle attribution overlays:</span>
                      <button
                        onClick={() => setShowGradCam(!showGradCam)}
                        className="text-cyan-400 hover:text-white font-mono font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                        {showGradCam ? 'Hide Heatmap' : 'Show Heatmap'}
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* Right Column: Case selector & Classification reports */}
              <section className="lg:col-span-7 space-y-6">
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
                  selectedAreaIndex={selectedAreaIndex}
                  setSelectedAreaIndex={setSelectedAreaIndex}
                />
              </section>
            </motion.div>
          )}

          {currentTab === 'xai' && (
            <motion.div
              key="xai-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
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
              <section className="lg:col-span-5 space-y-6 lg:sticky lg:top-[80px]">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm font-semibold text-slate-200 tracking-tight">
                        Explainability Visualizer Preview
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
              </section>
            </motion.div>
          )}

          {currentTab === 'mlops' && (
            <motion.div
              key="mlops-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="max-w-[1100px] mx-auto w-full"
            >
              <FastApiSandbox
                dockerStatus={dockerStatus}
                onControlContainer={handleControlContainer}
                inferenceResult={inferenceResult}
                prepConfig={prepConfig}
                selectedSampleName={isCustom ? 'Uploaded_Diagnosis_File.png' : selectedXray.name}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 4. Global Footer copyright and notes */}
      <footer className="border-t border-slate-900 mt-auto py-5 px-6 text-center text-slate-500 bg-slate-950 text-xs flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-1.5 font-medium">
          <Heart className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
          <span>Interactive Medical AI Deep Learning Explainer and Fine-tuning workbench.</span>
        </div>
        <div className="font-mono text-[10px] text-slate-600">
          Uvicorn 0.22.0 • FastAPI 0.100.0 • PyTorch 2.1.2+cu121 • ResNet-50
        </div>
      </footer>
    </div>
  );
}
