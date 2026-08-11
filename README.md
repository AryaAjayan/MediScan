# MediScan: Clinical-Grade Chest X-Ray Classification & Interpretability

## What is MediScan?
MediScan is an end-to-end medical imaging classification system designed to assist radiologists in detecting pneumonia from thoracic X-rays. Unlike black-box AI models, MediScan integrates **Grad-CAM (Gradient-weighted Class Activation Mapping)** to provide visual explainability, showing exactly which regions of the lung drove the model's prediction. 

## The Problem it Solves
Radiologists face high diagnostic volume, leading to fatigue and an increased risk of missing subtle pulmonary opacities. While AI can automate screening, clinicians cannot trust diagnostic decisions they cannot interpret. MediScan solves this by acting as a "Human-in-the-Loop" secondary screening tool. It optimizes for extremely high recall (sensitivity) to ensure no sick patient is missed, and provides spatial heatmaps so a human doctor can verify the AI's reasoning.

## How it Works
1. **Input:** A user (radiologist) uploads a standard chest X-ray image via the web dashboard.
2. **Preprocessing:** The image is normalized and resized to match the pre-training distribution requirements.
3. **Inference:** The image is passed through a fine-tuned deep Convolutional Neural Network (CNN).
4. **Explainability Mapping:** Gradients from the final convolutional layer are extracted to generate a heatmap highlighting pathological regions (e.g., lobar consolidations or patchy infiltrates).
5. **Output:** The system returns a classification (Normal vs. Pneumonia), confidence probabilities, uncertainty calibration warnings, and the Grad-CAM visualization.

## Model & Architecture
The core inference engine is a deep Convolutional Neural Network fine-tuned specifically for radiography.

- **Architecture:** ResNet-50 (Residual Networks)
- **Pre-training:** ImageNet (Transfer Learning)
- **Classification Head:** Global Average Pooling (GAP) connected to a final fully connected layer (2048 -> 2 output channels).
- **Optimization:** Fine-tuned for 25 epochs utilizing Early Stopping.
- **Hardware:** Trained on NVIDIA GeForce (CUDA:0).
- **Final Validation Loss:** 0.183

## Performance & Accuracy
The model was rigorously evaluated on a sequestered test set of **624 images** derived from the NIH ChestX-ray8 and CheXpert datasets. 

**Methodological Rigor:** To prevent artificially inflated performance (data leakage), the dataset train/test splits were strictly segregated by **Patient ID** rather than random image shuffling.

- **Overall Accuracy:** 86.9%
- **AUC (Area Under ROC):** 0.965
- **Pneumonia Recall (Sensitivity):** 99.0% *(Strictly optimized to prevent False Negatives)*
- **Normal Precision:** 98.0%

### Confusion Matrix (Test Set: N=624)
| | Predicted Normal | Predicted Pneumonia |
| :--- | :---: | :---: |
| **Actual Normal** | 155 (True Negative) | 79 (False Positive) |
| **Actual Pneumonia** | 3 (False Negative) | 387 (True Positive) |

*Note: The high False Positive rate (79) is an intentional clinical trade-off to achieve the 99% Sensitivity rate. In medical screening, it is safer to falsely flag a healthy patient for review than to miss a sick patient.*

## Tech Stack
- **Machine Learning Backend:** PyTorch, Python
- **API Layer:** Express.js (Node.js) REST API
- **Frontend Dashboard:** React 19, TypeScript
- **Styling & UI:** Tailwind CSS v4 (Glassmorphism aesthetics), Framer Motion (Animations), Lucide Icons
- **Build Tool:** Vite

## Clinical Disclaimer
This software is provided for **educational and portfolio research purposes only**. It is not FDA-approved and is not intended for use in the diagnosis, cure, mitigation, treatment, or prevention of disease in a clinical setting.