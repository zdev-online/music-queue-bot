import { GetCurrentAndNextAudioResponse, IPaginatedResponse } from './queue.types';

export type TGetCurrentAndNextAudioCallback = (response: GetCurrentAndNextAudioResponse) => void;

export interface IGetPaginatedAudiosOptions {
	readonly limit: number;
	readonly page: number;
}

export type IGetPaginatedAudiosCallback = (response: IPaginatedResponse) => void;
