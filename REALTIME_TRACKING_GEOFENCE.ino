#define DEBUG true

//******************* Pin Configurations *******************//

#define A9G_PON     14
#define A9G_POFF    13
#define A9G_LOWP    27
#define SOS_Button  22

//******************* MQTT Parameters *******************//

String MQTT_BROKER = "";
String MQTT_PORT = "";
String MQTT_USERNAME =  "";
String MQTT_PASSWORD = "";

//******************* SIM Paramaters *******************//

String SOS_NUM = "";
String APN_NAME = "";

//******************* Data Sending Interval *******************//
uint16_t Send_Data_After = 10; // 10 sec waiting
uint8_t SOS_Time = 5; // Press the button 5 sec

//******************* Geofence Parameters *******************//
#define GEOFENCE_LATITUDE  18.4640
#define GEOFENCE_LONGITUDE 73.8682
#define GEOFENCE_RADIUS    50 // in meters, adjust as needed

//******************* Necessary Variables *******************//

String fromGSM = "";
String res = "";
String response = " "; // Change type from char* to String
String location_data;
String lats;
String longi;
String link1;
String link2;
String link3;
String link4;
String msg;
String Inside_Geofence = "Inside Geofence";
String Outside_Geofence = "Outside_Geofence";

// define two tasks for MQTT_Task & SOSButton_Task
void MQTT_Task(void *pvParameters);
void SOSButton_Task(void *pvParameters);

//******************* Function Prototypes *******************//
float calculateDistance(float lat1, float lon1, float lat2, float lon2);
String sendData(String command, const int timeout, boolean debug);
void Get_gmap_link(bool makeCall);

// the setup function runs once when you press reset or power the board
void setup()
{
  Serial.begin(115200); // For ESP32
  Serial1.begin(115200, SERIAL_8N1, 33, 25); //For A9G

  pinMode(A9G_PON, OUTPUT);//LOW LEVEL ACTIVE
  pinMode(A9G_POFF, OUTPUT);//HIGH LEVEL ACTIVE
  pinMode(A9G_LOWP, OUTPUT);//LOW LEVEL ACTIVE
  pinMode(SOS_Button, INPUT);

  digitalWrite(A9G_POFF, LOW);
  digitalWrite(A9G_LOWP, HIGH);
  digitalWrite(A9G_PON, HIGH);
  delay(1000);
  digitalWrite(A9G_PON, LOW);

  //**************** AT Commands *****************// 

  msg = "";
  msg = sendData("AT+RST=1", 2000, DEBUG);
  while (msg.indexOf("OK") == -1) {
    msg = sendData("AT+RST = 1", 2000, DEBUG);
    Serial.println("Trying");
  }
  Serial.println("Before Delay");
  delay(6000);// Waiting For 15 Sec for Initialisation
  Serial.println("After Delay");

  msg = "";
  msg = sendData("AT", 1000, DEBUG);
  while (msg.indexOf("OK") == -1) {
    msg = sendData("AT", 1000, DEBUG);
    Serial.println("Trying");
  }

  msg = "";
  msg = sendData("AT+MQTTDISCONN", 1000, DEBUG);
  while (msg.indexOf("OK") == -1) {
    msg = sendData("AT+MQTTDISCONN", 1000, DEBUG);
    Serial.println("Trying");
  }

  msg = "";
  msg = sendData("AT+GPS=1", 2000, DEBUG);
  while (msg.indexOf("OK") == -1) {
    msg = sendData("AT+GPS=1", 1000, DEBUG);
    Serial.println("Trying");
  }

  msg = "";
  msg = sendData("AT+CGATT=1", 2000, DEBUG);
  while (msg.indexOf("OK") == -1) {
    msg = sendData("AT+CGATT=1", 1000, DEBUG);
    Serial.println("Trying");
  }

  msg = "";
  msg = sendData("AT+CGDCONT=1,\"IP\",\"" + APN_NAME + "\"", 2000, DEBUG);
  while (msg.indexOf("OK") == -1) {
    msg = sendData("AT+CGDCONT=1,\"IP\",\"" + APN_NAME + "\"", 1000, DEBUG);
    Serial.println("Trying");
  }

  msg = "";
  msg = sendData("AT+CGACT=1", 2000, DEBUG);
  while (msg.indexOf("OK") == -1) {
    msg = sendData("AT+CGACT=1", 1000, DEBUG);
    Serial.println("Trying");
  }

  msg = "";
  msg = sendData("AT+SNFS=2", 2000, DEBUG);
  while (msg.indexOf("OK") == -1) {
    msg = sendData("AT+SNFS=2", 1000, DEBUG);
    Serial.println("Trying");
  }

  msg = "";
  msg = sendData("AT+CLVL=8", 2000, DEBUG);
  while (msg.indexOf("OK") == -1) {
    msg = sendData("AT+CLVL=8", 1000, DEBUG);
    Serial.println("Trying");
  }

  msg = "";
  msg = sendData("AT+MQTTCONN=\"" + MQTT_BROKER + "\"," + MQTT_PORT + ",\"ABCD\",120,0,\"" + MQTT_USERNAME + "\",\"" + MQTT_PASSWORD + "\"", 3000, DEBUG);
  while (msg.indexOf("OK") == -1) {
    msg = sendData("AT+MQTTCONN=\"" + MQTT_BROKER + "\"," + MQTT_PORT + ",\"ABCD\",120,0,\"" + MQTT_USERNAME + "\",\"" + MQTT_PASSWORD + "\"", 1000, DEBUG);
    Serial.println("Trying");
  }

  // Now set up two tasks to run independently.
  xTaskCreatePinnedToCore(
    MQTT_Task
    , "MQTT_Task"   // A name just for humans
    , 1024  // This stack size can be checked & adjusted by reading the Stack Highwater
    , NULL
    , 2  // Priority, with 3 (configMAX_PRIORITIES - 1) being the highest, and 0 being the lowest.
    , NULL
    , 0);

  xTaskCreatePinnedToCore(
    SOSButton_Task
    , "SOSButton_Task"
    , 1024  // Stack size
    , NULL
    , 1  // Priority
    , NULL
    , 0);

  // Now the task scheduler, which takes over control of scheduling individual tasks, is automatically started.
}

void loop()
{
  // Empty. Things are done in Tasks.
}

//--------------------------------------------------//
//---------------------- Tasks ---------------------//
//--------------------------------------------------//

void MQTT_Task(void *pvParameters)  // This is a task.
{
  (void)pvParameters;

  for (;;) // A Task shall never return or exit.
  {
    //************** Sending Location Data *************//
    Serial1.println("AT+LOCATION=2\r\n");
    delay(2000);
    while (!Serial1.available())
    {
      Serial.println("Waiting");
      delay(10);
    }
    while (Serial1.available())
    {
      char add = Serial1.read();
      res = res + add;
      delay(1);
    }
    response = res; // Updated to assign String directly
    if (response.indexOf("GPS NOT") != -1)
    {
      Serial.println("No Location data");
    }
    else
    {
      int j = 0;
      while (res[j] != '2')
        j++;
      res = res.substring(j + 5);
      int k = 0;
      while (res[k] != '\n')
        k++;
      res = res.substring(0, k);
      response = res;
      Serial.print("Current String -"); Serial.print(response); Serial.println("-");
      int i = 0;
      while (response[i] != ',')
        i++;
      location_data = response;
      lats = location_data.substring(0, i);
      longi = location_data.substring(i + 1, i + 10);
      Serial.print("Lat - "); Serial.print(lats); Serial.println("-");
      Serial.print("Longi - "); Serial.print(longi); Serial.println("-");
      int longi_length = longi.length();
      Serial.print("Longi Length - "); Serial.print(longi_length); Serial.println("-");
      //lats.trim();
      String coordinates = "0," + lats + "," + longi + ",0"; // Removed c_str()
      Serial.print("coordinates - "); Serial.print(coordinates); Serial.println("-");
      link1 = ("AT+MQTTPUB=\"ProtonX/feeds/gpsloc/csv\",\"" + coordinates + "\",0,0,0") ;
      Serial.print("link lat -"); Serial.println(link1);
      sendData(link1, 1000, DEBUG);
      delay(2000);
      Serial.println("Location DataSend");

      //*************** Geofence Check *********************//
      float currentLat = lats.toFloat();
      float currentLon = longi.toFloat();

      float distance = calculateDistance(currentLat, currentLon, GEOFENCE_LATITUDE, GEOFENCE_LONGITUDE);
      if (distance <= GEOFENCE_RADIUS) {
    // Device is inside the geofence, perform action
    Serial.println("Device is inside the geofence!");
    String link3 = "AT+MQTTPUB=\"ProtonX/feeds/geofence/csv\",\"" + Inside_Geofence + "\",0,0,0";
    sendData(link3, 1000, DEBUG);
    } else {
    // Device is outside the geofence, perform action
    Serial.println("Device is outside the geofence!");
    String link4 = "AT+MQTTPUB=\"ProtonX/feeds/geofence/csv\",\"" + Outside_Geofence + "\",0,0,0";
    sendData(link4, 1000, DEBUG);
    }

      //*************** Sending Battery Status *********************//
      msg = "";
      msg = sendData("AT+CBC?", 2000, DEBUG);
      while (msg.indexOf("OK") == -1) {
        msg = sendData("AT+CBC?", 1000, DEBUG);
        Serial.println("Trying");
      }
      Serial.print("Received Data Before - "); Serial.println(msg); // printing the String in lower character form
      int count = 0;
      while (msg[count] != ',')
      {
        count++;
        Serial.print(msg[count]);
      }

      msg = msg.substring(count + 2);

      count = 0;
      while (msg[count] != '\n')
      {
        count++;
        Serial.print(msg[count]);
      }

      msg = msg.substring(0, count - 1);
      Serial.print("Received Data - "); Serial.println(msg); // printing the String in lower character form
      Serial.println("\n");
      link2 = ("AT+MQTTPUB=\"ProtonX/feeds/battery\",\"" + msg + "\",0,0,0") ;
      Serial.print("battery link -"); Serial.println(link2);
      Serial.print("For Serial Monitor-"); Serial.println(link2);

      msg = "";
      msg = (sendData(link2, 1000, DEBUG));
      char* msg_char = &msg[0];
      Serial.print("LAT MSG - "); Serial.println(msg_char);
      if (!(strstr(msg_char, "OK"))) {
        // MQTT_ReConnect();
      }
      delay(2000);
      Serial.println("Battery DataSend");
      response = "";
      res = "";
      Serial.println("Delay");
      vTaskDelay((Send_Data_After * 1000));
    }
  }
}

//***************** SOS Button *******************//

void SOSButton_Task(void *pvParameters)  // This is a task.
{
  (void)pvParameters;
  for (;;)
  {
    if (digitalRead(SOS_Button) == LOW)
    {
      Serial.println("Button Pressed");
      for (int l = 0; l <= SOS_Time; l++)
      {
        Serial.println(l);
        if (l == 5 && digitalRead(SOS_Button) == LOW)
        {
          Serial.println("SOS Triggered");
          Get_gmap_link(1);
          l = 0;
        }
        if (digitalRead(SOS_Button) == HIGH)
          break;
        vTaskDelay(1000);
      }
    }
    vTaskDelay(10);  // one tick delay (15ms) in between reads for stability
  }
}

String sendData(String command, const int timeout, boolean debug)
{
  String temp = "";
  Serial1.println(command);
  long int time = millis();
  while ((time + timeout) > millis())
  {
    while (Serial1.available())
    {
      char c = Serial1.read();
      temp += c;
    }
  }
  if (debug)
  {
    Serial.print(temp);
  }
  return temp;
}

void Get_gmap_link(bool makeCall)
{
  {
    Serial.println(lats);
    Serial.println(longi);

    String Gmaps_link = ("http://maps.google.com/maps?q=" + lats + "+" + longi); //http://maps.google.com/maps?q=38.9419+-78.3020
    //------------------------------------- Sending SMS with Google Maps Link with our Location
    Serial1.println("AT+CMGF=1");
    delay(1000);
    Serial1.println("AT+CMGS=\"" + SOS_NUM + "\"\r");
    delay(1000);

    Serial1.println("ID NO. 1 is here " + Gmaps_link);
    delay(1000);
    Serial1.println((char)26);
    delay(1000);

    Serial1.println("AT+CMGD=1,4"); // delete stored SMS to save memory
    delay(5000);
  }
  response = "";
  res = "";
  if (makeCall)
  {
    Serial.println("Calling Now");
    Serial1.println("ATD" + SOS_NUM);
  }
}

void MQTT_ReConnect()
{
  String new_msg = "";
  new_msg = sendData("AT+MQTTDISCONN", 2000, DEBUG);
  while (new_msg.indexOf("OK") == -1) {
    new_msg = sendData("AT+MQTTDISCONN", 2000, DEBUG);
    Serial.println("Trying");
  }
  new_msg = "";
  new_msg = sendData("AT+MQTTCONN=\"" + MQTT_BROKER + "\"," + MQTT_PORT + ",\"ABCD\",120,0,\"" + MQTT_USERNAME + "\",\"" + MQTT_PASSWORD + "\"", 3000, DEBUG);
  while (new_msg.indexOf("OK") == -1) {
    new_msg = sendData("AT+MQTTCONN=\"" + MQTT_BROKER + "\"," + MQTT_PORT + ",\"ABCD\",120,0,\"" + MQTT_USERNAME + "\",\"" + MQTT_PASSWORD + "\"", 1000, DEBUG);
    Serial.println("Trying");
  }
}

float calculateDistance(float lat1, float lon1, float lat2, float lon2) {
  float latRad1 = radians(lat1);
  float lonRad1 = radians(lon1);
  float latRad2 = radians(lat2);
  float lonRad2 = radians(lon2);

  // Haversine formula
  float dlon = lonRad2 - lonRad1;
  float dlat = latRad2 - latRad1;
  float a = pow(sin(dlat / 2), 2) + cos(latRad1) * cos(latRad2) * pow(sin(dlon / 2), 2);
  float c = 2 * atan2(sqrt(a), sqrt(1 - a));
  float distance = 6371000 * c; // Radius of the Earth in meters
  return distance;
}
