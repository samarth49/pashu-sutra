#include <SoftwareSerial.h>
#include <PubSubClient.h>

// Define GSM module RX and TX pins
#define GSM_RX_PIN 8
#define GSM_TX_PIN 9

// Adafruit IO credentials
const char* mqtt_server = "";
const char* mqtt_username = "YourAdafruitIOUsername";
const char* mqtt_password = "YourAdafruitIOKey";

// Geofence coordinates
float fence_latitude = 37.7749; // Define your geofence latitude
float fence_longitude = -122.4194; // Define your geofence longitude
float fence_radius_meters = 1000; // Define your geofence radius in meters

// MQTT topics
const char* mqtt_topic = "/feeds/your_topic"; // Change "your_topic" to your desired topic

SoftwareSerial gsmSerial(GSM_RX_PIN, GSM_TX_PIN); // RX, TX

PubSubClient client(gsmSerial);

void setup() {
  Serial.begin(9600);
  gsmSerial.begin(9600);

  // Wait for the GSM module to initialize
  delay(3000);

  // Set up GSM connection
  gsmSerial.println("AT");
  delay(1000);
  gsmSerial.println("AT+CGATT=1");
  delay(1000);
  gsmSerial.println("AT+CSTT=\"YourAPN\"");
  delay(1000);
  gsmSerial.println("AT+CIICR");
  delay(1000);
  gsmSerial.println("AT+CIFSR");
  delay(1000);

  // Initialize MQTT client
  client.setServer(mqtt_server, 1883);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // Fetch GPS coordinates - replace with your GPS module code
  float current_latitude = 37.7749; // Replace with actual latitude
  float current_longitude = -122.4194; // Replace with actual longitude

  // Calculate distance between current location and geofence center
  float distance_meters = distance(fence_latitude, fence_longitude, current_latitude, current_longitude);

  // Check if the device is outside the geofence
  if (distance_meters > fence_radius_meters) {
    Serial.println("Outside the fence");
    client.publish(mqtt_topic, "Outside the fence");
    delay(10000); // Wait for 10 seconds before checking again
  }
}

void reconnect() {
  // Loop until we're reconnected
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    // Attempt to connect
    if (client.connect("ESP8266Client", mqtt_username, mqtt_password)) {
      Serial.println("connected");
      // Once connected, publish an announcement...
      client.publish(mqtt_topic, "ESP8266 connected to Adafruit IO");
      // ... and resubscribe
      client.subscribe(mqtt_topic);
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      // Wait 5 seconds before retrying
      delay(5000);
    }
  }
}

float distance(float lat1, float lon1, float lat2, float lon2) {
  float R = 6371000; // Earth radius in meters
  float dLat = (lat2 - lat1) * PI / 180;
  float dLon = (lon2 - lon1) * PI / 180;
  float a = sin(dLat/2) * sin(dLat/2) + cos(lat1 * PI / 180) * cos(lat2 * PI / 180) * sin(dLon/2) * sin(dLon/2);
  float c = 2 * atan2(sqrt(a), sqrt(1-a));
  float d = R * c;
  return d;
}
