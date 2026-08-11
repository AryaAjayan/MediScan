# Model Card: MediScan ResNet-50 Chest X-Ray Classifier

## Model Details
* **Architecture:** ResNet-50 (Convolutional Neural Network)
* **Training Paradigm:** Transfer learning (pre-trained on ImageNet, fine-tuned on medical chest radiography dataset)
* **Task:** Binary classification of chest X-rays (Normal vs. Pneumonia)
* **Input Format:** Grayscale Chest X-Ray Tensors (normalized and resized to 224x224)
* **Output Format:** Probability scores (0.0 to 1.0) and Grad-CAM spatial activation heatmaps.

## Intended Use
* **Primary Use Case:** Secondary diagnostic screening tool for detecting pneumonia in chest radiography.
* **Target Users:** Radiologists, clinical researchers, and medical imaging software engineers.
* **Out of Scope:** This model is not intended as a primary diagnostic tool to replace human clinical judgment. It must always be used in conjunction with a qualified radiologist's review (Human-in-the-Loop).

## Training Data & Methodological Care
* **Patient-Leakage Mitigation:** A strict methodological approach was used during the train/validation/test split. The dataset was split **by Patient ID**, not randomly by image. This ensures that multiple scans from the same patient do not cross the boundary between training and testing sets, preventing data leakage and artificially inflated performance metrics.

## Evaluation Metrics (Test Set)
The model was evaluated on a sequestered test set of 624 clinical X-rays.

* **Accuracy:** 86.9%
* **AUC (Area Under the ROC Curve):** 0.965
* **Pneumonia Recall (Sensitivity):** 99.0% (0.99)
* **Normal Recall (Specificity):** 66.0% (0.66)
* **Pneumonia Precision:** 83.0% (0.83)
* **Normal Precision:** 98.0% (0.98)

### Confusion Matrix Analysis
* **True Positives (Pneumonia):** 387
* **True Negatives (Normal):** 155
* **False Positives (Predicted Pneumonia, actually Normal):** 79
* **False Negatives (Predicted Normal, actually Pneumonia):** 3

## Honest Uncertainty Communication & Trade-offs
* **High Recall Optimization:** The model is highly optimized for **Recall (Sensitivity)** on the Pneumonia class (99%). In a medical screening context, a False Negative (missing a sick patient) is catastrophic. The model successfully minimized False Negatives to just 3 cases out of 624.
* **False Positive Trade-off:** As a trade-off for high sensitivity, the model has a higher False Positive rate (79 cases). This means the model acts as a cautious screener—it will flag normal lungs as potentially problematic if there is ambiguity, deferring the final decision to a human radiologist. 
* **Calibration:** Confidence scores near the decision threshold (e.g., 50-65%) should be treated with high uncertainty. 

## Interpretability (Grad-CAM)
* To prevent "black box" reliance, the model utilizes Gradient-weighted Class Activation Mapping (Grad-CAM). 
* The system extracts the gradients flowing into the final convolutional layer (layer4) to generate a coarse localization map highlighting the regions in the image most influential in predicting the target concept (e.g., consolidation or fluid).
* **Limitation:** Grad-CAM maps highlight statistical correlation, not definitive physiological causation. They must be correlated with clinical findings by a professional.
