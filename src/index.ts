import http from 'http';
import express from 'express';
import { Server as IOServer } from 'socket.io';
import { AudioAttachment, getRandomId, VK } from 'vk-io';
import { ConfigService, MessagesService, NotifyService, QueueService } from './services';
import { join } from 'path';
import { Events } from './constants';
import {
	IGetPaginatedAudiosCallback,
	IGetPaginatedAudiosOptions,
	IQueueElement,
	TGetCurrentAndNextAudioCallback,
} from './types';

const config_service = new ConfigService(join(process.cwd(), 'config.json'));
const queue_service = new QueueService(join(process.cwd(), 'audios.json'));
const messages_service = new MessagesService();
const vk = new VK({ token: config_service.get('token') });
const notify_service = new NotifyService(vk.api);
const app = express();
const server = http.createServer(app);
const io = new IOServer(server);
const users = new Map<number, { id: number; username: string; last_message_at: number }>();
const max_audios = 2;
const server_port = config_service.get<number>('port');
const audio_timeout = config_service.get<number>('audio_timeout');

app.use(express.static(join(process.cwd(), 'public')));

// Socket IO
let connected = false;
io.on('connect', socket => {
	if (connected) {
		return socket.disconnect(true);
	}

	connected = true;
	socket.on(
		Events.GET_CURRENT_AND_NEXT_AUDIO,
		async (callback: TGetCurrentAndNextAudioCallback) => {
			const response = queue_service.getCurrentAndNextAudio();

			if (response[0]) {
				const { title, artist, user_id } = response[0];
				await notify_service.notifyUser(user_id, messages_service.getYourAudioPlay(title, artist));
			}

			return callback(response);
		},
	);
	socket.on(
		Events.GET_PAGINATED_AUDIOS,
		async (options: IGetPaginatedAudiosOptions, callback: IGetPaginatedAudiosCallback) => {
			const response = queue_service.getPaginated(options.limit || 0, options.page || 1);
			return callback(response);
		},
	);
});

// VK
vk.updates.use(async (ctx, next) => {
	try {
		if (!ctx.senderId || ctx.isChat) {
			return;
		}

		const user = users.get(ctx.senderId);
		if (!user) {
			const [{ first_name, last_name, id }] = await vk.api.users.get({ user_ids: [ctx.senderId] });
			users.set(ctx.senderId, { id, username: `${first_name} ${last_name}`, last_message_at: 0 });
		}

		await next();
	} catch (error) {
		console.error(`[Updates] Ошибка: ${error}`);
		await ctx.send?.(messages_service.getErrorMessage());
	}
});
vk.updates.on('message_new', async (ctx, next) => {
	if (!ctx.hasAttachments('audio')) {
		return await next();
	}

	const user = users.get(ctx.senderId)!;

	if (Date.now() - user.last_message_at < audio_timeout) {
		return await ctx.send(messages_service.getAudioMessageTimeout(audio_timeout));
	}

	const audios = ctx.attachments.filter(
		attachment => attachment.type == 'audio',
	) as AudioAttachment[];
	if (audios.length > max_audios) {
		return await ctx.send(messages_service.getAudioLimitMessage(max_audios));
	}

	const mapped_audios: IQueueElement[] = audios
		.filter(audio => !!audio.url)
		.map((audio: AudioAttachment) => ({
			id: audio.id,
			artist: audio.artist || '-',
			title: audio.title || 'Без названия',
			url: audio.url!,
			username: user.username,
			user_id: ctx.senderId,
		}));

	for (let element of mapped_audios) {
		const exists = queue_service.isAudioExistsById(element.id);
		if (exists) {
			await ctx.send(
				messages_service.getAudioAlreadyExistsMessage(
					exists.user_id,
					exists.username,
					exists.position,
				),
			);
			continue;
		}
		const position = queue_service.addAudio(element);
		await ctx.send(
			messages_service.getNewQueueElementMessage({
				position,
				title: element.title,
				artist: element.artist,
			}),
		);
	}
	users.set(ctx.senderId, { ...user, last_message_at: Date.now() });
});
vk.updates.on('message_new', async (ctx, next) => {
	return await ctx.send(messages_service.getNoAudioErrorMessage());
});

// Bootstrap
// TS Bug
server.listen(server_port, '127.0.0.1' as any, async () => {
	try {
		await queue_service.init();
		await vk.updates.start();
		console.log(`[Server] Сервер запущен. Адрес: http://127.0.0.1:${server_port}`);
		queue_service.saveToFileInterval(10000);
	} catch (error) {
		console.error(`[Server] Ошибка при запуске сервера: ${error}`);
		return process.exit(-1);
	}
});
