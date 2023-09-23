const { readFileSync: fsReadFileSync, writeFile, mkdirSync } = require("fs");
const { join: pathJoin } = require("path");
const { PDFDocument, rgb, PageSizes, degrees } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
const pdfToImg = require("pdf-img-convert");

// lib
const isValidURL = (urlString) => {
  try {
    const urlObj = new URL(urlString);
    return urlObj.protocol.startsWith("http");
  } catch (_) {
    return false;
  }
}

// default config
const defaultConfig = {
  templateFileURL: "/templates/cert-template.jpg",
  outputFolder: "/certificate-results",
  name: "Alexander Aronowitz",
  x: 209,
  // y: 394,
  y: 804,
  maxWidth: 1581,
  maxHeight: 271,
  textHeight: 176,
  fontFileURL: "/fonts/tangerine/Tangerine-Regular.ttf",
  fontSize: 230,
  fontColor: {
    red: 152,
    green: 18,
    blue: 17,
  },
}

const genPDF = async (reqConfig = {}) => {

  const start = performance.now();

  // const config = { ...reqConfig ? { ...reqConfig } : { ...defaultConfig } };
  const config = { ...defaultConfig, ...reqConfig };

  console.log(config)

  // get file bytes
  const templateFile = isValidURL(config.templateFileURL) ? await fetch(config.templateFileURL).then(res => res.arrayBuffer()) : fsReadFileSync(pathJoin("./data", config.templateFileURL)).buffer

  // load file
  // const pdfDoc = await PDFDocument.load(templateFile)
  // create new pdf
  const pdfDoc = await PDFDocument.create()

  // get font bytes
  const fontFile = isValidURL(config.fontFileURL) ? await fetch(config.fontFileURL).then(res => res.arrayBuffer()) : fsReadFileSync(pathJoin("./data", config.fontFileURL)).buffer
  // register fontkit to embed custom font
  pdfDoc.registerFontkit(fontkit);

  // load font
  const tangerineFont = await pdfDoc.embedFont(fontFile);

  // page one
  // const page = pdfDoc.getPage(0);
  // create new page
  const page = pdfDoc.addPage([2000, 1414]); // this is an template img size
  // const page = pdfDoc.addPage(PageSizes.A4.reverse());

  // draw image to page
  const templateImg = await pdfDoc.embedJpg(templateFile);
  page.drawImage(templateImg, {
    x: 0,
    y: 0,
  })

  // const { width, height } = page.getSize();
  // console.log({ width, height })

  // console.log(page.getPosition())
  // console.log(page.getRotation())

  // calculate x, y to align center and middle
  const text = config.name;
  const textSize = config.fontSize;
  const textWidth = tangerineFont.widthOfTextAtSize(text, textSize);
  const textHeight = config.textHeight || tangerineFont.heightAtSize(textSize);

  // console.log("textWidth : ", textWidth)
  // console.log("textHeight : ", textHeight)

  let currentTextWidth = textWidth;
  let currentTextSize = textSize;
  // console.log(currentTextWidth)
  // console.log(currentTextSize)
  while (currentTextWidth >= config.maxWidth) {
    currentTextWidth = tangerineFont.widthOfTextAtSize(text, currentTextSize--);
  }
  // console.log("after loop")
  // console.log(currentTextWidth)
  // console.log(currentTextSize)
  const calculatedX = config.x + ((config.maxWidth - currentTextWidth) / 2);
  const calculatedY = config.y + ((config.maxHeight - textHeight) / 2);

  // console.log("width")
  // console.log(config.maxWidth - currentTextWidth)
  // console.log((config.maxWidth - currentTextWidth) / 2)
  // console.log(config.x + ((config.maxWidth - currentTextWidth) / 2))
  // console.log("height")
  // console.log(config.maxHeight - textHeight)
  // console.log((config.maxHeight - textHeight) / 2)
  // console.log(config.y + ((config.maxHeight - textHeight) / 2))

  // draw text to page
  page.drawText(text, {
    x: calculatedX,
    y: calculatedY,
    maxWidth: config.maxWidth,
    font: tangerineFont,
    size: currentTextSize,
    color: rgb(config.fontColor.red > 1 ? config.fontColor.red / 255 : config.fontColor.red, config.fontColor.green > 1 ? config.fontColor.green / 255 : config.fontColor.green, config.fontColor.blue > 1 ? config.fontColor.blue / 255 : config.fontColor.blue),
    lineHeight: 1,
  })

  // get file bytes
  const pdfBytes = await pdfDoc.save()

  // create dir if not exist
  const dir = pathJoin("./public", config.outputFolder || "/certificate-results");
  mkdirSync(dir, { recursive: true }, (err) => {
    if (err) console.log(err);
  });

  const timestamp = new Date().toISOString().split(".")[0].replace(/[:-]/g, "").replace("T", "-");

  const resultURL = `${config.outputFolder}/${config.name.replace(/\s/, "_")}-${timestamp}.pdf`;

  // save to output folder
  await new Promise((resolve, reject) => {
    writeFile(pathJoin("./public", resultURL), pdfBytes, (err) => err ? reject(err) : resolve());
  });

  // convert to image img jpg
  const resultImg = await pdfToImg.convert(pdfBytes);
  // create dir if not exist
  const jpgDir = pathJoin("./public", config.outputFolder || "/certificate-results", "jpg");
  mkdirSync(jpgDir, { recursive: true }, (err) => {
    if (err) console.log(err);
  });

  const resultImgURL = `${config.outputFolder}/jpg/${config.name.replace(/\s/, "_")}-${timestamp}.jpg`;

  // save to output folder
  await new Promise((resolve, reject) => {
    writeFile(pathJoin("./public", resultImgURL), resultImg[0], (err) => err ? reject(err) : resolve());
  });

  console.log(`process done in ${performance.now() - start} ms`);
  return { resultURL, resultImgURL };
}

module.exports = {
  genPDF
}