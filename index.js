const Discord = require('discord.js');
const { prefix, assistantWatsonId, discordToken } = require('./config.json');
const { execute, skip, stop, currentSong, currentVolume, changeVolume, addSongToPlaylist, removeSongFromPlaylist, displayPlaylistsSongs } = require('./modules/music/commands');
const {	obtainPlaylists, displayPlaylists, playPlaylist, displayQueue, displayHelp, resumeSong, pauseSong, addNewPlaylist, playManea } = require('./modules/music/commands');
const translate = require('./modules/translate/en.json');
const { authWatsonAndGetService, callAssistant } = require('./modules/watson/watson');

const queue = new Map();
const client = new Discord.Client();
const regexPrefix = new RegExp('stiv ');
const playListPrefix = new RegExp('stiv playlists \\d+');
const playUrlPrefix = new RegExp('stiv play https:\\/\\/.*');
let playlists = null;
let assistant = null;

obtainPlaylists().then(result => playlists = result);
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
		if (msg.content.startsWith(`${prefix}play `) && playUrlPrefix.test(msg.content)) {
			console.log('play-url');
			execute(queue, msg, serverQueue, false);
			return;
		}
		else if (msg.content.startsWith(`${prefix}play `)) {
			console.log('play-name');
			execute(queue, msg, serverQueue, true);
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
		else if(msg.content.startsWith(`${prefix}current-song`)) {
			console.log('current-song');
			currentSong(queue, msg);
		}
		else if(msg.content.startsWith(`${prefix}current-volume`)) {
			console.log('current-volume');
			currentVolume(queue, msg);
		}
		else if(msg.content.startsWith(`${prefix}change-volume`)) {
			console.log('change-volume');
			changeVolume(queue, msg);
		}
		else if(msg.content.startsWith(`${prefix}playlists `) && playListPrefix.test(msg.content)) {
			console.log('play-playlists');
			await playPlaylist(playlists, queue, msg);
		}
		else if(msg.content.startsWith(`${prefix}songs `)) {
			console.log('songs-playlist');
			await displayPlaylistsSongs(playlists, msg);
		}
		else if(msg.content.startsWith(`${prefix}playlists`)) {
			console.log('display-playlists');
			await displayPlaylists(playlists, msg);
		}
		else if(msg.content.startsWith(`${prefix}playlist-create`)) {
			console.log('create-playlist');
			addNewPlaylist(playlists, msg);
		}
		else if(msg.content.startsWith(`${prefix}playlist-add`)) {
			console.log('playlist-add');
			addSongToPlaylist(playlists, msg);
		}
		else if(msg.content.startsWith(`${prefix}playlist-remove`)) {
			console.log('playlist-remove');
			removeSongFromPlaylist(playlists, msg);
		}
		else if(msg.content.startsWith(`${prefix}queue`)) {
			console.log('display-queue');
			displayQueue(queue, msg);
		}
		else if(msg.content.startsWith(`${prefix}help`)) {
			console.log('help');
			displayHelp(msg);
		}
		else if(msg.content.startsWith(`${prefix}pause`)) {
			console.log('pause');
			pauseSong(queue, msg);
		}
		else if(msg.content.startsWith(`${prefix}resume`)) {
			console.log('resume');
			resumeSong(queue, msg);
		}
		else if(msg.content.startsWith(`${prefix}puneo maniea`)) {
			console.log('puneo-maniea');
			playManea(playlists, queue, msg);
		}
		// else if(msg.content.startsWith(`${prefix}authorize`)) {
		// 	console.log('auth');
		// 	const role = msg.guild.roles.cache.find(e => e.name === 'Reprezentant la GOLF');
		// 	const member = msg.mentions.members.first();
		// 	member.roles.add(role);
		// }
		else if(msg.content.startsWith(`${prefix}`)) {
			console.log('assistant');
			const text = await callAssistant(msg.content.substring(4), assistant, assistantWatsonId);
			if(text) {
				msg.reply(text);
			}
		}
	}
});


client.login(discordToken);
