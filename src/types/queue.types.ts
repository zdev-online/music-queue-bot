export interface IQueueElement {
	readonly username: string;
	readonly id: number;
	readonly url: string;
	readonly title: string;
	readonly artist: string;
	readonly user_id: number;
}

export type GetCurrentAndNextAudioResponse = [IQueueElement | null, IQueueElement | null, number];

export interface IPaginatedResponse {
	data: IQueueElement[];
	total: number;
	page: number;
	pages_count: number;
	has_prev_page: boolean;
	has_next_page: boolean;
}
