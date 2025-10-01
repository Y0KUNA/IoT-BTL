#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ====== WiFi & MQTT ======
const char* ssid = "realme Q3s";
const char* password = "10580103";
const char* mqtt_server = "192.168.209.161";

WiFiClient espClient;
PubSubClient client(espClient);

// ====== DHT11 ======
#define DHTPIN D2        
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// ====== LDR ======
#define LDR_PIN A0

// ====== LED ======
#define LED1 D5
#define LED2 D6
#define LED3 D7

// ====== WiFi ======
void setup_wifi() {
  delay(10);
  Serial.print("Đang kết nối WiFi: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi connected");
  Serial.print("📡 IP: ");
  Serial.println(WiFi.localIP());
}

// ====== MQTT Callback ======
void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("📩 Message arrived [");
  Serial.print(topic);
  Serial.print("]: ");

  String message;
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);

  // Parse JSON
  StaticJsonDocument<128> doc;
  DeserializationError error = deserializeJson(doc, message);
  if (error) {
    Serial.print("❌ JSON parse error: ");
    Serial.println(error.c_str());
    return;
  }

  // Đọc giá trị và điều khiển LED
  if (doc.containsKey("led1")) {
    String v = doc["led1"].as<String>();
    digitalWrite(LED1, (v == "ON" || v == "1") ? HIGH : LOW);
  }
  if (doc.containsKey("led2")) {
    String v = doc["led2"].as<String>();
    digitalWrite(LED2, (v == "ON" || v == "1") ? HIGH : LOW);
  }
  if (doc.containsKey("led3")) {
    String v = doc["led3"].as<String>();
    digitalWrite(LED3, (v == "ON" || v == "1") ? HIGH : LOW);
  }

  Serial.printf("💡 LED => L1:%d L2:%d L3:%d\n",
                digitalRead(LED1), digitalRead(LED2), digitalRead(LED3));
}

// ====== MQTT Reconnect ======
void reconnect() {
  while (!client.connected()) {
    Serial.print("🔄 Kết nối MQTT...");
    if (client.connect("ESP8266Client", "huy", "123")) {
      Serial.println("✅ OK");
      client.subscribe("iot/led/control");
    } else {
      Serial.print("❌ Thất bại, rc=");
      Serial.println(client.state());
      delay(5000);
    }
  }
}

// ====== Setup ======
void setup() {
  Serial.begin(115200);
  setup_wifi();
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);

  dht.begin();
  pinMode(LED1, OUTPUT);
  pinMode(LED2, OUTPUT);
  pinMode(LED3, OUTPUT);
}

// ====== Loop ======
void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  // Đọc cảm biến & gửi JSON
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  int ldr = analogRead(LDR_PIN);

  StaticJsonDocument<128> doc;
  doc["temperature"] = isnan(t) ? 0 : t;
  doc["humidity"] = isnan(h) ? 0 : h;
  doc["light"] = ldr;

  char buffer[128];
  serializeJson(doc, buffer);
  client.publish("iot/sensor/data", buffer);
  Serial.print("📤 Published: ");
  Serial.println(buffer);

  delay(2000);
}
