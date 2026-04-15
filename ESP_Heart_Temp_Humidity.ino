#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"
#include <Adafruit_SHT4x.h>
#include <ESP8266WiFi.h>
#include <Adafruit_MQTT.h>
#include <Adafruit_MQTT_Client.h>

// WiFi credentials
#define WIFI_SSID ""
#define WIFI_PASS ""

// Adafruit IO credentials
#define AIO_SERVER ""
#define AIO_SERVERPORT 1883 // Use 8883 for SSL
#define AIO_USERNAME 
#define AIO_KEY 

WiFiClient client;

Adafruit_MQTT_Client mqtt(&client, AIO_SERVER, AIO_SERVERPORT, AIO_USERNAME, AIO_USERNAME, AIO_KEY);

// Feeds
Adafruit_MQTT_Publish pulse_feed = Adafruit_MQTT_Publish(&mqtt, "ProtonX/feeds/bpm");
Adafruit_MQTT_Publish temp_feed = Adafruit_MQTT_Publish(&mqtt, "ProtonX/feeds/temperature");
Adafruit_MQTT_Publish humidity_feed = Adafruit_MQTT_Publish(&mqtt, "ProtonX/feeds/humidity");

// MAX30105 sensor
MAX30105 particleSensor;

// SHT40 sensor
Adafruit_SHT4x sht40;

const int numSamples = 100;  // Number of samples to calculate average BPM
int rates[numSamples];      // Array to hold the heart rate samples
int rateSpot = 0;
long lastBeat = 0;

unsigned long lastPublishTime = 0;
const unsigned long publishInterval = 10000; // 10 seconds

const long noFingerThreshold = 5000; // Adjust this threshold based on your sensor's readings

void setup() {
  Serial.begin(115200);
  
  // Initialize the rates array
  for (int i = 0; i < numSamples; i++) {
    rates[i] = 0;
  }
  
  // Connect to WiFi
  Serial.print("Connecting to ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi connected!");

  // Initialize MAX30105
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("Could not find a valid MAX30105 sensor, check wiring!");
    while (1);
  }
  particleSensor.setup();
  particleSensor.setPulseAmplitudeRed(0x0A); 
  particleSensor.setPulseAmplitudeIR(0x0A); 

  // Initialize SHT40
  if (!sht40.begin()) {
    Serial.println("Could not find a valid SHT40 sensor, check wiring!");
    while (1);
  }
  
  // Connect to MQTT
  connectToMQTT();
}

void loop() {
  MQTT_connect();

  // Read MAX30105 sensor
  long irValue = particleSensor.getIR();

  float avgBPM = 0;
  if (irValue < noFingerThreshold) {
    // No finger detected
    avgBPM = 0;
  } else {
    if (checkForBeat(irValue) == true) {
      long delta = millis() - lastBeat;
      lastBeat = millis();

      float beatsPerMinute = 60 / (delta / 1000.0);
      if (beatsPerMinute < 255 && beatsPerMinute > 20) {
        rates[rateSpot++] = (int)beatsPerMinute; // Store the rate in the array
        rateSpot %= numSamples; // Wrap variable
      }
    }
    // Calculate the average BPM only if we have collected enough samples
    int validSamples = 0;
    for (int i = 0; i < numSamples; i++) {
      if (rates[i] > 0) {
        avgBPM += rates[i];
        validSamples++;
      }
    }
    if (validSamples > 0) {
      avgBPM /= validSamples;
    }
  }

  // Print average BPM for debugging
  Serial.print("Average BPM: ");
  Serial.println(avgBPM);

  // Read SHT40 sensor
  sensors_event_t humidity, temp;
  sht40.getEvent(&humidity, &temp); // Get all sensor readings

  Serial.print("Temperature: ");
  Serial.print(temp.temperature);
  Serial.println(" *C");
  
  Serial.print("Humidity: ");
  Serial.print(humidity.relative_humidity);
  Serial.println(" %");

  // Publish data to Adafruit IO at specified intervals
  if (millis() - lastPublishTime >= publishInterval) {
    publishToAdafruitIO(avgBPM, temp.temperature, humidity.relative_humidity);
    lastPublishTime = millis(); // Update last publish time
  }
}

void publishToAdafruitIO(float bpm, float temperature, float humidity) {
  if (!pulse_feed.publish(bpm)) {
    Serial.println("Failed to publish BPM data");
  } else {
    Serial.println("BPM data published successfully");
  }

  if (!temp_feed.publish(temperature)) {
    Serial.println("Failed to publish temperature data");
  } else {
    Serial.println("Temperature data published successfully");
  }

  if (!humidity_feed.publish(humidity)) {
    Serial.println("Failed to publish humidity data");
  } else {
    Serial.println("Humidity data published successfully");
  }
}

void connectToMQTT() {
  int8_t ret;

  // Stop if already connected.
  if (mqtt.connected()) {
    return;
  }

  Serial.print("Connecting to MQTT... ");

  while ((ret = mqtt.connect()) != 0) { // connect will return 0 for connected
       Serial.println(mqtt.connectErrorString(ret));
       Serial.println("Retrying MQTT connection in 5 seconds...");
       mqtt.disconnect();
       delay(5000);  // wait 5 seconds
  }
  Serial.println("MQTT Connected!");
}

void MQTT_connect() {
  int8_t ret;

  // Stop if already connected.
  if (mqtt.connected()) {
    return;
  }

  Serial.print("Connecting to MQTT... ");
  while ((ret = mqtt.connect()) != 0) { // connect will return 0 for connected
       Serial.println(mqtt.connectErrorString(ret));
       Serial.println("Retrying MQTT connection in 5 seconds...");
       mqtt.disconnect();
       delay(5000);  // wait 5 seconds
  }
  Serial.println("MQTT Connected!");
}
