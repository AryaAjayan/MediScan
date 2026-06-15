import React, { useState, useEffect } from 'react';
import { DockerStatus, InferenceResult, PreprocessingConfig } from '../types';
import { Terminal, Shield, Play, Square, RotateCw, CheckCircle2, Copy, FileCode, Server } from 'lucide-react';

interface FastApiSandboxProps {
  dockerStatus: DockerStatus;
  onControlContainer: (action: 'start' | 'stop' | 'restart') => void;
  inferenceResult: InferenceResult | null;
  prepConfig: PreprocessingConfig;
  selectedSampleName: string;
}

export const FastApiSandbox: React.FC<FastApiSandboxProps> = ({
  dockerStatus,
  onControlContainer,
  inferenceResult,
  prepConfig,
  selectedSampleName,
}) => {
  const [activeTab, setActiveTab] = useState<'swagger' | 'pytorch' | 'fastapi' | 'dockerfile'>('swagger');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [swaggerResponse, setSwaggerResponse] = useState<string>('{\n  "status": "awaiting_inference_request"\n}');

  // Update Swagger response when inference changes
  useEffect(() => {
    if (inferenceResult) {
      setSwaggerResponse(JSON.stringify(inferenceResult, null, 2));
    } else {
      setSwaggerResponse('{\n  "status": "awaiting_inference_request"\n}');
    }
  }, [inferenceResult]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // High quality PyTorch Code Snippet
  const pytorchCode = `import torch
import torch.nn as nn
import torchvision.models as models
import torchvision.transforms as transforms
from PIL import Image

class ChestXrayClassifier(nn.Module):
    def __init__(self, num_classes=2):
        super(ChestXrayClassifier, self).__init__()
        # Load standard PyTorch ResNet-50 with default weights (ImageNet transfer)
        self.backbone = models.resnet50(pretrained=True)
        
        # Fine-tune the classification head
        in_features = self.backbone.fc.in_features
        self.backbone.fc = nn.Sequential(
            nn.Linear(in_features, 512),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(512, num_classes) # output 2 classes: Pneumonia vs Normal
        )
        
    def forward(self, x):
        return self.backbone(x)

# Setup medical validation transformations
transform_pipeline = transforms.Compose([
    transforms.Resize((${prepConfig.resize}, ${prepConfig.resize})),
    # Pre-alignment flip and spatial jitter augmentations
    transforms.RandomRotation(${prepConfig.rotation}),
    transforms.RandomHorizontalFlip(p=${prepConfig.horizontalFlip ? '1.0' : '0.5'}),
    transforms.ColorJitter(brightness=${prepConfig.brightness}, contrast=${prepConfig.contrast}),
    transforms.ToTensor(),
    # Normalized using exact ImageNet parameters
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

# Grad-CAM weight extractor
class GradCAM:
    def __init__(self, model, target_layer):
        self.model = model
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None
        
        target_layer.register_forward_hook(self.save_activation)
        target_layer.register_backward_hook(self.save_gradient)
        
    def save_activation(self, module, input, output):
        self.activations = output
        
    def save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0]

    def generate_heatmap(self, input_tensor, class_idx=None):
        self.model.eval()
        output = self.model(input_tensor)
        if class_idx is None:
            class_idx = output.argmax(dim=1).item()
            
        self.model.zero_grad()
        output[0, class_idx].backward()
        
        # Calculate Grad-CAM channel weights using GAP (Global Average Pooling)
        weights = torch.mean(self.gradients, dim=(2, 3))[0]
        heatmap = torch.zeros(self.activations.shape[2:])
        
        # Linear combination of forward activations weighted by channel importance
        for i, w in enumerate(weights):
            heatmap += w * self.activations[0, i]
            
        heatmap = torch.clamp(heatmap, min=0) # Apply ReLU
        heatmap /= torch.max(heatmap)       # Normalize array max
        return heatmap.cpu().detach().numpy()
`;

  // High quality FastAPI Code Snippet
  const fastapiCode = `from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import torch
import io
import time
from PIL import Image

app = FastAPI(
    title="Chest X-Ray Pneumonia API",
    description="Fine-tuned ResNet-50 Docker service with integrated Grad-CAM overlays",
    version="1.0.0"
)

# Enable immediate cross-origin integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Deep learning model and cache weights into CUDA
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model = ChestXrayClassifier()
model.load_state_dict(torch.load('best_resnet_weights.pth', map_location=device))
model.to(device)
model.eval()

@app.post("/api/v1/inference")
async def start_inference(file: UploadFile = File(...)):
    start_time = time.time()
    try:
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        # Execute preprocessing pipeline
        input_tensor = transform_pipeline(image).unsqueeze(0).to(device)
        
        # Execute model forward pass with attribution hooks enabled
        cam_extractor = GradCAM(model, model.backbone.layer4[2].conv3)
        
        with torch.enable_grad():
            output = model(input_tensor)
            probs = torch.softmax(output, dim=1)[0]
            
        pneumonia_prob = float(probs[1]) * 100
        class_label = "pneumonia" if pneumonia_prob > 50 else "normal"
        
        # Extract Grad-CAM (attributions on fine-tuned 7x7 grid target)
        heatmap = cam_extractor.generate_heatmap(input_tensor, class_idx=probs.argmax().item())
        
        return {
            "prediction": class_label,
            "probability": f"{max(pneumonia_prob, 100-pneumonia_prob):.2f}%",
            "normal_probability": f"{100 - pneumonia_prob:.2f}%",
            "pneumonia_probability": f"{pneumonia_prob:.2f}%",
            "latency_ms": f"{(time.time() - start_time)*1000:.1f}ms",
            "gradcam_grid": heatmap.tolist()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
`;

  // Standard Dockerfile Code Snippet
  const dockerfileCode = `# Build using medical-imaging base tag supporting PyTorch + CUDA
FROM pytorch/pytorch:2.1.2-cuda12.1-cudnn8-runtime

WORKDIR /app

# Ensure platform pre-requisites for OpenCV and image operations
RUN apt-get update && apt-get install -y \\
    libgl1-mesa-glx \\
    libglib2.0-0 \\
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy PyTorch fine-tuned model checkpoint parameters
COPY best_resnet_weights.pth best_resnet_weights.pth
COPY . .

# Expose FastAPI ASGI container ingress port
EXPOSE 8000

# Start lightweight Uvicorn server matching production performance configurations
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
      <div>
        {/* Docker Container Server Header status representation */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Server className="w-4 h-4 text-cyan-400" />
            <div>
              <span className="text-sm font-semibold text-slate-200 block tracking-tight">
                Self-Hosted Docker Microservice
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                CONTAINER ID: pb-94resnet-50
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status light */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className={`w-2.5 h-2.5 rounded-full ${
                dockerStatus.state === 'running' ? 'bg-emerald-500 animate-pulse' :
                dockerStatus.state === 'stopped' ? 'bg-rose-500' :
                'bg-yellow-500 animate-spin border border-dashed border-slate-950'
              }`} />
              <span className="text-xs font-mono font-bold text-slate-300 capitalize">
                {dockerStatus.state}
              </span>
            </div>

            {/* Controls */}
            <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700/60">
              <button
                type="button"
                onClick={() => onControlContainer(dockerStatus.state === 'running' ? 'stop' : 'start')}
                className={`p-1.5 rounded-md transition-all hover:bg-slate-705 ${
                  dockerStatus.state === 'running' ? 'text-rose-450 hover:bg-rose-950/20' : 'text-emerald-400 hover:bg-emerald-950/20'
                }`}
                title={dockerStatus.state === 'running' ? 'Kill Container (SIGTERM)' : 'Boot Container'}
              >
                {dockerStatus.state === 'running' ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => onControlContainer('restart')}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700"
                title="Force Container Restart"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Real-time host machine hardware metrics */}
        <div className="grid grid-cols-3 gap-3 mb-5 text-[11px] font-mono">
          <div className="bg-slate-950 border border-slate-800/60 p-2.5 rounded-xl text-center">
            <span className="text-slate-550 block">Uptime</span>
            <span className="text-slate-300 font-semibold block mt-1">
              {dockerStatus.state === 'running' ? `${Math.floor(dockerStatus.uptimeSeconds / 60)}m ${dockerStatus.uptimeSeconds % 60}s` : '0s'}
            </span>
          </div>
          <div className="bg-slate-950 border border-slate-800/60 p-2.5 rounded-xl text-center">
            <span className="text-slate-550 block">CUDA Host CPU</span>
            <span className="text-slate-300 font-semibold block mt-1">
              {dockerStatus.cpuPercent}%
            </span>
          </div>
          <div className="bg-slate-950 border border-slate-800/60 p-2.5 rounded-xl text-center">
            <span className="text-slate-550 block">GPU VRAM Used</span>
            <span className="text-slate-300 font-semibold block mt-1">
              {dockerStatus.memoryMb} MB
            </span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 mb-4 bg-slate-950 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('swagger')}
            className={`flex-1 py-1 px-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'swagger'
                ? 'bg-slate-900 text-cyan-400 border border-slate-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Swagger JSON
          </button>
          <button
            onClick={() => setActiveTab('pytorch')}
            className={`flex-1 py-1 px-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'pytorch'
                ? 'bg-slate-900 text-cyan-400 border border-slate-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            PyTorch model
          </button>
          <button
            onClick={() => setActiveTab('fastapi')}
            className={`flex-1 py-1 px-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'fastapi'
                ? 'bg-slate-900 text-cyan-400 border border-slate-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            FastAPI router
          </button>
          <button
            onClick={() => setActiveTab('dockerfile')}
            className={`flex-1 py-1 px-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'dockerfile'
                ? 'bg-slate-900 text-cyan-400 border border-slate-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            Dockerfile
          </button>
        </div>

        {/* Active Tab Viewport */}
        <div className="relative">
          {activeTab === 'swagger' ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-mono bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-950 border border-emerald-800/80 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded">
                    POST
                  </span>
                  <span className="text-slate-350 select-all font-semibold">/api/v1/inference</span>
                </div>
                <button
                  onClick={() => copyToClipboard('curl -X POST "http://localhost:8000/api/v1/inference" -H "accept: application/json" -H "Content-Type: multipart/form-data" -F "file=@chest_xray.png"', 'curl')}
                  className="text-slate-500 hover:text-white text-[11px] font-mono flex items-center gap-1 bg-slate-900 px-2 py-1 rounded"
                >
                  {copiedKey === 'curl' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'curl' ? 'Copied' : 'cURL'}
                </button>
              </div>

              {/* Endpoint interactive payload summary */}
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono px-1">
                <span>Payload: multipart/form-data (Key: "file")</span>
                <div className="flex items-center gap-2">
                  <span>Active Input: {selectedSampleName || 'Default'}</span>
                  {inferenceResult && (
                    <button
                      onClick={() => copyToClipboard(swaggerResponse, 'json')}
                      className="text-cyan-500 hover:text-cyan-400 font-semibold cursor-pointer flex items-center gap-0.5"
                    >
                      • {copiedKey === 'json' ? 'Copied JSON' : 'Copy JSON'}
                    </button>
                  )}
                </div>
              </div>

              {/* Code JSON Response Block */}
              <div className="max-h-[340px] overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 leading-relaxed scrollbar-thin">
                <pre>{swaggerResponse}</pre>
              </div>
            </div>
          ) : (
            <div className="relative">
              {/* Code Snippet Toolbar */}
              <div className="absolute top-3 right-3 z-10">
                <button
                  onClick={() => {
                    const text = activeTab === 'pytorch' ? pytorchCode : activeTab === 'fastapi' ? fastapiCode : dockerfileCode;
                    copyToClipboard(text, activeTab);
                  }}
                  className="flex items-center gap-1 bg-slate-800/90 text-slate-300 hover:text-white px-2.5 py-1 rounded text-xs font-mono border border-slate-700 backdrop-blur"
                >
                  {copiedKey === activeTab ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === activeTab ? 'Copied script' : 'Copy'}
                </button>
              </div>

              {/* Code Box */}
              <div className="max-h-[340px] overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-400 leading-relaxed scrollbar-thin">
                <pre>
                  <code>
                    {activeTab === 'pytorch' ? pytorchCode : activeTab === 'fastapi' ? fastapiCode : dockerfileCode}
                  </code>
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Terminal Container Console logs */}
      <div className="mt-5 border-t border-slate-800 pt-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <Terminal className="text-cyan-400 w-3.5 h-3.5" />
            FastAPI Ingress Console Output
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {dockerStatus.logs.length} operations logged
          </span>
        </div>
        <div className="h-[140px] overflow-y-auto rounded-xl bg-slate-950 border border-slate-800/80 p-3.5 font-mono text-[11px] leading-relaxed select-text flex flex-col gap-1.5 scrollbar-thin">
          {dockerStatus.logs.slice().reverse().map((log, idx) => {
            let clrLevel = 'text-cyan-400';
            if (log.level === 'warn') clrLevel = 'text-yellow-400';
            if (log.level === 'error') clrLevel = 'text-rose-400';
            if (log.level === 'success') clrLevel = 'text-emerald-400';

            return (
              <div key={`log-${idx}`} className="flex gap-2">
                <span className="text-slate-600 shrink-0 select-none">
                  [{log.timestamp.split('T')[1].substring(0, 8)}]
                </span>
                <span className={`${clrLevel} font-bold shrink-0 select-none`}>
                  [{log.component}]
                </span>
                <span className="text-slate-300 break-words">{log.message}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
