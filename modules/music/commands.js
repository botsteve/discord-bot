const ytdl = require('ytdl-core');
const translate = require('../translate/en.json');

function hasPermissionToJoinOrSpeak(permissions) {
	return !permissions.has('CONNECT') || !permissions.has('SPEAK');
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
			volume: 4,
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

module.exports = { execute, skip, stop };