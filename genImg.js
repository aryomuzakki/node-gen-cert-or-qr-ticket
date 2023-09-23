const { writeFile, mkdirSync } = require("fs")
const { join: pathJoin } = require("path");
const Jimp = require("jimp");

// sample
const qrImgPathSample = "https://res.cloudinary.com/boldunderline/image/upload/v1695313004/storage/dev-digital-registration/dev/dev_ADE%20KURNIAWAN_6281234560001_789002.png";
const qrTemplateImgSample = "./data/templates/template-qr-ticket-761-1080.jpg";
const templatePlaceholderSample = {
  width: 500,
  height: 500,
}
const configSample = {
  outputFolder: "/img-results",
  name: decodeURIComponent(qrImgPathSample.split("/").pop().split(".")[0]),
}

const generateImage = async ({ qrImgPath, qrDataURL, templateImg, config = configSample }) => {

  const originalQrImage = await Jimp.read(qrImgPath || qrImgPathSample);

  // resize qr to available placeholder
  const qrImage = originalQrImage.resize(templatePlaceholderSample.width, templatePlaceholderSample.height)

  const qrWidth = qrImage.getWidth();
  const qrHeight = qrImage.getHeight();

  const templateImage = await Jimp.read(templateImg || qrTemplateImgSample);

  const templateWidth = templateImage.getWidth();
  const templateHeight = templateImage.getHeight();

  // set align center and align middle
  const centerX = (templateWidth - qrWidth) / 2;
  const centerY = (templateHeight - qrHeight) / 2;

  // this become a jpeg file
  const combinedImage = templateImage.composite(qrImage, centerX, centerY);

  const imageDataUri = await combinedImage.getBufferAsync(combinedImage.getMIME());

  // create dir if not exist
  const jpgDir = pathJoin("./public", config.outputFolder || "/img-results", "jpg");
  mkdirSync(jpgDir, { recursive: true }, (err) => {
    if (err) console.log(err);
  });

  const timestamp = new Date().toISOString().split(".")[0].replace(/[:-]/g, "").replace("T", "-");

  const resultURL = `${config.outputFolder}/jpg/${config.name.replace(/\s/, "_")}-${timestamp}.${combinedImage.getExtension()}`;

  // save to output folder
  await new Promise((resolve, reject) => {
    writeFile(pathJoin("./public", resultURL), imageDataUri, (err) => err ? reject(err) : resolve());
  });

  return {
    resultURL,
    resultImgURL: resultURL,
  };
}

module.exports = {
  generateImage,
}