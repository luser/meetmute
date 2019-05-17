/*global chrome*/

var log = (_) => {};
function setDebug(debug) {
    debug = !!debug;
    log = debug ? console.log : (_) => {};
    log(`Debug logging: ${debug}`);
}

chrome.storage.local.get('debug', ({debug}) => setDebug(debug));

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({'debug': true, 'bluetooth': false});
});

chrome.storage.onChanged.addListener((changes, namespace) => {
    for (var key in changes) {
        if (key == 'debug') {
            setDebug(changes[key].newValue);
        }
    }
});

var os = 'unknown';
chrome.runtime.getPlatformInfo(info => os = info.os);

chrome.commands.onCommand.addListener((command) => {
    log(`onCommand: ${command}`);
    var urls = [
        'https://meet.google.com/*',
    ];

    chrome.tabs.query({ url: urls }, (tabs) => {
        for (var i = 0; i < tabs.length; i++) {
            chrome.tabs.sendMessage(tabs[i].id, {action: 'toggle_mute', os: os});
        }
    });
});
