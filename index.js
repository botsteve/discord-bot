const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const client = new Discord.Client();
const AssistantV2 = require('ibm-watson/assistant/v2');
const { IamAuthenticator } = require('ibm-watson/auth');
const { prefix, assistantWatsonId, apikey, apiUrl, discordToken, assistantApiVersion } = require('./config.json');

const Token = discordToken;
const ASSISTANT_URL = apiUrl;
const ASSISTANT_APIKEY = apikey;
const ASST_API_VERSION = assistantApiVersion;

const assistantId = assistantWatsonId;
const disableSSL = false;
let assistant = false;
const queue = new Map();

if (assistantId) {
	let auth;
	try {
		auth = new IamAuthenticator({ apikey: ASSISTANT_APIKEY });
	}
	catch (e) {
		console.log(e.result.stringify);
	}

	assistant = new AssistantV2({
		version: ASST_API_VERSION,
		authenticator: auth,
		url: ASSISTANT_URL,
		disableSslVerification: disableSSL,
	});
}

async function getMessage(request, sessionId) {
	try {
		const param = {
			input: { text: request },
			assistantId: assistantId,
			sessionId: sessionId,
		};

		const response = await assistant.message(param);

		console.log('successful call');
		console.log('text0: ' + JSON.stringify(response.result, null, 2));
		return JSON.stringify(response.result.output.generic[0].text, null, 2);
	}
	catch (err) {
		console.log('unsuccessful call');
		console.log(err);
		return err.stringify;
	}
}

async function callAssistant(request) {
	try {
		const sessionId = (
			await assistant.createSession({ assistantId: assistantId })
		).result.session_id;
		const responseText = await getMessage(request, sessionId);
		return responseText;
	}
	catch (error) {
		console.error(error);
	}
}

client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}!`);
});

client.once('reconnecting', () => {
	console.log('Reconnecting!');
});

client.once('disconnect', () => {
	console.log('Disconnect!');
});

const regexPrefix = new RegExp('stiv*');

client.on('message', async (msg) => {

	if (msg.author.bot) return;
	const serverQueue = queue.get(msg.guild.id);
	if (regexPrefix.test(msg.content)) {
		if (msg.content.startsWith(`${prefix}play`)) {
			console.log('play');
			execute(msg, serverQueue);
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
			const text = await callAssistant(msg.content.substring(4));
			if(text) {
				msg.reply(text);
			}
		}
	}
});


async function execute(message, serverQueue) {
	const args = message.content.split(' ');

	const voiceChannel = message.member.voice.channel;
	console.log(message.member.voice.channel);
	if (!voiceChannel) {
		return message.channel.send(
			'You need to be in a voice channel to play music!',
		);
	}
	const permissions = voiceChannel.permissionsFor(message.client.user);
	if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
		return message.channel.send(
			'I need the permissions to join and speak in your voice channel!',
		);
	}

	const songInfo = await ytdl.getInfo(args[2]);
	const song = {
		title: songInfo.videoDetails.title,
		url: songInfo.videoDetails.video_url,
	};

	if (!serverQueue) {
		const queueContruct = {
			textChannel: message.channel,
			voiceChannel: voiceChannel,
			connection: null,
			songs: [],
			volume: 5,
			playing: true,
		};

		queue.set(message.guild.id, queueContruct);

		queueContruct.songs.push(song);

		try {
			const connection = await voiceChannel.join();
			queueContruct.connection = connection;
			play(message.guild, queueContruct.songs[0]);
		}
		catch (err) {
			console.log(err);
			queue.delete(message.guild.id);
			return message.channel.send(err);
		}
	}
	else {
		serverQueue.songs.push(song);
		return message.channel.send(`${song.title} has been added to the queue!`);
	}
}

function skip(message, serverQueue) {
	if (!message.member.voice.channel) {
		return message.channel.send(
			'You have to be in a voice channel to stop the music!',
		);
	}
	if (!serverQueue) {return message.channel.send('There is no song that I could skip!');}
	serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
	if (!message.member.voice.channel) {
		return message.channel.send(
			'You have to be in a voice channel to stop the music!',
		);
	}
	serverQueue.songs = [];
	serverQueue.connection.dispatcher.end();
}

function play(guild, song) {
	const serverQueue = queue.get(guild.id);
	if (!song) {
		serverQueue.voiceChannel.leave();
		queue.delete(guild.id);
		return;
	}

	const dispatcher = serverQueue.connection
		.play(ytdl(song.url))
		.on('finish', () => {
			serverQueue.songs.shift();
			play(guild, serverQueue.songs[0]);
		})
		.on('error', error => console.error(error));
	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
	serverQueue.textChannel.send(`Start playing: **${song.title}**`);
}

client.login(Token);
