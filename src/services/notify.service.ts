import { API, getRandomId } from 'vk-io';

export class NotifyService {
	constructor(private api: API) {}

	public async notifyUser(user_id: number, message: string) {
		try {
			await this.api.messages.send({
				user_id,
				message,
				random_id: getRandomId(),
			});
		} catch (error) {
			console.error(`Не удалось отправить сообщение: ${error}`);
		}
	}
}
