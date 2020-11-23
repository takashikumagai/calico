chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  console.log('request received')

  switch (request.handler) {
  case 'get_options':
    console.log('get_options')
    break
  case 'translate':
    console.log('received to translate: ' + request.word)
    break
  case 'toggle_disable_on_this_page':
    console.log('toggle_disable_on_this_page')
    break
  default:
    console.error('Unknown handler')
    sendResponse({})
  }
})

chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.tabs.sendMessage(tab.id, 'open_type_and_translate')
})

chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason == 'install') {
    chrome.tabs.create({url: chrome.extension.getURL('options.html')})
  }
})

chrome.commands.onCommand.addListener(function(command) {
  switch (command) {
  case 'select-candidate':
    chrome.tabs.query({active: true}, ([activeTab]) => {
      chrome.tabs.sendMessage(activeTab.id, 'select-candidate-in-active-tab')
    })
    break
  default:
    console.log('Unknown command %s', command)
  }
})
