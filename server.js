'use strict';

require('dotenv').config();

const URL = 'https://web.skype.com';

const DOM_ID_EMAIL     = 'i0116';
const DOM_ID_NGC       = 'idRemoteNGC_DisplaySign';
const DOM_XPATH_INFO   = '/html/body/div/div/div[1]/div[2]/div/div[1]/div/div/div[3]/button';
const DOM_XPATH_STATE  = '/html/body/div/div/div[2]/div/div[2]/div/div/div/div/div/div/div[3]/div[5]/div[1]/button';
const DOM_XPATH_ACTIVE = '/html/body/div/div/div[3]/div/div/div/button[1]';
const DOM_XPATH_AWAY   = '/html/body/div/div/div[3]/div/div/div/button[2]';

const webdriver = require('selenium-webdriver');
const { Builder, By, Key, until } = webdriver;

const driver = new Builder().forBrowser('chrome').build();

const signin = async () => {
  await driver.get(URL);
  const email = await driver.findElement(By.id(DOM_ID_EMAIL));
  await email.sendKeys(process.env.EMAIL, Key.RETURN);
  const ngc = await driver.wait(until.elementLocated(By.id(DOM_ID_NGC)));
  console.log('RemoteNGC: ' + await ngc.getText());
};

const click = async (e) => await driver.executeScript("arguments[0].click();", e);

const clickInfo = async () => {
  const info = await driver.wait(until.elementLocated(By.xpath(DOM_XPATH_INFO)));
  await click(info);
};

const getInfo = async () => {
  const info = await driver.wait(until.elementLocated(By.xpath(DOM_XPATH_INFO)));
  return await info.getAttribute('aria-label');
};

const clickState = async () => {
  const state = await driver.wait(until.elementLocated(By.xpath(DOM_XPATH_STATE)));
  await click(state);
};

const setState = async (xpath) => {
  await clickInfo();
  await clickState();
  const e = await driver.wait(until.elementLocated(By.xpath(xpath)));
  await click(e);
};

const setActive = async () => await setState(DOM_XPATH_ACTIVE);
const setAway = async () => await setState(DOM_XPATH_AWAY);

const KEEPALIVE_INTERVAL = 5 * 60 * 1000;

const http = require('http');
const server = http.createServer();

const respond = (response, data) => {
  response.writeHead(200, 'OK', { 'content-type': 'text/plain' });
  response.end(data);
};

const shutdown = () => {
  server.close();
  process.exit();
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

server.on('request', async (request, response) => {
  console.log(request.url);
  switch (request.url) {
    case '/active':
      await setActive();
      respond(response);
      break;
    case '/away':
      await setAway();
      respond(response);
      break;
    case '/state':
      const info = await getInfo();
      const state = info.split(',')[1].trim();
      respond(response, state);
      break;
    default:
      response.writeHead(404, 'Not Found');
      response.end();
  }
});

(async () => {
  await signin();
  setInterval(async () => await getInfo(), KEEPALIVE_INTERVAL);
  server.listen(process.env.UNIX_SOCKET);
})();

