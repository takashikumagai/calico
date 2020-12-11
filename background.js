function bgLog(message) {
  // console.log(message)
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
      chrome.tabs.sendMessage(activeTab.id, 'select-candidate-in-active-tab')
    })
    break
  default:
    console.log('Unknown command %s', command)
  }
})
