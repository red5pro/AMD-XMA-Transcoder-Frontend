/*
Copyright © 2015 Infrared5, Inc. All rights reserved.

The accompanying code comprising examples for use solely in conjunction with Red5 Pro (the "Example Code") 
is  licensed  to  you  by  Infrared5  Inc.  in  consideration  of  your  agreement  to  the  following  
license terms  and  conditions.  Access,  use,  modification,  or  redistribution  of  the  accompanying  
code  constitutes your acceptance of the following license terms and conditions.

Permission is hereby granted, free of charge, to you to use the Example Code and associated documentation 
files (collectively, the "Software") without restriction, including without limitation the rights to use, 
copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit 
persons to whom the Software is furnished to do so, subject to the following conditions:

The Software shall be used solely in conjunction with Red5 Pro. Red5 Pro is licensed under a separate end 
user  license  agreement  (the  "EULA"),  which  must  be  executed  with  Infrared5,  Inc.   
An  example  of  the EULA can be found on our website at: https://account.red5pro.com/assets/LICENSE.txt.

The above copyright notice and this license shall be included in all copies or portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,  INCLUDING  BUT  
NOT  LIMITED  TO  THE  WARRANTIES  OF  MERCHANTABILITY, FITNESS  FOR  A  PARTICULAR  PURPOSE  AND  
NONINFRINGEMENT.   IN  NO  EVENT  SHALL INFRARED5, INC. BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, 
WHETHER IN  AN  ACTION  OF  CONTRACT,  TORT  OR  OTHERWISE,  ARISING  FROM,  OUT  OF  OR  IN CONNECTION 
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
((window, navigator, red5prosdk) => { // eslint-disable-line no-unused-vars

  var isTranscode = true

  // List of default HD resolutions. Used in determining browser support for Camera.
  let hd = []
  let callback
  let provisionCallback
  let mediaConstraints
  const cameraSelect = document.getElementById('camera-select')
  const resContainer = document.getElementById('res-container')
  let selectedResolutions = []

  const onTranscodeSelect = el => {
    const id = parseInt(el.currentTarget.value, 10)
    if (el.currentTarget.checked) {
      if (selectedResolutions.length === 1) {
        const reject = selectedResolutions.pop()
        document.querySelector(`input[value="${hd.findIndex(o => o === reject)}"]`).checked = false
      }
      selectedResolutions.push(hd[id])
    } else {
      const index = selectedResolutions.findIndex(o => o === hd[id])
      if (index > -1) {
        selectedResolutions.splice(index, 1)
      }
    }
    let indices = selectedResolutions.map(r => hd.indexOf(r)).sort().reverse()
    selectedResolutions = indices.map(i => hd[i])
    console.log('SELECTED', selectedResolutions)
    if (provisionCallback) {
      provisionCallback(selectedResolutions)
    }
  }

  const displayAvailableResolutions = (deviceId, list) => {
    // Clear resolution selection UI.
    while (resContainer.firstChild) {
      resContainer.removeChild(resContainer.firstChild)
    }
    selectedResolutions = []
    // UI builder for resolution option to select from.
    const generateResOption = (dim, index, enabled) => {
      var res = [dim.width, dim.height].join('x')
      var framerate = dim.frameRate
      var bitrate = dim.bandwidth
      var tr = document.createElement('tr')
      var resTD = document.createElement('td')
      var frTD = document.createElement('td')
      var bitrateTD = document.createElement('td')
      var acceptedTD = document.createElement('td')
      var transcodeTD = document.createElement('td')
      var resText = document.createTextNode(res)
      var ftText = document.createTextNode(framerate)
      var bitrateText = document.createTextNode(bitrate)
      var accText = document.createTextNode(enabled ? '✓' : '⨯')
      var transcodeSelect = document.createElement('input')
      transcodeSelect.type = 'checkbox'
      transcodeSelect.value = index
      transcodeSelect.classList.add('transcode-select')
      transcodeSelect.classList.add('disable-on-starting')

      tr.id = 'dimension-' + index
      tr.classList.add('settings-control')
      tr.appendChild(resTD)
      tr.appendChild(frTD)
      tr.appendChild(bitrateTD)
      tr.appendChild(acceptedTD)
      tr.appendChild(transcodeTD)
      tr.classList.add('table-row')
      if (!enabled) {
        tr.classList.add('table-row-disabled')
        transcodeSelect.disabled = true
      }
      resTD.appendChild(resText)
      frTD.appendChild(ftText)
      bitrateTD.appendChild(bitrateText)
      acceptedTD.appendChild(accText)
      transcodeTD.appendChild(transcodeSelect);

      [resTD, frTD, bitrateTD, acceptedTD, transcodeTD].forEach(td => {
        td.classList.add('table-entry')
      })

      if (enabled) {
        transcodeSelect.addEventListener('click', onTranscodeSelect, true)
      }
      return tr
    }
    return new Promise(function (resolve) {
      // For each HD listing, check if resolution is supported in the browser and 
      //  add to selection UI if available.
      var checkValid = function (index) {
        var dim = list[index];
        var constraints = {
          audio:false, 
          video: {
            width: { exact: dim.width },
            height: { exact: dim.height },
            //            frameRate: { exact: dim.frameRate },
            deviceId: { exact: deviceId }
          }
        }

        navigator.mediaDevices.getUserMedia(constraints)
          .then(function (media) {
            // If resolution supported, generate UI entry and add event listener for selection.
            if (dim.media) {
              dim.media.getVideoTracks().forEach(function (track) {
                track.stop()
              })
            }
            dim.media = media
            resContainer.appendChild(generateResOption(dim, index, true))
            if (index === list.length - 1) {
              resolve()
            } else {
              checkValid(++index)
            }
          })
          .catch(function (error) {
            console.log(error.name + ':: ' + JSON.stringify(dim))
            resContainer.appendChild(generateResOption(dim, index, false))
            resContainer.firstChild.firstChild.setAttribute('checked', 'checked')
            if (index === list.length - 1) {
              resolve();
            } else {
              checkValid(++index)
            }
          })
      }

      checkValid(0)
    })
  }

  const updateMediaStreamTrack = async (constraints, trackKind, callback, element) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      callback(stream, constraints)
      element.srcObject = stream
    } catch (error) {
      console.error('Could not replace track : ' + error.message)
    }
  }

  const onCameraSelect = (camera, constraints, callback, element) => {
    let newConstraints = {...constraints}
    if (newConstraints.video && typeof newConstraints.video !== 'boolean') {
      newConstraints.video.deviceId = camera
    }
    else {
      newConstraints.video = {
        deviceId: camera
      }
    }
    updateMediaStreamTrack(newConstraints, 'video', callback, element);
    if (isTranscode) {
      displayAvailableResolutions(camera, hd)
    }
  }

  const setSelectedCameraIndexFromTrack = (track, deviceList) => {
    var i = deviceList.length
    while (--i > -1) {
      var option = deviceList[i]
      if (option.label === track.label) {
        break
      }
    }
    if (i > -1) {
      cameraSelect.selectedIndex = i
      if (isTranscode) {
        displayAvailableResolutions(deviceList[i].deviceId, hd)
      }
    }
    return i
  }

  const updateCameraDeviceList = (cameras, videoTrack, constraints, callback, element) => {
    const options = cameras.map((camera, index) => {
      return '<option value="' + camera.deviceId + '">' + (camera.label || 'camera ' + index) + '</option>'
    })
    cameraSelect.innerHTML = options.join(' ')
    cameraSelect.addEventListener('change', () => {
      onCameraSelect(cameraSelect.value, constraints, callback, element)
    });
    return setSelectedCameraIndexFromTrack(videoTrack, cameras)
  }

  const beginMediaMonitor = async (mediaStream, callback, constraints, element) => {
    let tracks = mediaStream.getTracks();
    let videoTracks = tracks.filter(function (track) { return track.kind === 'video' });
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cameraDevices = devices.filter(d => d.kind === 'videoinput')
      const cameraId = updateCameraDeviceList(cameraDevices, videoTracks[0], constraints, callback, element)
      if (cameraId > -1) {
        if (typeof constraints.video === 'boolean') {
          constraints.video = {
            deviceId: undefined
          }
        }
        constraints.video.deviceId = cameraDevices[cameraId].deviceId
      }
      callback(mediaStream, constraints)
    } catch (e) {
      console.error('Could not access media devices: ' + e.message)
    }
  }

  let hasBegunMonitor = false
  window.allowMediaStreamSwap = (viewElement, constraints, mediaStream, hdList, callback) => {
    if (hasBegunMonitor) return
    hasBegunMonitor = true
    hd = hdList
    callback = callback
    mediaConstraints = constraints
    beginMediaMonitor(mediaStream, callback, mediaConstraints, viewElement)
  }
  window.registerProvisionCallback = callback => provisionCallback = callback

})(window, navigator, window.red5prosdk)

