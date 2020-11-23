class Popup extends HTMLElement {
  static get observedAttributes() {
    return ['content', 'top', 'left', 'width', 'height', 'options']
  }

  // Attach the popup as a shadow DOM tree
  // - this.attachShadow() creates a shadow root
  constructor() {
    super()
    // Get the template element
    const t = document.querySelector('#transover-popup-template').content.cloneNode(true)
    this.attachShadow({mode: 'open'}).appendChild(t)
  }

  // Ref: https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements
  attributeChangedCallback(attribute, oldVal, newVal) {
    const main = this.shadowRoot.querySelector('main')

    if (attribute == 'content') {
      main.innerHTML = newVal

      setTimeout(function() {
        const main = this.shadowRoot.querySelector('main')
        const style = window.getComputedStyle(main)

        this.setAttribute('content-width', parseFloat(style.width))
        this.setAttribute('content-height', parseFloat(style.height))

        this.setAttribute('outer-width', main.offsetWidth)
        this.setAttribute('outer-height', main.offsetHeight)

        const e = new CustomEvent('transover-popup_content_updated')
        this.dispatchEvent(e)
      }.bind(this), 0)

    } else if (attribute == 'options') {
      const {fontSize} = JSON.parse(newVal)
      main.style['font-size'] = fontSize + 'px'
    } else if (attribute == 'top') {
      main.style.top = newVal + 'px'
    } else if (attribute == 'left') {
      main.style.left = newVal + 'px'
    } else if (attribute == 'width') {
      main.style.width = newVal + 'px'
    } else if (attribute == 'height') {
      main.style.height = newVal + 'px'
    }
  }
}

window.customElements.define('transover-popup', Popup)
