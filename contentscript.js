let englishToKatakanaLookupTable = null
let focusedInputTarget = null;
let currentCandidate = null;
let parseTextAsRomanizedJapanese = true;
let isActive = false; // Copy of isActive in the background script

const romajiToKanaTable = [
  {
    "a": "あ",
    "i": "い",
    "u": "う",
    "e": "え",
    "o": "お",
  },
  {
    "ka": "か",
    "ki": "き",
    "ku": "く",
    "ke": "け",
    "ko": "こ",
    "ga": "が",
    "gi": "ぎ",
    "gu": "ぐ",
    "ge": "げ",
    "go": "ご",
    "sa": "さ",
    "su": "す",
    "se": "せ",
    "so": "そ",
    "za": "ざ",
    "ji": "じ",
    "zu": "ず",
    "ze": "ぜ",
    "zo": "ぞ",
    "ta": "た",
    "te": "て",
    "to": "と",
    "da": "だ",
    "di": "ぢ",
    "du": "づ",
    "de": "で",
    "do": "ど",
    "ti": "てぃ",
    "na": "な",
    "ni": "に",
    "nu": "ぬ",
    "ne": "ね",
    "no": "の",
    "ha": "は",
    "hi": "ひ",
    "fu": "ふ",
    "he": "へ",
    "ho": "ほ",
    "ba": "ば",
    "bi": "び",
    "bu": "ぶ",
    "be": "べ",
    "bo": "ぼ",
    "ma": "ま",
    "mi": "み",
    "mu": "む",
    "me": "め",
    "mo": "も",
    "ya": "や",
    "yu": "ゆ",
    "yo": "よ",
    "ra": "ら",
    "ri": "り",
    "ru": "る",
    "re": "れ",
    "ro": "ろ",
    "wa": "わ",
    "wo": "を",
    "wi": "うぃ",
    "we": "うぇ",
    "nn": "ん",
  },
  {
    "kya": "きゃ",
    "kyu": "きゅ",
    "kyo": "きょ",
    "shi": "し",
    "sha": "しゃ",
    "shu": "しゅ",
    "sho": "しょ",
    "she": "しぇ",
    "chi": "ち",
    "tsu": "つ",
    "thi": "てぃ",
    "cha": "ちゃ",
    "chu": "ちゅ",
    "cho": "ちょ",
    "che": "ちぇ",
    "nya": "にゃ",
    "nyu": "にゅ",
    "nyo": "にょ",
    "hya": "ひゃ",
    "hyu": "ひゅ",
    "hyo": "ひょ",
    "mya": "みゃ",
    "myu": "みゅ",
    "myo": "みょ",
    "rya": "りゃ",
    "ryu": "りゅ",
    "ryo": "りょ"
  }
];

function debug(message) {
  //console.log(message);
}

let options

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
  // 'transover-type-and-translate-popup': 'transover-tat-popup-template'
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
  //removePopup('transover-type-and-translate-popup')

  // Append the text box DOM to the root of the page DOM
  const $popup = createPopup('transover-popup')

  // Also append text box DOM to the body element
  $('body').append($popup)

  $popup.on('transover-popup_content_updated', function() {
    const pos = calculatePosition(e.clientX, e.clientY, $popup)
    // Note that template DOM appended to the body element has
    // only one child element 'main'.
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
    removePopup('transover-popup')
  }
}).keyup(function(e) {
  debug('keyup')
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

function changeToKana(text) {
  if(englishToKatakanaLookupTable == null) {
    debug('Lookup table not loaded');
    return null;
  }
  let wordInKatakana = englishToKatakanaLookupTable[text];
  if(wordInKatakana != undefined) {
    return wordInKatakana;
  } else if(shouldParseAsJapanese(text)
   && parseTextAsRomanizedJapanese) {
    const parsingResult = parseRomanizedJapaneseText(text);
    // We may have got some kana sequence as a result of parsing the word
    // as Romanized Japanese; we can show this as a suggestion
    return parsingResult;
  } else {
    return null;
  }
}

function getLastWord(text) {
  const words = text.match(/[A-Za-z]+$/);
  if(words) {
    return words[words.length - 1];
  } else {
    return '';
  }
}

document.addEventListener('input', e => {
  focusedInputTarget = e.target;
  debug(`Input event: ${e.target.value}`);

  if(!isActive) {
    // The extension is not active right now. Do nothing and return
    return;
  }

  let text = e.target.value;
  const lastWord = getLastWord(text);
  debug(`Last word: ${lastWord}`);
  if(lastWord === '') {
    removePopup('transover-popup');
  } else {
    textInKatakana = changeToKana(lastWord);
    if(textInKatakana != null) {
      debug(`${lastWord} -> ${textInKatakana}`);

      // Close the current popup window before displaying a new one
      removePopup('transover-popup');

      currentCandidate = textInKatakana;

      // Event.target is not guaranteed to be an HTML element but this seems to work
      const rect = e.target.getBoundingClientRect();
      debug(`client rect xywh: ${rect.x}, ${rect.y}, ${rect.width}, ${rect.height}`);
      debug(`selection start, end: ${e.selectionStart}, ${e.selectionEnd}`);
  
      const t = e.target;
      const expected_input_field_height = 36;
      const x = rect.x;
      const y = rect.y + expected_input_field_height;
      const xy = { clientX: x, clientY: y };
      showPopup(xy, textInKatakana);
    } else {
      debug(`No katakana word found for ${lastWord}`);
      removePopup('transover-popup');
      currentCandidate = null;
    }
  }
});

document.addEventListener('focusin', e => {
  debug('awww focusin');
  focusedInputTarget = null;
  currentCandidate = null;
});

document.addEventListener('focusout', e => {
  debug('awww focusout');
  focusedInputTarget = null;
  currentCandidate = null;
});

chrome.runtime.onMessage.addListener(
  function(message) {
    debug(message)
    if (window != window.top) return
    if(!message.command) {
      return
    }
    if (message.command == 'open_type_and_translate') {
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
    } else if (message.command == 'select-candidate-in-active-tab') {
      debug('received select-candidate-in-active-tab');
      if(focusedInputTarget != null && currentCandidate != null) {
        const currentText = focusedInputTarget.value;
        const lastWord = getLastWord(currentText);
        const textBeforeLastWord =
        focusedInputTarget.value.substring(
          0,
          currentText.length - lastWord.length);
        focusedInputTarget.value = textBeforeLastWord + currentCandidate;
        currentCandidate = null;
        removePopup('transover-popup');
      }
    } else if (message.command == 'update-extension-state') {
      console.log(`New active state: ${message.isActive}`);
      if(message.isActive == undefined) {
        console.log('The message does not have isActive key; sanity check failed');
      } else {
        isActive = message.isActive;
        if(!message.isActive) {
          removePopup('transover-popup');
        }
      }
    }
  }
)

function includeNonRomanizedJapaneseSequence(word) {
  return word.includes('the')
  || word.includes('q')
  || word.match(/c[aeiou]/)
  || word.match(/[bcdfgjklmnpqrstvwxyz]$/)
}

// Note
// This old-fashioned way of checking for uppercase seems to work
// if('A' <= text[0] && text[0] <= 'Z') {...}
// But regex is more readable and is preferred.
function shouldParseAsJapanese(text) {
  if(text === null || text === '') {
    return false;
  }

  if(text[0].match(/[A-Z]/)) {
    // Begins with an uppercase alphabet
    console.log('uppercase');
    return false;
  } else if(includeNonRomanizedJapaneseSequence(text)) {
    console.log('nrj sequence');
    return false;
  }
  else {
    let match = /[bcdfgjklmnpqrstvwxzh][bcdfgjklmnpqrstvwxz]/i.exec(text);
    if(match) {
      const index = match.index;
      if(text[index] != text[index+1]
       && text.substring(index,index+2) != 'ts'
       && text.substring(index,index+2) != 'sh'
       && text.substring(index,index+2) != 'ch') {
        // 2 consecutive consonant letters (except h or y) that are not the same
        console.log('consonant cluster');
        return false;
      } else {
        return true;
      }
    } else {
      return true;
    }
  }
}

function parseRomanizedJapaneseText(text) {
  let kanaText = '';
  let pos = 0;
  while(pos < text.length) {

    if( pos < text.length - 1
    && text[pos].match(/[bcdfghjklmprstvwxyz]/)
    && (text[pos] === text[pos+1])) {
      kanaText += 'っ';
      pos += 1;
      continue;
    }

    let i = 1;
    let converted = false;
    for(table of romajiToKanaTable) {
      const chars = text.substring(pos, pos+i);
      let kana = table[chars];
      if(kana) {
        kanaText += kana;
        pos += i;
        converted = true;
        break;
      }
      i += 1;
    }
    if(!converted) {
      kanaText += text.substring(pos);
      break;
    }
  }
  return kanaText;
}

$(function() {
  registerTransoverComponent('popup')
  //registerTransoverComponent('tat_popup')
  loadEnglishToKatakanaLookupTable();

  chrome.runtime.sendMessage({type: "get-extension-state"}, (response) => {
    console.log(`setting the isActive value: ${response.isActive}`);
    isActive = response.isActive;
  });
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
