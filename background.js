let isActive = false;

function bgLog(message) {
  // console.log(message)
}

function updateExtensionStateInActiveTab() {
  chrome.tabs.query({active: true, currentWindow: true}, ([activeTab]) => {
    bgLog(`Sending update-extension-state message to active tab (${activeTab.id}). isActive: ${isActive}`)
    chrome.tabs.sendMessage(activeTab.id, {command: 'update-extension-state', isActive: isActive})
  })
}

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  console.log('request received')

  switch (request.handler) {
  case 'get_options':
    console.log('get_options')
    break
  default:
    console.error('Unknown handler')
    sendResponse({})
  }
})

chrome.browserAction.onClicked.addListener(function(tab) {
  // chrome.tabs.sendMessage(tab.id, 'open_type_and_translate')
})

// chrome.runtime.onInstalled.addListener(function(details) {
//   if (details.reason == 'install') {
//     chrome.tabs.create({url: chrome.extension.getURL('options.html')})
//   }
// })

chrome.commands.onCommand.addListener(function(command) {
  bgLog(`Command: ${command}`)
  switch (command) {
  case 'select-candidate':
    bgLog('Selecting current candidate')
    chrome.tabs.query({active: true, currentWindow: true}, ([activeTab]) => {
      bgLog(`active tab: ${activeTab.id}`)
      chrome.tabs.sendMessage(activeTab.id, {command: 'select-candidate-in-active-tab'})
    })
    break
  case 'toggle-active':
    bgLog('toggle-active')
    isActive = !isActive
    updateExtensionStateInActiveTab()
    break
  default:
    console.log('Unknown command %s', command)
  }
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if(message.type == 'get-extension-state') {
    sendResponse({isActive: isActive})
  }
})

chrome.tabs.onActiveChanged.addListener((tabId, selectInfo) => {
  bgLog('onActiveChanged')
  updateExtensionStateInActiveTab()
})

// Couldn't tell the difference from this and onActiveChanged;
// 2 events seem to happen in pairs (onSelectionChanged followed by onActiveChanged)
// chrome.tabs.onSelectionChanged.addListener((tabId, selectInfo) => {
//   bgLog('onSelectionChanged')
// })

// chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
//   bgLog('onUpdated')
// })
