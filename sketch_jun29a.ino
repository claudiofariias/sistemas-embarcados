#include <WiFi.h>
#include <WiFiClient.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <WiFiUdp.h>
#include <NTPClient.h>
#include <vector>
#include <algorithm>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

#define BUZZER_PIN 4
#define LED_PIN 2
#define BUTTON_PIN 5

// Configurações WiFi
char ssid[] = "SEU-WIFI";
char pass[] = "SUA-SENHA";

// Configurações MQTT
const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;
const char* mqtt_client_id = "ESP32_Medicine_Reminder";
const char* mqtt_username = ""; // Se necessário
const char* mqtt_password = ""; // Se necessário

// Tópicos MQTT
const char* topic_prefix = "medicine_reminder/";
const char* topic_hour = "medicine_reminder/hour";
const char* topic_minute = "medicine_reminder/minute";
const char* topic_medicine = "medicine_reminder/medicine";
const char* topic_add = "medicine_reminder/add";
const char* topic_clear = "medicine_reminder/clear";
const char* topic_status = "medicine_reminder/status";
const char* topic_list = "medicine_reminder/list";

struct Alarm {
  int hour;
  int minute;
  String medicine;
};

std::vector<Alarm> alarms;
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", -3 * 3600);

WiFiClient espClient;
PubSubClient client(espClient);

int tempHour = 0;
int tempMinute = 0;
String tempMedicine = "";
bool needsDisplayUpdate = true;

void setup() {
  Serial.begin(115200);
  
  // Inicializa hardware
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("Falha no display SSD1306"));
    for(;;);
  }
  
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  // Conecta WiFi
  WiFi.begin(ssid, pass);
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.setCursor(0,0);
  display.println("Conectando WiFi...");
  display.display();
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  // Configura MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  
  timeClient.begin();
  reconnect();
}

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Mensagem recebida [");
  Serial.print(topic);
  Serial.print("] ");
  
  String message;
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);
  
  if (strcmp(topic, topic_hour) == 0) {
    tempHour = message.toInt();
  } else if (strcmp(topic, topic_minute) == 0) {
    tempMinute = message.toInt();
  } else if (strcmp(topic, topic_medicine) == 0) {
    tempMedicine = message;
  } else if (strcmp(topic, topic_add) == 0 && message == "1") {
    if (tempMedicine != "") {
      addAlarm(tempHour, tempMinute, tempMedicine);
      tempMedicine = ""; // Reseta após adicionar
    }
  } else if (strcmp(topic, topic_clear) == 0 && message == "1") {
    alarms.clear();
    client.publish(topic_status, "Todos os alarmes foram removidos");
    needsDisplayUpdate = true;
  } else if (strcmp(topic, topic_list) == 0) {
    sendAlarmsList();
  }
}

void addAlarm(int hour, int minute, String medicine) {
  // Verifica se o alarme já existe
  for (const auto& alarm : alarms) {
    if (alarm.hour == hour && alarm.minute == minute && alarm.medicine == medicine) {
      client.publish(topic_status, "Alarme já existe");
      return;
    }
  }
  
  alarms.push_back({hour, minute, medicine});
  std::sort(alarms.begin(), alarms.end(), [](const Alarm &a, const Alarm &b) {
    return (a.hour < b.hour) || (a.hour == b.hour && a.minute < b.minute);
  });
  
  String statusMsg = "Alarme adicionado: " + String(hour) + ":" + String(minute) + " - " + medicine;
  client.publish(topic_status, statusMsg.c_str());
  needsDisplayUpdate = true;
  
  // Publica a lista atualizada de alarmes
  sendAlarmsList();
}

void sendAlarmsList() {
  String alarmList = "";
  for (const auto& alarm : alarms) {
    if (alarmList.length() > 0) alarmList += "|";
    alarmList += String(alarm.hour) + "," + String(alarm.minute) + "," + alarm.medicine;
  }
  client.publish(topic_list, alarmList.c_str());
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Conectando ao broker MQTT...");
    if (client.connect(mqtt_client_id, mqtt_username, mqtt_password)) {
      Serial.println("conectado");
      
      // Inscreve nos tópicos necessários
      client.subscribe(topic_hour);
      client.subscribe(topic_minute);
      client.subscribe(topic_medicine);
      client.subscribe(topic_add);
      client.subscribe(topic_clear);
      client.subscribe(topic_list);
      
      // Publica uma mensagem de status ao conectar
      client.publish(topic_status, "ESP32 Despertador Inteligente conectado");
      
      // Envia a lista atual de alarmes
      sendAlarmsList();
    } else {
      Serial.print("falha, rc=");
      Serial.print(client.state());
      Serial.println(" tentando novamente em 5 segundos");
      delay(5000);
    }
  }
}

void triggerAlarm() {
  unsigned long startTime = millis();
  bool interrupted = false;
  
  while ((millis() - startTime < 30000) && !interrupted) {
    digitalWrite(BUZZER_PIN, HIGH);
    digitalWrite(LED_PIN, HIGH);
    unsigned long toneStart = millis();
    while (millis() - toneStart < 1000 && !interrupted) {
      if (digitalRead(BUTTON_PIN) == LOW) {
        interrupted = true;
      }
      delay(10);
    }
    
    digitalWrite(BUZZER_PIN, LOW);
    digitalWrite(LED_PIN, LOW);
    unsigned long pauseStart = millis();
    while (millis() - pauseStart < 1000 && !interrupted) {
      if (digitalRead(BUTTON_PIN) == LOW) {
        interrupted = true;
      }
      delay(10);
    }
  }
  
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_PIN, LOW);
}

unsigned long lastTimeUpdate = 0;
const unsigned long timeUpdateInterval = 1000; // Atualiza a cada 1 segundo

void updateDisplay() {
  timeClient.update(); // Atualiza o horário do NTP
  
  display.clearDisplay();
  
  // Mostra próximo alarme
  display.setTextColor(WHITE);
  display.setTextSize(1);
  display.setCursor(0,0);
  display.println("Proximo Alarme:");
  
  if (!alarms.empty()) {
    display.print(alarms[0].hour);
    display.print(":");
    if (alarms[0].minute < 10) display.print("0");
    display.print(alarms[0].minute);
    display.print(" - ");
    display.println(alarms[0].medicine.substring(0, 10));
  } else {
    display.println("Nenhum");
  }
  
  // Mostra hora atual
  display.fillRect(0, 20, 128, 44, WHITE);
  display.setTextColor(BLACK);
  display.setCursor(10, 22);
  display.setTextSize(2);
  
  int hours = timeClient.getHours();
  int mins = timeClient.getMinutes();
  int secs = timeClient.getSeconds();
  
  display.print(hours);
  display.print(":");
  if (mins < 10) display.print("0");
  display.print(mins);
  
  // Mostra segundos 
  display.setTextSize(1);
  display.setCursor(90, 40);
  display.print(":");
  if (secs < 10) display.print("0");
  display.print(secs);
  
  display.display();
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
  
  unsigned long currentMillis = millis();
  
  // Atualiza o display a cada segundo
  if (currentMillis - lastTimeUpdate >= timeUpdateInterval) {
    lastTimeUpdate = currentMillis;
    updateDisplay();
  }
  
  // Verifica alarmes a cada minuto, para evitar verificações desnecessárias
  static unsigned long lastAlarmCheck = 0;
  if (currentMillis - lastAlarmCheck >= 60000) {
    lastAlarmCheck = currentMillis;
    checkAlarms();
  }
}

void checkAlarms() {
  timeClient.update();
  int currentHour = timeClient.getHours();
  int currentMinute = timeClient.getMinutes();
  
  for (auto it = alarms.begin(); it != alarms.end(); ) {
    if (it->hour == currentHour && it->minute == currentMinute) {
      String medicine = it->medicine;
      String statusMsg = "ALARME: " + String(it->hour) + ":" + String(it->minute) + " - " + medicine;
      client.publish(topic_status, statusMsg.c_str());
      
      it = alarms.erase(it);
      triggerAlarm();
      needsDisplayUpdate = true;
      
      // Atualiza a lista após remover o alarme
      sendAlarmsList();
    } else {
      ++it;
    }
  }
}

