import React, { useRef, useEffect } from 'react';
import { SampleXray, PreprocessingConfig, GradCamConfig, InferenceResult } from '../types';

interface AnatomyChartProps {
  xray: SampleXray;
  isCustom: boolean;
  customImageSrc: string | null;
  prepConfig: PreprocessingConfig;
  gradCamConfig: GradCamConfig;
  showGradCam: boolean;
  inferenceResult: InferenceResult | null;
  selectedAreaIndex: number | null;
  setSelectedAreaIndex: (idx: number | null) => void;
}

// Colormap lookup functions
function getColormapColor(value: number, colormap: 'jet' | 'viridis' | 'inferno' | 'hot' | 'magma'): { r: number, g: number, b: number } {
  const v = Math.max(0, Math.min(1, value));
  
  if (colormap === 'jet') {
    // Blue -> Cyan -> Green -> Yellow -> Red
    // Reference Jet color mapping
    const r = Math.round(Math.max(0, Math.min(255, 255 * (v < 0.35 ? 0 : v < 0.66 ? (v - 0.35) / 0.31 : v < 0.89 ? 1 : 1 - (v - 0.89) / 0.11 * 0.5))));
    const g = Math.round(Math.max(0, Math.min(255, 255 * (v < 0.125 ? 0 : v < 0.375 ? (v - 0.125) / 0.25 : v < 0.64 ? 1 : v < 0.91 ? 1 - (v - 0.64) / 0.27 : 0))));
    const b = Math.round(Math.max(0, Math.min(255, 255 * (v < 0.11 ? 0.5 + v / 0.11 * 0.5 : v < 0.34 ? 1 : v < 0.62 ? 1 - (v - 0.34) / 0.28 : 0))));
    return { r, g, b };
  } else if (colormap === 'hot') {
    // Black -> Red -> Orange -> Yellow -> White
    const r = Math.round(Math.max(0, Math.min(255, 255 * (v < 0.33 ? v / 0.33 : 1))));
    const g = Math.round(Math.max(0, Math.min(255, 255 * (v < 0.33 ? 0 : v < 0.66 ? (v - 0.33) / 0.33 : 1))));
    const b = Math.round(Math.max(0, Math.min(255, 255 * (v < 0.66 ? 0 : (v - 0.66) / 0.34))));
    return { r, g, b };
  } else if (colormap === 'inferno') {
    // Black -> Purple -> Orange -> Yellow
    const r = Math.round(Math.max(0, Math.min(255, 255 * (v < 0.4 ? v * 2 : 1))));
    const g = Math.round(Math.max(0, Math.min(255, 255 * (v < 0.4 ? v * 0.5 : v < 0.8 ? (v - 0.4) / 0.4 * 0.8 + 0.2 : 1))));
    const b = Math.round(Math.max(0, Math.min(255, 255 * (v < 0.2 ? v * 3 : v < 0.6 ? 0.6 - (v - 0.2) : v / 2 + 0.5))));
    return { r, g, b };
  } else if (colormap === 'magma') {
    // Black -> Purple -> Orange-red -> Yellow
    const r = Math.round(Math.max(0, Math.min(255, 255 * (v < 0.35 ? v * 1.5 : v < 0.7 ? 0.525 + (v - 0.35) * 1.35 : 1))));
    const g = Math.round(Math.max(0, Math.min(255, 255 * (v < 0.3 ? v * 0.3 : v < 0.6 ? 0.09 + (v - 0.3) * 1.7 : 0.6 + (v - 0.6) * 1.0))));
    const b = Math.round(Math.max(0, Math.min(255, 255 * (v < 0.2 ? v * 3.5 : v < 0.55 ? 0.7 - (v - 0.2) * 1.1 : 0.315 + (v - 0.55) * 1.955))));
    return { r, g, b };
  } else {
    // Viridis
    // Deep purple -> Blue -> Green -> Yellow
    const r = Math.round(Math.max(0, Math.min(255, 255 * (0.267 - 0.24 * v + 0.9 * v * v))));
    const g = Math.round(Math.max(0, Math.min(255, 255 * (0.004 + 0.95 * v - 0.15 * v * v))));
    const b = Math.round(Math.max(0, Math.min(255, 255 * (0.329 + 0.8 * v - 0.6 * v * v))));
    return { r, g, b };
  }
}

export const AnatomyChart: React.FC<AnatomyChartProps> = ({
  xray,
  isCustom,
  customImageSrc,
  prepConfig,
  gradCamConfig,
  showGradCam,
  inferenceResult,
  selectedAreaIndex,
  setSelectedAreaIndex,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Render Grad-CAM Heatmap onto Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!showGradCam || !inferenceResult || !inferenceResult.gradCamGrid) {
      return;
    }

    const grid = inferenceResult.gradCamGrid;
    const rows = grid.length;
    const cols = grid[0]?.length || 0;

    if (rows === 0 || cols === 0) return;

    // Create custom off-screen buffer to render raw 7x7 activation pixels
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cols;
    tempCanvas.height = rows;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    const imgData = tempCtx.createImageData(cols, rows);

    // Populate pixels based on colormap translation
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const val = grid[r][c];
        const color = getColormapColor(val, gradCamConfig.colormap);
        const idx = (r * cols + c) * 4;

        // Apply scaling thresholds so cooler background indices are more transparent
        const alpha = Math.round(val * 255);

        imgData.data[idx] = color.r;
        imgData.data[idx + 1] = color.g;
        imgData.data[idx + 2] = color.b;
        imgData.data[idx + 3] = alpha; 
      }
    }

    tempCtx.putImageData(imgData, 0, 0);

    // Draw raw 7x7 pixels onto larger canvas with smooth bilinear scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
  }, [inferenceResult, showGradCam, gradCamConfig.colormap, gradCamConfig.opacity]);

  // Construct styling variables according to Augmentation preprocessing configs
  const transformStyle: React.CSSProperties = {
    transform: `
      rotate(${prepConfig.rotation}deg) 
      scaleX(${prepConfig.horizontalFlip ? -1 : 1})
    `,
    filter: `
      brightness(${prepConfig.brightness}) 
      contrast(${prepConfig.contrast})
    `,
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  return (
    <div className="relative w-full aspect-square max-w-[500px] mx-auto bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col justify-between">
      {/* Absolute Header indicators */}
      <div className="absolute top-3 left-3 z-10 flex gap-2">
        <span className="text-[10px] font-mono tracking-wider bg-slate-900/80 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-md backdrop-blur-sm">
          {prepConfig.resize} × {prepConfig.resize}px Resized
        </span>
        {inferenceResult && (
          <span className="text-[10px] font-mono tracking-wider bg-emerald-950/80 border border-emerald-800/50 text-emerald-400 px-2 py-0.5 rounded-md backdrop-blur-sm">
            ResNet-50 Fine-Tuned
          </span>
        )}
      </div>

      <div className="absolute top-3 right-3 z-10">
        <span className="text-[10px] font-mono tracking-wider bg-slate-900/80 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-md backdrop-blur-sm uppercase">
          {isCustom ? 'User Image' : xray.metadata.id}
        </span>
      </div>

      {/* Main Image Viewport Area */}
      <div className="relative w-full flex-grow flex items-center justify-center p-4 bg-slate-950/70" style={{ minHeight: '380px' }}>
        
        {/* The visual target inside which transform and filter is applied */}
        <div id="xray-augmentation-stage" className="relative w-full aspect-square max-w-[390px] mx-auto rounded-lg overflow-hidden" style={transformStyle}>
          {isCustom && customImageSrc ? (
            /* Selected Custom Image Upload Interface */
            <img
              src={customImageSrc}
              alt="Custom Thorax Xray"
              className="w-full h-full object-cover select-none"
              referrerPolicy="no-referrer"
            />
          ) : (
            /* Procedural SVG Chest Vector Blueprint */
            <svg
              viewBox="0 0 200 200"
              className="w-full h-full bg-slate-950 select-none cursor-crosshair"
              id="procedural-xray-svg"
            >
              <defs>
                {/* Background Shadow Gradient */}
                <radialGradient id="chestGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#1e293b" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#020617" stopOpacity="0.85" />
                </radialGradient>

                {/* Left and Right Lung Ventilation Gradient */}
                <linearGradient id="lungField" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#030712" />
                  <stop offset="40%" stopColor="#0b1329" />
                  <stop offset="90%" stopColor="#1e1b4b" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#020617" />
                </linearGradient>

                {/* Left lung heart-shadow gradient */}
                <radialGradient id="heartShadow" cx="40%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#111827" stopOpacity="0.95" />
                  <stop offset="85%" stopColor="#030712" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#020617" stopOpacity="0.0" />
                </radialGradient>

                {/* Pneumonia Consolidation Blur Filter */}
                <filter id="pneumoniaBlur" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="8" />
                </filter>
                <filter id="patellaBlur" x="-10%" y="-10%" width="120%" height="120%">
                  <feGaussianBlur stdDeviation="3" />
                </filter>
                
                {/* Noise overlay pattern */}
                <filter id="noiseFilter">
                  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch" />
                  <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.12 0" />
                </filter>
              </defs>

              {/* 1. Underlying chest outline */}
              <rect width="200" height="200" fill="url(#chestGlow)" />
              <path d="M 40,30 C 40,20 160,20 160,30 C 170,50 180,120 170,165 C 160,185 140,190 100,192 C 60,190 40,185 30,165 C 20,120 30,50 40,30 Z" fill="#090d16" stroke="#1e293b" strokeWidth="1.5" />

              {/* 2. Lung Cavities */}
              {/* Right lung (on anatomical right, visual left side) */}
              <path d="M 92,38 C 80,31 52,42 45,55 C 38,72 38,125 43,155 C 50,162 72,166 90,164 C 95,155 93,120 93,75 C 93,50 95,43 92,38 Z" fill="url(#lungField)" stroke="#111827" strokeWidth="0.8" />
              {/* Left lung (on anatomical left, visual right side, includes heart notch) */}
              <path d="M 108,38 C 120,31 148,42 155,55 C 162,72 162,125 157,155 C 150,162 128,166 110,164 C 105,150 106,120 107,75 C 107,50 105,43 108,38 Z" fill="url(#lungField)" stroke="#111827" strokeWidth="0.8" />

              {/* 3. Heart shadow overlaying visual left/right (anatomical left) */}
              <path d="M 94,82 C 94,82 105,98 123,105 C 138,112 138,136 120,154 C 106,163 94,164 94,164 Z" fill="url(#heartShadow)" className="mix-blend-lighten" />
              <path d="M 94,80 C 94,80 110,95 125,115 C 132,125 130,145 118,154 C 102,162 94,163 94,163 Z" fill="none" stroke="#222530" strokeWidth="1" opacity="0.4" />

              {/* 4. Mediastinum Structure & Trachea */}
              <rect x="94" y="24" width="12" height="60" fill="#0c111d" />
              <path d="M 100,24 L 100,84" stroke="#05070a" strokeWidth="4" strokeDasharray="3,1" opacity="0.6" />
              
              {/* 5. Clavicles (collar bones) */}
              <path d="M 100,32 Q 65,34 33,26" fill="none" stroke="#475569" strokeWidth="2.5" opacity="0.65" />
              <path d="M 100,32 Q 135,34 167,26" fill="none" stroke="#475569" strokeWidth="2.5" opacity="0.65" />

              {/* 6. Vertebral Column / Spine outline */}
              {Array.from({ length: 18 }).map((_, i) => (
                <rect key={`vertebra-${i}`} x="95" y={32 + i * 8} width="10" height="5" rx="1.5" fill="#1e293b" opacity="0.45" stroke="#0c111a" strokeWidth="0.5" />
              ))}

              {/* 7. Anatomical Rib Cage (Curving across the lung spaces) */}
              {/* Right ribs (visual left) */}
              {Array.from({ length: 9 }).map((_, i) => (
                <path
                  key={`rib-r-${i}`}
                  d={`M 94,${45 + i * 11} Q ${75 - i * 1.5},${48 + i * 10} ${33 + i * 1},${50 + i * 12}`}
                  fill="none"
                  stroke="#334155"
                  strokeWidth="2"
                  opacity="0.35"
                />
              ))}
              {/* Left ribs (visual right) */}
              {Array.from({ length: 9 }).map((_, i) => (
                <path
                  key={`rib-l-${i}`}
                  d={`M 106,${45 + i * 11} Q ${125 + i * 1.5},${48 + i * 10} ${167 - i * 1},${50 + i * 12}`}
                  fill="none"
                  stroke="#334155"
                  strokeWidth="2"
                  opacity="0.35"
                />
              ))}

              {/* 8. Diaphragm Arches at the bottom */}
              <path d="M 28,166 Q 60,154 94,162 Q 140,154 172,166" fill="none" stroke="#2c3749" strokeWidth="1.5" />
              <path d="M 30,172 Q 62,152 92,163" fill="#070a11" stroke="#101725" strokeWidth="0.8" />
              <path d="M 92,163 Q 138,153 170,172" fill="#070a11" stroke="#101725" strokeWidth="0.8" />

              {/* 9. Pathology Layer (Pneumonia Consolidation fluid opacities) */}
              {!isCustom && xray.pathologicalAreas.map((area, idx) => (
                <g 
                  key={`pathology-${idx}`}
                  className="group cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAreaIndex(selectedAreaIndex === idx ? null : idx);
                  }}
                >
                  {/* Visual consolidation opacity blob */}
                  <ellipse
                    cx={area.cx}
                    cy={area.cy}
                    rx={area.rx}
                    ry={area.ry}
                    fill="#e2e8f0"
                    opacity={area.intensity * 0.42}
                    filter="url(#pneumoniaBlur)"
                  />
                  
                  {/* Additional dense consolidation core */}
                  <ellipse
                    cx={area.cx}
                    cy={area.cy}
                    rx={area.rx * 0.5}
                    ry={area.ry * 0.5}
                    fill="#ffffff"
                    opacity={area.intensity * 0.3}
                    filter="url(#pneumoniaBlur)"
                  />

                  {/* Highlight outline if user clicks/hovers the pathological area description */}
                  <ellipse
                    cx={area.cx}
                    cy={area.cy}
                    rx={area.rx + 8}
                    ry={area.ry + 8}
                    fill="none"
                    stroke={selectedAreaIndex === idx ? "#67e8f9" : "transparent"}
                    strokeWidth="1.5"
                    strokeDasharray="4,4"
                    className="transition-colors duration-200"
                  />
                </g>
              ))}

              {/* Noise layer matching OpenCV noise augmentation configuration */}
              {prepConfig.gaussianNoise > 0 && (
                <rect width="200" height="200" filter="url(#noiseFilter)" opacity={prepConfig.gaussianNoise} className="pointer-events-none" />
              )}
            </svg>
          )}

          {/* 10. Grad-CAM Overlay Canvas */}
          <canvas
            ref={canvasRef}
            width={224}
            height={224}
            style={{
              opacity: showGradCam ? gradCamConfig.opacity : 0,
              mixBlendMode: 'screen', // highly realistic overlay blending
              pointerEvents: 'none',
              transition: 'opacity 0.2s ease-in-out',
            }}
            className="absolute inset-0 w-full h-full object-cover select-none"
          />
        </div>
      </div>

      {/* Absolute Augmentation Watermark Overlay Grid */}
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent border-t border-slate-900 flex justify-between items-center z-10">
        <div className="flex flex-col">
          <span className="text-[11px] font-sans font-medium text-slate-200 truncate max-w-[280px]">
            {isCustom ? 'Uploaded Diagnostic File' : xray.name}
          </span>
          <span className="text-[9px] font-mono text-slate-500 uppercase">
            {isCustom ? 'CSV/JPEG file stream' : `Pt ID: ${xray.metadata.id} • ${xray.metadata.age}y/o • ${xray.metadata.gender}`}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-mono text-cyan-400">
            {showGradCam ? `${gradCamConfig.layer.split('.')[0]} active` : 'X-Ray Input'}
          </span>
        </div>
      </div>
    </div>
  );
};
