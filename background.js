/*global chrome*/

chrome.commands.onCommand.addListener(function(command) {
  var urls = [
    'https://hangouts.google.com/*',
    'https://meet.google.com/*',
  ];

  var key = (command == "toggleMic") ? "d" : "e";
  var script = `document.dispatchEvent(new KeyboardEvent("keydown", {"key": "${key}", metaKey: true})); document.dispatchEvent(new KeyboardEvent("keyup", {"key": "${key}", metaKey: true}));`;

  chrome.tabs.query({ url: urls }, function(tabs) {
    for (var i = 0; i < tabs.length; i++) {
      var tab = tabs[i];
      chrome.tabs.executeScript(tab.id, {code: script});
    }
  });
});
