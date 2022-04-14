window.provisionUtil = {
  postTranscode: async (baseUrl, provision) => {
    const url = `${baseUrl}/cluster/api?action=provision.create`
    const post = JSON.stringify(provision)
    try {
      const result = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: post 
      })
      const json = await result.json()
      if (json && json.errorMessage) {
        throw new Error(json.errorMessage)
      }
      return json
    } catch (e) {
      // Testing purposes...
      return true
      //      throw e
    }
  },
  deleteTranscode: async (baseUrl, provision) => {
    const url = `${baseUrl}/cluster/api?action=provision.delete`
    const post = JSON.stringify(provision)
    try {
      const result = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: post 
      })
      const json = await result.json()
      if (json && json.errorMessage) {
        throw new Error(json.errorMessage)
      }
      return json
    } catch (e) {
      // Testing purposes...
      return true
      //      throw e
    }
  }
}
