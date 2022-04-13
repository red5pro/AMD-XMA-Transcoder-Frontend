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
((window, navigator, red5prosdk, SubscriberBlock) => { // eslint-disable-line no-unused-vars

  red5prosdk.setLogLevel(red5prosdk.LOG_LEVELS.TRACE)

  let mediaStream
  let mediaStreamConstraints
  let subscriberStreamNames = []

  let provisionCount = 4
  let host = window.location.hostname
  let streamName = 'stream'
  let appContext = 'live'
  let ipReg = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/
  let localhostReg = /^localhost.*/
  const isIPOrLocalhost = host => ipReg.exec(host) || localhostReg.exec(host)

  const hostField = document.getElementById('host-field')
  const streamNameField = document.getElementById('streamname-field')
  const publisherStatusField = document.getElementById('publisher-status-field')
  const postProvisionButton = document.getElementById('post-button')
  const mainPublishContainer = document.getElementById('main_publisher-container')
  const sessionPublishContainer = document.getElementById('session_publisher-container')
  const sessionSubscribeContainer = document.getElementById('session_subscribe-container')
  const contentSelect = document.getElementById('content-select')
  const prioritySelect = document.getElementById('priority-select')
  const networkSelect = document.getElementById('network-select')

  const STATE_SETUP = 'setup'
  const STATE_STARTING = 'starting'
  const STATE_SESSION = 'session'

  const setState = state => {
    switch (state) {
      case STATE_SETUP:
        Array.prototype.slice.call(document.querySelectorAll('.remove-on-setup')).forEach(el => el.classList.add('hidden'))
        Array.prototype.slice.call(document.querySelectorAll('.remove-on-session')).forEach(el => el.classList.remove('hidden'))
        Array.prototype.slice.call(document.querySelectorAll('.disable-on-starting')).forEach(el => el.disabled = false)
        postProvisionButton.addEventListener('click', handlePostProvision, true) 
        break;
      case STATE_STARTING:
        Array.prototype.slice.call(document.querySelectorAll('.disable-on-starting')).forEach(el => el.disabled = true)
        Array.prototype.slice.call(document.querySelectorAll('.remove-on-starting')).forEach(el => el.classList.remove('hidden'))
        postProvisionButton.removeEventListener('click', handlePostProvision, true)
        break;
      case STATE_SESSION:
        Array.prototype.slice.call(document.querySelectorAll('.remove-on-session')).forEach(el => el.classList.add('hidden'))
        Array.prototype.slice.call(document.querySelectorAll('.remove-on-setup')).forEach(el => el.classList.remove('hidden'))
        postProvisionButton.removeEventListener('click', handlePostProvision, true)
        const pubView = document.querySelector('#red5pro-publisher')
        pubView.parentNode.removeChild(pubView)
        sessionPublishContainer.appendChild(pubView)
        pubView.classList.add('red5pro-publisher')
        break;
    }
  }

  const showErrorAlert = message => {
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

  const onPublisherEvent = async(event) => {
    console.log('[Red5ProPublisher] ' + event.type + '.')
    publisherStatusField.classList.remove('hidden')
    publisherStatusField.innerText = event.type
    if (event.type === 'WebRTC.Offer.Start') {
      try {
        const sender = event.publisher.getPeerConnection().getSenders().find(s => s.track.kind === 'video')
        let params = await sender.getParameters()
        params.degradationPreference = 'maintain-resolution'
        params.encodings = [
          {...params.encodings[0], ...{
            priority: prioritySelect.value,
            networkPriority: networkSelect.value
          }}
        ]
        await sender.setParameters(params)
      } catch (e) {
        console.error(e)
      }
    }
    if (event.type === 'Publish.Available') {
      setState(STATE_SESSION)
    }
  }

  // Stream Manager API POST
  /*
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
  */

  const provisionVariant = {
    guid: 'live/stream1',
    context: 'live',
    name: 'stream1_1',
    level: 1,
    isRestricted: false,
    restrictions: [],
    parameters: {
      videoWidth: 1920,
      videoHeight: 1080,
      videoFPS: 30, 
      hardware: 'xili',
      videoBR: 2000000
    },
    primaries: [],
    secondaries: []
  }

  const reassignMedia = constraint => {
    console.log('CONSTRAINT', constraint)
    const {
      video: {
        deviceId
      }
    } = mediaStreamConstraints 
    const id = deviceId.hasOwnProperty('exact') ? deviceId.exact : deviceId
    const constraints = {
      audio: true,
      video: {
        deviceId: { exact: id },
        width: { exact: constraint.width },
        height: { exact: constraint.height },
//        frameRate: { exact: framerate }
      }
    }
    const element = document.querySelector('#red5pro-publisher')
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => {
        track.stop()
      })
    }

    let t = setTimeout(() => {
      navigator.mediaDevices.getUserMedia(constraints)
        .then(media => {
          mediaStream = media
          element.srcObject = mediaStream
          window.r5pro_stream = mediaStream
        })
    }, 200)
  }

  let selectedProvisions = []
  const handleProvisionChange = list => {
    selectedProvisions = list
    // We limit to the one selection, highest out.
    reassignMedia(selectedProvisions[0])
  }

  const bitrateFromResolution = (width, height) => {
    if (height >= 1080) return 3000
    if (height >= 720) return 1500
    if (height >= 540) return 750
    if (height >= 360) return 512
    return 256
  }

  const fpsFromResolution = (width, height) => {
    if (height >= 720) return 30
    return 15
  }

  const padVariants = (streamName, list, highestVariant, length) => {
    const { properties: { videoWidth, videoHeight, videoFPS } } = highestVariant
    while (list.length < length) {
      const nextIndex = list.length + 1
      const multiplier = (length-(nextIndex-1)) * ((100 / length) / 100)
      const width = Math.floor(videoWidth * multiplier)
      const height = Math.floor(videoHeight * multiplier)
      list.push({...highestVariant, ...{
        level: nextIndex,
        name: `${streamName}_${nextIndex}`,
        properties: {
          videoBR: bitrateFromResolution(width, height) * 1000,
          videoWidth: width,
          videoHeight: height,
          videoFPS: fpsFromResolution(width, height)
        }
      }})
    }
    return list
  }

  const getApiBaseUrl = () => {
    const hostValue = hostField.value
    const protocol = isIPOrLocalhost(hostValue) ? 'http' : 'https'
    const port = isIPOrLocalhost(hostValue) ? 5080 : 443
    return `${protocol}://${hostValue}:${port}`
  }

  const removeStoredProvisionAndRepost = async (guid, context, name) => {
    try {
      const baseUrl = getApiBaseUrl()
      await window.provisionUtil.deleteTranscode(baseUrl, { guid, context, name })
      handlePostProvision()
    } catch (e) {
      console.error(e)
    }
  }

  const handlePostProvision = async () => {
    if (selectedProvisions.length < 1) {
      showErrorAlert('Please select the High-Level Variant for provisioning the transcoder.')
      return
    }
    setState(STATE_STARTING)
    const host = hostField.value
    const name = streamNameField.value
    const guid = `${appContext}/${name}`
    let framerate = 15
    // Only top level in list.
    let streams = selectedProvisions.map((res, index) => {
      return {
        level: index+1,
        name: `${name}_${index+1}`,
        properties: {
          videoBR: res.bandwidth * 1000,
          videoWidth: res.width,
          videoHeight: res.height,
          videoFPS: res.frameRate
        }
      }
    })
    const highestLevel = streams.find(e => e.level === 1)
    const highestLevelIndex = streams.findIndex(e => e.level === 1)
    framerate = selectedProvisions[highestLevelIndex].frameRate
    streams = padVariants(name, streams, highestLevel, provisionCount)
    streams = streams.map(entry => {
      const { parameters } = provisionVariant
      const { properties } = entry
      return {...provisionVariant, ...{
        guid,
        context: appContext,
        name: entry.name,
        level: entry.level,
        parameters: {...parameters, ...properties }
      }}
    })
    const transcoderPOST = {provisions: streams}
    subscriberStreamNames = streams.map(v => v.name)
    window.scrollTo(0, 0)    
    try {
      const baseUrl = getApiBaseUrl()
      console.log('POST', baseUrl, transcoderPOST)
      const payload = await window.provisionUtil.postTranscode(baseUrl, transcoderPOST)
      await startBroadcastWithLevel(highestLevel, name, framerate)
      startSubscribers(subscriberStreamNames)
    } catch (e) {
      console.error(e)
      if (/Provision already exists/.exec(e.message)) {
        removeStoredProvisionAndRepost(guid, appContext, name)
        return
      } else {
        showErrorAlert(e.message)
      }
      setState(STATE_SETUP)
    }
  }

  const startBroadcastWithLevel = async (level, name, framerate) => {
    const element = document.querySelector('#red5pro-publisher')
    const {
      properties: {
        videoWidth,
        videoHeight,
        videoBR
      }
    } = level
    const bitrate = videoBR / 1000
    try {
      await doPublish(mediaStream || element.srcObject, name, bitrate)
      return true
    } catch (e) {
      console.error(e)
      showErrorAlert(e.message.length === 0 ? e.name : e.message)
      setState(STATE_SETUP)
      return
    }
  }

  const doPublish = async (stream, name, bitrate = 256) => {
    const hostValue = hostField.value
    const streamNameToUse =  `${name}_1`
    let config = {
      protocol: isIPOrLocalhost(hostValue) ? 'ws' : 'wss',
      port: isIPOrLocalhost(hostValue) ? 5080 : 443,
      host: hostValue,
      bandwidth: {
        video: bitrate
      },
      app: appContext,
      streamName: streamNameToUse
    }

    try {
      const track = stream.getVideoTracks()[0]
      track.contentHint = contentSelect.value || ''
      let publisher = new red5prosdk.RTCPublisher()
      await publisher.initWithStream(config, stream)
      publisher.on('*', onPublisherEvent)
      await publisher.publish(streamNameToUse)
      window.connection = publisher.getPeerConnection()
      console.log('SETTINGS TRACK', track)
      console.log('SETTINGS PARAMS',publisher.getPeerConnection().getSenders().find(s => s.track.kind === 'video').getParameters())
      // Moved to Publish.Available event.
      //      setState(STATE_SESSION)
      return publisher
    } catch (e) {
      console.error(e)
      showErrorAlert(e.message)
    }
  }

  const startPreview = async () => {
    const element = document.querySelector('#red5pro-publisher')
    const constraints = {
      audio: true,
      video: true
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

  const startSubscribers = streamNames => {
    const hostValue = hostField.value
    const baseConfig = {
      protocol: isIPOrLocalhost(hostValue) ? 'ws' : 'wss',
      port: isIPOrLocalhost(hostValue) ? 5080 : 443,
      host: hostValue,
      app: 'live'
    }
    console.log('start subscribers', streamNames)
    const length = provisionCount * 3
    streamNames.forEach((name, index) => {
      try {
        const scale = (length-(index)) * ((100 / length) / 100)
        const sub = new SubscriberBlock(baseConfig, name)
        sessionSubscribeContainer.appendChild(sub.init(scale))
        sub.start()
      } catch (e) {
        console.error(e)
      }
    })
  }

  window.registerProvisionCallback(handleProvisionChange)
  setState(STATE_SETUP)
  startPreview()

  hostField.value = host
  streamNameField.value = streamName

})(window, navigator, window.red5prosdk, window.SubscriberBlock)
