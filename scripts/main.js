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

  red5prosdk.setLogLevel(red5prosdk.LOG_LEVELS.TRACE)

  let mediaStream
  let mediaStreamConstraints

  let host = window.location.hostname
  let streamName = 'stream'
  let ipReg = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/
  let localhostReg = /^localhost.*/
  const isIPOrLocalhost = ipReg.exec(host) || localhostReg.exec(host)

  const hostField = document.getElementById('host-field')
  const streamNameField = document.getElementById('streamname-field')
  const postProvisionButton = document.getElementById('post-button')

  const STATE_SETUP = 'setup'
  const STATE_SESSION = 'session'

  const setState = state => {
    switch (state) {
      case STATE_SETUP:
        Array.prototype.slice.call(document.querySelectorAll('.remove-on-setup')).forEach(el => el.classList.add('hidden'))
        postProvisionButton.addEventListener('click', handlePostProvision, true) 
        break;
      case STATE_SESSION:
        Array.prototype.slice.call(document.querySelectorAll('.remove-on-session')).forEach(el => el.classList.add('hidden'))
        postProvisionButton.removeEventListener('click', handlePostProvision, true) 
        break;
    }
  }

  const showErrorAlert = (message) => {
    const al = document.querySelector('.alert')
    const msg = al.querySelector('.alert-message')
    const submit = al.querySelector('#alert-submit')
    msg.innerText = message
    al.classList.remove('hidden')
    submit.addEventListener('click', () => {
      al.classList.add('hidden')
    })
    window.scrollTo(0, 0)
  }

  let transcoderPOST = {
    meta: {
      authentication: {
        username: '',
        password: '',
        token: undefined
      },
      stream: [],
      georules: {
        regions: ['US', 'UK'],
        restricted: false
      },
      qos: 3
    }
  }
  let selectedProvisions = []
  const handleProvisionChange = list => {
    selectedProvisions = list
  }

  const handlePostProvision = async () => {
    if (selectedProvisions.length < 4) {
      showErrorAlert('Please select 4 Variants for provisioning the transcoder.')
      return
    }
    const host = hostField.value
    const name = streamNameField.value
    let framerate = 15
    const streams = selectedProvisions.map((res, index) => {
      if (index === 0) framerate = res.frameRate
      return {
        level: index+1,
        name: `${name}_${index+1}`,
        properties: {
          videoBR: res.bandwidth * 1000,
          videoWidth: res.width,
          videoHeight: res.height
        }
      }
    }).reverse()
    const highestLevel = streams.find(e => e.level === 1)
    transcoderPOST.meta.stream = streams
    try {
      console.log('POST', transcoderPOST)
      const payload = await window.provisionUtil.postTranscode(host, `live/`, `${name}`, transcoderPOST, smToken)
      console.log('PAYLOAD', payload)
      startBroadcastWithLevel(highestLevel, name, framerate)
    } catch (e) {
      console.error(e)
      if (/Provision already exists/.exec(e.message)) {
        startBroadcastWithLevel(highestLevel, name, framerate)
      } else {
        showErrorAlert(e.message)
      }
    }
  }

  const startBroadcastWithLevel = async (level, room, name, framerate) => {
    setState(STATE_SESSION)
    const element = document.querySelector('#red5pro-publisher')
    const {
      properties: {
        videoWidth,
        videoHeight,
        videoBR
      }
    } = level
    const deviceId = mediaStreamConstraints.video.deviceId.exact

    const constraints = {
      audio: true,
      video: {
        deviceId: { exact: deviceId },
        width: { exact: videoWidth },
        height: { exact: videoHeight },
        frameRate: { exact: framerate }
      }
    }

    let stream
    const bitrate = videoBR / 1000
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints)
    } catch (e) {
      showErrorAlert(e.message.length === 0 ? e.name : e.message)
      setState(STATE_TRANSCODE)
      return
    }
    mediaStream = stream
    element.srcObject = mediaStream
    doPublish(mediaStream, name, bitrate)
  }

  const doPublish = (mediaStream, name, bitrate) => {
    console.log('doPublish')
  }

  const startPreview = async () => {
    const element = document.querySelector('#red5pro-publisher')
    const constraints = {
      audio: true,
      video: {
        width: {
          exact: 640
        },
        height: {
          exact: 360
        },
        frameRate: {
          exact: 15
        }
      }
    }
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      mediaStreamConstraints = constraints
      element.srcObject = mediaStream
      window.allowMediaStreamSwap(element, constraints, mediaStream, (activeStream, activeConstraints) => {
        mediaStream = activeStream
        mediaStreamConstraints = activeConstraints
        console.log(mediaStream, mediaStreamConstraints)
      })
    } catch (e) {
      console.error(e)
    }
  }

  window.registerProvisionCallback(handleProvisionChange)
  setState(STATE_SETUP)
  startPreview()

  hostField.value = host
  streamNameField.value = streamName

})(window, navigator, window.red5prosdk)
