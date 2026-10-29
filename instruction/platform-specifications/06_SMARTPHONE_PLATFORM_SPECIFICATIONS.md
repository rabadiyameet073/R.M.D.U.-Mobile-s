# Module 06: Smartphone Platform Specifications & Interactive UX

## 1. High-Trust Device Recommendation Architecture

Consumers making smartphone purchases require absolute transparency, unbiased benchmark data, and clear trade-off assessments. RMDU Mobiles delivers this through four core architecture standards:

1. **Verifiable Device Hardware Metrics**:
   - Explicit processor silicon (`Snapdragon 8 Gen 3`, `Dimensity 9300+`, `Apple A17 Pro`).
   - Camera sensor dimensions and optics (e.g. Sony LYT-900 1-inch sensor, Optical Image Stabilization, f/1.63 aperture, 5x periscope optical zoom).
   - Display panel capabilities (1.5K / 2K AMOLED, 1–120Hz LTPO dynamic refresh, 2160Hz PWM dimming, peak outdoor brightness in nits).
   - Battery & Charging chemistry (Silicon-Carbon / Li-Po capacity in mAh, wired wattage, wireless charging support, and thermal bypass charging).
2. **Real-World Evaluation Criteria (Over Synthetic Marketing)**:
   - Measured 45-minute sustained gaming thermal dissipation (throttling stability percentage vs peak score).
   - Practical Screen-On Time (SOT) under mixed 5G, Wi-Fi, camera, and navigation usage.
   - Long-term software commitment (e.g., 4 OS upgrades + 5 years security patches).
3. **Five-Category Structured Taxonomy**:
   - **Budget Killer** (`/budget-killer`): Maximum value per unit currency, dependable daily performance, durable battery, and zero bloatware compromises.
   - **Gaming Guru** (`/gaming-guru`): Unthrottled GPU frame rates, large vapor chamber cooling, high touch-sampling rate (1000Hz+), and dual stereo speakers.
   - **Camera Champ** (`/camera-champ`): Color accuracy, natural background separation, dynamic range in harsh backlight, low-light computational imaging, and stable 4K video.
   - **Battery Boss** (`/battery-boss`): Exceptional all-day endurance (7+ hours SOT), standby power optimization, and rapid charging under 35 minutes.
   - **G.O.A.T** (`/goat`): Pinnacle flagship hardware, IP68 dust/water protection, aerospace materials, wireless charging, and peerless overall polish.

---

## 2. Interactive Feature Workflows

### A. Side-by-Side Device Comparison Drawer
- Allows users to pin 2 to 4 phones across different categories or price segments.
- **Sticky Header**: Device thumbnails, names, and prices remain fixed at top while scrolling through comprehensive spec rows.
- **"Highlight Differences" Switch**: Instantly dims identical specs (e.g., both 5000mAh) to spotlight critical divergences (e.g., LPDDR5X vs LPDDR4X, UFS 4.0 vs UFS 2.2).
- **Clear & Share Actions**: 1-click comparison reset, and URL parameter serialization (`/compare?devices=s24-ultra,14-pro,iqoo-12`) enabling instant link sharing.

### B. 3-Step AI Smartphone Recommendation Quiz
- **Step 1: Primary Usage Intent**:
  - Gaming & High Performance | Photography & Content Creation | Long Battery Life & Travel | Everyday Multitasking & Value.
- **Step 2: Budget Comfort Zone**:
  - Under ₹15,000 ($200) | ₹15,000–₹30,000 ($200–$400) | ₹30,000–₹50,000 ($400–$650) | Flagship ₹50,000+ ($650+).
- **Step 3: Non-Negotiable Hardware Priority**:
  - Compact size / Lightweight | Clean UI / Zero ads | Telephoto zoom camera | Ultra-fast charging (80W+).
- **Result Output**:
  - Computes deterministic compatibility scores (e.g., `98.6% Match for your gaming priorities`).
  - Highlights Top 2 matched devices with transparent trade-off disclosures ("Why this is your match" & "What you sacrifice").

### C. Dynamic Budget Range Filtering
- Interactive dual-range slider or stepped price pills allowing users to restrict phones instantly.
- Live URL query synchronization (`?min=20000&max=35000`) with smooth debouncing.
- Seamless currency toggle supporting Indian Rupee (₹ INR) and US Dollar ($ USD).

### D. Detailed Specification Modal & Score Breakdown
- Accessible dialog opening upon clicking any phone card.
- Visual category scoring bars (Performance, Camera, Battery, Display, Value) scored from 1 to 10.
- Key pros and cons bulleted list derived from real-world testing.
