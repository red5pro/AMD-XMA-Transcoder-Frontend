((window) => {

  const generateVariantOption = (dim, index) => {
    var res = [dim.width, dim.height].join('x')
    var framerate = dim.frameRate
    var bitrate = dim.bandwidth
    var tr = document.createElement('tr')
    var resTD = document.createElement('td')
    var frTD = document.createElement('td')
    var bitrateTD = document.createElement('td')
    var variantTD = document.createElement('td')
    var resText = document.createTextNode(res)
    var frText = document.createTextNode(framerate)
    var bitrateText = document.createTextNode(bitrate)
    var variantSelect = document.createElement('input')
    variantSelect.type = 'checkbox'
    variantSelect.value = index
    variantSelect.classList.add('variant-select')

    resTD.classList.add('resolution-text')
    frTD.classList.add('framerate-text')
    bitrateTD.classList.add('bitrate-text')
    tr.id = 'variant-' + index
    tr.classList.add('settings-control')
    tr.appendChild(resTD)
    tr.appendChild(frTD)
    tr.appendChild(bitrateTD)
    tr.appendChild(variantTD)
    tr.classList.add('table-row')
    resTD.appendChild(resText)
    frTD.appendChild(frText)
    bitrateTD.appendChild(bitrateText)
    variantTD.appendChild(variantSelect);

    [resTD, frTD, bitrateTD, variantTD].forEach(td => {
      td.classList.add('table-entry')
    })
    return tr
  }

  const generateInputVariantOption = index => {
    var tr = document.createElement('tr')
    var resTD = document.createElement('td')
    var frTD = document.createElement('td')
    var bitrateTD = document.createElement('td')
    var variantTD = document.createElement('td')
    var resText = document.createElement('input')
    var frText = document.createElement('input')
    var bitrateText = document.createElement('input')
    var variantSelect = document.createElement('input')
    variantSelect.type = 'checkbox'
    variantSelect.value = index
    variantSelect.checked = true
    variantSelect.classList.add('variant-select')

    resText.classList.add('resolution-input')
    frText.classList.add('framerate-input')
    bitrateText.classList.add('bitrate-input')
    tr.id = 'input-variant-' + index
    tr.classList.add('settings-control')
    tr.appendChild(resTD)
    tr.appendChild(frTD)
    tr.appendChild(bitrateTD)
    tr.appendChild(variantTD)
    tr.classList.add('table-row')
    resTD.appendChild(resText)
    frTD.appendChild(frText)
    bitrateTD.appendChild(bitrateText)
    variantTD.appendChild(variantSelect);

    [resTD, frTD, bitrateTD, variantTD].forEach(td => {
      td.classList.add('table-entry')
    })
    return tr
  }

  const getValue = (el, inputClass, textClass) => {
     return el.querySelector(`.${inputClass}`) ? el.querySelector(`.${inputClass}`).value : el.querySelector(`.${textClass}`).innerText
  }

  const findSelectedVariants = table => {
    const entries = table.querySelectorAll('.table-row')
    const selected = Array.from(entries).filter(el => {
      const last = el.lastChild
      const checkbox = last.querySelector('input[type="checkbox"]')
      return checkbox.checked
    })
    const variants = selected.map(el => {
      const resolution = getValue(el, 'resolution-input', 'resolution-text')
      const fr = getValue(el, 'framerate-input', 'framerate-text')
      const br = getValue(el, 'bitrate-input', 'bitrate-text')
      const widthHeight = resolution.split('x')
      if (widthHeight.length != 2) return undefined

      const width = parseInt(widthHeight[0], 10)
      const height = parseInt(widthHeight[1], 10)
      const frameRate = parseInt(fr, 10)
      const bitrate = parseInt(br, 10)
      if (isNaN(width) || isNaN(height) || isNaN(frameRate) || isNaN(bitrate)) return undefined

      return {
        width,
        height,
        frameRate,
        bitrate
      }
    }).filter(v => typeof v !== 'undefined')
    variants.sort((a, b) => ((a.width * a.height) > (b.width * b.height)) ? -1 : 1)
    return variants
  }

  const showVariantsSelectDialog = (selectedProvisions, hdList, postCallback) => {
    const dialog = document.querySelector('#variant-dialog')
    dialog.classList.remove('hidden')
    const table = dialog.querySelector('#variant-container')
    const addButton = dialog.querySelector('#add-variant-button')
    const cancelButton = dialog.querySelector('#cancel-button')
    const postButton = dialog.querySelector('#post-button')
    while (table.firstChild) {
      table.removeChild(table.firstChild)
    }
    const last = selectedProvisions[selectedProvisions.length -1]
    const index = hdList.findIndex(v => (v.width === last.width) && (v.height === last.height))
    const options = hdList.slice(index+1)
    const optionsElements = options.map(generateVariantOption)
    optionsElements.forEach(el => table.appendChild(el))

    const addNewOption = () => {
      const option = generateInputVariantOption(table.children.length)
      table.appendChild(option)
    }

    const post = () => {
      const selections = findSelectedVariants(table)
      postCallback(selectedProvisions.concat(selections))
    }

    const cancel = () => {
      addButton.removeEventListener('click', addNewOption)
      postButton.removeEventListener('click', post)
      cancelButton.removeEventListener('click', cancel)
      while (table.firstChild) {
        table.removeChild(table.firstChild)
      }
      dialog.classList.add('hidden')
    }

    addButton.addEventListener('click', addNewOption)
    postButton.addEventListener('click', post)
    cancelButton.addEventListener('click', cancel)
  }

  window.showVariantsSelectDialog = showVariantsSelectDialog

})(window)
