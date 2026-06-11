# MediScan

MediScan is an interactive medical deep learning explainer and transfer learning workbench for chest X-ray classification. The application visualizes and explains a ResNet-50 convolutional neural network (CNN) model trained to classify chest X-ray images into Normal or Pneumonia categories. It provides real-time image preprocessing simulations, dynamic Grad-CAM activation mapping overlays, and a hosted FastAPI Docker container endpoint simulation with an interactive Swagger-like playground.

## Tech Stack

The application is built using a modern, performant, and type-safe stack:

### Frontend
* Core Framework: React 19, TypeScript
* Styling: Vanilla CSS with Tailwind CSS for layout structure
* Animations: Motion (formerly Framer Motion)
* Icons: Lucide React

### Backend
* Server Framework: Express, Node.js
* Development Environment: Vite, TSX (TypeScript Execute)
* AI Integration: Google Gen AI SDK (Gemini 3.5 Flash)

### Tooling and Build System
* Bundler: Vite, ESBuild
* Transpilation: TypeScript

---

## System Architecture

The project is structured around a decoupled model-view-controller flow that coordinates image preprocessing, model execution, and explainability mapping:

```
+--------------------------------------------------------------+
|                        Client (React)                        |
|                                                              |
|   - Thoracic Diagnostic Viewer (X-Ray visualization)         |
|   - Preprocessing Panel (Rotation, Flip, Noise, Normalization)|
|   - Grad-CAM Attribution Overlay (7x7 visual heatmap)         |
|   - Live Docker Supervisor & FastAPI Sandbox console         |
+------------------------------+-------------------------------+
                               |
                        HTTP / JSON
                               |
                               v
+--------------------------------------------------------------+
|                  Express Backend (server.ts)                 |
|                                                              |
|   - Serves static assets / Vite middleware                   |
|   - Manages simulated Docker FastAPI container state         |
|   - Performs inference classification                        |
|     - Uses Gemini 3.5 Flash Vision API (if key configured)   |
|     - Falls back to local rule-based CNN mock inference      |
+------------------------------+-------------------------------+
                               |
                Google GenAI API (Optional)
                               |
                               v
+--------------------------------------------------------------+
|                 Gemini 3.5 Flash Vision Model               |
|                                                              |
|   - Evaluates custom uploaded X-Rays                         |
|   - Generates simulated CNN metrics & 7x7 Grad-CAM grid      |
|   - Returns structured JSON classification response          |
+--------------------------------------------------------------+
```

### Components and Data Flow
1. **AnatomyChart**: Renders the X-ray image along with interactive hotspot overlays pointing to pathological focus areas.
2. **PreprocessPanel**: Simulates the standard image augmentations performed in a computer vision training pipeline (rotation, flipping, scaling, noise injection, and tensor normalization).
3. **GradCamVisualizer**: Controls the rendering opacity, target convolutional layer attribution (e.g., layer4.2.conv3), and colormap settings for the Grad-CAM heatmap.
4. **ModelBench**: Coordinates sample selection, custom file uploads, and execution of the inference pipeline.
5. **FastApiSandbox**: Simulates docker container controls (start, stop, restart), displays container resource usage metrics (CPU, memory, uptime), and generates Python integration code snippets.

---

## Features

### 1. Image Preprocessing Pipeline
Users can tune parameters in real-time to visualize how preprocessing affects the input matrix fed to the CNN:
* Geometric Transforms: Rotation and horizontal flipping.
* Color Transforms: Brightness and contrast adjustments.
* Tensor Normalization: Set mean and standard deviation matrices.
* Noise Simulation: Add Gaussian noise parameters.

### 2. Explainable AI (Grad-CAM)
The model explains its classification decisions using Gradient-weighted Class Activation Mapping:
* Renders a 7x7 spatial heatmap representing regions of high neural attention.
* Allows adjusting the overlay blending opacity.
* Identifies which specific anatomical structures (e.g., lower lobes, perihilar networks) guided the classification decision.

### 3. Dev Sandbox and Live Mocking
Includes a full Swagger-like interactive sandbox representing a FastAPI endpoint:
* Simulates Docker container states (running, stopped, restarting).
* Captures standard error outputs and system logs from the PyTorch backend.
* Exposes Python code generation templates for API integration.

---

## Installation and Setup

### Prerequisites
* Node.js (v18 or higher recommended)
* npm (Node Package Manager)

### 1. Clone the Repository
```bash
git clone https://github.com/AryaAjayan/MediScan.git
cd MediScan
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory (based on `.env.example`):
```bash
GEMINI_API_KEY="your_api_key_here"
PORT=3000
```
Note: If no `GEMINI_API_KEY` is provided, the application will fallback to a rule-based mock engine to classify the preset images.

### 4. Running the Development Server
Start the local server containing both the Express backend and the Vite frontend:
```bash
node --import tsx server.ts
```
The server will start listening at http://localhost:3000.

---

## API Endpoints

The Express backend implements the following simulation APIs:

### GET `/api/docker-status`
Returns the status, resource usage metrics, and logs of the simulated FastAPI container.
* Response Schema:
  ```json
  {
    "state": "running" | "stopped" | "restarting",
    "uptimeSeconds": 3600,
    "cpuPercent": 8,
    "memoryMb": 382,
    "logs": [ ... ]
  }
  ```

### POST `/api/docker-control`
Controls the state of the simulated Docker microservice container.
* Request Body: `{ "action": "start" | "stop" | "restart" }`
* Response Schema: `{ "success": true, "state": "running" | "stopped" | "restarting" }`

### POST `/api/classify`
Classifies a chest X-ray image (preset ID or uploaded base64 data) and generates the corresponding Grad-CAM activation grid.
* Request Body:
  ```json
  {
    "id": "sample-id",
    "name": "sample-name",
    "isCustom": false,
    "base64ImageData": null,
    "prepConfig": { ... }
  }
  ```
* Response Schema:
  ```json
  {
    "type": "pneumonia" | "normal",
    "probability": 94.2,
    "normalProb": 5.8,
    "pneumoniaProb": 94.2,
    "latencyMs": 450,
    "imageDimensions": { "w": 224, "h": 224 },
    "resnetFeatures": {
      "backbone": "ResNet-50",
      "fineTunedEpochs": 25,
      "activeChannels": 2048,
      "lossAttribution": 0.85
    },
    "clinicalAttributes": {
      "consolidation": 91.8,
      "infiltrates": 94.2,
      "pleuralEffusion": 12.5,
      "airBronchograms": true
    },
    "gradCamGrid": [ ... ],
    "explainability": "Detailed description of Grad-CAM activations...",
    "dockerEndpointUsed": "http://localhost:8000/api/v1/inference"
  }
  ```
