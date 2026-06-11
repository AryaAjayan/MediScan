import { SampleXray } from '../types';

export const SAMPLE_XRAYS: SampleXray[] = [
  {
    id: 'xray-normal-01',
    name: 'Normal Thoracic Scan (Healthy Left/Right)',
    type: 'normal',
    metadata: {
      id: 'PT-209-A',
      age: 28,
      gender: 'M',
      coughDuration: 'None',
      fever: 'No',
      oxygenSat: 99,
    },
    clinicalFindings: 'Both lung fields are completely clear and well-inflated. Costophrenic and cardiophrenic angles are sharp. Pleural spaces are patent. Trachea is midline. Cardiomediastinal silhouette is within normal limits for size and contour.',
    pathologicalAreas: [], // Normal lungs have no consolidation areas
  },
  {
    id: 'xray-pneumonia-bacterial',
    name: 'Bacterial Lobar Pneumonia (Right Lower Lobe)',
    type: 'pneumonia',
    metadata: {
      id: 'PT-684-D',
      age: 46,
      gender: 'F',
      coughDuration: '5 Days (Productive)',
      fever: 'Yes (39.1°C)',
      oxygenSat: 91,
    },
    clinicalFindings: 'A dense, confluent consolidation is visible in the right lower lobe, consistent with bacterial lobar pneumonia. Air bronchograms are visible within the opacity. Left lung field is clear. Heart size is normal. Mild pleural thickening on the right.',
    // Right lower lobe is situated around cx: 35%, cy: 70% in SVG chest space
    pathologicalAreas: [
      {
        cx: 35, // Right side on chest view (Anatomical Right is left side of image)
        cy: 70,
        rx: 55,
        ry: 45,
        intensity: 0.9,
        description: 'Dense right lower lobe lobar consolidation',
      },
      {
        cx: 40,
        cy: 55,
        rx: 40,
        ry: 30,
        intensity: 0.5,
        description: 'Perihilar infiltration surrounding bronchial tree',
      }
    ],
  },
  {
    id: 'xray-pneumonia-viral',
    name: 'Viral Multifocal Pneumonia (Bilateral Ground-Glass)',
    type: 'pneumonia',
    metadata: {
      id: 'PT-112-W',
      age: 59,
      gender: 'M',
      coughDuration: '9 Days (Dry)',
      fever: 'Yes (38.4°C)',
      oxygenSat: 88,
    },
    clinicalFindings: 'Bilateral, diffuse, multifocal ground-glass opacities and patchy alveolar infiltrates. Manifests predominantly in lower and mid-lung zones. Typical presentation for viral pneumonia progression. Costophrenic recesses are blunted.',
    pathologicalAreas: [
      {
        cx: 34, // Left lung field in image (Anatomical Right)
        cy: 62,
        rx: 50,
        ry: 40,
        intensity: 0.75,
        description: 'Bilateral diffuse right mid-to-lower infiltrates',
      },
      {
        cx: 66, // Right lung field in image (Anatomical Left)
        cy: 64,
        rx: 45,
        ry: 35,
        intensity: 0.8,
        description: 'Diffuse patchy left lower infiltrate',
      },
      {
        cx: 64,
        cy: 45,
        rx: 35,
        ry: 25,
        intensity: 0.55,
        description: 'Patchy left midzone bronchial wall thickening',
      }
    ],
  },
  {
    id: 'xray-normal-02',
    name: 'Normal Thoracic Scan (Healthy Paediatric)',
    type: 'normal',
    metadata: {
      id: 'PT-041-K',
      age: 12,
      gender: 'F',
      coughDuration: '1 Day (Mild asthma)',
      fever: 'No',
      oxygenSat: 98,
    },
    clinicalFindings: 'Clear lung fields without focal consolidation, pleural effusion, or pulmonary vascular congestion. Normal cardiomediastinal contour. Thymic shadow is visible as a normal physiological variant for age.',
    pathologicalAreas: [],
  }
];
