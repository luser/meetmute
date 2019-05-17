This directory contains an Arduino project for use on an [Adafruit Feather 32u4 Bluefruit LE](https://www.adafruit.com/product/2829). It provides a HID keyboard over Bluetooth LE as well as battery status and an additional digital output characteristic to control an LED. It expects a push button to be wired from pin 0 to ground. Pushing the button sends a keypress whose value is hardcoded in the source (currently `Command+Shift+A`). An LED can be wired between pin 1 and ground (the button in the hardware list in the [top-level README](../README.md) has a built-in LED) and it can be controlled via Bluetooth.

This project requires the [Bounce2](https://github.com/thomasfredericks/Bounce2) Arduino library as well as the [Adafruit BluefruitLE nRF51](https://github.com/adafruit/Adafruit_BluefruitLE_nRF51) Arduino library. See [the Adafruit documentation](https://learn.adafruit.com/adafruit-feather-32u4-bluefruit-le/setup) for directions on configuring the Arduino IDE and libraries for use with this board.

This project is designed to be used in combination with [the Chrome extension](../extension) in this repository, which listens for this keypress and sends the proper keypress to a Google Meet tab to toggle mute. The extension has some support for setting the LED based on the current mute status but it is not very reliable currently.


To the extent possible under law, the author(s) have dedicated all copyright and related and neighboring rights to this software to the public domain worldwide. This software is distributed without any warranty.

You should have received a copy of the CC0 Public Domain Dedication along with this software. If not, see <http://creativecommons.org/publicdomain/zero/1.0/>.
