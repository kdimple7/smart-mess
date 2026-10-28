# SmartPlate AI — Intelligent Campus Food Waste Management 🍽️🌱

A full-stack campus mess food intelligence, IoT disposal hopper, and waste reduction platform featuring dual-layer computer vision plate scanning (FastAPI backend + in-browser HTML5 Canvas AI), automated hardware telemetry, encrypted student verification, and predictive kitchen demand analytics.

---

## 🌟 Key Features

1. **Dual-Layer Computer Vision Plate Segmentation (`vision.py` & In-Browser Canvas AI)**:
   - Multi-region food detection using normalized chromaticity ($r/I, g/I, b/I$) and texture/edge gradient variance.
   - Calculates leftover waste in grams based on plate surface area coverage and food density.
   - **Contaminant detection**: Flags aluminum foil and plastic packaging to prevent compost contamination.
   - **Standalone Edge AI**: When deployed statically (e.g., GitHub Pages) or offline, the client-side canvas engine automatically executes real computer vision analysis directly in the browser with bounding boxes.
2. **IoT Smart Mess Hopper & Hardware Station (`iot/`)**:
   - **HX711 Digital Load Cell**: Measures ground-truth food scrap weight down to $\pm 1\text{g}$.
   - **HC-SR04 Ultrasonic Sensor**: Real-time bin volume tracking with housekeeping alert triggers at $>85\%$ capacity.
   - **SG90 Servo Chute Diverter**: Automatic physical gate deflection (0° Organic Compost vs 90° Landfill/Recyclables).
   - **MFRC522 RFID Card Tap**: Tap student ID for instant Clean Plate Club rewards (+50 Eco-Points).
   - **Web Serial API Bridge**: Connect physical ESP32 or Arduino microcontrollers directly from Google Chrome / Microsoft Edge with one click!
3. **Comprehensive Environmental & Financial Analytics**:
   - **Financial Loss Counter**: Estimated monthly savings based on ₹/g ingredient costs.
   - **Virtual Water Conserved**: Embedded agricultural water calculations.
   - **Emissions & Recoverable Meals**: $CO_2$e avoided and equivalent meal portions saved.
4. **Clean Plate Club — Campus Hostel Leaderboard**:
   - Real-time ranking of hostel wings and dining blocks based on lowest scrap averages and zero-waste consistency streaks.
5. **Verified Anonymous Feedback (`server.py`)**:
   - Student identity salting and SHA-256 tokenization.
   - Collects taste, portion, and diet feedback without tracking individual students.
6. **Executive Kitchen Demand Intelligence Dashboard**:
   - 14-day daily waste trends and most-wasted dishes breakdown powered by Chart.js.
   - Real-time kitchen cooking recommendations to prevent overproduction.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.12, FastAPI, Uvicorn
- **Database**: SQLite (`smartplate.db`)
- **Computer Vision**: Pillow (PIL), NumPy & HTML5 Canvas Edge AI
- **IoT & Hardware**: ESP32 / Arduino C++, Web Serial API, HX711, HC-SR04, SG90, MFRC522
- **Frontend**: HTML5, CSS3 (Modern Flexbox/Grid), Vanilla JavaScript (ES6+)
- **Data Visualization**: Chart.js

---

## 🚀 Quick Start & Installation

### 1. Run Static Frontend (or GitHub Pages)
Simply open `index.html` in any web browser, or view live on GitHub Pages. The in-browser computer vision engine and IoT simulator will operate automatically.

### 2. Run Full FastAPI Backend (Optional for local DB persistence)
```bash
# Clone the repository
git clone https://github.com/kdimple7/smart-mess.git
cd smart-mess

# Install dependencies
pip install -r requirements.txt

# Run the FastAPI server
python -m uvicorn server:app --host 127.0.0.1 --port 8000 --reload
# or
python server.py
```
Visit **`http://localhost:8000`** in your browser.

---

## 🔌 Hardware Setup (ESP32 / Arduino)

1. Connect your **ESP32** via USB.
2. Open `iot/esp32_smart_mess.ino` in the Arduino IDE and flash it to your board.
3. Refer to `iot/WIRING.md` for circuit schematics and pinouts.
4. In the web dashboard under **Step 02: IoT Smart Hopper**, click **"🔌 Connect USB Microcontroller"** to stream live weight and bin metrics!

---

## 📂 Project Structure

```
smart-mess/
├── iot/
│   ├── esp32_smart_mess.ino   # Microcontroller firmware (HX711, HC-SR04, Servo, Serial JSON)
│   └── WIRING.md              # Circuit diagrams & pin connection guide
├── server.py                  # FastAPI application, REST & IoT telemetry endpoints
├── database.py                # SQLite schema, queries, leaderboard & impact calculations
├── vision.py                  # Multi-region CV segmentation & gram calculations (NumPy/PIL)
├── index.html                 # Frontend layout, Wastia hero, IoT station & leaderboard
├── style.css                  # Wastia theme, IoT dials, digital scale & responsive styles
├── script.js                  # In-browser Canvas CV, Web Serial API, audio, & Chart.js
├── requirements.txt           # Python package dependencies
├── .gitignore                 # Ignored temporary & cache files
└── uploads/                   # Saved plate scans
```

---

## 📄 License
MIT License
