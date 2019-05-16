/*global document chrome setTimeout MutationObserver*/

const ATTR = 'data-is-muted';
const LED_SERVICE = 'd78ac848-d42f-49d3-9bdb-8958980e210d';

var log = (_) => {};
function setDebug(debug) {
    debug = !!debug;
    log = debug ? console.log : (_) => {};
    log(`Debug logging: ${debug}`);
}

var last_muted;
var bt = false;
var bt_error = false;
var led = null;

chrome.storage.local.get(['debug', 'bluetooth'], ({debug, bluetooth}) => {
    setDebug(debug);
    bt = bluetooth;
});

chrome.storage.onChanged.addListener((changes, namespace) => {
    for (var key in changes) {
        if (key == 'debug') {
            setDebug(changes[key].newValue);
        } else if (key == 'bluetooth') {
            bt = changes[key].newValue;
        }
    }
});

async function updateLED(muted) {
    try {
        let val = new Uint8Array([muted ? 1 : 0]);
        await led.writeValue(val);
    } catch (ex) {
        log(`Error updating LED: ${ex.toString()}`);
    }
}

async function tryConnectDevice() {
    try {
        // TODO: use `navigator.permissions.request` once that is implemented
        // for bluetooth in Chrome:
        // https://webbluetoothcg.github.io/web-bluetooth/#permission-api-integration
        // https://bugs.chromium.org/p/chromium/issues/detail?id=577953
        // We can use that to request access to the same device ID we had last
        // time.
	const device = await navigator.bluetooth.requestDevice({filters: [{services: [LED_SERVICE]}]});
        console.log('Connecting to GATT Server...');
        const server = await device.gatt.connect();
        console.log('Getting Service...');
        const service = await server.getPrimaryService(LED_SERVICE);
        console.log('Getting Characteristic...');
        led = await service.getCharacteristic(0x2A57);
    } catch (ex) {
        log(`Error getting bluetooth device: ${ex.toString()}`);
        bt_error = true;
    }
}

// Notify the background script of mute state changes.
function sendNotification(button) {
    const muted = button.dataset.isMuted;
    log(`muted: ${muted}`);
    if (bt) {
        if (led) {
            // TODO: check `navigator.userActivation.isActive`
            if (muted != last_muted) {
                updateLED(muted);
                last_muted = muted;
            }
        } else if (!bt_error) {
            tryConnectDevice();
        }
    }
}

// Add a mutation observer for the `data-is-muted` attribute to track the
// current mute state.
function addObserver(button) {
    var btn_obs = new MutationObserver((muts, o) => {
        sendNotification(button);
    });
    btn_obs.observe(button, {attributes: true, attributeFilter: [ATTR]});
    // Add another observer to watch all elements in the document to catch
    // the mute button element being removed from the DOM, which happens when
    // transitioning from the "Join Call" view to the in-call view.
    var doc_obs = new MutationObserver((muts, o) => {
        if (!document.contains(button)) {
            log('Mute button was removed');
            doc_obs.disconnect();
            btn_obs.disconnect();
            findMuteButton();
        }
    });
    doc_obs.observe(document, {childList: true, subtree: true});
}

// Locate the mute button by selector. Keep trying if it can't be found.
function findMuteButton() {
    // Using the tooltip seems fragile but all of the other attributes use
    // non-descriptive values.
    var button = document.querySelector('div[data-tooltip$=" microphone"]');
    if (button == null) {
        setTimeout(findMuteButton, 100);
    } else {
        log(`found mute button: ${button.className}`);
        sendNotification(button);
        addObserver(button);
    }
}

findMuteButton();

chrome.runtime.onMessage.addListener(({action, os}) => {
    log(`onMessage: ${action} ${os}`);
    if (action == 'toggle_mute') {
        // Command+d toggles the microphone on macOS, Ctrl+d on other platforms:
        // https://support.google.com/meet/answer/7315119?hl=en
        var opts = {'key': 'd'};
        if (os == 'mac') {
            opts.metaKey = true;
        } else {
            opts.ctrlKey = true;
        }
        document.dispatchEvent(new KeyboardEvent('keydown', opts));
        document.dispatchEvent(new KeyboardEvent('keyup', opts));
    }
});
