import React from 'react';
import { GradCamConfig } from '../types';
import { Layers, EyeOff, Activity, HelpCircle } from 'lucide-react';

interface GradCamVisualizerProps {
  config: GradCamConfig;
  onChange: (newConfig: GradCamConfig) => void;
  showGradCam: boolean;
  onToggleShow: (show: boolean) => void;
  disabled: boolean;
}

export const GradCamVisualizer: React.FC<GradCamVisualizerProps> = ({
  config,
  onChange,
  showGradCam,
  onToggleShow,
  disabled
}) => {
  const updateKey = <K extends keyof GradCamConfig>(key: K, value: GradCamConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  const layersList = [
    {
      id: 'layer1.2.conv3' as const,
      label: 'Conv1 (layer1)',
      desc: 'Low-level spatial filters. Attributes to shallow textural features, crisp rib bone borders, and chest contours.',
    },
    {
      id: 'layer2.3.conv3' as const,
      label: 'Conv2 (layer2)',
      desc: 'Mid-level linear outlines. Captures bronchial structures and major diaphragmatic or cardiovascular silhouettes.',
    },
    {
      id: 'layer3.5.conv3' as const,
      label: 'Conv3 (layer3)',
      desc: 'High-level anatomical contours. Focuses on regional lung expansions and general bilateral pleural spaces.',
    },
    {
      id: 'layer4.2.conv3' as const,
      label: 'Conv4 (layer4)',
      desc: 'Abstract semantic pathology features. Deepest ResNet-50 layer; targets alveolar consolidation and air bronchograms.',
    }
  ];

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between ${disabled ? 'opacity-65 pointer-events-none' : ''}`}>
      <div>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold text-slate-200 tracking-tight">
              Explainable AI: Grad-CAM Activation Mapping
            </span>
          </div>
          <button
            onClick={() => onToggleShow(!showGradCam)}
            disabled={disabled}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg transition-all border ${
              showGradCam
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold hover:bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-900'
            }`}
          >
            {showGradCam ? (
              <>
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                Grad-CAM: ACTIVE
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                Grad-CAM: DISABLED
              </>
            )}
          </button>
        </div>

        <p className="text-[12px] text-slate-400 mb-5 leading-relaxed">
          Grad-CAM (Gradient-weighted Class Activation Mapping) uses gradients of target classes flowing into the final convolutional layer to produce coarse heatmaps highlighting discriminative clinical regions.
        </p>

        {/* 1. Colormap Visual Option Selector */}
        <div className="mb-5">
          <label className="text-xs font-mono text-slate-300 mb-2.5 block">
            Visualization Colormap Index
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'jet', label: 'Jet (Spectral)', gradient: 'from-blue-600 via-green-500 to-red-500' },
              { id: 'viridis', label: 'Viridis (Contrast)', gradient: 'from-indigo-950 via-teal-600 to-yellow-400' },
              { id: 'inferno', label: 'Inferno (Thermal)', gradient: 'from-black via-fuchsia-700 to-yellow-300' },
              { id: 'hot', label: 'Hot (Ironbow)', gradient: 'from-black via-red-650 to-white' },
              { id: 'magma', label: 'Magma (Sunset)', gradient: 'from-black via-pink-700 to-yellow-300' },
            ].map((mapItem) => (
              <button
                key={mapItem.id}
                onClick={() => updateKey('colormap', mapItem.id as any)}
                className={`p-2 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  config.colormap === mapItem.id
                    ? 'border-cyan-500 bg-cyan-950/20 shadow-[inset_0_0_8px_rgba(6,182,212,0.15)]'
                    : 'border-slate-800 bg-slate-950 hover:bg-slate-900'
                }`}
              >
                <span className="text-xs text-slate-300 font-medium capitalize mb-1.5">{mapItem.label}</span>
                <div className={`w-full h-1.5 rounded-full bg-gradient-to-r ${mapItem.gradient}`} />
              </button>
            ))}
          </div>
        </div>

        {/* 2. Layer Depth Target Selection */}
        <div className="mb-5">
          <label className="text-xs font-mono text-slate-300 mb-2 block">
            ResNet Layer Mapping Attributions
          </label>
          <div className="space-y-2">
            {layersList.map((layer) => (
              <div
                key={layer.id}
                onClick={() => updateKey('layer', layer.id)}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                  config.layer === layer.id
                    ? 'border-cyan-500 bg-cyan-950/20'
                    : 'border-slate-800 bg-slate-950/50 hover:bg-slate-900/40'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-[11px] font-mono leading-none ${
                    config.layer === layer.id ? 'text-cyan-300 font-bold' : 'text-slate-400'
                  }`}>
                    {layer.id}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium truncate ${
                    config.layer === layer.id ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-900 text-slate-500'
                  }`}>
                    {layer.label}
                  </span>
                </div>
                <p className="text-[10px] text-slate-450 leading-snug">
                  {layer.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Opacity Controls */}
      <div className="border-t border-slate-800 pt-4 mt-auto">
        <div className="flex justify-between items-center mb-1 text-xs text-slate-300">
          <span className="flex items-center gap-1">
            Grad-CAM Overlay Opacity
          </span>
          <span className="font-mono text-cyan-400">{Math.round(config.opacity * 100)}%</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="0.9"
          step="0.05"
          value={config.opacity}
          disabled={!showGradCam || disabled}
          onChange={(e) => updateKey('opacity', parseFloat(e.target.value))}
          className="w-full h-1.5 accent-cyan-500 bg-slate-950 rounded-lg cursor-pointer disabled:opacity-40"
        />
        <div className="flex justify-between text-[9px] text-slate-500 mt-1 font-mono">
          <span>0.1 (Faint Blend)</span>
          <span>0.9 (Solid Heatmap)</span>
        </div>
      </div>
    </div>
  );
};
