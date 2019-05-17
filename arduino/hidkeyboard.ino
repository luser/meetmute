
#include <Arduino.h>
#include <avr/sleep.h>
#include <SPI.h>
#include "Adafruit_BLE.h"
#include "Adafruit_BluefruitLE_SPI.h"
#include "Adafruit_BluefruitLE_UART.h"
#include "Adafruit_BLEGatt.h"
// https://github.com/thomasfredericks/Bounce2
#include <Bounce2.h>

#include "BluefruitConfig.h"

#define BUTTON_PIN 0
#define LED_PIN 1
#define VBATPIN A9
#define FACTORY_RESET 0

const unsigned long BAT_DELAY_MS = 5000;
uint8_t LED_SERVICE_UUID[] = { 0xD7, 0x8A, 0xC8, 0x48, 0xD4, 0x2F, 0x49, 0xD3, 0x9B, 0xDB, 0x89, 0x58, 0x98, 0x0E, 0x21, 0x0D };

/* ...hardware SPI, using SCK/MOSI/MISO hardware SPI pins and then user selected CS/IRQ/RST */
Adafruit_BluefruitLE_SPI ble(BLUEFRUIT_SPI_CS, BLUEFRUIT_SPI_IRQ, BLUEFRUIT_SPI_RST);
Adafruit_BLEGatt gatt(ble);

// A debouncer for the button.
Bounce debouncer = Bounce();

// The last time the battery value was measured (from millis())
unsigned long last_bat = 0;
// The LED GATT service ID
int32_t ledServiceId;
// The LED GATT characteristic ID
int32_t ledCharId;

// A small helper
void error(const __FlashStringHelper*err) {
  Serial.println(err);
  while (1);
}

void connected(void)
{
  Serial.println(F("Connected"));
}

void disconnected(void)
{
  Serial.println(F("Disconnected"));
}

// Called when the LED characteristic is changed
void led_char_changed(int32_t char_id, uint8_t data[], uint16_t len) {
  if (char_id == ledCharId) {
    Serial.print(F("LED characteristic changed: "));
    Serial.print(data[0]);
    Serial.print(F(", len: "));
    Serial.println(len);
    digitalWrite(LED_PIN, data[0] ? HIGH : LOW);
  }
}

void wake() {
  sleep_disable();
  detachInterrupt(digitalPinToInterrupt(BUTTON_PIN));
}

// Taken from http://www.gammon.com.au/interrupts
void sleepNow ()
{
  set_sleep_mode (SLEEP_MODE_PWR_DOWN);
  noInterrupts();          // make sure we don't get interrupted before we sleep
  sleep_enable();          // enables the sleep bit in the mcucr register
  attachInterrupt(digitalPinToInterrupt(BUTTON_PIN), wake, FALLING);  // wake up on D0 falling
  interrupts();           // interrupts allowed now, next instruction WILL be executed
  sleep_cpu();            // here the device is put to sleep
}

void setup(void)
{
  debouncer.attach(BUTTON_PIN, INPUT_PULLUP);
  debouncer.interval(10);

  pinMode(LED_PIN, OUTPUT);

  while (!Serial);  // required for Flora & Micro
  delay(500);

  Serial.begin(115200);
  if (!ble.begin(VERBOSE_MODE)) {
    error(F("Couldn't find Bluefruit, make sure it's in CoMmanD mode & check wiring?"));
  }

  // Disable command echo from Bluefruit
  ble.echo(false);

#if FACTORY_RESET
  Serial.println(F("Performing factory reset..."));
  if (!ble.factoryReset()) {
    error(F("Couldn't factory reset"));
  }
  ble.info();
#endif

  ble.setConnectCallback(connected);
  ble.setDisconnectCallback(disconnected);

  // Change the device name to make it easier to find
  if (!ble.sendCommandCheckOK(F("AT+GAPDEVNAME=Mute Button"))) {
    error(F("Could not set device name"));
  }

  // Enable HID Service
  if (!ble.sendCommandCheckOK(F("AT+BleHIDEn=1" ))) {
    error(F("Could not enable Keyboard"));
  }


  // Enable battery service
  int32_t enabled = 0;
  if (!ble.sendCommandWithIntReply(F("AT+BLEBATTEN"), &enabled)) {
    error(F("Could not get status of battery service"));
  }

  if (!enabled && !ble.sendCommandCheckOK(F("AT+BLEBATTEN=1"))) {
    error(F("Could not enable battery service"));
  }

  gatt.clear();
  ledServiceId = gatt.addService(LED_SERVICE_UUID);
  if (ledServiceId == 0) {
    error(F("Could not add LED service"));
  }
  // Add a Digital Output characteristic for controlling the LED
  ledCharId = gatt.addCharacteristic(0x2A57, GATT_CHARS_PROPERTIES_READ | GATT_CHARS_PROPERTIES_WRITE, 1, 1, BLE_DATATYPE_INTEGER, "LED");
  if (ledCharId == 0) {
    error(F("Could not add LED characteristic"));
  }

  ble.setBleGattRxCallback(ledCharId, led_char_changed);

  // Set the advertising data to include both the HID service UUID and our made-up service UUID.
  // 0x01 = Flags
  // 0x02 = Incomplete List of 16-bit Service Class UUIDs ( 0x1812 = HID Service )
  // 0x06 = Incomplete List of 128-bit Service Class UUIDs ( LED_SERVICE_UUID above )
  if (!ble.sendCommandCheckOK(F("AT+GAPSETADVDATA=02-01-06-03-02-12-18-11-06-0D-21-0E-98-58-89-DB-9B-D3-49-2F-D4-48-C8-8A-D7"))) {
    error(F("Could not set advertising data"));
  }


  if (!ble.sendCommandCheckOK(F("AT+GAPSTARTADV"))) {
    Serial.println(F("Couldn't start advertising"));
  }

  ble.reset();
}


void loop(void)
{
  ble.update(0);

  unsigned long now = millis();
  if (now < last_bat || (now - last_bat) > BAT_DELAY_MS) {
    last_bat = now;
    // From https://learn.adafruit.com/adafruit-feather-32u4-bluefruit-le?view=all#measuring-battery-4-9
    float vbat = analogRead(VBATPIN);
    vbat *= 2;    // we divided by 2, so multiply back
    vbat *= 3.3;  // Multiply by 3.3V, our reference voltage
    vbat /= 1024; // convert to voltage
    Serial.print(F("VBat: "));
    Serial.println(vbat);
    // Clamp to the range 3.2-4.2V.
    uint8_t pct = 100 * (max(min(vbat, 4.2), 3.2) - 3.2);
    ble.atcommand(F("AT+BLEBATTVAL"), pct);
  }

  debouncer.update();

  if (debouncer.fell()) {
    if (ble.isConnected()) {
      Serial.println("Sending keypress...");
      // Send a Shift+Command+A keypress
      ble.println("AT+BLEKEYBOARDCODE=0A-00-04-00-00-00-00");

      if (!ble.waitForOK()) {
        Serial.println( F("FAILED!") );
      }

      delay(10);

      // Release all keys
      ble.println("AT+BLEKEYBOARDCODE=00-00");

      if (!ble.waitForOK()) {
        Serial.println( F("FAILED!") );
      }
    } else {
      Serial.println("Advertising...");
      if (!ble.sendCommandCheckOK(F("AT+GAPSTARTADV"))) {
        Serial.println(F("Couldn't start advertising"));
      }
    }
  }
  // Sleep until the button gets pressed again.
  //sleepNow();
}
