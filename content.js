/*global document chrome*/
chrome.runtime.onMessage.addListener(request => {
  console.log(`onMessage: ${request.action}`);
  if (request.action == "toggleMic") {
    sendKey("d");
  } else if (request.action == "toggleCam") {
    sendKey("e");
  }
});

function sendKey(key) {
  var init = {"key": key, metaKey: true};
  document.dispatchEvent(new KeyboardEvent("keydown", init));
  document.dispatchEvent(new KeyboardEvent("keyup", init));
}
