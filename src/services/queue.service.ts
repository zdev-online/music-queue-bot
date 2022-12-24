import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { GetCurrentAndNextAudioResponse, IPaginatedResponse, IQueueElement } from '../types';

export class QueueService {
	private queue: IQueueElement[] = [];
	constructor(private queue_path: string) {
		this.init = this.init.bind(this);
		this.addAudio = this.addAudio.bind(this);
		this.isAudioExistsById = this.isAudioExistsById.bind(this);
		this.getPaginated = this.getPaginated.bind(this);
		this.getCurrentAndNextAudio = this.getCurrentAndNextAudio.bind(this);
		this.saveToFileInterval = this.saveToFileInterval.bind(this);
		this.saveToFile = this.saveToFile.bind(this);
		this.getFromFile = this.getFromFile.bind(this);
	}

	/** Инициализация очереди */
	public async init(): Promise<void> {
		const queue_exists = existsSync(this.queue_path);
		if (!queue_exists) {
			await this.saveToFile([]);
			console.log(`[Queue] Очередь не была найдена. Файл создан.`);
			return;
		}
		this.queue = await this.getFromFile();
		console.log(`[Queue] Очередь найдена. Файл прочитан.`);
		return;
	}

	/** Добавить аудио в очередь */
	public addAudio(element: IQueueElement): number {
		return this.queue.push(element);
	}

	/** Проверить есть ли аудио с таким ID в очереди */
	public isAudioExistsById(id: number): (IQueueElement & { position: number }) | null {
		const index = this.queue.findIndex(audio => audio.id == id);
		if (index == -1) {
			return null;
		}

		const element = this.queue[index];
		return { ...element, position: index + 1 };
	}

	/** Получить аудио по страницам */
	public getPaginated(limit: number, page: number): IPaginatedResponse {
		const total = this.queue.length;
		const pages_count = Math.ceil(total / limit);
		const offset = (page - 1) * limit;

		const paginated: IQueueElement[] = [];
		if (this.queue[offset]) {
			for (let index = offset; index < limit; index++) {
				if (!this.queue[index]) {
					break;
				}

				paginated.push(this.queue[index]);
			}
		}

		const has_prev_page = page - 1 > 0;
		const has_next_page = page < pages_count;

		return { data: paginated, total, page, pages_count, has_prev_page, has_next_page };
	}

	/** Получить аудио для воспроизведения и следующее */
	public getCurrentAndNextAudio(): GetCurrentAndNextAudioResponse {
		const current: IQueueElement | null = this.queue.shift() || null;
		const next: IQueueElement | null = this.queue[0] || null;
		return [current, next, this.queue.length];
	}

	/** Сохранять периодически в файл */
	public async saveToFileInterval(timeout: number) {
		try {
			await this.saveToFile(this.queue);
			console.log(`[Queue] Очередь сохранена в файл`);
		} catch (error) {
			console.error(`[Queue] Не удалось сохранить очередь: ${error}`);
		} finally {
			setTimeout(this.saveToFileInterval, timeout, timeout);
		}
	}

	/** Сохранить очередь в файл (Через `JSON.stringify`) */
	public async saveToFile(queue: IQueueElement[]): Promise<void> {
		const raw_queue = JSON.stringify(queue, null, 2);
		return await writeFile(this.queue_path, raw_queue, { encoding: 'utf-8' });
	}

	/** Получить очередь из файла (Через `JSON.parse`) */
	public async getFromFile(): Promise<IQueueElement[]> {
		const raw_queue = await readFile(this.queue_path, { encoding: 'utf-8' });
		return JSON.parse(raw_queue);
	}
}
