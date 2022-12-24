import { readFileSync } from 'fs';
import { IConfig } from '../types';

export class ConfigService {
	private config: IConfig;

	constructor(path_to_config: string) {
		const raw_config = readFileSync(path_to_config, { encoding: 'utf-8' });
		this.config = JSON.parse(raw_config);
	}

	public get<T>(key: keyof IConfig): T {
		return this.config[key] as T;
	}
}
