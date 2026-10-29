# 📱 RMDU Mobiles — Smart Smartphone Recommendation & Intelligence Platform

[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![GSAP](https://img.shields.io/badge/GSAP-3.x-88CE02?style=for-the-badge&logo=greensock&logoColor=white)](https://greensock.com/gsap/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![pgvector](https://img.shields.io/badge/pgvector-RAG_AI-FF6F00?style=for-the-badge&logo=openai&logoColor=white)](https://github.com/pgvector/pgvector)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)](LICENSE)

> *"Don't Just Upgrade Your Phone — Upgrade Your Experience"*  
> **RMDU Mobiles** is an enterprise-grade smartphone recommendation, device intelligence, and decision platform engineered to eliminate the paradox of choice in mobile buying through mathematical scoring algorithms, intent-driven taxonomy, structured specification analysis, and AI-driven semantic retrieval.

---

## 📑 Table of Contents
1. [Project Overview & Core Mission](#1-project-overview--core-mission)
2. [The Core Problem & RMDU Solution](#2-the-core-problem--rmdu-solution)
3. [System Architecture & Technology Stack](#3-system-architecture--technology-stack)
4. [Master Device Intelligence Model (60+ Tracked Specifications)](#4-master-device-intelligence-model-60-tracked-specifications)
5. [The 5 Signature Recommendation Pillars](#5-the-5-signature-recommendation-pillars)
6. [Granular Budget Framework & Spec Benchmarks](#6-granular-budget-framework--spec-benchmarks)
   - [Tier 1: Under ₹10,000 (Sub-10K Ultra Budget)](#tier-1-under-10000-sub-10k-ultra-budget)
   - [Tier 2: ₹10,000 – ₹20,000 (Sub-20K Mainstream Budget)](#tier-2-10000--20000-sub-20k-mainstream-budget)
   - [Tier 3: ₹20,000 – ₹30,000 (Sub-30K Mid-Range Value Tier)](#tier-3-20000--30000-sub-30k-mid-range-value-tier)
   - [Tier 4: ₹30,000 – ₹40,000 (Sub-40K Upper Mid-Range / Premium)](#tier-4-30000--40000-sub-40k-upper-mid-range--premium)
   - [Tier 5: ₹40,000 – ₹50,000 (Sub-50K Near-Flagship Tier)](#tier-5-40000--50000-sub-50k-near-flagship-tier)
   - [Tier 6: Above ₹50,000 (50K+ Ultra-Premium & Flagship Titans)](#tier-6-above-50000-50k-ultra-premium--flagship-titans)
7. [Category × Budget Master Decision Matrix](#7-category--budget-master-decision-matrix)
8. [Recommendation Engine & Mathematical Scoring Algorithm](#8-recommendation-engine--mathematical-scoring-algorithm)
9. [Side-by-Side Comparison & Upgrade Inference Engine](#9-side-by-side-comparison--upgrade-inference-engine)
10. [Database Architecture & Complete PostgreSQL Schema (21+ Tables)](#10-database-architecture--complete-postgresql-schema-21-tables)
11. [REST API Architecture & Endpoint Contracts](#11-rest-api-architecture--endpoint-contracts)
12. [Frontend Engineering & UI/UX Design System](#12-frontend-engineering--uiux-design-system)
13. [Shopkeeper Offline Intelligence & Retail Integration](#13-shopkeeper-offline-intelligence--retail-integration)
14. [Project Directory & File Structure](#14-project-directory--file-structure)
15. [Environment Variables & Supabase Configuration (.env)](#15-environment-variables--supabase-configuration-env)
16. [Setup, Installation & Execution Guide](#16-setup-installation--execution-guide)
17. [Security, Performance & Production Best Practices](#17-security-performance--production-best-practices)
18. [Future Roadmap & AI Evolution](#18-future-roadmap--ai-evolution)

---

## 1. Project Overview & Core Mission

**RMDU Mobiles** is built to fundamentally transform how people evaluate, discover, and purchase smartphones. Modern consumers are inundated with an overwhelming volume of smartphone releases, aggressive marketing jargon, and contradictory specification sheets.

Instead of treating smartphones as generic catalog listings, RMDU Mobiles introduces a **decision engine** that:
- Deconstructs complex technical specifications (nanometer nodes, sensor microns, thermal coefficients, sustained GPU clocks) into measurable real-world metrics.
- Evaluates candidate devices against transparent user-centric priorities.
- Delivers an omnichannel experience spanning online single-page applications, offline brick-and-mortar retail cards, and future AI conversational agents.

---

## 2. The Core Problem & RMDU Solution

### 🛑 The Paradox of Choice in Smartphone Buying
1. **Spec Sheet Inflation:** Marketing terms like "200MP AI Ultra Camera" or "Virtual RAM" often mask inferior sensor sizes, lack of Optical Image Stabilization (OIS), or slow storage architectures (eMMC vs UFS).
2. **Conflicting Priorities & Inherent Trade-offs:** A phone with top-tier battery capacity may suffer from heavy bulk and slow charging; a phone with high peak benchmark performance may throttle severely after 15 minutes of gaming.
3. **Information Fragmentation:** Review portals, benchmark sites, and e-commerce stores disperse information across incompatible formats, forcing buyers to maintain manual comparison tables.
4. **Distributor-Biased Retail Sales:** Physical retail store recommendations are often driven by salesperson distributor incentives rather than consumer suitability.

### 💡 The RMDU Solution Architecture
- **5-Pillar Intent Taxonomy:** Groups every device into focused, purpose-built buckets: *Budget Killer*, *Gaming Guru*, *Camera Champ*, *Battery Boss*, and *G.O.A.T*.
- **Rigorous Budget Micro-Segmentation:** Filters devices across 6 realistic price tiers (Under ₹10k, ₹10k–₹20k, ₹20k–₹30k, ₹30k–₹40k, ₹40k–₹50k, and ₹50k+).
- **Algorithmic Match Scoring:** Ranks devices using transparent multi-factor weighted formulas with explicit penalty deductions for budget overshoot, missing 5G bands, or slow charging.
- **Physical-to-Digital Bridge (Shopkeeper Cards):** Generates short 8-character codes and standardized specification sheets for offline retail stores.
- **RAG & Vector AI Core:** PostgreSQL `pgvector` embedding storage enabling conversational lifestyle queries (e.g., *"Find a durable device under ₹25k with clean software and all-day battery life for travel"*).

---

## 3. System Architecture & Technology Stack

```
┌────────────────────────────────────────────────────────────────────────┐
│                        RMDU PLATFORM ARCHITECTURE                      │
├────────────────────────────────┬───────────────────────────────────────┤
│ CLIENT PRESENTATION TIER       │ DATA & INTELLIGENCE TIER              │
│ • React 18 SPA (Vite Bundled)  │ • FastAPI (Python 3.11+ High-Speed)   │
│ • GSAP 3 + ScrollTrigger Engine│ • Uvicorn ASGI Async Server           │
│ • Lenis Smooth Scrolling       │ • Pydantic v2 Data Validation Schemas │
│ • Vanilla CSS Design System    │ • PostgreSQL 15+ Enterprise Database  │
│ • Responsive Touch Ergonomics  │ • pgvector 1536-dim Vector Embeddings │
│ • Offline-Ready LocalStorage   │ • Stored Procedures & Logic Functions │
│ • Interactive Modal Inspector  │ • Trigram Fuzzy Search Engine         │
└────────────────────────────────┴───────────────────────────────────────┘
```

- **Frontend Core:** React 18 Single-Page Application bootstrapped via Vite for instant Hot Module Replacement (HMR).
- **Motion & Physics Engine:** GreenSock Animation Platform (GSAP 3) and `@studio-freight/lenis` for inertial smooth scrolling and preloader-to-navbar logo morphing.
- **Styling Architecture:** Modular Vanilla CSS utilizing CSS Custom Properties (Tokens), glassmorphic backdrops, fluid typography, and dark-mode ergonomics.
- **Backend API Layer (FastAPI):** High-performance asynchronous REST microservices built with **FastAPI** (Python 3.11+) and Uvicorn. Implements Pydantic v2 data models, asynchronous PostgreSQL connection pooling via `asyncpg`, and auto-generates interactive Swagger UI documentation at `/docs`.
- **Database Engine:** PostgreSQL 15+ with extensions:
  - `uuid-ossp` for non-enumerable, globally unique primary keys.
  - `pgcrypto` for cryptographically secure hashing.
  - `pgvector` for OpenAI/Gemini 1536-dimensional semantic vector search.
  - `pg_trgm` for trigram-based fuzzy model search.

---

## 4. Master Device Intelligence Model (60+ Tracked Specifications)

Every device in the RMDU registry is decomposed into **10 core technical domains** and over **60 discrete hardware specifications** in the `device_specs` table:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    RMDU DEVICE SPECIFICATION DOMAINS                       │
├───────────────────────────────┬────────────────────────────────────────────┤
│ 1. Core Silicon & Computing   │ 6. Structural Engineering & Materials      │
│ 2. Memory & Storage Bus       │ 7. Telecommunications & Radios             │
│ 3. Display Optics & Refresh   │ 8. Operating System & Firmware Lifecycle   │
│ 4. Camera Array & ISP         │ 9. Economics & Valuation                   │
│ 5. Battery Chemistry & Power  │ 10. Vector Semantic Profile                │
└───────────────────────────────┴────────────────────────────────────────────┘
```

| Domain | Tracked Parameters | Technical Unit / Standard |
|---|---|---|
| **1. Silicon & Processing** | `processor_name`, `processor_brand`, `process_node`, `cpu_cores`, `cpu_max_freq_ghz`, `gpu_name`, `antutu_score`, `geekbench_single`, `geekbench_multi` | nm (nanometers), GHz clock frequency, AnTuTu v10 points, Geekbench 6 integer scores |
| **2. Memory & Storage** | `ram_options_gb`, `ram_type`, `storage_options_gb`, `storage_type`, `expandable_storage` | Gigabytes (GB), LPDDR4X / LPDDR5 / LPDDR5X, eMMC 5.1 / UFS 2.2 / UFS 3.1 / UFS 4.0 / NVMe, MicroSD dedicated vs hybrid slot |
| **3. Display & Visuals** | `display_size_inches`, `display_type`, `resolution_width`, `resolution_height`, `refresh_rate_hz`, `touch_sampling_rate_hz`, `peak_brightness_nits`, `display_protection` | Diagonal inches, IPS LCD / Super AMOLED / LTPO OLED, Pixel matrix (FHD+, 1.5K, 2K), Hertz (60Hz–165Hz), PWM frequency, Nits peak, Gorilla Glass standard |
| **4. Imaging & Optics** | `rear_camera_primary_mp`, `rear_camera_primary_sensor`, `rear_camera_primary_aperture`, `has_ois`, `rear_camera_ultrawide_mp`, `rear_camera_telephoto_mp`, `optical_zoom_factor`, `rear_camera_extra_sensors`, `front_camera_mp`, `front_camera_aperture`, `front_camera_af`, `video_recording_max`, `has_gyro_eis` | Megapixels (MP), Sensor optical format (1/1.56" to 1-inch), f-stop aperture, Hardware OIS vs EIS, Periscope zoom factor (3x, 5x, 10x), Eye Autofocus (AF), Video resolution (1080p60, 4K60, 4K120, 8K) |
| **5. Battery & Power** | `battery_mah`, `charging_watt_wired`, `charging_watt_wireless`, `has_reverse_charging`, `has_bypass_charging`, `battery_type` | Milliampere-hours (mAh), Watts (W), Inductive wireless (W), Reverse wireless support, Bypass charging during gaming, Silicon-Carbon vs Li-Po |
| **6. Build & Materials** | `height_mm`, `width_mm`, `thickness_mm`, `weight_grams`, `frame_material`, `back_material`, `ip_rating` | Millimeters (mm), Grams (g), Polycarbonate / Aluminum / Stainless Steel / Titanium, Glass / Ceramic / Vegan Leather, Ingress Protection (IP52 to IP69) |
| **7. Connectivity** | `has_5g`, `supported_5g_bands`, `wifi_standard`, `bluetooth_version`, `has_nfc`, `has_ir_blaster`, `has_headphone_jack`, `speaker_type` | Domestic 5G band array (n1, n3, n5, n8, n28, n77, n78), Wi-Fi 5 / 6 / 6E / 7, Bluetooth 5.0–5.4, Dual Stereo Speakers / Dolby Atmos, 3.5mm jack |
| **8. OS & Lifecycle** | `launch_os`, `current_os`, `custom_ui`, `promised_os_updates_years`, `promised_security_years` | Android/iOS baseline version, OEM UI overlay, Major OS upgrade commitment (1–7 years), Security patch cadence (2–7 years) |
| **9. Economics & Value** | `price`, `currency`, `is_featured`, `is_active`, `vfm_score` | INR (₹), Active catalog state, Certified Refurbished grading (Grade A/B), Algorithmic Value-for-Money score (0–10 scale) |
| **10. AI Vector Space** | `embedding` | 1536-dimensional dense floating-point vector representation for OpenAI/Gemini semantic similarity search |

---

## 5. The 5 Signature Recommendation Pillars

Every smartphone in the system is evaluated, scored, and categorized into five distinct pillars:

```
                    ┌─────────────────────────┐
                    │  5 SIGNATURE CATEGORIES │
                    └────────────┬────────────┘
         ┌───────────────┬───────┴───────┬───────────────┐
         ▼               ▼               ▼               ▼
   [Budget Killer] [Gaming Guru]  [Camera Champ]  [Battery Boss]  [G.O.A.T]
```

### 1. 💰 Budget Killer
- **Objective:** Maximum utility and performance per rupee in tight budget brackets.
- **Key Evaluation Criteria:** Cost-to-performance ratio, essential daily multitasking stability, long-term battery degradation resistance, and clean software with minimal adware.
- **Weight Distribution:** Value for Money (40%), Daily Processor Efficiency (25%), Battery Health (20%), Display & UI Polish (15%).

### 2. 🎮 Gaming Guru
- **Objective:** Peak sustained framerate, low latency, and thermal endurance for competitive mobile gaming.
- **Key Evaluation Criteria:** Sustained GPU clock stability under load, vapor chamber cooling area, screen refresh rate (120Hz–165Hz), touch response rate (360Hz–480Hz+), and dedicated gaming optimizations (e.g. bypass charging, frame interpolation chips).
- **Weight Distribution:** Chipset & GPU Silicon (40%), Thermal Cooling & Frame Stability (25%), Display Refresh & Touch Latency (20%), Fast Charging & Game Modes (15%).

### 3. 📷 Camera Champ
- **Objective:** Studio-grade still photography, portrait fidelity, low-light illumination, and stable 4K video recording.
- **Key Evaluation Criteria:** Primary sensor physical area (1/1.56" to 1-inch), Optical Image Stabilization (OIS), dedicated optical periscope telephoto zoom, front selfie autofocus, computational HDR processing, and professional color grading tuning.
- **Weight Distribution:** Primary Sensor Hardware & OIS (35%), Low-Light Computational Engine (25%), Periscope / Ultra-wide Versatility (25%), Video Stabilization & Audio Quality (15%).

### 4. 🔋 Battery Boss
- **Objective:** Total freedom from power banks and charging anxiety under heavy mixed usage.
- **Key Evaluation Criteria:** Physical battery capacity (6000mAh to 8300mAh+), real-world screen-on time (SOT), deep sleep standby efficiency, and high-wattage charging speed (45W to 150W+).
- **Weight Distribution:** Battery Capacity (40%), Real-World SOT Endurance (30%), Charging Velocity & Safety (20%), Thermal Efficiency on Charge (10%).

### 5. 🏆 G.O.A.T (Greatest Of All Time)
- **Objective:** Complete absence of compromise across engineering, aesthetics, status, and longevity.
- **Key Evaluation Criteria:** Includes cutting-edge flagship releases and **certified refurbished flagship legends** (devices that originally retailed at high prices and now offer flagship display curves, premium materials, and top-tier silicon at steep discounts).
- **Weight Distribution:** Build Quality & Materials (30%), Long-term Software Support (25%), Display & Camera Benchmark Dominance (25%), Value Retention & Ecosystem Polish (20%).

---

## 6. Granular Budget Framework & Spec Benchmarks

The RMDU platform defines rigorous hardware standards across **six micro-budget tiers**. Below is the complete structural breakdown of expected hardware, targeted benchmarks, and acceptable engineering trade-offs for each budget bracket:

---

### Tier 1: Under ₹10,000 (Sub-10K Ultra Budget)

*Target Persona: Entry-level users, students, seniors, delivery personnel, and secondary phone buyers.*

| Dimension | Standard Target Specs | Acceptable Trade-offs | Red Flags to Avoid |
|---|---|---|---|
| **Processor** | 6nm/12nm Octa-core SoCs (Cortex-A75 + A55 cores) | Moderate GPU gaming power; standard multi-core speeds | Ancient 28nm/quad-core processors |
| **RAM & Storage** | 4GB–6GB LPDDR4X RAM • 64GB–128GB Internal Storage | UFS 2.2 or optimized eMMC 5.1 storage speeds | 2GB/3GB RAM configurations that lag on modern apps |
| **Display** | 6.5"–6.75" HD+ to FHD+ IPS LCD • 90Hz Refresh Rate | Drop notches; LCD instead of AMOLED; standard viewing angles | 60Hz panels with poor outdoor peak brightness (<400 nits) |
| **Battery & Charging** | 5000mAh–6000mAh capacity • 18W Fast Charging | Slower charging time (~80–110 min); plastic back | Sub-5000mAh batteries; micro-USB ports |
| **Camera System** | 50MP AI Main Camera • 8MP Front Selfie Camera | Auxiliary 2MP depth/macro sensors; no 4K video recording | Outdated 8MP/13MP primary sensors |
| **Connectivity** | Dual 4G VoLTE or Entry-level 5G Bands • 3.5mm Headphone Jack | Plastic chassis; side-mounted physical fingerprint sensor | Absence of dual-band Wi-Fi (5GHz) |

---

### Tier 2: ₹10,000 – ₹20,000 (Sub-20K Mainstream Budget)

*Target Persona: College students, high-usage working professionals, and battery endurance seekers.*

| Dimension | Standard Target Specs | Acceptable Trade-offs | Red Flags to Avoid |
|---|---|---|---|
| **Processor** | Modern 4nm/6nm 5G Silicon (Cortex-A78 cores, AnTuTu ~400k–650k) | Mild throttling under sustained maximum 3D load | Repackaged entry-tier 4G processors re-released in 5G coats |
| **RAM & Storage** | 6GB–8GB LPDDR4X/LPDDR5 RAM • 128GB–256GB UFS 2.2/3.1 Storage | Hybrid SIM/microSD slots | Slow eMMC 5.1 storage that bottlenecks app installs |
| **Display** | 6.6"–6.78" 120Hz FHD+ IPS LCD or 120Hz Super AMOLED (1000+ nits) | Plastic middle frames; flat display glass | 720p HD+ resolution displays at prices above ₹15,000 |
| **Battery & Charging** | 5000mAh to 7000mAh Ultra-high capacity • 33W to 80W Fast Charging | Moderate phone thickness (8.5mm–9.2mm) for high mAh cells | Slow 15W/18W charging on giant 6000mAh+ cells |
| **Camera System** | 50MP–64MP Primary (with OIS becoming available) + Ultrawide Lens | Secondary 2MP macro/depth fillers; 1080p60 video max | Unstabilized primary cameras with aggressive noise in low light |
| **Connectivity** | Full Domestic 5G Band Coverage (8–13 bands) • Stereo Speakers • IP54 | Plastic construction; standard haptic motors | Devices with fewer than four 5G bands |

---

### Tier 3: ₹20,000 – ₹30,000 (Sub-30K Mid-Range Value Tier)

*Target Persona: Mobile gamers, aspiring content creators, and enthusiasts seeking flagship-adjacent speeds.*

| Dimension | Standard Target Specs | Acceptable Trade-offs | Red Flags to Avoid |
|---|---|---|---|
| **Processor** | Upper-Mid Silicon (Cortex-X cores, AnTuTu ~800k–1.4M+) | Higher heat output requiring internal vapor chamber | Power-inefficient chipsets with thermal throttling |
| **RAM & Storage** | 8GB–12GB LPDDR5X RAM • 128GB–256GB UFS 3.1 or UFS 4.0 Storage | Omission of expandable microSD slot | UFS 2.2 storage on performance-marketed devices |
| **Display** | 6.67"–6.78" 1.5K 120Hz–144Hz AMOLED • HDR10+ • 1800–4500 nits Peak | Curved glass edges (polarizing for some gamers) | Standard 8-bit color displays; thick bezels |
| **Battery & Charging** | 5500mAh–7000mAh capacity • 67W–120W Ultra-fast FlashCharge | Absence of wireless inductive charging | Batteries smaller than 5000mAh without fast charging |
| **Camera System** | 50MP–200MP Main with OIS (Sony LYT or ISOCELL) + 8MP Ultrawide | Absence of telephoto periscope zoom in some models | Omnipresent 2MP useless macro sensors masquerading as "triple cams" |
| **Connectivity** | Wi-Fi 6/6E • In-display Optical Fingerprint • Dual Stereo Speakers • IP64/IP68 | Lack of 3.5mm analog audio jack | Weak single bottom-firing speaker setups |

---

### Tier 4: ₹30,000 – ₹40,000 (Sub-40K Upper Mid-Range / Premium)

*Target Persona: Prosumers seeking flagship camera sensors, optical periscope zoom, and refined ergonomics.*

| Dimension | Standard Target Specs | Acceptable Trade-offs | Red Flags to Avoid |
|---|---|---|---|
| **Processor** | Flagship-Tier Silicon (Flagship 4nm chips, AnTuTu ~1.5M+) | Mild battery consumption under high sustained gaming | Mid-tier processors packaged into premium bodies |
| **RAM & Storage** | 8GB–16GB LPDDR5X RAM • 256GB UFS 4.0 Storage | Lack of headphone jack and memory expansion | 128GB base storage tiers at this price point |
| **Display** | 6.7"–6.83" 1.5K–2K 120Hz LTPO AMOLED • 10-bit/12-bit Color • 4000+ nits | Sub-2K resolution on select models favoring battery | Non-LTPO panels with high static power draw |
| **Battery & Charging** | 5500mAh–7500mAh capacity • 80W–120W Fast Charging | Fast chargers occasionally sold separately in select brands | Sub-60W charging speeds unless paired with wireless charging |
| **Camera System** | 50MP Sony Sensor with OIS + Dedicated 3x Optical Periscope Zoom + 4K60 | No 8K video recording; plastic frame borders on select SKUs | Fake digital 2x zoom promoted as dedicated telephoto |
| **Connectivity** | Full IP68 Water/Dust Immersion Resistance • Metal/Glass Build • Wi-Fi 7 Ready | Premium pricing on official manufacturer accessories | Plastic rear shells; lack of official water ingress rating |

---

### Tier 5: ₹40,000 – ₹50,000 (Sub-50K Near-Flagship Tier)

*Target Persona: Tech enthusiasts demanding high-end engineering, gaming triggers, and studio photography.*

| Dimension | Standard Target Specs | Acceptable Trade-offs | Red Flags to Avoid |
|---|---|---|---|
| **Processor** | Top-Tier Current/Previous-Gen Flagship Silicon (AnTuTu ~1.8M–2.2M+) | Substantial thermal output during continuous stress testing | Throttling processors without dedicated cooling solutions |
| **RAM & Storage** | 12GB–16GB LPDDR5X RAM • 256GB–512GB UFS 4.0 High-speed Storage | No external SD card slot | Outdated memory standards |
| **Display** | 6.7"–6.85" 1.5K–2K LTPO 120Hz–165Hz AMOLED • High-frequency PWM Dimming | Curved glass reflections in outdoor sunlight | Flickering displays with low PWM frequency (<960Hz) |
| **Battery & Charging** | 5500mAh–8300mAh Silicon-Carbon Cell • 100W–150W Wired + Wireless | Phone weight reaching 210g–225g on massive battery variants | Slow charging coupled with heavy daily battery drain |
| **Camera System** | 50MP Triple System (Main OIS + 50MP Ultrawide + 3x–5x Optical Periscope) | Slightly larger camera bump module | Mediocre secondary sensors paired with good main cameras |
| **Connectivity** | Aerospace Aluminum/Titanium or Vegan Leather • IP68/IP69 • Haptics | Absence of bundled cases in select luxury SKUs | Weak vibration motors without directional haptic feedback |

---

### Tier 6: Above ₹50,000 (50K+ Ultra-Premium & Flagship Titans)

*Target Persona: Luxury consumers, pro mobile cinematographers, executives, and power users wanting absolute top tier.*

| Dimension | Standard Target Specs | Acceptable Trade-offs | Red Flags to Avoid |
|---|---|---|---|
| **Processor** | Leading-Edge 2nm/3nm Flagship Silicon (Next-Gen NPU, AnTuTu ~2.5M–3M+) | Premium price bracket | Processors with known overheating or battery drainage bugs |
| **RAM & Storage** | 12GB–24GB LPDDR5X RAM • 256GB–1TB UFS 4.0 / NVMe Storage | No storage expandability | Base storage below 256GB |
| **Display** | 6.7"–6.9" Quad-Curved / Flat 2K ProXDR LTPO AMOLED • 1Hz–165Hz • 4500–6000 nits | Substantial display surface area (two-handed operation) | Displays lacking adaptive 1Hz–120Hz dynamic refresh |
| **Battery & Charging** | 5000mAh–7500mAh Silicon-Carbon High Density • 80W–150W Wired + 50W Wireless | Proprietary wireless charging pads required for max speed | Sub-30W charging speeds on massive flagships |
| **Camera System** | 1-inch Type Main Sensor + Dual Periscope Zoom (3x + 6x) + 4K120/8K ProRes | Prominent camera module protrusion | Digital software cropping passing as optical telephoto |
| **Materials & Build** | Grade 5 Titanium / Ceramic / Anti-Reflective Armor Glass • IP68/IP69 • Satellite | Premium repair costs for cracked glass panels | Plastic frames, cheap vibration motors, or lack of water sealing |

---

## 7. Category × Budget Master Decision Matrix

*This matrix illustrates the technical focus prioritized for every Category across every Budget Bracket:*

| Budget Bracket | 💰 Budget Killer Focus | 🎮 Gaming Guru Focus | 📷 Camera Champ Focus | 🔋 Battery Boss Focus | 🏆 G.O.A.T Choice Focus |
|---|---|---|---|---|---|
| **Under ₹10k** | Maximum RAM/Storage per rupee with clean Android | Entry 4nm 5G chipset with 90Hz smooth scrolling | 50MP sensor with large f/1.8 aperture for low light | 6000mAh high-capacity cell with power management | Solid brand durability with guaranteed OS updates |
| **₹10k – ₹20k** | Balance of 120Hz display, clean UI, and 5G band support | High multi-core 5G SoC with liquid cooling chamber | 50MP sensor with OIS and AMOLED display | 7000mAh battery cell with 33W–80W fast charging | Certified refurbished flagship offering metal build and premium silicon |
| **₹20k – ₹30k** | High AnTuTu (~1M+) score with LPDDR5X RAM | 144Hz screen, dedicated display chip, vapor chamber | 50MP/200MP OIS sensor with studio portrait tuning | 6500mAh–7100mAh battery with 80W charging | Certified refurbished flagship with 2K LTPO curve and Hasselblad/Leica tuning |
| **₹30k – ₹40k** | Sub-flagship silicon with premium glass build | Flagship killer SoC with 7000mAh+ gaming marathon cell | Dedicated 3x optical periscope zoom lens with OIS | 7000mAh+ cell with 100W–120W HyperCharge | Certified refurbished flagship titan with integrated stylus and 10x periscope |
| **₹40k – ₹50k** | Near-flagship speed with 4+ years of OS support | Ultrasonic shoulder triggers, 165Hz screen, bypass charging | Studio computational photography with pure natural color | 7400mAh–8300mAh battery with 120W–150W charging | Certified refurbished luxury Pro flagship with ProMotion and stainless steel |
| **Above ₹50k** | Flagship display with ceramic build and zero bloatware | Console-grade ray tracing, internal RGB fan, raw horsepower | 1-inch sensor or Dual Periscope (3x + 6x) with 4K120 ProRes | 7000mAh+ high-density battery with 150W charging | State-of-the-art titanium flagship with 7-year software drops |

---

## 8. Recommendation Engine & Mathematical Scoring Algorithm

The core engine computes an objective compatibility match score between a user profile and all candidate devices in the database using the stored procedure `fn_compute_match_score`:

$$\text{MatchScore} = \sum_{i \in \text{Criteria}} \left( W_i \times S_i \right) - \sum \text{Penalties}$$

### 1. Weighted Criteria Model
Each priority category assigns distinct weights to normalized 0–100 sub-scores stored in `device_scores`:
- $W_{\text{perf}}$: Processor benchmarks, multi-core speeds, and thermal stability.
- $W_{\text{cam}}$: Sensor area, OIS capability, telephoto versatility, and computational ISP.
- $W_{\text{bat}}$: Milliampere-hour rating, screen-on endurance, and wattage speed.
- $W_{\text{disp}}$: Panel technology (AMOLED vs LCD), refresh rate, and outdoor nit brightness.
- $W_{\text{val}}$: Performance delivered per rupee relative to current market pricing.

### 2. Auto-Computed Device Overall Score
In the PostgreSQL database, every device's `overall_score` is automatically calculated and stored as a generated column:
$$\text{overall\_score} = 0.25 \times S_{\text{perf}} + 0.25 \times S_{\text{cam}} + 0.20 \times S_{\text{bat}} + 0.15 \times S_{\text{disp}} + 0.15 \times S_{\text{val}}$$

### 3. Penalty Modifiers
- **Budget Exceedance Penalty:**
  $$\text{Penalty}_{\text{budget}} = \max\left(0, \frac{\text{DevicePrice} - \text{BudgetMax}}{\text{BudgetMax}} \times 100 \times 1.5\right)$$
- **Band Incompatibility Deduction:** Up to $-10$ points if critical regional 5G frequency bands (n28, n78) are absent from the hardware spec.
- **Charging Velocity Deficit:** If the user priority is *Battery Boss* and charging velocity is $<33\text{W}$, an endurance tax of $-8$ points is applied.

### 4. Dynamic Rank Shift Trigger Mechanism
Category ranks are stored as strict, dense integer positions ($1, 2, 3 \dots$) inside `device_categories.rank`.
When an administrator inserts or updates a phone at rank $R$, the database trigger `trg_shift_category_ranks` automatically shifts all existing rows with rank $\ge R$ downward by $+1$:

```sql
CREATE OR REPLACE FUNCTION fn_shift_category_ranks()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE device_categories
    SET rank = rank + 1
    WHERE category_id = NEW.category_id
      AND rank >= NEW.rank
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 9. Side-by-Side Comparison & Upgrade Inference Engine

### 1. Specification Normalization
When multiple devices are selected for comparison (stored in `comparison_sessions` with array column `device_ids UUID[]`):
- Technical dimensions are normalized to comparable units (e.g. converting pixel density into PPI, battery capacity to Wh where voltage is known, and charging times to standard 0–100% minutes).
- Direct delta indicators highlight advantages (e.g. `+2500mAh battery`, `+44Hz refresh rate`, `Silicon node 4nm vs 6nm`).

### 2. Upgrade Pattern Inference
The `user_phone_history` table records previous devices owned along with duration of ownership (`usage_years`).
The system analyzes this historical progression to infer user upgrade frequency and calculate whether a prospective device represents a true generational leap:
$$\text{GenerationalLeapIndex} = \frac{\text{Benchmark}_{\text{New}} - \text{Benchmark}_{\text{Old}}}{\text{Benchmark}_{\text{Old}}} \times 100$$
If the leap index is under 20%, the system flags a "Marginal Upgrade Warning" to prevent unnecessary expenditure.

---

## 10. Database Architecture & Complete PostgreSQL Schema (21+ Tables)

The system uses a PostgreSQL 15+ relational schema with 21+ tables detailed in [`database/mobilemart_schema.sql`](file:///d:/rmdu%20mobiles/database/mobilemart_schema.sql):

```mermaid
erDiagram
    USERS ||--|| USER_PROFILES : "has preferences"
    USERS ||--o{ USER_PHONE_HISTORY : "previously owned"
    USERS ||--o{ REVIEWS : "authors"
    BRANDS ||--o{ DEVICES : "manufactures"
    DEVICES ||--|| DEVICE_SPECS : "technical specs"
    DEVICES ||--|| DEVICE_SCORES : "computed ratings"
    DEVICES ||--o{ DEVICE_PROS_CONS : "editorial highlights"
    DEVICES ||--o{ DEVICE_CATEGORIES : "ranked in"
    CATEGORIES ||--o{ DEVICE_CATEGORIES : "contains"
    DEVICES ||--o{ SHOPKEEPER_CARDS : "offline shortcode"
    DEVICES ||--|| DEVICE_EMBEDDINGS : "pgvector 1536-dim"
```

### Complete Schema Table Reference:

| Table Name | Primary Purpose | Key Columns & Constraints |
|---|---|---|
| `users` | User authentication, identity, and role-based access | `id (UUID)`, `email (UNIQUE)`, `password_hash (bcrypt)`, `role ('user'\|'admin'\|'editor')` |
| `user_profiles` | Extended buyer preferences, budget envelope, and priority | `user_id (FK)`, `budget_min`, `budget_max`, `primary_priority`, `preferred_os`, `preferred_brands` |
| `user_phone_history` | Previously owned phones for calculating upgrade paths | `user_id (FK)`, `device_id (FK)`, `usage_years`, `review` |
| `brands` | Smartphone manufacturers and brand metadata | `id (UUID)`, `name (UNIQUE)`, `country`, `logo_url`, `is_active` |
| `devices` | Central smartphone registry | `id (UUID)`, `brand_id (FK)`, `slug (UNIQUE)`, `price`, `currency`, `embedding (VECTOR(1536))` |
| `device_specs` | Granular technical hardware specifications (60+ columns) | `device_id (FK UNIQUE)`, `processor_name`, `antutu_score`, `display_type`, `battery_mah`, `ip_rating` |
| `device_scores` | Normalized 0–100 sub-scores and auto-generated overall score | `device_id (FK UNIQUE)`, `performance_score`, `camera_score`, `battery_score`, `overall_score (GENERATED)` |
| `device_pros_cons` | Editorial positive and negative product highlights | `device_id (FK)`, `type ('pro'\|'con')`, `point_text`, `display_order` |
| `device_features` | Key-value hardware feature highlights | `device_id (FK)`, `feature_name`, `feature_value`, `icon` |
| `device_ussd_codes` | Diagnostic and secret testing USSD codes per brand/device | `device_id (FK)`, `brand_id (FK)`, `code`, `description`, `is_universal` |
| `categories` | The 5 signature discovery categories | `id (UUID)`, `slug (UNIQUE)`, `name`, `description`, `icon`, `color_hex`, `display_order` |
| `device_categories` | Dynamic ranked device listings within each category | `device_id (FK)`, `category_id (FK)`, `rank (INTEGER)`, `badge`, `UNIQUE(device_id, category_id)` |
| `recommendations` | Precomputed recommendation entries per user | `user_id (FK)`, `device_id (FK)`, `category_id (FK)`, `match_score`, `rank`, `reason_summary` |
| `recommendation_rules`| Priority-based score weight matrices | `priority ('gaming'\|'camera'...)`, `weight_performance`, `weight_camera`, `weight_battery` |
| `comparison_sessions` | Multi-device comparison history | `session_token`, `device_ids (UUID[])`, `user_id (FK)`, `created_at` |
| `shopkeeper_cards` | Physical retail integration cards with short lookup codes | `device_id (FK)`, `short_code (VARCHAR(8) UNIQUE)`, `qr_code_svg`, `views_count`, `is_active` |
| `reviews` | Owner ratings and verified buyer reviews | `device_id (FK)`, `user_id (FK)`, `rating (1-5)`, `review_title`, `review_text`, `verified_owner` |
| `price_alerts` | User-defined price drop threshold notifications | `user_id (FK)`, `device_id (FK)`, `target_price`, `is_triggered`, `created_at` |
| `audit_log` | Immutable administrative record of catalog modifications | `admin_id (FK)`, `action ('INSERT'\|'UPDATE'\|'DELETE')`, `table_name`, `record_id`, `old_value`, `new_value` |
| `device_embeddings` | AI semantic vectors of device summaries (RAG core) | `device_id (FK UNIQUE)`, `embedding (VECTOR(1536))`, `chunk_text`, `model_name` |
| `user_query_embeddings`| Cached embeddings of previous user search queries | `query_text`, `embedding (VECTOR(1536))`, `created_at` |
| `rag_knowledge_chunks` | Chunked domain knowledge for RAG retrieval | `id (UUID)`, `source_type`, `chunk_text`, `embedding (VECTOR(1536))` |
| `ai_chat_sessions` | Conversational session tracker for AI assistant | `session_token (UNIQUE)`, `user_id (FK)`, `summary`, `created_at` |
| `ai_chat_messages` | Full chat history with user and assistant turns | `session_id (FK)`, `role ('user'\|'assistant'\|'system')`, `content`, `embedding (VECTOR(1536))` |

---

## 11. FastAPI Backend Architecture & REST Contracts

The backend service is built natively with **FastAPI** (Python 3.11+), leveraging its high-throughput asynchronous request handling, automatic request validation via Pydantic v2, and auto-generated interactive OpenAPI docs (`/docs`).

### 1. FastAPI Modular Project Layout
```text
backend/
├── main.py                  # FastAPI app factory, CORS middleware, lifespan events
├── core/
│   ├── config.py            # Pydantic BaseSettings, environment variables
│   └── database.py          # Async engine, connection pooling with asyncpg
├── schemas/                 # Pydantic v2 schemas (DeviceResponse, RecommendationRequest, etc.)
├── routers/                 # APIRouter modules
│   ├── devices.py           # /api/v1/devices CRUD & specification filters
│   ├── categories.py        # /api/v1/categories ranking queries
│   ├── recommendations.py   # /api/v1/recommendations algorithmic calculation
│   ├── compare.py           # /api/v1/compare side-by-side normalizer
│   ├── retail.py            # /api/v1/retail/card shopkeeper shortcode lookups
│   └── ai.py                # /api/v1/ai semantic vector search with pgvector
└── services/
    ├── recommendation_engine.py  # Stored procedure execution & penalty calculations
    └── vector_search.py     # Embedding cosine similarity queries
```

### 2. REST API Route Matrix

```
┌────────────────────────────────────────────────────────────────────────┐
│                        RMDU REST API CONTRACTS                         │
├─────────┬───────────────────────────┬──────────────────────────────────┤
│ METHOD  │ ENDPOINT                  │ FUNCTIONALITY                    │
│ GET     │ /api/v1/devices           │ Filtered catalog list & pagination│
│ GET     │ /api/v1/devices/{slug}    │ Full 60+ spec detail and scores   │
│ GET     │ /api/v1/categories        │ 5 Signature categories & counts   │
│ GET     │ /api/v1/categories/{slug} │ Ranked devices within category   │
│ POST    │ /api/v1/recommendations   │ Compute weighted matches for user│
│ POST    │ /api/v1/compare           │ Multi-device spec normalization  │
│ GET     │ /api/v1/retail/card/{code}│ Shopkeeper shortcode lookup      │
│ POST    │ /api/v1/ai/query          │ Vector similarity RAG retrieval  │
│ GET     │ /docs                     │ Interactive Swagger UI Explorer  │
│ GET     │ /redoc                    │ ReDoc Technical Documentation    │
└─────────┴───────────────────────────┴──────────────────────────────────┘
```

### 3. Recommendation Request & Validation Contract

FastAPI enforces strict schema validation through Pydantic:

```python
from pydantic import BaseModel, Field
from typing import List, Optional

class RecommendationRequest(BaseModel):
    budget_min: float = Field(0.0, ge=0, description="Minimum budget in INR")
    budget_max: float = Field(100000.0, gt=0, description="Maximum budget in INR")
    primary_priority: str = Field(..., regex="^(budget|gaming|camera|battery|all-rounder)$")
    secondary_priority: Optional[str] = None
    preferred_os: str = Field("any", regex="^(android|ios|any)$")
    preferred_brands: List[str] = []
    must_have_features: List[str] = []

class RecommendationItem(BaseModel):
    device_id: str
    match_score: float = Field(..., ge=0, le=100)
    rank: int
    reason_summary: str
    price: float
    overall_score: float
```

Example JSON Payload:
```json
{
  "budget_min": 20000,
  "budget_max": 35000,
  "primary_priority": "gaming",
  "secondary_priority": "battery",
  "preferred_os": "android",
  "preferred_brands": [],
  "must_have_features": ["has_ois", "has_bypass_charging"]
}
```

---

## 12. Frontend Engineering & UI/UX Design System

### 1. Preloader-to-Navbar Morphing Sequence
The application features an intro animation built using GSAP 3:
1. The RMDU logo scales into the exact viewport center accompanied by a fading tagline.
2. An animated progress bar tracks loading status.
3. Upon completion, the central logo mathematically calculates the target bounding rectangle (`getBoundingClientRect()`) of the navbar logo.
4. The logo smoothly flies and scales directly into the navigation header while the preloader veil dissolves, ensuring zero layout shift.

### 2. Inertial Scrolling (Lenis Integration)
Integrated with `@studio-freight/lenis` and synced to GSAP's `ScrollTrigger.update`, delivering smooth 60fps momentum physics on mouse wheels, trackpads, and touch devices.

### 3. Responsive Modal Spec Inspector
Clicking on any device card triggers an accessible modal overlay rendering:
- High-resolution product imagery and official launch year.
- Performance, display, battery, and connectivity spec chips.
- Value for Money (VFM) rating and category justification.

---

## 13. Shopkeeper Offline Intelligence & Retail Integration

A core differentiator of RMDU Mobiles is its **Shopkeeper Card System**:
- **Offline Shortcodes:** Every smartphone in the database is assigned an 8-character unique alphanumeric shortcode (e.g. `RMDU-B7K1`).
- **Retail Display Cards:** Physical retail partner stores can display standardized RMDU specification cards beside demo units.
- **Zero-Friction Lookup:** Shoppers can enter the shortcode into the web app to view verified benchmarks, Pros & Cons, and category justifications without salesperson bias.

---

## 14. Project Directory & File Structure

```text
d:\rmdu mobiles\
├── .env                                   # Local active environment secrets (git-ignored)
├── .env.example                           # Comprehensive environment configuration template
├── README.md                              # Master project analysis & architecture specification
├── RMDU_Mobiles_Project_Documentation.md   # Extended engineering and business requirements documentation
├── Dont-Just-Upgrade-Your-Phone (1).pdf   # Executive pitch and product strategy presentation
├── Dont-Just-Upgrade-Your-Phone (1).pptx  # Editable executive presentation slide deck
│
├── frontend/                              # Modern React 18 + Vite SPA
│   ├── .env                               # Local frontend client environment secrets (git-ignored)
│   ├── .env.example                       # Frontend client environment template
│   ├── index.html                         # SPA HTML entry point with metadata
│   ├── package.json                       # Frontend dependencies (React, GSAP, Lenis, Vite)
│   ├── vite.config.js                     # Vite build, server, and asset configurations
│   └── src/
│       ├── main.jsx                       # React DOM root bootstrapping
│       ├── App.jsx                        # Master router handling category paths & transitions
│       ├── app.js                         # Lenis smooth-scroll & GSAP preloader morphing logic
│       ├── components/
│       │   ├── Home.jsx                   # Interactive homepage with animated landing sections
│       │   ├── CategoryPage.jsx           # Dedicated category showcase template with video reels
│       │   ├── Header.jsx                 # Glassmorphic header with navigation links
│       │   ├── Preloader.jsx              # Intro preloader animation with progress counter
│       │   ├── NavOverlay.jsx             # Full-screen responsive drawer navigation menu
│       │   ├── CustomCursor.jsx           # Interactive magnetic cursor dot & trailing ring
│       │   └── sections/
│       │       ├── Hero.jsx               # Immersive hero section with video loop
│       │       ├── Problem.jsx            # "Why RMDU" market challenge breakdown
│       │       ├── Categories.jsx         # 5 category portals with video preview reels
│       │       ├── Trust.jsx              # Transparency, zero-sponsor ethics statement
│       │       └── Footer.jsx             # Sitemap, social links, and copyright
│       └── styles/                        # Modular CSS stylesheets and design tokens
│
├── database/                              # Database schemas & implementation guides
│   ├── mobilemart_schema.sql              # Complete PostgreSQL 15+ schema (21 tables, triggers, pgvector)
│   └── implement.md                       # Database setup guide and deployment documentation
│
└── old site/                              # Reference implementation & standalone HTML catalog
    ├── BudgetKiller.html                  # Standalone interactive Budget Killer catalog
    ├── GamingGuru.html                    # Standalone interactive Gaming Guru catalog
    ├── CameraChampion.html                # Standalone interactive Camera Champ catalog
    ├── BatteryBeast.html                  # Standalone interactive Battery Boss catalog
    ├── GOATLegends.html                   # Standalone interactive G.O.A.T catalog
    ├── cart.html                          # Cart overview and quantity adjustments
    ├── checkout.html                      # Delivery address, order summary & payment gateway
    ├── wishlist.html                      # Saved phones collection
    ├── login.html & newacc.html           # Authentication pages
    ├── feedback.html                      # Customer rating & feedback collection
    ├── database/schema.sql                # Original MySQL reference schema
    └── frontend/js/                       # Client-side scripts
        ├── complete-device-database.js    # Device specification dictionary
        ├── modal-device-details.js        # Dynamic modal populator & category justifications
        ├── unified-cart.js                # LocalStorage cart management system
        └── advanced-filters.js            # Client-side multi-facet filter processor
```

---

## 15. Environment Variables & Supabase Configuration (.env)

The RMDU Mobiles platform relies on environment variables to seamlessly connect the React/Vite frontend, the FastAPI backend, the Supabase PostgreSQL database, and AI vector search services.

### 1. Master Environment Variable Reference

| Variable Name | Layer | Purpose / Description | Sample / Format |
|---|---|---|---|
| `DATABASE_URL` | Backend / DB | Direct PostgreSQL connection string for migrations, ORM, and CLI tools | `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres` |
| `DATABASE_POOLED_URL` | Backend / DB | Connection pooler URI with PgBouncer for high-concurrency async operations | `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `SUPABASE_URL` | Shared | Base HTTPS endpoint for Supabase REST API & Auth | `https://your-project-ref.supabase.co` |
| `SUPABASE_ANON_KEY` | Shared / Client | Public anonymous JWT key with Row Level Security (RLS) enforcement | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend Only | Secret admin JWT key that bypasses RLS (never expose to frontend clients) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `VITE_SUPABASE_URL` | Frontend (Vite) | Client-accessible Supabase project URL bundled into browser builds | `https://your-project-ref.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Frontend (Vite) | Client-accessible anonymous public key for frontend queries | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `VITE_API_BASE_URL` | Frontend (Vite) | Base URL for FastAPI REST microservice endpoints | `http://localhost:8000/api/v1` |
| `APP_ENV` | Backend | Environment flag (`development`, `staging`, `production`) | `development` |
| `APP_HOST` / `APP_PORT` | Backend | FastAPI host binding address and listening port | `127.0.0.1` / `8000` |
| `CORS_ORIGINS` | Backend | Comma-separated list of allowed frontend client origins | `http://localhost:5173,http://127.0.0.1:5173` |
| `SECRET_KEY` | Backend | 32-byte cryptographic secret used for JWT signing and session integrity | Generated via `openssl rand -hex 32` |
| `OPENAI_API_KEY` | AI Service | API key for OpenAI text-embedding-3-small (1536-dim vectors for RAG) | `sk-...` |
| `EMBEDDING_MODEL` | AI Service | Embedding model identifier | `text-embedding-3-small` |
| `EMBEDDING_DIMENSIONS` | AI Service | Dimensions of device and query vectors | `1536` |

---

### 2. How to Retrieve Your Supabase Credentials

1. **Log in to Supabase**: Navigate to **[supabase.com/dashboard](https://supabase.com/dashboard)** and select your RMDU Mobiles project.
2. **Retrieve API Keys**:
   - Go to **Project Settings** (gear icon) ➔ **API**.
   - Copy **Project URL** ➔ Paste into `SUPABASE_URL` and `VITE_SUPABASE_URL`.
   - Copy **Project API keys: `anon` `public`** ➔ Paste into `SUPABASE_ANON_KEY` and `VITE_SUPABASE_ANON_KEY`.
   - Copy **Project API keys: `service_role` `secret`** ➔ Paste into `SUPABASE_SERVICE_ROLE_KEY` (keep this safe).
3. **Retrieve Database Connection Strings**:
   - Go to **Project Settings** ➔ **Database**.
   - Under **Connection parameters**, find **Connection string**.
   - Select **URI** mode and copy the string (replace `[YOUR-PASSWORD]` with your actual database password) ➔ Paste into `DATABASE_URL`.
   - Under **Connection Pooling**, copy the transaction pooling URI (port 6543) ➔ Paste into `DATABASE_POOLED_URL`.

---

## 16. Setup, Installation & Execution Guide

### Prerequisites
- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher
- **Python:** v3.11 or higher
- **PostgreSQL / Supabase:** PostgreSQL 15+ (with `pgvector`, `uuid-ossp`, `pgcrypto` extensions)

### 1. Configuring Environment Files
```bash
# In the project root, copy the template to .env
cp .env.example .env

# In the frontend directory, copy the template to .env
cp frontend/.env.example frontend/.env

# Open .env and populate your real Supabase and API credentials
```

### 2. Launching the Modern Frontend
```bash
# Navigate to the frontend directory
cd "d:\rmdu mobiles\frontend"

# Install project dependencies
npm install

# Start Vite local development server
npm run dev
```
Open your browser at `http://localhost:5173` to experience the animated interface.

### 3. Running the FastAPI Backend
```bash
# Navigate to the backend directory (or root)
cd "d:\rmdu mobiles\backend"

# Create a virtual environment
python -m venv venv

# Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Linux / macOS:
# source venv/bin/activate

# Install backend dependencies
pip install fastapi "uvicorn[standard]" asyncpg pydantic pydantic-settings sqlalchemy pgvector

# Launch FastAPI ASGI server with auto-reload
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
- Interactive API Documentation: Visit `http://127.0.0.1:8000/docs` (Swagger UI)
- Alternative API Documentation: Visit `http://127.0.0.1:8000/redoc` (ReDoc)

### 4. Provisioning the Enterprise Database (Supabase or Local PostgreSQL)

#### Option A: Via Supabase Dashboard (Recommended)
1. In your Supabase Dashboard, go to **Database** ➔ **Extensions** and ensure `vector`, `uuid-ossp`, and `pgcrypto` are enabled.
2. Go to **SQL Editor** ➔ **New Query**.
3. Paste the entire contents of [database/mobilemart_schema.sql](file:///d:/rmdu%20mobiles/database/mobilemart_schema.sql) and click **Run**.

#### Option B: Via PostgreSQL CLI
```bash
# 1. Create the PostgreSQL database instance
createdb -U postgres rmdu_mobiles

# 2. Run the master schema file
psql -U postgres -d rmdu_mobiles -f "d:\rmdu mobiles\database\mobilemart_schema.sql"

# 3. Verify that all tables, functions, and extensions are active
psql -U postgres -d rmdu_mobiles -c "\dt"
```

### 5. Launching Standalone Reference Catalogues
The reference HTML implementations in `old site/` (e.g. `BudgetKiller.html`) can be previewed directly using any static HTTP server or VS Code Live Server.

---

## 17. Security, Performance & Production Best Practices

- **Database Normalization:** Strict separation of static hardware specs (`device_specs`), dynamic computed ratings (`device_scores`), and pricing metadata ensures zero data duplication.
- **Vector Search Optimization:** `HNSW` (Hierarchical Navigable Small World) index configured on `device_embeddings.embedding` for low-latency similarity queries.
- **DOM & Render Optimization:** Video reels in category pages utilize `playsinline`, `muted`, and lazy preload triggers to prevent network congestion on mobile data connections.
- **State Resilience:** Shopping cart, wishlist items, and filter states persist across sessions using serialized `localStorage` adapters.

---

## 18. Future Roadmap & AI Evolution

1. **Conversational Multi-modal AI Assistant:**
   Integrate Gemini / OpenAI LLMs with the `device_embeddings` vector table to support natural language queries (e.g., *"Show me phones with clean software, great portraits, and at least 2 days of battery life under ₹30,000"*).
2. **Automated Price Tracking Daemon:**
   Background workers scraping certified e-commerce APIs to trigger instant price drop notifications.
3. **Interactive Device Comparison Visualizer:**
   Side-by-side spec comparison tool highlighting hardware trade-offs with visual delta indicators.
4. **Physical QR Code Generator for Retailers:**
   Automated generation of shelf talkers with dynamic QR codes linking directly to a phone's RMDU intelligence card.

---

*RMDU Mobiles © 2026. All rights reserved. Designed & Engineered with precision.*
