/*global chrome */

var log = chrome.extension.getBackgroundPage().log;

function setupCheck(name) {
    var check = document.getElementById(name);
    check.addEventListener('change', () => {
        log(`Setting ${name} to ${!!check.checked}`);
        chrome.storage.local.set({name: !!check.checked});
    });
    chrome.storage.local.get(name, (res) => {
        log(`${name} is ${!!res[name]}`);
        check.checked = !!res[name];
    });
}

/*
const SERVICE_UUID = 'd78ac848-d42f-49d3-9bdb-8958980e210d';

function haveBluetoothDevice(device) {
    log(`haveBluetoothDevice: ${device}`);
    document.getElementById('disconnected').style.display = 'none';
    document.getElementById('bluetooth_name').innerText = device;
    document.getElementById('connected').style.display = '';
}

function noBluetoothDevice() {
    log(`noBluetoothDevice`);
    document.getElementById('disconnected').style.display = '';
    document.getElementById('bluetooth_name').innerText = '';
    document.getElementById('connected').style.display = 'none';
}

async function getDevice() {
    try {
        log('Requesting device...');
        const device = await navigator.bluetooth.requestDevice({
            // Look for our custom LED service.
            filters: [{services: [SERVICE_UUID]}]
        });
        log(`Got device ${device.id}, ${device.name ? device.name : '(no name)'}`);
    } catch (ex) {
        log(`Error getting device: ${ex.toString()}`);
    }
}

function setupBluetooth() {
    document.getElementById('connect').addEventListener('click', getDevice);
    document.getElementById('disconnect').addEventListener('click', () => {
        chrome.storage.local.remove('bluetooth_device');
        noBluetoothDevice();
    });
    chrome.storage.local.get('bluetooth_device', (res) => {
        if ('bluetooth_device' in res) {
            haveBluetoothDevice(res.bluetooth_device);
        } else {
            noBluetoothDevice();
        }
    });
}
*/

document.addEventListener('DOMContentLoaded', () => {
    setupCheck('debug');
    setupCheck('bluetooth');
});
