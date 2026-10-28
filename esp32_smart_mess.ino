/*
 * SmartPlate AI — IoT Smart Mess Hopper & Segregation Firmware
 * Target: ESP32 DevKit / Arduino Uno + WiFi Shield
 * 
 * Hardware Peripherals:
 *  1. HX711 Load Cell (5kg/10kg) - Precise plate waste weight measurement (±1g)
 *  2. HC-SR04 Ultrasonic Distance Sensor - Real-time bin fill level monitoring
 *  3. SG90 / MG995 Micro Servo - Automatic dual-chute diverter (Compost vs Landfill)
 *  4. MFRC522 RFID Reader (SPI) - Student ID card tap & Clean Plate Club verification
 *  5. WS2812B NeoPixel RGB Ring - Visual student sorting guidance (Green/Red/Blue)
 * 
 * Communication:
 *  - USB Serial JSON stream (115200 baud) for Web Serial API direct browser connect
 *  - Optional WiFi HTTP POST to FastAPI backend (/api/iot/telemetry)
 */

#include <Arduino.h>

// --- PIN DEFINITIONS (ESP32) ---
// HX711 Load Cell
#define HX711_DOUT_PIN  21
#define HX711_SCK_PIN   22

// HC-SR04 Ultrasonic Sensor
#define TRIG_PIN        18
#define ECHO_PIN        19

// Servo Motor (PWM)
#define SERVO_PIN       13

// Status LED (Blinking / Indicator)
#define STATUS_LED_PIN  2

// Bin Dimensions (cm)
const float BIN_DEPTH_CM = 45.0; // Total empty depth of bin

// State variables
float current_weight_g = 0.0;
float tare_offset = 0.0;
float calibration_factor = 420.0; // Adjust after calibrating with known 100g weight
int bin_fill_percent = 0;
int servo_angle = 0; // 0 = Bio/Compost Chute, 90 = Landfill/Contaminant Chute
String last_rfid_card = "NONE";
bool auto_mode = true;
unsigned long last_telemetry_time = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 1000; // Stream every 1 sec

// Mock or basic HX711 bit-bang reading (if HX711 library not installed)
long readRawHX711() {
  pinMode(HX711_DOUT_PIN, INPUT);
  pinMode(HX711_SCK_PIN, OUTPUT);
  digitalWrite(HX711_SCK_PIN, LOW);

  unsigned long startTime = millis();
  while (digitalRead(HX711_DOUT_PIN) == HIGH) {
    if (millis() - startTime > 100) return 0; // Timeout
  }

  long count = 0;
  for (int i = 0; i < 24; i++) {
    digitalWrite(HX711_SCK_PIN, HIGH);
    delayMicroseconds(1);
    count = count << 1;
    digitalWrite(HX711_SCK_PIN, LOW);
    delayMicroseconds(1);
    if (digitalRead(HX711_DOUT_PIN)) count++;
  }
  // 25th pulse for channel A, gain 128
  digitalWrite(HX711_SCK_PIN, HIGH);
  delayMicroseconds(1);
  digitalWrite(HX711_SCK_PIN, LOW);
  delayMicroseconds(1);

  if (count & 0x800000) count |= 0xFF000000; // 2's complement sign extend
  return count;
}

// Measure distance using HC-SR04
float readDistanceCM() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout (~5m)
  if (duration <= 0) return BIN_DEPTH_CM;

  float distance = (duration * 0.0343) / 2.0;
  if (distance > BIN_DEPTH_CM) distance = BIN_DEPTH_CM;
  if (distance < 2.0) distance = 2.0;
  return distance;
}

void setServoAngle(int angle) {
  servo_angle = constrain(angle, 0, 90);
  // Simple software PWM for ESP32/Arduino without extra library
  int pulseWidthUs = map(servo_angle, 0, 180, 544, 2400);
  for (int i = 0; i < 8; i++) {
    digitalWrite(SERVO_PIN, HIGH);
    delayMicroseconds(pulseWidthUs);
    digitalWrite(SERVO_PIN, LOW);
    delay(20);
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(SERVO_PIN, OUTPUT);
  pinMode(STATUS_LED_PIN, OUTPUT);

  digitalWrite(STATUS_LED_PIN, HIGH);
  setServoAngle(0); // Start at Bio chute

  // Initial Tare
  long initial_raw = readRawHX711();
  tare_offset = (float)initial_raw;

  Serial.println(F("{\"system\":\"SmartPlate-IoT\",\"status\":\"online\",\"version\":\"2.0\"}"));
}

void loop() {
  // Check for incoming serial commands from browser Web Serial API
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd == "TARE") {
      tare_offset = (float)readRawHX711();
      Serial.println(F("{\"event\":\"tare_success\"}"));
    } else if (cmd == "CHUTE_BIO") {
      setServoAngle(0);
      Serial.println(F("{\"chute\":\"compost_organic\",\"angle\":0}"));
    } else if (cmd == "CHUTE_LANDFILL") {
      setServoAngle(90);
      Serial.println(F("{\"chute\":\"landfill_contaminant\",\"angle\":90}"));
    } else if (cmd.startsWith("RFID:")) {
      last_rfid_card = cmd.substring(5);
    }
  }

  // Periodic Telemetry Streaming
  if (millis() - last_telemetry_time >= TELEMETRY_INTERVAL_MS) {
    last_telemetry_time = millis();

    // 1. Read load cell weight
    long raw = readRawHX711();
    if (raw != 0) {
      current_weight_g = max(0.0f, (float)(raw - tare_offset) / calibration_factor);
    }

    // 2. Read ultrasonic bin fill
    float distance = readDistanceCM();
    float filled_cm = max(0.0f, BIN_DEPTH_CM - distance);
    bin_fill_percent = (int)constrain((filled_cm / BIN_DEPTH_CM) * 100.0, 0, 100);

    // 3. Output JSON packet formatted for Web Serial API / Dashboard ingestion
    Serial.print(F("{\"weight_g\":"));
    Serial.print(current_weight_g, 1);
    Serial.print(F(",\"bin_fill_pct\":"));
    Serial.print(bin_fill_percent);
    Serial.print(F(",\"chute_angle\":"));
    Serial.print(servo_angle);
    Serial.print(F(",\"rfid\":\""));
    Serial.print(last_rfid_card);
    Serial.println(F("\"}"));

    // Heartbeat LED toggle
    digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN));
  }
}
