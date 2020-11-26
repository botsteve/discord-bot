const ytdl = require('ytdl-core');
const translate = require('../translate/en.json');
const savedPlaylists = require('../playlists/playlists.json');
const Discord = require('discord.js');

function hasPermissionToJoinOrSpeak(permissions) {
	return !permissions.has('CONNECT') || !permissions.has('SPEAK');
}

const displayHelp = function displayHelp(message) {
	const helpMessage = new Discord.MessageEmbed()
		.setColor('#ff0000')
		.setTitle('HELP')
		.setDescription(translate.help_description)
		.addField(translate.help_disclaimer, '\u200b')
		.addField(translate.help_play_label, translate.help_play_value)
		.addField(translate.help_stop_label, translate.help_stop_value)
		.addField(translate.help_skip_label, translate.help_skip_value)
		.addField(translate.help_current_song_label, translate.help_current_song_value)
		.addField(translate.help_current_volume_label, translate.help_current_volume_value)
		.addField(translate.help_change_volume_label, translate.help_change_volume_value)
		.addField(translate.help_playlists_label, translate.help_playlists_value)
		.addField(translate.help_playlists_number_label, translate.help_playlists_number_value)
		.addField(translate.help_queue_label, translate.help_queue_value)
		.addField(translate.help_help_label, translate.help_help_value);

	return message.channel.send(helpMessage);
};

const displayQueue = function displayQueue(queue, message) {
	const serverSongQueue = queue.get(message.guild.id);

	if(!serverSongQueue) {
		return message.channel.send(translate.empty_queue_error);
	}
	else {
		const queueMessage = getMessageQueue(serverSongQueue);
		return message.channel.send(queueMessage);
	}
};


function getMessageQueue(serverSongQueue) {
	const message = new Discord.MessageEmbed()
		.setColor('#0099ff')
		.setTitle('QUEUE');

	for(let i = 0;i < serverSongQueue.songs.length;i++) {
		const songTitle = serverSongQueue.songs[i].title.trim();
		const songUrl = serverSongQueue.songs[i].url.trim();
		if(songTitle != undefined) {
			message.addField(`${i}. ***${songTitle}***`, `__${songUrl}__`);
		}
	}
	return message;
}

const playPlaylist = async function playPlaylist(playlists, queue, message) {
	const serverSongQueue = queue.get(message.guild.id);
	const playlistNumber = message.content.split(' ')[2];
	const voiceChannel = message.member.voice.channel;

	if (!voiceChannel) {
		return message.channel.send(translate.voice_channel_error);
	}

	const permissions = voiceChannel.permissionsFor(message.client.user);
	if (hasPermissionToJoinOrSpeak(permissions)) {
		return message.channel.send(translate.channel_permissions_error);
	}

	if(playlistNumber == null || playlistNumber == undefined) {
		return message.channel.send(translate.playlist_number_error);
	}

	if (!serverSongQueue) {
		const queueContruct = {
			textChannel: message.channel,
			voiceChannel: voiceChannel,
			connection: null,
			songs: playlists[playlistNumber].songs,
			volume: 5,
			playing: true,
		};
		queue.set(message.guild.id, queueContruct);
		try {
			const connection = await voiceChannel.join();
			queueContruct.connection = connection;
			play(queue, message.guild, queueContruct.songs[0]);
		}
		catch (err) {
			console.log(err);
			queue.delete(message.guild.id);
			return message.channel.send(err);
		}
	}
	else{
		message.channel.send(translate.changing_playlist);
		serverSongQueue.songs = playlists[playlistNumber].songs;
		serverSongQueue.connection.dispatcher.end();
	}
};

const obtainPlaylists = async function obtainPlaylists() {
	const playlists = savedPlaylists;
	for(let i = 0;i < playlists.playlists.length;i++) {
		for(let j = 0;j < playlists.playlists[i].songs.length;j++) {
			const song = playlists.playlists[i].songs[j];
			const songInfo = await ytdl.getInfo(song.url);
			playlists.playlists[i].songs[j].title = songInfo.videoDetails.title;
		}
	}

	return playlists.playlists;
};

const displayPlaylists = async function displayPlaylists(playlists, message) {
	const channelMessage = await parsePlaylists(playlists, message);
	if(channelMessage) {
		return message.channel.send(channelMessage);
	}
};

async function parsePlaylists(playlists, serverMessage) {
	const message = new Discord.MessageEmbed()
		.setColor('#0099ff')
		.setTitle('PLAYLISTS');
	if(!playlists) {
		serverMessage.channel.send(translate.wait_for_load);
	}
	else{
		for(let i = 0;i < playlists.length;i++) {
			message.addField(`__**${playlists[i].playlistName}**__`, '\u200b', true);
			for(let j = 0;j < playlists[i].songs.length;j++) {
				message.addField(`\t [${[j]}].**${playlists[i].songs[j].title}**`, `${playlists[i].songs[j].url}`);
			}
			message.addField('\u200b', '\u200b');
		}
		return message;
	}
}

const execute = async function execute(queue, message, serverSongQueue) {
	const songUrl = message.content.split(' ')[2];

	const voiceChannel = message.member.voice.channel;
	if (!voiceChannel) {
		return message.channel.send(translate.voice_channel_error);
	}

	const permissions = voiceChannel.permissionsFor(message.client.user);
	if (hasPermissionToJoinOrSpeak(permissions)) {
		return message.channel.send(translate.channel_permissions_error);
	}

	const songInfo = await ytdl.getInfo(songUrl);
	const song = {
		title: songInfo.videoDetails.title,
		url: songInfo.videoDetails.video_url,
	};

	if (!serverSongQueue) {
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
			play(queue, message.guild, queueContruct.songs[0]);
		}
		catch (err) {
			console.log(err);
			queue.delete(message.guild.id);
			return message.channel.send(err);
		}
	}
	else {
		serverSongQueue.songs.push(song);
		return message.channel.send(`${song.title} has been added to the queue!`);
	}
};

const currentSong = function currentSong(queue, message) {
	const serverSongQueue = queue.get(message.guild.id);
	if(serverSongQueue && serverSongQueue.songs) {
		const currentPlayingSong = serverSongQueue.songs[0];
		return message.channel.send(`${currentPlayingSong.title} is currently playing!`);
	}
	else{
		return message.channel.send(translate.no_song_is_currently_playing);
	}
};

const currentVolume = function currentVolume(queue, message) {
	const serverSongQueue = queue.get(message.guild.id);
	if(serverSongQueue && serverSongQueue.songs) {
		const currentSongVolume = serverSongQueue.volume;
		return message.channel.send(`The current volume is set at : ${currentSongVolume} !`);
	}
	else{
		return message.channel.send(translate.no_song_is_currently_playing);
	}
};

const changeVolume = function increaseVolume(queue, message) {
	const newVolume = message.content.split(' ')[2];
	const serverSongQueue = queue.get(message.guild.id);
	if(serverSongQueue && serverSongQueue.songs) {
		serverSongQueue.volume = newVolume;
		serverSongQueue.connection.dispatcher.setVolumeLogarithmic(serverSongQueue.volume / 5);
		return message.channel.send(`The new volume is now set at : ${serverSongQueue.volume} !`);
	}
	else{
		return message.channel.send(translate.no_song_is_currently_playing);
	}
};

const skip = function skip(message, serverSongQueue) {
	if (!message.member.voice.channel) {
		return message.channel.send(translate.user_not_in_voice_channel);
	}
	if (!serverSongQueue) {return message.channel.send(translate.no_song_in_queue_error);}
	serverSongQueue.connection.dispatcher.end();
};

const stop = function stop(message, serverSongQueue) {
	if (!message.member.voice.channel) {
		return message.channel.send(translate.user_not_in_voice_channel);
	}
	serverSongQueue.songs = [];
	serverSongQueue.connection.dispatcher.end();
};

function play(queue, guild, song) {
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
			play(queue, guild, serverQueue.songs[0]);
		})
		.on('error', error => console.error(error));
	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
	serverQueue.textChannel.send(`Start playing: **${song.title}**`);
}

module.exports = { execute, skip, stop, currentSong, currentVolume, changeVolume, obtainPlaylists, displayPlaylists, playPlaylist, displayQueue, displayHelp };