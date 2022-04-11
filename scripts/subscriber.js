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
  '</div>';
  const getElementIdFromStreamName = name => {
    return `${name}_subscriber`
  }
  const generateSubscriberId = name => {
    const uid = Math.floor(Math.random() * 0x10000).toString(16)
    return `${name}_${uid}`
  }

  const generateSubscriberElement = name => {
    const div = document.createElement('div')
    div.innerHTML = template
    const videoElement = div.getElementsByClassName('red5pro-subscriber')[0]
    videoElement.id = getElementIdFromStreamName(name)
    videoElement.muted = true
    return div
  }

  class SubscriberBlock {

    constructor (baseConfiguration, streamName) {
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
    }

    onSubscriberEvent (event) {
      if (event.type === 'Subscribe.Time.Update') return
      console.log(`[Subscriber+${this.subscriberId}] :: ${event.type}`)
    }

    retry () {
      clearTimeout(this.retryTimer)
      this.retryTimer = setTimeout(() => {
        clearTimeout(this.retryTimer)
        this.start()
      }, this.retryDelay)
    }

    init () {
      return generateSubscriberElement(this.streamName)
    }

    async start () {
      clearTimeout(this.retryTimer)
      try {
        console.log(`[START] : ${this.config.streamName}`)
        this.subscriber = new red5prosdk.RTCSubscriber()
        this.subscriber.on('*', event => this.onSubscriberEvent(event))
        await this.subscriber.init(this.config)
        await this.subscriber.subscribe()
        console.log(`[END] : ${this.config.streamName}`)
      } catch (e) {
        console.error(e)
        this.retry()
      }
    }

  }

  window.SubscriberBlock = SubscriberBlock

})(window, window.red5prosdk)
