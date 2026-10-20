# SQMS Machine Learning Pipeline & Research Experimentation

## 1. Research Problem Definition
Vehicle service center completion turnaround $T_{total}$ is composed of two stochastic variables:
$$T_{total} = T_{wait} + T_{service}$$
Where:
- $T_{wait}$: Waiting time until an appropriate bay and certified mechanic become available.
- $T_{service}$: Actual mechanical duration required to execute the diagnostic, repair, and detailing tasks.

Traditional systems display static token numbers or rely on naive fixed lookup tables (e.g. "General service = 60 mins"). SQMS solves this using supervised regression trained on non-linear queue bottlenecks, vehicle attributes, mechanic specializations, and workshop workload.

---

## 2. Dataset Synthesis & Distributions
In compliance with research integrity guidelines, SQMS includes a **clearly labeled synthetic demo dataset** containing 12,000 service records (`data/synthetic_service_records.csv`).

### Non-Linear Relationships Implemented:
1. **Bottleneck Congestion**:
   $$EffectiveCapacity = 0.6 \times AvailableMechanics + 0.4 \times AvailableBays$$
   $$T_{wait} \propto \frac{QueuePosition}{EffectiveCapacity} + (Workload \times 22.0) \times PeakMultiplier$$
2. **Vehicle Category Multiplier**: Hatchback ($0.9\times$), Sedan ($1.0\times$), SUV ($1.2\times$), Luxury ($1.45\times$), Bike ($0.65\times$).
3. **Realistic Noise**: Gaussian noise distributions $\mathcal{N}(0, \sigma^2)$ are injected to represent realistic inspection delays and unexpected parts issues.

---

## 3. Candidate Models & Empirical Comparison

Candidate regression algorithms evaluated during training:
1. **Baseline**: Dummy regressor predicting median values.
2. **Linear Regression**: Ordinary least squares baseline.
3. **Decision Tree Regressor**: Non-linear tree with depth regularization ($depth=8$).
4. **Random Forest Regressor**: Ensemble of 75 bagged decision trees ($depth=10$).
5. **Gradient Boosting Regressor**: Sequential boosting of 85 shallow trees with shrinkage ($\eta=0.08, depth=5$).

### Empirical Benchmark Results on 20% Test Split:
| Target | Model | MAE (min) | RMSE (min) | $R^2$ Score | Selection |
|---|---|---:|---:|---:|---|
| **Waiting Time** | Baseline (Median) | 31.86 | 43.57 | -0.0710 | Benchmark |
| | Linear Regression | 11.82 | 16.04 | 0.8549 | Benchmark |
| | Decision Tree | 4.47 | 6.16 | 0.9786 | Benchmark |
| | Random Forest | 3.82 | 4.86 | 0.9867 | Benchmark |
| | **Gradient Boosting** | **3.68** | **4.63** | **0.9879** | **★ Production Active** |
| **Service Duration** | Baseline (Median) | 58.40 | 94.24 | -0.1575 | Benchmark |
| | Linear Regression | 11.10 | 18.04 | 0.9576 | Benchmark |
| | Decision Tree | 10.26 | 17.83 | 0.9586 | Benchmark |
| | Random Forest | 9.99 | 16.92 | 0.9627 | Benchmark |
| | **Gradient Boosting** | **9.65** | **16.45** | **0.9647** | **★ Production Active** |

---

## 4. Feature Importance & Explainability
Feature importance scores derived from tree ensembles provide transparent explanations shown directly on customer and manager dashboards:
- `queue_position` (~42% importance)
- `current_workload` (~24% importance)
- `available_mechanics` (~14% importance)
- `available_bays` (~11% importance)
- `service_type` & `vehicle_type` (~9% combined)

---

## 5. Transparent Baseline Fallback
If model artifact serialization files (`.joblib`) are absent, the system seamlessly operates in **Transparent Baseline Fallback Mode**, explicitly declaring:
> *"Prediction source: Transparent Baseline Estimation (Heuristic Rule Engine)"*
Guaranteeing zero downtime without pretending heuristic rules are AI.
