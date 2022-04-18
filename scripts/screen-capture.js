((window, html2canvas) => {

  const capture = () => {
    html2canvas(document.body).then(canvas => {
      let a = document.createElement("a")
      a.download = `screenshot-${new Date().getTime()}.png`
      a.target = '_blank'
      a.href = canvas.toDataURL('image/png')
      a.click()
    }).catch(e => console.error(e))
  }

  window.screencapture = capture

})(window, window.html2canvas)
