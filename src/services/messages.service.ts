import { INewQueueElementMessage } from '../types';

export class MessagesService {
	public getErrorMessage(): string {
		return `⛔ Произошла ошибка. Попробуйте ещё раз.`;
	}

	public getAudioLimitMessage(limit: number) {
		return `⛔ Нельзя поставить за раз больше ${limit} трек(а|ов)!`;
	}

	public getAudioMessageTimeout(timeout: number) {
		let message = `⛔ Отправлять сообщения можно раз в ${timeout} сек.\n`;
		return message;
	}

	public getNoAudioErrorMessage() {
		return `⛔ Прикрепи хотя бы 1 трек к сообщению.`;
	}

	public getAudioAlreadyExistsMessage(user_id: number, username: string, audio_position: number) {
		let message = `❗ Трек уже в очереди.\n\n`;
		message += `👥 Позиция в очереди: ${audio_position}\n`;
		message += `👤 Добавлен пользователем: [id${user_id}|${username}]`;

		return message;
	}

	public getNewQueueElementMessage({ title, artist, position }: INewQueueElementMessage) {
		let message = `🕐 Трек добавлен в очередь.\n\n`;

		message += `🎵 Название: ${title}\n`;
		message += `🎤 Артист: ${artist}\n\n`;

		message += `👥 Позиция: ${position}`;

		return message;
	}

	public getYourAudioPlay(audio_title: string, audio_artist: string) {
		let message = `❗ Твоя музыка включается.\n\n`;

		message += `🎵 Название: ${audio_title}\n`;
		message += `🎤 Артист: ${audio_artist}`;

		return message;
	}
}
