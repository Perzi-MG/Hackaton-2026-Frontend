#include <Adafruit_VL53L0X.h>
#include <ArduinoJson.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Wire.h>

// ================================================================
// CONFIGURACIÓN
// ================================================================
const char *ssid = "iPhoneMike";
const char *password = "Mike1234";

const char *RASP_IP = "172.20.10.3";
const int PORT_RX = 1234;
const int PORT_TX = 5005;

const int DISTANCIA_PELIGRO = 1500; // mm

// ================================================================
// PINES — 8 Zonas
// ================================================================
const int pinArmL1 = 13;
const int pinArmL2 = 12;
const int pinArmR1 = 14;
const int pinArmR2 = 27;
const int pinFootL = 26;
const int pinFootR = 25;
const int pinChest = 33;
const int pinBack = 32;

// ================================================================
// OBJETOS
// ================================================================
WiFiUDP udp;
Adafruit_VL53L0X lox = Adafruit_VL53L0X();

// ================================================================
// ESTADO
// ================================================================
struct HapticState {
  uint8_t armL1 = 0, armL2 = 0;
  uint8_t armR1 = 0, armR2 = 0;
  uint8_t footL = 0, footR = 0;
  uint8_t chest = 0, back = 0;
  uint8_t alert = 0;
  uint16_t distanciaFrontal = 9999;
};

HapticState estadoActual;
SemaphoreHandle_t mutexEstado;

bool alertaActiva = false;
SemaphoreHandle_t mutexAlerta;

// ================================================================
// PROTOTIPOS
// ================================================================
void TaskSensor(void *pvParameters);
void TaskUDP(void *pvParameters);
void TaskMotores(void *pvParameters);

// ================================================================
// SETUP
// ================================================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n=== TRAJE HÁPTICO INICIANDO ===");

  // PWM
  const int pines[] = {pinArmL1, pinArmL2, pinArmR1, pinArmR2,
                       pinFootL, pinFootR, pinChest, pinBack};

  for (int i = 0; i < 8; i++) {
    ledcSetup(i, 5000, 8);
    ledcAttachPin(pines[i], i);
    ledcWrite(i, 0);
  }

  Serial.println("[PWM] OK");

  // I2C + ToF
  Wire.begin();
  if (!lox.begin()) {
    Serial.println("[ToF] ERROR");
  } else {
    Serial.println("[ToF] OK");
  }

  // WiFi
  WiFi.begin(ssid, password);
  Serial.print("[WiFi] Conectando");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.print("\n[WiFi] IP: ");
  Serial.println(WiFi.localIP());

  // UDP
  udp.begin(PORT_RX);

  // Mutex
  mutexEstado = xSemaphoreCreateMutex();
  mutexAlerta = xSemaphoreCreateMutex();

  // Tasks
  xTaskCreatePinnedToCore(TaskSensor, "Sensor", 4096, NULL, 2, NULL, 1);
  xTaskCreatePinnedToCore(TaskUDP, "UDP", 4096, NULL, 1, NULL, 0);
  xTaskCreatePinnedToCore(TaskMotores, "Motores", 2048, NULL, 3, NULL, 0);

  Serial.println("=== LISTO ===");
}

void loop() { vTaskDelay(portMAX_DELAY); }

// ================================================================
// SENSOR (CON DEBOUNCE)
// ================================================================
void TaskSensor(void *pvParameters) {
  (void)pvParameters;

  if (!lox.begin()) {
    Serial.println("[Sensor] No disponible");
    vTaskDelete(NULL);
    return;
  }

  const int MUESTRAS_PARA_CONFIRMAR = 5;
  int muestrasEnPeligro = 0;
  int muestrasLibre = 0;

  for (;;) {
    VL53L0X_RangingMeasurementData_t measure;
    uint16_t distancia = 9999;

    lox.rangingTest(&measure, false);

    if (measure.RangeStatus != 4) {
      distancia = measure.RangeMilliMeter;
    }

    // Guardar distancia
    if (xSemaphoreTake(mutexEstado, pdMS_TO_TICKS(10))) {
      estadoActual.distanciaFrontal = distancia;
      xSemaphoreGive(mutexEstado);
    }

    bool enPeligro = (distancia > 0 && distancia < DISTANCIA_PELIGRO);

    if (enPeligro) {
      muestrasLibre = 0;
      muestrasEnPeligro++;
    } else {
      muestrasEnPeligro = 0;
      muestrasLibre++;
    }

    if (xSemaphoreTake(mutexAlerta, pdMS_TO_TICKS(10))) {

      if (muestrasEnPeligro >= MUESTRAS_PARA_CONFIRMAR && !alertaActiva) {
        alertaActiva = true;
        xSemaphoreGive(mutexAlerta);

        String msg = "SCAN:" + String(distancia);
        udp.beginPacket(RASP_IP, PORT_TX);
        udp.print(msg);
        udp.endPacket();

        Serial.printf("[ToF] %dmm confirmado\n", distancia);

      } else if (muestrasLibre >= MUESTRAS_PARA_CONFIRMAR && alertaActiva) {
        alertaActiva = false;
        muestrasLibre = 0;
        xSemaphoreGive(mutexAlerta);

        udp.beginPacket(RASP_IP, PORT_TX);
        udp.print("CLEAR");
        udp.endPacket();

        Serial.println("[ToF] CLEAR confirmado");

        if (xSemaphoreTake(mutexEstado, pdMS_TO_TICKS(10))) {
          estadoActual = HapticState();
          xSemaphoreGive(mutexEstado);
        }

      } else {
        xSemaphoreGive(mutexAlerta);
      }
    }

    vTaskDelay(pdMS_TO_TICKS(50));
  }
}

// ================================================================
// UDP
// ================================================================
void TaskUDP(void *pvParameters) {
  (void)pvParameters;
  char buffer[512];

  for (;;) {
    int paquete = udp.parsePacket();

    if (paquete > 0) {
      int len = udp.read(buffer, sizeof(buffer) - 1);
      buffer[len] = '\0';

      JsonDocument doc;
      if (!deserializeJson(doc, buffer)) {
        if (xSemaphoreTake(mutexEstado, pdMS_TO_TICKS(20))) {
          estadoActual.armL1 = doc["armL1"] | 0;
          estadoActual.armL2 = doc["armL2"] | 0;
          estadoActual.armR1 = doc["armR1"] | 0;
          estadoActual.armR2 = doc["armR2"] | 0;
          estadoActual.footL = doc["footL"] | 0;
          estadoActual.footR = doc["footR"] | 0;
          estadoActual.chest = doc["chest"] | 0;
          estadoActual.back = doc["back"] | 0;
          estadoActual.alert = doc["alert"] | 0;
          xSemaphoreGive(mutexEstado);
        }
      }
    }

    vTaskDelay(pdMS_TO_TICKS(10));
  }
}

// ================================================================
// MOTORES
// ================================================================
void TaskMotores(void *pvParameters) {
  (void)pvParameters;

  for (;;) {
    HapticState snap;

    if (xSemaphoreTake(mutexEstado, pdMS_TO_TICKS(10))) {
      snap = estadoActual;
      xSemaphoreGive(mutexEstado);
    }

    ledcWrite(0, snap.armL1);
    ledcWrite(1, snap.armL2);
    ledcWrite(2, snap.armR1);
    ledcWrite(3, snap.armR2);
    ledcWrite(4, snap.footL);
    ledcWrite(5, snap.footR);
    ledcWrite(6, snap.chest);
    ledcWrite(7, snap.back);

    vTaskDelay(pdMS_TO_TICKS(20));
  }
}