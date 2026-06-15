import React from 'react';
import { PreprocessingConfig } from '../types';
import { Sliders, RotateCw, RefreshCw, Eye, Percent } from 'lucide-react';

interface PreprocessPanelProps {
  config: PreprocessingConfig;
  onChange: (newConfig: PreprocessingConfig) => void;
}

export const PreprocessPanel: React.FC<PreprocessPanelProps> = ({ config, onChange }) => {
  const updateKey = <K extends keyof PreprocessingConfig>(key: K, value: PreprocessingConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  const resetToDefaults = () => {
    onChange({
      rotation: 0,
      horizontalFlip: false,
      brightness: 1.0,
      contrast: 1.0,
      resize: 224,
      normMean: [0.485, 0.456, 0.406],
      normStd: [0.229, 0.224, 0.225],
      gaussianNoise: 0.0,
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold text-slate-200 tracking-tight">
              Pre-alignment & Torchvision Augmentations
            </span>
          </div>
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Reset Transforms
          </button>
        </div>

        <p className="text-[12px] text-slate-400 mb-5 leading-relaxed">
          Fine-tuned ResNet-50 models require specific resizing, standardizations, and augmentation steps to improve generalization and counter sparse medical datasets.
        </p>

        {/* Augmentation Presets */}
        <div className="mb-5 bg-slate-950 p-2.5 rounded-xl border border-slate-850">
          <span className="text-[10px] font-mono text-slate-500 block uppercase tracking-wider mb-2">
            AUGMENTATION PROFILE PRESETS
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Standard', config: { rotation: 0, horizontalFlip: false, brightness: 1.0, contrast: 1.0, resize: 224, normMean: [0.485, 0.456, 0.406], normStd: [0.229, 0.224, 0.225], gaussianNoise: 0.0 } },
              { label: 'Diagnostic', config: { rotation: 5, horizontalFlip: false, brightness: 1.15, contrast: 1.35, resize: 224, normMean: [0.485, 0.456, 0.406], normStd: [0.229, 0.224, 0.225], gaussianNoise: 0.05 } },
              { label: 'Scanner Noise', config: { rotation: -10, horizontalFlip: true, brightness: 0.85, contrast: 0.9, resize: 128, normMean: [0.485, 0.456, 0.406], normStd: [0.229, 0.224, 0.225], gaussianNoise: 0.3 } },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChange(preset.config as any)}
                className="py-1 px-1.5 bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-[10px] font-mono rounded-lg transition-all text-slate-350 hover:text-white cursor-pointer text-center"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* 1. Resizing & Interpolation Target */}
        <div className="mb-5">
          <label className="text-xs font-mono text-slate-300 flex justify-between items-center mb-2">
            <span>torchvision.transforms.Resize</span>
            <span className="text-cyan-400 font-bold">{config.resize} × {config.resize}px</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {([128, 224, 256, 512] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => updateKey('resize', size)}
                className={`py-1.5 px-1 rounded-lg text-xs font-mono border transition-all ${
                  config.resize === size
                    ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                }`}
              >
                {size}²
              </button>
            ))}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            * 224x224px is the optimized ImageNet standard to balance floating-point ops and lesion resolution.
          </span>
        </div>

        {/* 2. Spatial Augmentations */}
        <div className="space-y-4 mb-5 border-t border-slate-800 pt-4">
          <h4 className="text-[11px] font-mono tracking-wider text-slate-500 uppercase">
            Spatial augmentations (Affine/Flip)
          </h4>

          {/* Rotation Row */}
          <div>
            <div className="flex justify-between items-center mb-1 text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5 text-slate-400" /> Random Rotation
              </span>
              <span className="font-mono text-cyan-400">{config.rotation}°</span>
            </div>
            <input
              type="range"
              min="-30"
              max="30"
              value={config.rotation}
              onChange={(e) => updateKey('rotation', parseInt(e.target.value))}
              className="w-full accent-cyan-500 bg-slate-950 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Horizontal Flip */}
          <div className="flex justify-between items-center bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/40">
            <span className="text-xs text-slate-300 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-slate-400" /> Random Horizontal Flip
            </span>
            <button
              onClick={() => updateKey('horizontalFlip', !config.horizontalFlip)}
              className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 outline-none ${
                config.horizontalFlip ? 'bg-cyan-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                  config.horizontalFlip ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 3. Pixel Intensity Normalizations */}
        <div className="space-y-4 mb-5 border-t border-slate-800 pt-4">
          <h4 className="text-[11px] font-mono tracking-wider text-slate-500 uppercase">
            Intensity & Noise transformations
          </h4>

          {/* Brightness */}
          <div>
            <div className="flex justify-between items-center mb-1 text-xs text-slate-300">
              <span>ColorJitter: Brightness</span>
              <span className="font-mono text-cyan-400">{config.brightness.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={config.brightness}
              onChange={(e) => updateKey('brightness', parseFloat(e.target.value))}
              className="w-full accent-cyan-500 bg-slate-950 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Contrast */}
          <div>
            <div className="flex justify-between items-center mb-1 text-xs text-slate-300">
              <span>ColorJitter: Contrast</span>
              <span className="font-mono text-cyan-400">{config.contrast.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={config.contrast}
              onChange={(e) => updateKey('contrast', parseFloat(e.target.value))}
              className="w-full accent-cyan-500 bg-slate-950 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Gaussian Noise */}
          <div>
            <div className="flex justify-between items-center mb-1 text-xs text-slate-300">
              <span>Gaussian Noise Augmentation</span>
              <span className="font-mono text-cyan-400">+{Math.round(config.gaussianNoise * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.8"
              step="0.05"
              value={config.gaussianNoise}
              onChange={(e) => updateKey('gaussianNoise', parseFloat(e.target.value))}
              className="w-full accent-cyan-500 bg-slate-950 h-1.5 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 4. Tensor Normalization Vector Specs */}
      <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800/80">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[11px] font-mono text-slate-400">transforms.Normalize (ImageNet)</span>
          <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 px-1.5 py-0.5 rounded">
            RGB Channel
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-[11px] font-mono">
          <div>
            <span className="text-slate-500 block">Mean (μ)</span>
            <span className="text-slate-350 bg-slate-900 px-2 py-0.5 rounded inline-block mt-1 w-full text-center border border-slate-900">
              [{config.normMean.join(', ')}]
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Std Dev (σ)</span>
            <span className="text-slate-350 bg-slate-900 px-2 py-0.5 rounded inline-block mt-1 w-full text-center border border-slate-900">
              [{config.normStd.join(', ')}]
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
