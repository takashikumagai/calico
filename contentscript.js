let englishToKatakanaLookupTable = null
let focusedInputTarget = null;
let currentCandidate = null;

function debug(message) {
  console.log(message);
}

let options
let disable_on_this_page

function ignoreThisPage(options) {
  const isBlacklisted = $.grep(options.except_urls, function(url) { return RegExp(url).test(window.location.href) }).length > 0
  const isWhitelisted = $.grep(options.only_urls, function(url) { return RegExp(url).test(window.location.href) }).length > 0 ||
    options.only_urls.length === 0

  return isBlacklisted || !isWhitelisted
}

// Append the template DOM to the root element of document
function createPopup(nodeType) {
  document.documentElement.appendChild(templates[templateIds[nodeType]])
  return $('<'+nodeType+'>')
}

function removePopup(nodeType) {
  $(nodeType).each(function() {
    const self = this
    $(this.shadowRoot.querySelector('main')).fadeOut('fast', function() { self.remove() })
  })

  // Remove the template element from the DOM
  $('#'+templateIds[nodeType]).remove()
}

const templates = {}
const templateIds = {
  'transover-popup': 'transover-popup-template',
  'transover-type-and-translate-popup': 'transover-tat-popup-template'
}

/**
 * - Loads a DOM that represents the text box for displaying candidates
 *   and stores it in a variable.
 * - Does not attach the loaded DOM to the document
 * - Attaches the JavaScript for the loaded DOM to the head of the DOM
 *   of the original page (not the loaded one)
 * 
 * @param {*} component 
 */
function registerTransoverComponent(component) {
  const html = component + '.html'
  const script = component + '.js'

  const xhr = new XMLHttpRequest()
  xhr.open('GET', chrome.extension.getURL(html), true)
  xhr.responseType = 'document'
  xhr.onload = function(e) {
    const doc = e.target.response
    const template = doc.querySelector('template') // template is the root element of the html we load and use
    templates[template.id] = template
  }
  xhr.send()

  const s = document.createElement('script')
  s.type = 'text/javascript'
  s.src = chrome.extension.getURL(script)
  s.async = true
  document.head.appendChild(s)
}

let last_translation

function showPopup(e, content) {
  removePopup('transover-type-and-translate-popup')

  // Append the text box DOM to the root of the page DOM
  const $popup = createPopup('transover-popup')

  // Also append text box DOM to the body element
  $('body').append($popup)

  $popup.on('transover-popup_content_updated', function() {
    const pos = calculatePosition(e.clientX, e.clientY, $popup)
    $popup
      .each(function() {
        $(this.shadowRoot.querySelector('main')).hide()
      })
      .attr({ top: pos.y, left: pos.x })
      .each(function() {
        $(this.shadowRoot.querySelector('main')).fadeIn('fast')
      })
  })
  $popup.attr({content, options: JSON.stringify(options)})
}

function calculatePosition(x, y, $popup) {
  const pos = {}

  pos.x = x;
  pos.y = y;

  return pos
}

function loadOptions() {
  // chrome.extension.sendRequest({handler: 'get_options'}, function(response) {
  //   options = JSON.parse( response.options )
  //   disable_on_this_page = ignoreThisPage(options)
  //   chrome.extension.sendRequest({handler: 'setIcon', disabled: disable_on_this_page})
  // })
}
loadOptions()

function loadEnglishToKatakanaLookupTable() {
  const url = chrome.extension.getURL('english-to-katakana.json');
  //console.log(`loading lookup table: ${url}`);
  fetch(url)
  .then(response => response.json())
  .then(data => englishToKatakanaLookupTable = data);
}

document.addEventListener('visibilitychange', function () {
  if (!document.hidden) {
    loadOptions()
  }
}, false)

let show_popup_key_pressed = false
$(document).keydown(function(e) {
  // Hide tat popup on escape
  if (e.keyCode == 27) {
    removePopup('transover-type-and-translate-popup')
  }
}).keyup(function(e) {
  console.log('keyup')
  // if (TransOver.modifierKeys[e.keyCode] == options.popup_show_trigger) {
  //   show_popup_key_pressed = false
  // }
})

let timer25
const last_mouse_stop = {x: 0, y: 0}

$(document).scroll(function() {
  removePopup('transover-popup')
})

// setup mousestop event
$(document).on('mousemove_without_noise', function(e){
  removePopup('transover-popup')

  clearTimeout(timer25)

  if (options) {
    let delay = options.delay

    if (window.getSelection().toString()) {
      if (options.selection_key_only) {
        delay = 200
      }
    } else {
      if (options.word_key_only) {
        delay = 200
      }
    }

    timer25 = setTimeout(function() {
      const mousestop = new $.Event('mousestop')
      last_mouse_stop.x = mousestop.clientX = e.clientX
      last_mouse_stop.y = mousestop.clientY = e.clientY

      $(document).trigger(mousestop)
    }, delay)
  }
})

document.addEventListener('input', e => {
  focusedInputTarget = e.target;
  console.log(`Input event: ${e.target.value}`);
  let text = e.target.value;
  if(text === '') {
    removePopup('transover-popup');
  } else {
    if(englishToKatakanaLookupTable == null) {
      console.log('Lookup table not loaded');
      return;
    }
    let wordInKatakana = englishToKatakanaLookupTable[text];
    if(wordInKatakana != undefined) {
      console.log(`${text} -> ${wordInKatakana}`);

      // Close the current popup window before displaying a new one
      removePopup('transover-popup');

      currentCandidate = wordInKatakana;

      // Event.target is not guaranteed to be an HTML element but this seems to work
      const rect = e.target.getBoundingClientRect();
      console.log(`client rect xywh: ${rect.x}, ${rect.y}, ${rect.width}, ${rect.height}`);
  
      const t = e.target;
      const expected_input_field_height = 36;
      const x = rect.x;
      const y = rect.y + expected_input_field_height;
      const xy = { clientX: x, clientY: y };
      showPopup(xy, wordInKatakana);
    }
  }
});

document.addEventListener('focusin', e => {
  console.log('awww focusin');
  focusedInputTarget = null;
  currentCandidate = null;
});

document.addEventListener('focusout', e => {
  console.log('awww focusout');
  focusedInputTarget = null;
  currentCandidate = null;
});

chrome.runtime.onMessage.addListener(
  function(request) {
    if (window != window.top) return

    if (request == 'open_type_and_translate') {
      // if ($('transover-type-and-translate-popup').length == 0) {
      //   chrome.extension.sendRequest({handler: 'get_last_tat_sl_tl'}, function(response) {
      //     const $popup = createPopup('transover-type-and-translate-popup')
      //     const languages = $.extend({}, TransOverLanguages)

      //     if (response.sl) {
      //       languages[response.sl].selected_sl = true
      //     }
      //     languages[response.tast_tl || options.target_lang].selected_tl = true

      //     $popup.attr('data-languages', JSON.stringify(languages))
      //     $popup.attr('data-disable_on_this_page', disable_on_this_page)
      //     $('body').append($popup)
      //     $popup.each(function() {
      //       $(this.shadowRoot.querySelector('main')).hide().fadeIn('fast')
      //     })
      //   })
      // }
      // else {
      //   removePopup('transover-type-and-translate-popup')
      // }
    } else if (request == 'select-candidate-in-active-tab') {
      console.log('received select-candidate-in-active-tab');
      if(focusedInputTarget != null) {
        focusedInputTarget.value = currentCandidate;
        currentCandidate = null;
        removePopup('transover-popup');
      }
    }
  }
)

$(function() {
  registerTransoverComponent('popup')
  //registerTransoverComponent('tat_popup')
  loadEnglishToKatakanaLookupTable();
})

window.addEventListener('message', function(e) {
  // We only accept messages from ourselves
  if (e.source != window)
    return

  // if (e.data.type == 'transoverTranslate') {

  // } else if (e.data.type === 'toggle_disable_on_this_page') {

  // } else if (e.data.type === 'tat_close') {

  // }
})
