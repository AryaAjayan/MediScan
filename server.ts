import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Express
const app = express();
const PORT = 3000;

// Body Parsers
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// Simulate Docker status
let dockerState: 'stopped' | 'running' | 'restarting' = 'running';
let logs: Array<{
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  component: 'uvicorn' | 'pytorch' | 'docker' | 'fastapi';
  message: string;
}> = [
  { timestamp: new Date(Date.now() - 3600000).toISOString(), level: 'info', component: 'docker', message: 'Creating container "pneumonet-api-v1" using deeplearning-fastapi-resnet:latest' },
  { timestamp: new Date(Date.now() - 3590000).toISOString(), level: 'info', component: 'docker', message: 'Configuring network attachments: ports=8000:8000, hardware_acceleration=CUDA_GPUS' },
  { timestamp: new Date(Date.now() - 3580000).toISOString(), level: 'info', component: 'pytorch', message: 'Initializing PyTorch framework v2.1.2+cuda12.1' },
  { timestamp: new Date(Date.now() - 3570000).toISOString(), level: 'info', component: 'pytorch', message: 'Loading pre-trained ResNet-50 model from cache storage' },
  { timestamp: new Date(Date.now() - 3550000).toISOString(), level: 'success', component: 'pytorch', message: 'Fine-tuned weights successfully restored. Accuracy=94.21%, Validation_Loss=0.183' },
  { timestamp: new Date(Date.now() - 3500000).toISOString(), level: 'info', component: 'uvicorn', message: 'Started server process [12] on ASGI-uvicorn' },
  { timestamp: new Date(Date.now() - 3490000).toISOString(), level: 'info', component: 'uvicorn', message: 'Waiting for application startup.' },
  { timestamp: new Date(Date.now() - 3480000).toISOString(), level: 'success', component: 'fastapi', message: 'FastAPI application startup complete. Uvicorn serving on http://0.0.0.0:8000 (Press CTRL+C to quit)' }
];

// Helper to push log
function addLog(level: 'info' | 'warn' | 'error' | 'success', component: 'uvicorn' | 'pytorch' | 'docker' | 'fastapi', message: string) {
  logs.push({
    timestamp: new Date().toISOString(),
    level,
    component,
    message
  });
  if (logs.length > 150) {
    logs.shift();
  }
}

// Lazy-loaded Gemini AI client helper
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Server API Routes

// 1. Docker Status
app.get("/api/docker-status", (req, res) => {
  res.json({
    state: dockerState,
    uptimeSeconds: dockerState === 'running' ? Math.floor(process.uptime()) + 3600 : 0,
    cpuPercent: dockerState === 'running' ? Math.round(5 + Math.random() * 8) : 0,
    memoryMb: dockerState === 'running' ? 382 + Math.round(Math.random() * 15) : 0,
    logs: logs.slice(-50)
  });
});

// 2. Control Docker Container
app.post("/api/docker-control", (req, res) => {
  const { action } = req.body; // 'stop' | 'start' | 'restart'
  
  if (action === 'stop') {
    dockerState = 'stopped';
    addLog('warn', 'docker', 'Received SIGTERM signal. Initiating graceful shutdown sequence...');
    addLog('info', 'uvicorn', 'Shutting down server on PID 12');
    addLog('success', 'docker', 'FastAPI application container stopped successfully (Exit Code 0)');
  } else if (action === 'start') {
    dockerState = 'restarting';
    addLog('info', 'docker', 'Starting docker instance "pneumonet-api-v1"');
    addLog('info', 'pytorch', 'Reloading CUDA device layers & ResNet weights');
    setTimeout(() => {
      dockerState = 'running';
      addLog('success', 'fastapi', 'Container online. Serving on http://localhost:8000');
    }, 2500);
  } else if (action === 'restart') {
    dockerState = 'restarting';
    addLog('warn', 'docker', 'Restart sequence triggered via backend supervisor.');
    addLog('info', 'uvicorn', 'Uvicorn process killed.');
    setTimeout(() => {
      dockerState = 'running';
      addLog('success', 'pytorch', 'Weights compiled successfully to device=cuda:0');
      addLog('success', 'fastapi', 'FastAPI restarted. Uvicorn listening at http://0.0.0.0:8000');
    }, 2000);
  }

  res.json({ success: true, state: dockerState });
});

// 3. Inference System simulation (using optional Gemini AI or robust local rule parameters)
app.post("/api/classify", async (req, res) => {
  const { id, name, isCustom, base64ImageData, prepConfig } = req.body;
  const startTimer = Date.now();

  if (dockerState !== 'running') {
    return res.status(503).json({
      error: "FastAPI docker service is currently offline. Please start/restart the container."
    });
  }

  // Preprocessing logs
  addLog('info', 'fastapi', `POST /api/v1/inference - Request received for image [${isCustom ? 'Uploaded_Xray' : id}]`);
  
  if (prepConfig) {
    addLog('info', 'pytorch', `Transform applied: Resize=[${prepConfig.resize}x${prepConfig.resize}], Rotation=[${prepConfig.rotation}°], HFlip=[${prepConfig.horizontalFlip}], GaussianNoise=[${prepConfig.gaussianNoise}]`);
    addLog('info', 'pytorch', `Tensor normalization applied: Mean=[${prepConfig.normMean.join(', ')}], Std=[${prepConfig.normStd.join(', ')}]`);
  }

  // Define fallback mock outputs based on preset types
  const getFallbackInference = (presetId: string): any => {
    const presetLabel = presetId.includes('pneumonia') ? 'pneumonia' : 'normal';
    
    // Normal ResNet prediction mock
    if (presetLabel === 'normal') {
      const pNormal = 95.8 + Math.random() * 3.5;
      const pPneumonia = 100 - pNormal;
      const grid = [
        [0.05, 0.04, 0.03, 0.03, 0.04, 0.05, 0.05],
        [0.06, 0.07, 0.05, 0.04, 0.05, 0.07, 0.06],
        [0.05, 0.06, 0.08, 0.05, 0.07, 0.06, 0.05],
        [0.04, 0.05, 0.05, 0.04, 0.05, 0.05, 0.04],
        [0.03, 0.04, 0.04, 0.03, 0.04, 0.04, 0.03],
        [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03],
        [0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02]
      ];
      return {
        type: 'normal',
        probability: pNormal,
        normalProb: pNormal,
        pneumoniaProb: pPneumonia,
        latencyMs: 38 + Math.round(Math.random() * 25),
        imageDimensions: { w: 224, h: 224 },
        resnetFeatures: {
          backbone: "ResNet-50 (Fine-Tuned on CheXpert & ChestX-ray8)",
          fineTunedEpochs: 25,
          activeChannels: 2048,
          lossAttribution: 0.124
        },
        clinicalAttributes: {
          consolidation: 1.2,
          infiltrates: 2.1,
          pleuralEffusion: 1.0,
          airBronchograms: false
        },
        gradCamGrid: grid,
        explainability: "The model focused key visual attention on the costophrenic angles and the heart borders to guarantee absence of pathological infiltrates. High visual attribution was centered on anatomical features associated with typical clear ventilated thorax expansions. Zero indices of patchy opacity or consolidation were detected in either hemithorax.",
        dockerEndpointUsed: "http://localhost:8000/api/v1/inference"
      };
    } else {
      // Pneumonia Mock
      const isViral = presetId.includes('viral');
      const pPneumonia = isViral ? (89.5 + Math.random() * 5) : (96.4 + Math.random() * 3);
      const pNormal = 100 - pPneumonia;
      
      // Let's model different paths of activation
      let grid: number[][];
      if (isViral) {
        // Viral multifocal - activates both left & right lower areas
        grid = [
          [0.10, 0.12, 0.11, 0.08, 0.11, 0.13, 0.11],
          [0.15, 0.22, 0.18, 0.10, 0.18, 0.24, 0.16],
          [0.25, 0.52, 0.35, 0.15, 0.34, 0.48, 0.28],
          [0.40, 0.78, 0.50, 0.20, 0.48, 0.72, 0.42],
          [0.45, 0.85, 0.55, 0.22, 0.52, 0.82, 0.48],
          [0.30, 0.65, 0.40, 0.18, 0.38, 0.60, 0.32],
          [0.15, 0.25, 0.20, 0.10, 0.18, 0.22, 0.15]
        ];
      } else {
        // Bacterial Lobar on bottomright (which represents visual bottom-left coordinates)
        grid = [
          [0.08, 0.08, 0.06, 0.05, 0.05, 0.06, 0.07],
          [0.12, 0.14, 0.08, 0.06, 0.06, 0.08, 0.09],
          [0.22, 0.34, 0.15, 0.08, 0.07, 0.10, 0.12],
          [0.48, 0.74, 0.28, 0.10, 0.08, 0.12, 0.14],
          [0.62, 0.92, 0.45, 0.12, 0.10, 0.14, 0.16],
          [0.44, 0.78, 0.32, 0.10, 0.08, 0.11, 0.12],
          [0.18, 0.32, 0.15, 0.06, 0.05, 0.07, 0.08]
        ];
      }

      return {
        type: 'pneumonia',
        probability: pPneumonia,
        normalProb: pNormal,
        pneumoniaProb: pPneumonia,
        latencyMs: 45 + Math.round(Math.random() * 30),
        imageDimensions: { w: 224, h: 224 },
        resnetFeatures: {
          backbone: "ResNet-50 (Fine-Tuned on CheXpert & ChestX-ray8)",
          fineTunedEpochs: 25,
          activeChannels: 2048,
          lossAttribution: 0.854
        },
        clinicalAttributes: {
          consolidation: isViral ? 52.4 : 91.8,
          infiltrates: isViral ? 88.5 : 94.2,
          pleuralEffusion: isViral ? 34.0 : 12.5,
          airBronchograms: !isViral
        },
        gradCamGrid: grid,
        explainability: isViral 
          ? "Unsupervised Grad-CAM visualizes intense spatial gradient attributions scattered symmetrically across BOTH lower lung hemispheres. The focus correlates securely with diffuse, bilateral ground-glass densities characteristic of viral consolidation triggers. Peak intensity is anchored coordinates surrounding perihilar networks."
          : "The CNN final convolution layers (target layer: layer4.2.conv3) generated extreme diagnostic activations tightly localized mapping the posterior segments of the anatomical Right Lower Lobe. The model heavily weighted the visible silhouetting of the Right Diaphragm margin as a key differentiator. The focal dense consolidation and air bronchograms serve as prominent high-activation classifiers.",
        dockerEndpointUsed: "http://localhost:8000/api/v1/inference"
      };
    }
  };

  // Check if we can use Gemini to analyze custom uploads or dynamically upgrade Preset interpretations!
  const gemini = getGeminiClient();
  
  if (gemini && base64ImageData) {
    try {
      addLog('info', 'fastapi', 'Invoking backend Vision Transformer + ResNet reasoning path via Gemini API to extract high-accuracy diagnostic features.');
      
      const imagePart = {
        inlineData: {
          mimeType: "image/png",
          data: base64ImageData.split(',')[1] || base64ImageData
        }
      };

      const prompt = `You are a simulated fine-tuned ResNet-50 chest X-ray deep learning classification model (Pneumonia vs Normal).
Evaluate the provided chest X-ray image. Provide the output in JSON format exactly representing what a computer vision CNN would output with Grad-CAM visualization.
Analyze carefully if there is visible pneumonia (accumulation of fluid/consolidation/opacity in left or right lungs) or if it is normal.

You MUST respond with a JSON object following this schema. Do not output markdown besides JSON.
{
  "prediction": "normal" | "pneumonia",
  "pneumoniaConfidence": number (value between 0.0 and 100.0),
  "normalConfidence": number (value between 0.0 and 100.0),
  "consolidationConfidence": number (percentage 0 to 100),
  "infiltratesConfidence": number (percentage 0 to 100),
  "pleuralEffusionConfidence": number (percentage 0 to 100),
  "airBronchograms": boolean,
  "findingsText": "Short clinical sentence summarizing the visual findings",
  "explainabilityText": "Write a highly detailed explanation mapping Grad-CAM visual attention. E.g. where the model localized, what convolutional features were weighted, and clinical relevance.",
  "heatmapActivations": [7 arrays of 7 numbers, where each number is between 0.0 and 1.0. This models a 7x7 spatial activation grid from the last layer. High values (0.7-1.0) should perfectly coincide with areas of dense consolidation (either left lung mid/lower region, right lung, or clear for normal).]
}`;

      const response = await gemini.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [imagePart, { text: prompt }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              prediction: { type: Type.STRING, description: "Must be 'normal' or 'pneumonia'" },
              pneumoniaConfidence: { type: Type.NUMBER },
              normalConfidence: { type: Type.NUMBER },
              consolidationConfidence: { type: Type.NUMBER },
              infiltratesConfidence: { type: Type.NUMBER },
              pleuralEffusionConfidence: { type: Type.NUMBER },
              airBronchograms: { type: Type.BOOLEAN },
              findingsText: { type: Type.STRING },
              explainabilityText: { type: Type.STRING },
              heatmapActivations: {
                type: Type.ARRAY,
                items: {
                  type: Type.ARRAY,
                  items: { type: Type.NUMBER },
                  description: "7 elements in the row"
                },
                description: "Array of 7 rows"
              }
            },
            required: [
              "prediction", "pneumoniaConfidence", "normalConfidence",
              "consolidationConfidence", "infiltratesConfidence",
              "pleuralEffusionConfidence", "airBronchograms",
              "findingsText", "explainabilityText", "heatmapActivations"
            ]
          }
        }
      });

      const text = response.text || "{}";
      const resultObj = JSON.parse(text);

      const latency = Date.now() - startTimer;
      addLog('success', 'fastapi', `Inference successful! Time=${latency}ms, Class=[${resultObj.prediction.toUpperCase()}], Score=${resultObj.prediction === 'pneumonia' ? resultObj.pneumoniaConfidence : resultObj.normalConfidence}%`);

      return res.json({
        type: resultObj.prediction,
        probability: resultObj.prediction === 'pneumonia' ? resultObj.pneumoniaConfidence : resultObj.normalConfidence,
        normalProb: resultObj.normalConfidence,
        pneumoniaProb: resultObj.pneumoniaConfidence,
        latencyMs: latency,
        imageDimensions: { w: 224, h: 224 },
        resnetFeatures: {
          backbone: "ResNet-50 (Fine-Tuned on CheXpert & ChestX-ray8)",
          fineTunedEpochs: 25,
          activeChannels: 2048,
          lossAttribution: resultObj.prediction === 'pneumonia' ? 0.89 : 0.11
        },
        clinicalAttributes: {
          consolidation: resultObj.consolidationConfidence,
          infiltrates: resultObj.infiltratesConfidence,
          pleuralEffusion: resultObj.pleuralEffusionConfidence,
          airBronchograms: resultObj.airBronchograms
        },
        gradCamGrid: resultObj.heatmapActivations || getFallbackInference('xray-normal-01').gradCamGrid,
        explainability: resultObj.explainabilityText || resultObj.findingsText,
        dockerEndpointUsed: "http://localhost:8000/api/v1/inference (Analyzed via Gemini-3.5 Vision)"
      });
    } catch (err: any) {
      addLog('error', 'fastapi', `Gemini analysis error: ${err.message || err}. Falling back to rule-based ResNet engine.`);
      // Continue to local fallback mock
    }
  }

  // Local fallback (if Gemini not active or presets selected or failed)
  const targetId = id || 'xray-normal-01';
  const inference = getFallbackInference(targetId);
  const totalDuration = Date.now() - startTimer;
  inference.latencyMs = totalDuration;

  setTimeout(() => {
    addLog('success', 'fastapi', `Inference successful! Time=${totalDuration}ms, Class=[${inference.type.toUpperCase()}], Score=${inference.probability.toFixed(1)}%`);
    res.json(inference);
  }, 400); // realistic latency delay
});

// Configure Vite or Static server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Web application running & listening on http://localhost:${PORT}`);
  });
}

startServer();
