const Discord = require('discord.js');
const { prefix, assistantWatsonId, discordToken } = require('./config.json');
const { execute, skip, stop } = require('./modules/music/commands');
const translate = require('./modules/translate/en.json');
const { authWatsonAndGetService, callAssistant } = require('./modules/watson/watson');

let assistant = null;
const queue = new Map();
const client = new Discord.Client();
const regexPrefix = new RegExp('stiv*');

assistant = authWatsonAndGetService(assistantWatsonId);

client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}!`);
});

client.once('reconnecting', () => {
	console.log(translate.reconnecting);
});

client.once('disconnect', () => {
	console.log(translate.disconnect);
});


client.on('message', async (msg) => {

	if (msg.author.bot) return;
	const serverQueue = queue.get(msg.guild.id);
	if (regexPrefix.test(msg.content)) {
		if (msg.content.startsWith(`${prefix}play`)) {
			console.log('play');
			execute(queue, msg, serverQueue);
			return;
		}
		else if (msg.content.startsWith(`${prefix}skip`)) {
			console.log('skip');
			skip(msg, serverQueue);
			return;
		}
		else if (msg.content.startsWith(`${prefix}stop`)) {
			console.log('stop');
			stop(msg, serverQueue);
			return;
		}
		else {
			console.log('assistant');
			const text = await callAssistant(msg.content.substring(4), assistant, assistantWatsonId);
			if(text) {
				msg.reply(text);
			}
		}
	}
});


client.login(discordToken);
