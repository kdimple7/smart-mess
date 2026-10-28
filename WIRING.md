# SmartPlate AI — IoT Hardware Station & Wiring Guide 🛠️📡

This guide explains how to build the physical IoT Smart Mess Disposal Station using an ESP32 (or Arduino Uno) to measure ground-truth plate scrap weight, monitor bin fill levels, and automatically deflect non-biodegradable contaminants.

---

## 🔌 Hardware Bill of Materials (BOM)

| Component | Purpose | Typical Price |
| :--- | :--- | :--- |
| **ESP32 NodeMCU / DevKit V1** | Microcontroller with WiFi + Serial bridge | ~$4–$6 |
| **HX711 ADC + 5kg/10kg Load Cell** | Precision weight sensor for food scraps ($\pm 1\text{g}$) | ~$3–$5 |
| **HC-SR04 Ultrasonic Sensor** | Bin depth fill-level detector | ~$1.50 |
| **SG90 or MG995 Micro-Servo** | Automated chute diverter flap (Bio vs Landfill) | ~$2–$4 |
| **MFRC522 RFID Module (Optional)** | Student ID card tap at disposal point | ~$2.50 |
| **WS2812B RGB NeoPixel Ring (8-LED)** | Visual guidance ring (Green for Bio, Red for Landfill) | ~$2 |
| **Jumper Wires & Breadboard** | Prototyping connections | ~$2 |

---

## 📐 Circuit Schematic & Pin Connections

### 1. HX711 Load Cell Amplifier to ESP32
* **VCC** $\rightarrow$ `3.3V` (or `5V` depending on module)
* **GND** $\rightarrow$ `GND`
* **DT (DOUT)** $\rightarrow$ `GPIO 21`
* **SCK (Clock)** $\rightarrow$ `GPIO 22`

### 2. HC-SR04 Ultrasonic Sensor to ESP32
* **VCC** $\rightarrow$ `5V` (VIN)
* **GND** $\rightarrow$ `GND`
* **TRIG** $\rightarrow$ `GPIO 18`
* **ECHO** $\rightarrow$ `GPIO 19` (Use a 1kΩ / 2kΩ resistor divider if 5V level shifting needed)

### 3. SG90 Servo Motor to ESP32
* **Brown (GND)** $\rightarrow$ `GND`
* **Red (VCC)** $\rightarrow$ `5V` (External power supply recommended for high torque)
* **Orange (PWM)** $\rightarrow$ `GPIO 13`

---

## ⚡ Direct Browser Connection via Web Serial API

You don't even need to configure complex WiFi or MQTT credentials:
1. Connect your ESP32 to your computer using a USB-C / Micro-USB cable.
2. Open the **SmartPlate AI** dashboard in **Google Chrome** or **Microsoft Edge**.
3. Scroll to the **IoT Smart Bin Station** section.
4. Click **"🔌 Connect USB Hardware"**.
5. Select your Silicon Labs CP210x or CH340 COM port and click **Connect**.
6. The dashboard will instantly display real-time sensor readouts straight from the load cell and ultrasonic sensor!
