#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Adafruit_NeoPixel.h>

// ==========================================
// 1. RED WI-FI
const char* WIFI_SSID = "nombre_de_red_wifi";
const char* WIFI_PASS = "tu_contraseña_wifi";
#define NUM_LEDS 8

// ==========================================
// 2. PINES DE HARDWARE (NODEMCU V2 AMICA)
#define PIN_LDR     A0  // nodo LDR + resistencia
#define PIN_BUTTON  D2  // boton a GND
#define PIN_LED     D5  // DIN de la tira LED

// ==========================================
// 3. MQTT (WEBAPP PARADA SEGURA)
const char* MQTT_BROKER   = "broker.emqx.io";
const int   MQTT_PORT     = 1883;
const char* CLIENT_ID     = "esp8266_parada_p14_lina";
const char* TOPIC_ESTADO  = "parada_segura_uabc_441/p14/estado";
const char* TOPIC_COMANDO = "parada_segura_uabc_441/p14/comandos";

// ==========================================
// 4. VARIABLES Y UMBRALES
WiFiClient espClient;
PubSubClient mqtt(espClient);
Adafruit_NeoPixel aroLed(NUM_LEDS, PIN_LED, NEO_GRB + NEO_KHZ800);
WiFiEventHandler eventoDesconexion;

int lecturaCrudaLdr = 0;
int luxActual = 0;
bool modoNocturno = false;
bool paradaSolicitada = false;
bool botonPresionado = false;
String estadoLed = "OFF";
bool wifiYaConectado = false;

unsigned long ultimoEnvioMqtt = 0;
unsigned long ultimaLecturaLdr = 0;
unsigned long ultimoLogLdr = 0;
unsigned long ultimoAvisoWifi = 0;
unsigned long ultimoIntentoMqtt = 0;
unsigned long ultimoReboteBoton = 0;
int ultimoEstadoBoton = HIGH;

const unsigned long INTERVALO_TELEMETRIA = 3000;
const unsigned long INTERVALO_LECTURA_LDR = 500; // Evita saturar el radio Wi-Fi

// Umbrales calibrados a tu lectura real (oscuro: ~2, con luz: ~48-100)
const int UMBRAL_NOCHE_ON  = 8; // Enciende modo nocturno si Lux <= 15
const int UMBRAL_NOCHE_OFF = 18; // Apaga modo nocturno si Lux >= 35

// ==========================================
// HARDWARE
void actualizarAroLed() {
  if (paradaSolicitada) {
    estadoLed = "ALERT";
    for (int i = 0; i < NUM_LEDS; i++) {
      aroLed.setPixelColor(i, aroLed.Color(0, 255, 80));
    }
  } else if (modoNocturno) {
    estadoLed = "COURTESY";
    for (int i = 0; i < NUM_LEDS; i++) {
      aroLed.setPixelColor(i, aroLed.Color(45, 45, 60));
    }
  } else {
    estadoLed = "OFF";
    aroLed.clear();
  }
  aroLed.show();
}

void publicarEstado() {
  if (!mqtt.connected()) return;

  JsonDocument doc;
  doc["stop_id"] = 14;
  doc["lux"] = luxActual;
  doc["night_mode"] = modoNocturno;
  doc["button_pressed"] = botonPresionado;
  doc["led_state"] = estadoLed;
  doc["seats_free"] = 7;
  doc["occupancy_color"] = "GREEN";
  doc["device_id"] = "ESP8266-P14";
  doc["rssi"] = WiFi.RSSI();

  char payload[256];
  serializeJson(doc, payload);

  if (mqtt.publish(TOPIC_ESTADO, payload, false)) {
    Serial.printf("[MQTT TX] %s\n", payload);
  } else {
    Serial.println("[MQTT ERROR] Fallo al publicar");
  }
}

void leerLdr() {
  lecturaCrudaLdr = analogRead(PIN_LDR);
  luxActual = map(lecturaCrudaLdr, 0, 1023, 0, 1000);
  luxActual = constrain(luxActual, 0, 1000);

  if (millis() - ultimoLogLdr >= 2000) {
    ultimoLogLdr = millis();
    Serial.printf("[LDR] A0 crudo: %d | Lux: %d | Noche: %s | LED: %s\n",
                  lecturaCrudaLdr, luxActual, modoNocturno ? "SI" : "NO", estadoLed.c_str());
  }

  bool nuevoModoNocturno = modoNocturno;
  if (!modoNocturno && luxActual <= UMBRAL_NOCHE_ON) {
    nuevoModoNocturno = true;
  } else if (modoNocturno && luxActual >= UMBRAL_NOCHE_OFF) {
    nuevoModoNocturno = false;
  }

  if (nuevoModoNocturno != modoNocturno) {
    modoNocturno = nuevoModoNocturno;
    Serial.printf("[CAMBIO LDR] Modo nocturno: %s (A0=%d, Lux=%d)\n",
                  modoNocturno ? "ACTIVADO" : "DESACTIVADO", lecturaCrudaLdr, luxActual);
    actualizarAroLed();
    publicarEstado();
  }
}

void leerBoton() {
  int lecturaBoton = digitalRead(PIN_BUTTON);
  if (lecturaBoton != ultimoEstadoBoton) {
    ultimoReboteBoton = millis();
  }

  if ((millis() - ultimoReboteBoton) > 50) {
    if (lecturaBoton == LOW && !botonPresionado) {
      botonPresionado = true;
      paradaSolicitada = !paradaSolicitada;
      Serial.printf("[BOTON] Parada solicitada: %s\n", paradaSolicitada ? "SI" : "NO");
      actualizarAroLed();
      publicarEstado();
    } else if (lecturaBoton == HIGH) {
      botonPresionado = false;
    }
  }
  ultimoEstadoBoton = lecturaBoton;
}

void recibirComandoMqtt(char* topic, byte* payload, unsigned int length) {
  Serial.print("[MQTT RX] ");
  for (unsigned int i = 0; i < length; i++) Serial.print((char)payload[i]);
  Serial.println();

  JsonDocument doc;
  if (deserializeJson(doc, payload, length)) return;

  const char* action = doc["action"];
  if (action != nullptr) {
    if (strcmp(action, "REQUEST_STOP") == 0) {
      paradaSolicitada = true;
      actualizarAroLed();
      publicarEstado();
    } else if (strcmp(action, "CANCEL_STOP") == 0) {
      paradaSolicitada = false;
      actualizarAroLed();
      publicarEstado();
    }
  }
}

void gestionarRed() {
  if (WiFi.status() != WL_CONNECTED) {
    wifiYaConectado = false;
    if (millis() - ultimoAvisoWifi > 5000) {
      ultimoAvisoWifi = millis();
      Serial.printf("[WI-FI] Esperando %s (estado=%d)\n", WIFI_SSID, WiFi.status());
    }
    return;
  }

  if (!wifiYaConectado) {
    wifiYaConectado = true;
    Serial.print("[WI-FI] CONECTADO! IP: ");
    Serial.println(WiFi.localIP());
  }

  if (!mqtt.connected()) {
    if (millis() - ultimoIntentoMqtt > 5000) {
      ultimoIntentoMqtt = millis();
      Serial.print("[MQTT] Conectando a broker.emqx.io... ");
      if (mqtt.connect(CLIENT_ID)) {
        Serial.println("CONECTADO!");
        mqtt.subscribe(TOPIC_COMANDO, 1);
        publicarEstado();
      } else {
        Serial.printf("Fallo (rc=%d)\n", mqtt.state());
      }
    }
  } else {
    mqtt.loop();
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== INICIANDO PARADA SEGURA P14 ===");

  pinMode(PIN_BUTTON, INPUT_PULLUP);

  // LEDs apagados durante la conexion Wi-Fi
  aroLed.begin();
  aroLed.setBrightness(30);
  aroLed.clear();
  aroLed.show();

  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(200);

  eventoDesconexion = WiFi.onStationModeDisconnected([](const WiFiEventStationModeDisconnected& evt) {
    Serial.printf("[WI-FI RAZON] %s -> codigo %d\n", evt.ssid.c_str(), (int)evt.reason);
  });

  WiFi.setSleepMode(WIFI_NONE_SLEEP);
  WiFi.setAutoReconnect(true);
  Serial.printf("[WI-FI] Conectando a %s...\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  unsigned long inicio = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - inicio < 12000) {
    delay(250);
  }

  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  mqtt.setCallback(recibirComandoMqtt);

  // Lectura inicial del LDR ya conectado
  leerLdr();
  modoNocturno = (luxActual <= UMBRAL_NOCHE_ON);
  actualizarAroLed();
}

void loop() {
  gestionarRed();
  leerBoton();

  if (millis() - ultimaLecturaLdr >= INTERVALO_LECTURA_LDR) {
    ultimaLecturaLdr = millis();
    leerLdr();
  }

  if (millis() - ultimoEnvioMqtt >= INTERVALO_TELEMETRIA) {
    ultimoEnvioMqtt = millis();
    publicarEstado();
  }

  yield();
}