const Events = {
	GET_CURRENT_AND_NEXT_AUDIO: 'get_current_and_next_audio',
	GET_PAGINATED_AUDIOS: 'get_paginated_audios',
};
const state = {
	current_track: null,
	track_paused: false,
};

const socket = io();
const max_socket_event_timeout = 5000;

const toggle_pause_button = document.getElementById('toggle-pause-button');
const next_track_button = document.getElementById('next-track-button');
const audios_list_container = document.getElementById('audios-list-container');
const current_track_name = document.getElementById('current-track-name');
const current_track_username = document.getElementById('current-track-username');
const next_track_name = document.getElementById('next-track-name');
const next_track_username = document.getElementById('next-track-username');
const actions = document.getElementById('actions');
const empty_message = document.getElementById('empty-queue-message');
const start_block = document.getElementById('start-block');
const start_button = document.getElementById('start');
const audio_timer = document.getElementById('audio-timer');

empty_message.style.display = 'none';

const toggleActionsPanel = () => {
	toggle_pause_button.style.display =
		toggle_pause_button.style.display == 'none' ? 'block' : 'none';
	next_track_button.style.display = next_track_button.style.display == 'none' ? 'block' : 'none';
	actions.style.opacity = actions.style.opacity == '0' ? '1' : '0';
};
const showActionsPanel = () => {
	toggle_pause_button.style.display = 'block';
	next_track_button.style.display = 'block';
	actions.style.opacity = '1';
};
const hideActionsPanel = () => {
	toggle_pause_button.style.display = 'none';
	next_track_button.style.display = 'none';
	actions.style.opacity = '0';
};
const toggleEmptyMessage = () => {
	const elements = Array.from(document.querySelectorAll('.info-block'));
	elements.map(
		element => (element.style.display = element.style.display == 'none' ? 'flex' : 'none'),
	);
	empty_message.style.display = empty_message.style.display == 'none' ? 'block' : 'none';
};
const showEmptyMessage = () => {
	const elements = Array.from(document.querySelectorAll('.info-block'));
	elements.map(element => (element.style.display = 'none'));
	empty_message.style.display = 'block';
};
const hideEmptyMessage = () => {
	const elements = Array.from(document.querySelectorAll('.info-block'));
	elements.map(element => (element.style.display = 'flex'));
	empty_message.style.display = 'none';
};
const secondsToString = input_seconds => {
	let hours = Math.floor(((input_seconds % 31536000) % 86400) / 3600);
	let minutes = Math.floor((((input_seconds % 31536000) % 86400) % 3600) / 60);
	let seconds = (((input_seconds % 31536000) % 86400) % 3600) % 60;

	let string = ``;

	if (hours !== 0) {
		if (hours < 10) {
			hours = `0${hours}`;
		}
	}

	minutes = minutes < 10 ? `0${minutes}` : minutes;
	seconds = seconds < 10 ? `0${seconds}` : seconds;

	hours && (string += `${hours}:`);
	minutes && (string += `${minutes}:`);
	seconds && (string += `${seconds}`);
	return string;
};

const createStringAudioListElement = (audio_name = '', username = '') => {
	return `
    <div class="audio-element">
      <p class="audio-element-name">
        <span class="audio-name">${audio_name}</span>
      </p>
      <p class="audio-element-username">${username}</p>
    </div>
  `;
};

const setCurrentTrack = (name = '', username = '') => {
	current_track_name.innerText = name;
	current_track_username.innerText = username;
};

const setNextTrack = (name = '', username = '') => {
	next_track_name.innerText = name;
	next_track_username.innerText = username;
};

const getCurrentAndNextAudio = () =>
	new Promise((resolve, reject) => {
		const timeout = setTimeout(reject, max_socket_event_timeout, `Timed out`);
		socket.emit(Events.GET_CURRENT_AND_NEXT_AUDIO, response => {
			clearTimeout(timeout);
			return resolve(response);
		});
	});

const getPaginatedAudios = (options = { limit: 10, page: 1 }) =>
	new Promise((resolve, reject) => {
		const timeout = setTimeout(reject, max_socket_event_timeout, `Timed out`);
		socket.emit(Events.GET_PAGINATED_AUDIOS, options, response => {
			clearTimeout(timeout);
			return resolve(response);
		});
	});

const start = async () => {
	try {
		document.title = 'Music | Музыка';
		setCurrentTrack('-', '-');

		const [current, next] = await getCurrentAndNextAudio();
		if (!current) {
			hideActionsPanel();
			showEmptyMessage();
			return setTimeout(start, 2000);
		}

		showActionsPanel();
		hideEmptyMessage();

		if (next) {
			setNextTrack(`${next.title} - ${next.artist}`, next.username);
		} else {
			setNextTrack('-', '-');
		}

		state.current_track = new Howl({
			src: current.url,
			html5: true,
			onend: () => setTimeout(play_next_track, 1000),
			onplay: () => {
				document.title = `${current.title} - ${current.artist}`;
				setCurrentTrack(`${current.title} - ${current.artist}`, current.username);
			},
			onplayerror: () => setTimeout(play_next_track, 1000),
			autoplay: true,
		});

		const { data } = await getPaginatedAudios();

		let new_container_html = '';
		for (let element of data) {
			new_container_html += createStringAudioListElement(
				`${element.title} - ${element.artist}`,
				element.username,
			);
		}

		audios_list_container.innerHTML = new_container_html;
	} catch (error) {
		console.error(`[Start] Error: `, error);
		return setTimeout(start, 2000);
	}
};

const play_next_track = () => {
	state.current_track?.pause();
	state.current_track = null;
	state.track_paused = false;
	toggle_pause_button.innerText = `Пауза`;
	start();
};

const toggle_pause_track = () => {
	if (!state.current_track) {
		return;
	}
	if (state.track_paused) {
		state.current_track?.play();
		state.track_paused = false;
		toggle_pause_button.innerText = `Пауза`;
		return;
	}

	state.current_track?.pause();
	state.track_paused = true;
	toggle_pause_button.innerText = `Продолжить`;
	return;
};
const getPaginatedAudiosInterval = async () => {
	try {
		const { data } = await getPaginatedAudios();

		let new_container_html = '';
		for (let element of data) {
			new_container_html += createStringAudioListElement(
				`${element.title} - ${element.artist}`,
				element.username,
			);
		}

		const [next] = data;
		if (next) {
			setNextTrack(`${next.title} - ${next.artist}`, next.username);
		}
		audios_list_container.innerHTML = new_container_html;
	} catch (error) {
		console.error(error);
	} finally {
		setTimeout(getPaginatedAudiosInterval, 2000);
	}
};
const updateAudioTimerInterval = () => {
	try {
		if (!state.current_track) {
			audio_timer.innerText = '-:-';
			return setTimeout(updateAudioTimerInterval, 1000);
		}

		const seek = Math.ceil(state.current_track.seek());
		const duration = Math.ceil(state.current_track.duration());

		audio_timer.innerText = `${secondsToString(seek)} \\ ${secondsToString(duration)}`;
		return setTimeout(updateAudioTimerInterval, 1000);
	} catch (error) {
		console.error(error);
		setTimeout(updateAudioTimerInterval, 1000);
	}
};

toggle_pause_button.addEventListener('click', event => {
	toggle_pause_track();
});

start_button.addEventListener('click', () => {
	start_block.style.display = 'none';
	start();
	getPaginatedAudiosInterval();
	updateAudioTimerInterval();
});

next_track_button.addEventListener('click', event => {
	play_next_track();
});
