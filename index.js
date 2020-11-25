const Discord = require("discord.js");
const fs = require('fs')
const client = new Discord.Client();
const AssistantV2 = require("ibm-watson/assistant/v2"); //Watson Assistant
const {IamAuthenticator} = require("ibm-watson/auth"); //Watson Auth
const {assistantWatsonId, apikey, url, discordToken, assistantApiVersion} = require('./credentials.json');

const Token = discordToken;
const ASSISTANT_URL = url;
const ASSISTANT_APIKEY = apikey; //service-credentials-blog
const ASST_API_VERSION = assistantApiVersion;

const assistantId = assistantWatsonId;
let assistant = false;
if (assistantId) {
  let url;
  let disableSSL = false;
  let auth;
  try {
    auth = new IamAuthenticator({ apikey: ASSISTANT_APIKEY });
    url = ASSISTANT_URL;
  } catch (e) {
    console.log(e.result.stringify);
  }

  assistant = new AssistantV2({
    version: ASST_API_VERSION,
    authenticator: auth,
    url: url,
    disableSslVerification: disableSSL,
  });
}

async function getMessage(request, sessionId) {
  try {
    let param = {
      input: { text: request },
      assistantId: assistantId,
      sessionId: sessionId,
    };

    let response = await assistant.message(param);

    console.log("successful call");
    console.log("text0: " + JSON.stringify(response.result, null, 2)); //an entire response from the service
    return JSON.stringify(response.result.output.generic[0].text, null, 2);
  } catch (err) {
    console.log("unsuccessful call");
    console.log(err);
    return error.stringify;
  }
}

async function callAssistant(request) {
  try {
    const sessionId = (
      await assistant.createSession({ assistantId: assistantId })
    ).result.session_id;
    const responseText = await getMessage(request, sessionId);
    return responseText;
  } catch (error) {
    console.error(error);
  }
}

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

const regexPrefix = new RegExp("stiv*");

client.on("message", async (msg) => {
  if (regexPrefix.test(msg.content)) {
    let text = await callAssistant(msg.content.substring(4));
    console.log(text);
    if (text) {
      msg.reply(text);
    } else {
      msg.reply("Please repeat!");
    }
  }
});

client.login(Token);
