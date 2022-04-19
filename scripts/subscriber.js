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
((window, red5prosdk) => {

  const getRandomBetween = (min, max) => Math.floor(Math.random() * (max - min) + min)
  const template = '<div class="video-holder">' +
    '<video autoplay controls playsinline class="red5pro-subscriber"></video>' +
    '<p class="resolution-field">0x0</p>' +
  '</div>';
  const getElementIdFromStreamName = name => {
    return `${name}_subscriber`
  }
  const generateSubscriberId = name => {
    const uid = Math.floor(Math.random() * 0x10000).toString(16)
    return `${name}_${uid}`
  }

  const generateSubscriberElement = (name, scale) => {
    const div = document.createElement('div')
    div.innerHTML = template
    const videoElement = div.getElementsByClassName('red5pro-subscriber')[0]
    videoElement.id = getElementIdFromStreamName(name)
    videoElement.muted = true
    videoElement.style.width = `calc(((100vw * 0.66) * 0.5) * ${scale})`
    return div
  }

  class SubscriberBlock {

    constructor (baseConfiguration, streamName, scale) {
      this.subscriberId = generateSubscriberId(streamName)
      this.config = {...baseConfiguration, ...{
        streamName: streamName,
        subscriptionId: this.subscriberId,
        mediaElementId: getElementIdFromStreamName(streamName)
      }}
      this.streamName = streamName
      this.subscriber = undefined
      this.retryTimer = 0
      this.retryDelay = (30 + getRandomBetween(10, 60)) * 100
      this.statsInterval = 0
      this.incomingWidth = 0
      this.incomingHeight = 0
      this.scale = 0
      this.subscriberEventHandler = this.onSubscriberEvent.bind(this)
    }

    onSubscriberEvent (event) {
      if (event.type === 'Subscribe.Time.Update') return
      console.log(`[Subscriber+${this.subscriberId}] :: ${event.type}`)
      if (event.type === 'Subscribe.Play.Unpublish' || event.type === 'Subscribe.Connection.Closed') {
        this.retry()
      }
    }

    async stop () {
      this.incomingWidth = 0
      this.incomingHeight = 0
      clearInterval(this.statsInterval)
      clearTimeout(this.retryTimer)
      if (this.subscriber) {
        try {
          this.subscriber.off('*', this.subscriberEventHandler)
          await this.subscriber.unsubscribe()
          this.subscriber = undefined
        } catch (e) {
          console.error(e)
        }
      }
    }

    async retry () {
      clearTimeout(this.retryTimer)

      this.stop() 
      this.retryTimer = setTimeout(() => {
        clearTimeout(this.retryTimer)
        this.start()
      }, this.retryDelay)
    }

    init (scale) {
      this.scale = scale
      return generateSubscriberElement(this.streamName, scale)
    }

    async start () {
      clearTimeout(this.retryTimer)
      try {
        this.subscriber = new red5prosdk.RTCSubscriber()
        this.subscriber.on('*', this.subscriberEventHandler)
        await this.subscriber.init(this.config)
        await this.subscriber.subscribe()
        this.setUpStatsCheck(this.subscriber.getPeerConnection())
      } catch (e) {
        console.error(e)
        this.retry()
      }
    }

    setIncomingResolution (width, height) {
      //      console.log(`[Subscriber+${this.subscriberId}] :: ${width}x${height}`)
      const element = document.querySelector(`#${getElementIdFromStreamName(this.streamName)}`)
      const resolutionField = element.parentNode.querySelector('.resolution-field')
      const vidWidth = width || element.videoWidth
      const vidHeight = height || element.videoHeight
      if (element && this.incomingWidth !== vidWidth) {
        element.style['max-width'] = `${vidWidth}px`
      }
      if (element && this.incomingHeight !== vidHeight) {
        element.style['max-height'] = `${vidHeight}px`
      }
      this.incomingWidth = vidWidth || 0
      this.incomingHeight = vidHeight || 0
      resolutionField.innerText = `${this.scale === 1 ? 'Original' : 'Transcoded Resolution'}:  ${this.incomingWidth}x${this.incomingHeight}`
    }

    setUpStatsCheck (connection) {
      clearInterval(this.statsInterval)
      this.statsInterval = setInterval(() => {
        connection.getStats(null)
          .then(response => {
            response.forEach(report => {
              if ((report.type === 'track' || report.type === 'inbound-rtp') &&
                (report.kind === 'video' || (report.frameWidth || report.frameHeight))) {
                this.setIncomingResolution(report.frameWidth, report.frameHeight)
              }
            })
          })
          .catch (e => console.error(e))
      }, 1000)
    }

  }

  window.SubscriberBlock = SubscriberBlock

})(window, window.red5prosdk)
