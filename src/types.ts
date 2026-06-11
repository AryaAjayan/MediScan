export type XrayType = 'normal' | 'pneumonia';

export interface PatientMetadata {
  id: string;
  age: number;
  gender: 'M' | 'F';
  coughDuration: string;
  fever: string;
  oxygenSat: number; // e.g., 98
}

export interface SampleXray {
  id: string;
  name: string;
  type: XrayType;
  metadata: PatientMetadata;
  imageUrl?: string; // If user leaves it, we render high-fidelity procedural elements
  clinicalFindings: string;
  // Visual structures for beautiful vector drawing of Chest X-Ray
  pathologicalAreas: Array<{
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    intensity: number; // 0 to 1
    description: string;
  }>;
}

export interface PreprocessingConfig {
  rotation: number; // degrees -30 to 30
  horizontalFlip: boolean;
  brightness: number; // 0.5 to 1.5
  contrast: number; // 0.5 to 1.5
  resize: 128 | 224 | 256 | 512;
  normMean: number[]; // e.g [0.485, 0.456, 0.406]
  normStd: number[]; // e.g [0.229, 0.224, 0.225]
  gaussianNoise: number; // 0 to 1
}

export interface GradCamConfig {
  opacity: number; // 0 to 1
  layer: 'layer1.2.conv3' | 'layer2.3.conv3' | 'layer3.5.conv3' | 'layer4.2.conv3'; // Layer depth selection
  colormap: 'jet' | 'viridis' | 'inferno' | 'hot';
}

export interface InferenceResult {
  id: string; // matches sample ID or 'custom'
  type: XrayType;
  probability: number; // 0 to 100
  normalProb: number; // percentage
  pneumoniaProb: number; // percentage
  latencyMs: number;
  imageDimensions: { w: number; h: number };
  resnetFeatures: {
    backbone: string; // e.g. "ResNet-50 (ImageNet Pre-trained)"
    fineTunedEpochs: number;
    activeChannels: number;
    lossAttribution: number;
  };
  clinicalAttributes: {
    consolidation: number; // percentage confidence of findings
    infiltrates: number;
    pleuralEffusion: number;
    airBronchograms: boolean;
  };
  gradCamGrid: number[][]; // 7x7 grid representing convolution weights
  explainability: string;
  dockerEndpointUsed: string;
}

export interface LogMessage {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  component: 'uvicorn' | 'pytorch' | 'docker' | 'fastapi';
  message: string;
}

export interface DockerStatus {
  state: 'stopped' | 'running' | 'restarting';
  uptimeSeconds: number;
  cpuPercent: number;
  memoryMb: number;
  logs: LogMessage[];
}
