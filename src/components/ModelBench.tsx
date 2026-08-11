import React, { useState } from 'react';
import { SampleXray, InferenceResult, PreprocessingConfig } from '../types';
import { SAMPLE_XRAYS } from '../data/samples';
import { Upload, Activity, AlertCircle, TrendingUp, BarChart2, FileText, ChevronRight, BrainCircuit, ScanLine } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ModelBenchProps {
  onRunInference: (
    xray: SampleXray,
    isCustom: boolean,
    customImageSrc: string | null,
    onSuccess: (res: InferenceResult) => void
  ) => void;
  selectedXray: SampleXray;
  setSelectedXray: (xray: SampleXray) => void;
  isCustom: boolean;
  setIsCustom: (isCustom: boolean) => void;
  customImageSrc: string | null;
  setCustomImageSrc: (src: string | null) => void;
  inferenceResult: InferenceResult | null;
  loading: boolean;
  selectedAreaIndex?: number | null;
  setSelectedAreaIndex?: (idx: number | null) => void;
  prepConfig?: PreprocessingConfig;
}

export const ModelBench: React.FC<ModelBenchProps> = ({
  onRunInference,
  selectedXray,
  setSelectedXray,
  isCustom,
  setIsCustom,
  customImageSrc,
  setCustomImageSrc,
  inferenceResult,
  loading,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [resultTab, setResultTab] = useState<'overview' | 'clinical' | 'performance'>('overview');

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Medical classification requires an image file stream (PNG/JPEG).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setCustomImageSrc(e.target?.result as string);
      setIsCustom(true);
      const customXray: SampleXray = {
        id: 'custom-upload',
        name: file.name,
        type: 'normal',
        metadata: {
          id: `USR-${Math.floor(100 + Math.random() * 899)}`,
          age: 40,
          gender: 'M',
          coughDuration: 'Unknown',
          fever: 'No',
          oxygenSat: 96,
        },
        clinicalFindings: 'Custom uploaded digital image stream awaiting server-side CNN classification.',
        pathologicalAreas: [],
      };
      setSelectedXray(customXray);
      
      // Auto-trigger inference for an incredibly fluid UX
      onRunInference(customXray, true, e.target?.result as string, () => {});
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Input Workbench - Nested Apple Style Card */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
        <div className="bg-[#030712]/50 rounded-[1.25rem] p-6 lg:p-8 border border-white/[0.02]">
          
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-3 tracking-tight">
              <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <BrainCircuit className="w-5 h-5 text-indigo-400" />
              </div>
              Data Ingestion Workbench
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left: Case Library */}
            <div className="space-y-4">
              <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase flex items-center gap-2">
                <FileText className="w-3 h-3" />
                Select Patient Cohort
              </span>
              <div className="grid grid-cols-1 gap-3 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {SAMPLE_XRAYS.map((item) => {
                  const isSelected = !isCustom && selectedXray.id === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSelectedXray(item);
                        setIsCustom(false);
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all duration-300 flex items-center justify-between group ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                          : 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.1] hover:scale-[1.02]'
                      }`}
                    >
                      <div className="truncate max-w-[220px]">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${item.type === 'normal' ? 'bg-emerald-400 text-emerald-400' : 'bg-rose-400 text-rose-400'}`} />
                          <span className="text-sm font-bold text-slate-200 truncate group-hover:text-white transition-colors">{item.name}</span>
                        </div>
                        <span className="text-xs text-slate-500 font-mono">
                          ID: {item.metadata.id} • {item.metadata.age}y/o
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Drag & Drop Dropzone */}
            <div className="flex flex-col h-full">
              <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-4 flex items-center gap-2">
                <Upload className="w-3 h-3" />
                Custom Ingestion
              </span>
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`relative flex-grow border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-6 text-center transition-all duration-300 cursor-pointer overflow-hidden group ${
                  dragActive 
                    ? 'border-indigo-400 bg-indigo-500/10 scale-[1.02] shadow-[0_0_30px_rgba(99,102,241,0.2)]' 
                    : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20'
                } ${isCustom ? 'border-indigo-500/50 bg-indigo-500/5' : ''}`}
              >
                {dragActive && (
                  <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full animate-pulse z-0"></div>
                )}
                
                <input
                  id="file-upload-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="file-upload-input" className="cursor-pointer flex flex-col items-center justify-center relative z-10 w-full h-full">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-all duration-300 ${dragActive ? 'bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)]' : 'bg-white/5 group-hover:bg-white/10 group-hover:scale-110'}`}>
                    <Upload className={`w-6 h-6 transition-colors ${dragActive ? 'text-white' : 'text-slate-400'}`} />
                  </div>
                  <span className="text-base text-slate-200 font-bold mb-2 tracking-tight">
                    {isCustom ? 'Replace Uploaded Image' : 'Drag & Drop X-Ray File'}
                  </span>
                  <span className="text-xs text-slate-500 font-medium max-w-[200px]">
                    PNG, JPEG up to 10MB. Inference will run automatically.
                  </span>
                </label>
              </div>
            </div>
          </div>
          
          {/* Action Footer */}
          <div className="mt-8 pt-6 border-t border-white/[0.05] flex justify-between items-center">
            <span className="text-xs text-slate-500 hidden md:block">
              Models are loaded into system memory. Inference takes ~4s on CPU.
            </span>
            <button
              onClick={() => onRunInference(selectedXray, isCustom, customImageSrc, () => setResultTab('overview'))}
              disabled={loading}
              className={`px-8 py-3.5 rounded-xl font-bold tracking-wide flex items-center gap-3 transition-all duration-300 shadow-xl ${
                loading
                  ? 'bg-indigo-500/50 text-white/50 cursor-not-allowed scale-95'
                  : 'bg-indigo-500 hover:bg-indigo-400 text-white hover:scale-105 hover:shadow-[0_0_30px_rgba(99,102,241,0.4)]'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  PROCESSING TENSORS...
                </>
              ) : (
                <>
                  <ScanLine className="w-5 h-5" />
                  EXECUTE INFERENCE
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Results Dashboard */}
      <AnimatePresence>
        {inferenceResult && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-1.5 shadow-[0_15px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl relative overflow-hidden"
          >
            {/* Ambient result glow */}
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-32 blur-[100px] pointer-events-none z-0 ${inferenceResult.type === 'normal' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}></div>

            <div className="bg-[#030712]/70 rounded-[1.25rem] p-6 lg:p-8 border border-white/[0.05] relative z-10">
              
              {/* Tab Navigation */}
              <div className="flex flex-wrap gap-2 border-b border-white/[0.05] pb-6 mb-8">
                {(['overview', 'clinical', 'performance'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setResultTab(tab)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
                      resultTab === tab
                        ? 'bg-white/10 text-white shadow-inner border border-white/20'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab.replace('-', ' ')}
                  </button>
                ))}
              </div>

              {/* Tab Content Areas */}
              <div className="min-h-[300px]">
                {resultTab === 'overview' && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                    className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center"
                  >
                    {/* Primary Verdict */}
                    <div className="md:col-span-5 text-center md:text-left space-y-6">
                      <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                        Final Model Verdict
                      </span>
                      <h2 className={`text-5xl lg:text-6xl font-black tracking-tighter ${
                        inferenceResult.type === 'normal' ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.3)]' : 'text-rose-400 drop-shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                      }`}>
                        {inferenceResult.type === 'normal' ? 'NORMAL' : 'PNEUMONIA'}
                      </h2>
                      <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] backdrop-blur-md">
                        <Activity className={`w-5 h-5 ${inferenceResult.type === 'normal' ? 'text-emerald-400' : 'text-rose-400'}`} />
                        <span className="text-xl font-mono text-white font-bold">
                          {inferenceResult.probability.toFixed(1)}% Confidence
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed font-medium">
                        {inferenceResult.type === 'normal' 
                          ? 'No significant pulmonary abnormalities detected in the provided radiography.' 
                          : 'High confidence features indicating fluid infiltration or consolidation detected.'}
                      </p>
                    </div>

                    {/* Confidence Bars */}
                    <div className="md:col-span-7 space-y-6 bg-white/[0.02] p-6 rounded-3xl border border-white/[0.05]">
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-300">
                          <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-400"></div> Pneumonia Probability</span>
                          <span className="font-mono text-white">{inferenceResult.pneumoniaProb.toFixed(1)}%</span>
                        </div>
                        <div className="h-4 w-full bg-black/50 rounded-full overflow-hidden border border-white/5 p-0.5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${inferenceResult.pneumoniaProb}%` }}
                            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.5)]" 
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-300">
                          <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400"></div> Normal Probability</span>
                          <span className="font-mono text-white">{inferenceResult.normalProb.toFixed(1)}%</span>
                        </div>
                        <div className="h-4 w-full bg-black/50 rounded-full overflow-hidden border border-white/5 p-0.5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${inferenceResult.normalProb}%` }}
                            transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]" 
                          />
                        </div>
                      </div>
                      
                      <div className="mt-6 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex gap-3">
                        <AlertCircle className="w-5 h-5 text-indigo-400 shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-slate-200 block mb-1 uppercase tracking-widest">Grad-CAM Explainability</span>
                          <p className="text-sm text-slate-400 font-serif italic">
                            "{inferenceResult.explainability}"
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {resultTab === 'clinical' && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-6"
                  >
                    {/* Clinical Feature Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-5 hover:bg-white/[0.04] transition-colors">
                        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block mb-4">Consolidation</span>
                        <div className="flex items-end gap-2">
                          <span className="text-3xl font-black text-white">{inferenceResult.clinicalAttributes.consolidation.toFixed(1)}</span>
                          <span className="text-sm text-slate-500 font-mono mb-1">%</span>
                        </div>
                      </div>
                      <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-5 hover:bg-white/[0.04] transition-colors">
                        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block mb-4">Infiltrates</span>
                        <div className="flex items-end gap-2">
                          <span className="text-3xl font-black text-white">{inferenceResult.clinicalAttributes.infiltrates.toFixed(1)}</span>
                          <span className="text-sm text-slate-500 font-mono mb-1">%</span>
                        </div>
                      </div>
                      <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-5 hover:bg-white/[0.04] transition-colors">
                        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block mb-4">Pleural Effusion</span>
                        <div className="flex items-end gap-2">
                          <span className="text-3xl font-black text-white">{inferenceResult.clinicalAttributes.pleuralEffusion.toFixed(1)}</span>
                          <span className="text-sm text-slate-500 font-mono mb-1">%</span>
                        </div>
                      </div>
                      <div className={`border rounded-3xl p-5 transition-colors ${inferenceResult.clinicalAttributes.airBronchograms ? 'bg-rose-500/10 border-rose-500/30' : 'bg-white/[0.02] border-white/[0.05]'}`}>
                        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block mb-4">Air Bronchograms</span>
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_currentColor] ${inferenceResult.clinicalAttributes.airBronchograms ? 'bg-rose-400 text-rose-400' : 'bg-slate-700 text-slate-700'}`}></div>
                          <span className="text-xl font-bold text-white">
                            {inferenceResult.clinicalAttributes.airBronchograms ? 'DETECTED' : 'CLEAR'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Uncertainty Warning */}
                    {inferenceResult.probability >= 50 && inferenceResult.probability <= 65 && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex items-start gap-4">
                        <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-1" />
                        <div>
                          <h4 className="text-sm font-bold text-amber-300 mb-1 tracking-tight">Uncertainty Calibration Warning</h4>
                          <p className="text-sm text-amber-200/70 leading-relaxed">
                            The model is expressing high uncertainty ({inferenceResult.probability.toFixed(1)}%). 
                            Because this network is optimized for extreme recall (Sensitivity = 99%), it aggressively flags ambiguous textures to prevent false negatives. 
                            <strong> Human radiological review is strictly required.</strong>
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {resultTab === 'performance' && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                  >
                    <div className="space-y-4">
                      <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 hover:bg-white/[0.04] transition-colors">
                        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block mb-4 flex items-center gap-2">
                          <TrendingUp className="w-3 h-3" />
                          Model Pipeline
                        </span>
                        <ul className="space-y-3 font-mono text-sm">
                          <li className="flex justify-between"><span className="text-slate-500">Backbone</span> <span className="text-cyan-300">ResNet-50</span></li>
                          <li className="flex justify-between"><span className="text-slate-500">Epochs</span> <span className="text-slate-300">25 (Early Stop)</span></li>
                          <li className="flex justify-between"><span className="text-slate-500">Test N</span> <span className="text-slate-300">624 Images</span></li>
                          <li className="flex justify-between"><span className="text-slate-500">Latency</span> <span className="text-slate-300">{inferenceResult.latencyMs}ms</span></li>
                        </ul>
                      </div>
                      
                      <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6">
                        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block mb-2">
                          Methodological Care & Patient Leakage
                        </span>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          A strict methodological approach was used. The dataset was split <strong className="text-white">by Patient ID</strong>, not randomly by image. This prevents data leakage and artificially inflated metrics.
                        </p>
                      </div>
                    </div>

                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 flex flex-col justify-center text-center group hover:bg-white/[0.04] transition-all cursor-pointer">
                      <BarChart2 className="w-12 h-12 text-indigo-400 mx-auto mb-4 group-hover:scale-110 transition-transform duration-500" />
                      <h4 className="text-lg font-bold text-white mb-2 tracking-tight">Full Evaluation Report</h4>
                      <p className="text-xs text-slate-400 mb-6 px-4">
                        View the comprehensive Model Card detailing the ROC AUC, confusion matrix (387 TP / 3 FN), and ethical constraints.
                      </p>
                      <a href="https://github.com/AryaAjayan/MediScan/blob/master/MODEL_CARD.md" target="_blank" rel="noopener noreferrer" className="mx-auto flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-300 bg-indigo-500/10 px-6 py-3 rounded-full hover:bg-indigo-500/20 border border-indigo-500/30 transition-all">
                        Open Model Card <ChevronRight className="w-4 h-4" />
                      </a>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
