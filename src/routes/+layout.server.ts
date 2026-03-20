import { env } from '$env/dynamic/private';

export function load() {
	return {
		plausibleDomain: env.PLAUSIBLE_DOMAIN ?? ''
	};
}
