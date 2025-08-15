#define BLYNK_TEMPLATE_ID "TMPL2ICpA9uXR"
#define BLYNK_TEMPLATE_NAME "Quickstart Device"
#define BLYNK_AUTH_TOKEN "7VXnkSGWGjm878MVradiOE3-6pcE2lsu"
#define BLYNK_PRINT Serial
#define BUTTON_PIN 5  // Botão conectado no GPIO5 (pull-up interno)

#include <WiFi.h>
#include <BlynkSimpleEsp32.h>
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

char ssid[] = "SUA_REDE_WIFI";
char pass[] = "SENHA_WIFI";

struct Alarm {
  int hour;
  int minute;
  String medicine;
};

std::vector<Alarm> alarms;
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", -3 * 3600);
BlynkTimer timer;

int tempHour = 0;
int tempMinute = 0;
String tempMedicine = "";

void setup() {
  Serial.begin(115200);
  
  // Inicializa hardware
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("Falha no display SSD1306"));
    for(;;);
  }
  
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);  // Botão com pull-up interno
  
  // Conecta WiFi
  WiFi.begin(ssid, pass);
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.setCursor(0,0);
  display.println("Conectando WiFi...");
  display.display();
  
  while (WiFi.status() != WL_CONNECTED) delay(500);
  
  timeClient.begin();
  Blynk.begin(BLYNK_AUTH_TOKEN, ssid, pass);
  timer.setInterval(1000L, checkAlarms);
}

void triggerAlarm() {
  unsigned long startTime = millis();
  bool interrupted = false;
  
  while ((millis() - startTime < 30000) && !interrupted) { // Toca por até 30s
    // Toca por 1 segundo
    digitalWrite(BUZZER_PIN, HIGH);
    digitalWrite(LED_PIN, HIGH);
    unsigned long toneStart = millis();
    while (millis() - toneStart < 1000 && !interrupted) {
      if (digitalRead(BUTTON_PIN) == LOW) {
        interrupted = true;
      }
      delay(10);
    }
    
    // Pausa por 1 segundo
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

void updateDisplay() {
  timeClient.update();
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
  display.print(hours);
  display.print(":");
  if (mins < 10) display.print("0");
  display.print(mins);
  
  display.display();
}

void checkAlarms() {
  timeClient.update();
  int currentHour = timeClient.getHours();
  int currentMinute = timeClient.getMinutes();
  
  for (auto it = alarms.begin(); it != alarms.end(); ) {
    if (it->hour == currentHour && it->minute == currentMinute) {
      String medicine = it->medicine; // Salva antes de apagar
      it = alarms.erase(it);
      Blynk.virtualWrite(V5, "Alarme: " + medicine);
      triggerAlarm(); // Toca o alarme (pode ser interrompido pelo botão)
    } else {
      ++it;
    }
  }
  updateDisplay();
}

BLYNK_WRITE(V1) { tempHour = param.asInt(); }
BLYNK_WRITE(V2) { tempMinute = param.asInt(); }
BLYNK_WRITE(V3) { tempMedicine = param.asStr(); }

BLYNK_WRITE(V4) {
  if (param.asInt() == 1 && tempMedicine != "") {
    alarms.push_back({tempHour, tempMinute, tempMedicine});
    std::sort(alarms.begin(), alarms.end(), [](const Alarm &a, const Alarm &b) {
      return (a.hour < b.hour) || (a.hour == b.hour && a.minute < b.minute);
    });
    Blynk.virtualWrite(V5, "Alarme adicionado: " + tempMedicine);
    updateDisplay();
  }
}

BLYNK_WRITE(V7) {
  if (param.asInt() == 1) {
    alarms.clear();
    Blynk.virtualWrite(V5, "Todos os alarmes foram removidos");
    updateDisplay();
  }
}

void loop() {
  Blynk.run();
  timer.run();
}