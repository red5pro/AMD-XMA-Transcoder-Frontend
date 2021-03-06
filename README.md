# Standalone Transcoder Demo Frontend

This front-end demonstrates the selection and submission of a transcoder provision to a standalone server, which then plays back each transcoded stream on a single page. **NOT FOR PRODUCTION**

To run locally:

```sh
open http://localhost:8080 && python -m SimpleHTTPServer 8080
```

That will open the `index.html` page in your system's default browser server on `localhost` at port `8080`.

> It is assumed that if you are running on localhost and you keep the `Host` input setting as `localhost`, additionally you have a Red5 Pro server running on `localhost` at default port `5080`.

**OR**

Alternatively, you can clone this repo and copy it into the `webapps` directory of the server being tested (and restart the server for the webapp to be recognized).

For more information on Red5 Pro and AMD hardware, drop us a line at info@red5pro.com.
