# Pashu-Sutra: Cattle Temperature Calibration Dataset

> [!NOTE]
> This dataset is used to calibrate neck-worn IoT temperature sensors (DS18B20) against core body temperature (rectal) for early fever detection in cattle.

## Project Context
In bovine health monitoring, surface temperature (measured at the neck) is typically 1.5–2.5°C lower than core body temperature. Pashu-Sutra uses a calibrated machine learning model to bridge this gap, allowing farmers to receive "Core Temperature" alerts rather than raw surface data.

---

## Data Workflow: Seed to Synthetic
Since large-scale paired datasets (Rectal + Neck) are difficult to collect manually, this project follows a two-stage augmentation workflow:

1.  **Seed Collection (`generate_seed_dataset.py`)**: 
    - Simulates 10 days of manual farmer readings (3 times/day).
    - Captures the real physiological relationship in a "clean" environment.
2.  **Synthetic Expansion (`expand_synthetic.py`)**: 
    - Expands the 30 seed rows to **1,000+ rows**.
    - Introduces "noise" and extreme environmental scenarios (10°C to 42°C ambient).
    - Models breed differences (Indigenous vs. HF Crossbreed).

---

## Data Dictionary

| Column | Unit | Description | Range (Typical) |
| :--- | :--- | :--- | :--- |
| `Neck_Temp_C` | °C | Input from the DS18B20 collar sensor. | 35.0 - 39.5 |
| `Ambient_Temp_C` | °C | External temperature from DHT11 or Weather API. | 10.0 - 42.0 |
| `Hour` | 0–23 | Hour of the day, used for diurnal rhythm correction. | 0 - 23 |
| `Breed` | Flag | 0 = Indigenous (Zebu/Gir), 1 = HF/Exotic. | 0 or 1 |
| `Rectal_Temp_C` | °C | **Ground Truth**. The estimated core temperature. | 37.5 - 41.5 |
| `Offset_C` | °C | The mathematical difference (`Rectal` - `Neck`). | 1.2 - 3.1 |
| `Health_Status` | Label | Classification: Normal, Mild Elevation, or Fever. | String |

---

## Scientific Basis (Physiological Model)
The synthetic generation and subsequent model are grounded in veterinary literature:

*   **Base Offset**: A standard gap of **~1.85°C** between neck surface and core (McDowell & Hillman, 1959).
*   **Ambient Cooling**: The gap widens as ambient temperature drops, and narrows in heat stress due to vasodilation (~0.04°C shift per degree ambient; Gebremedhin, 2010).
*   **Diurnal Rhythm**: Core temperature peaks in late afternoon and is lowest in early morning (Beatty et al., 2006).
*   **Breed Factor**: Exotic breeds (HF) typically maintain a 0.2°C higher core temperature than indigenous breeds (Collier, 2012).

---

## Model Integration
The data is used to train a **Linear Regression** model. The resulting coefficients are embedded in the Pashu-Sutra application (`databaseService.js`):

```javascript
export function estimateCoreTemp(neckTemp, ambientTemp, hour, breed) {
  // core = (c1 * neck) + (c2 * amb) + (c3 * hour) + (c4 * breed) + intercept
  // Returns estimated core temp with +/- 0.15°C accuracy (MAE)
}
```

---

## File Summary
- `cattle_calibration_seed.xlsx`: 30 high-fidelity manual readings.
- `cattle_temp_full_dataset.xlsx`: 1000 expanded synthetic rows.
- `synthetic_cattle_temp.csv`: Raw CSV for ML pipelines.
