const express = require('express')
const bodyParser = require('body-parser')
const imageProcessor = require('./imageProcessor.js');
const { genPDF } = require('./genPdf.js');
const path = require("path");
const { generateImage } = require('./genImg.js');

const app = express()

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(express.static('public'));
app.use(express.static('outputImage'));

app.get('/', function (req, res) {
  res.send('nodejs ecertificate generator')
})

app.get('/generateCertificate', function (req, res) {
  let { user_name, date, course, tmpl_id, response } = req.query;
  let props = { user_name, date, course };

  imageProcessor.generateImage(props, tmpl_id, function (imageUrl) {

    if (response === "view")
      res.send("<img src='" + imageUrl.replace("./outputImage", "") + "' />");
    else
      res.sendFile(imageUrl, { root: __dirname });

  })

})

app.get('/genCert', async function (req, res) {

  try {

    let { name, response } = req.query;

    if (!name) {
      return res.status(400).json({ success: false, message: "Name is Required" });
    }

    const { resultURL, resultImgURL } = await genPDF({ name });

    if (response === "json") {
      return res.json({
        success: true, data: {
          resultURL:
            new URL(`${req.protocol}://${req.get("host")}${resultURL}`),
          resultImgURL:
            new URL(`${req.protocol}://${req.get("host")}${resultURL}`)
        }
      })
    } if (response === "image") {
      return res.sendFile(path.join("./public", resultImgURL), { root: __dirname });
    } else {
      return res.sendFile(path.join("./public", resultURL), { root: __dirname });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message || "Internal Server Error" });
  }
})

app.get("/genImg", async (req, res) => {
  try {
    const { resultURL, resultImgURL } = await generateImage({});

    if (req.query?.json !== undefined && req.query?.json !== null) {
      return res.json({
        success: true, data: {
          resultURL:
            new URL(`${req.protocol}://${req.get("host")}${resultURL}`),
          resultImgURL:
            new URL(`${req.protocol}://${req.get("host")}${resultURL}`)
        }
      })
    } if (req.query?.image !== undefined && req.query?.image !== null) {
      return res.sendFile(path.join("./public", resultImgURL), { root: __dirname });
    } else {
      return res.sendFile(path.join("./public", resultURL), { root: __dirname });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message || "Internal Server Error" });
  }
})

const server = app.listen(5000, "127.0.0.1", () => {
  console.log(`Listening at http://${server.address().address}:${server.address().port}`)
});