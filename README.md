# SmartPlate AI — Intelligent Campus Food Waste Management 🍽️🌱

A full-stack campus mess food intelligence and waste reduction system featuring computer vision plate scanning, smart bin guidance, encrypted student verification, and predictive kitchen demand analytics.

---

## 🌟 Key Features

1. **AI Plate Vision & Segmentation (`vision.py`)**:
   - Multi-region food detection using normalized chromaticity and texture variance.
   - Calculates leftover waste in grams based on plate surface area coverage and food density.
   - Contaminant detection: Flags aluminum foil and plastic packaging to prevent compost contamination.
   - Supports circular plates and multi-compartment rectangular thali trays.
2. **Interactive Live Webcam & Audio**:
   - WebRTC live camera toggle with snapshot capture.
   - Synthesized Web Audio chimes for correct bin sorting.
   - Gamified Eco Campus Points system.
3. **Verified Anonymous Feedback (`server.py`)**:
   - Student identity salting and SHA-256 tokenization.
   - Collects taste, portion, and diet feedback without tracking individual students.
4. **Kitchen Intelligence Dashboard**:
   - 14-day daily waste trends and most-wasted dishes breakdown powered by Chart.js.
   - Real-time kitchen cooking recommendations to prevent overproduction.
5. **Modern Wastia Design & Curated Scroll Experience**:
   - Deep forest green & mint color palette.
   - Sticky stepper with scroll-spy navigation.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.12, FastAPI, Uvicorn
- **Database**: SQLite (`smartplate.db`)
- **Computer Vision**: Pillow (PIL), NumPy
- **Frontend**: HTML5, CSS3 (Modern Flexbox/Grid), Vanilla JavaScript (ES6+)
- **Data Visualization**: Chart.js

---

## 🚀 Quick Start & Installation

### 1. Clone the repository
```bash
git clone https://github.com/kdimple7/smart-mess.git
cd smart-mess
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the application
```bash
python -m uvicorn server:app --host 127.0.0.1 --port 8000 --reload
```
or simply:
```bash
python server.py
```

### 4. Open in browser
Visit **`http://localhost:8000`**

---

## 📂 Project Structure

```
smart-mess/
├── server.py              # FastAPI application & REST endpoints
├── database.py            # SQLite schema, queries & analytics aggregations
├── vision.py              # Multi-region CV segmentation & gram calculations
├── index.html             # Frontend layout & Wastia hero
├── style.css              # Wastia theme & WhereNext curated scroll styles
├── script.js              # Client state, WebRTC camera, audio & Chart.js
├── requirements.txt       # Python package dependencies
├── .gitignore             # Ignored temporary & cache files
└── uploads/               # Saved plate scans
```

---

## 📄 License
MIT License
