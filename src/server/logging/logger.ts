import pino from 'pino';
import { getEnv } from '../../lib/env';

const SENSITIVE_KEYS = new Set([
	'password',
	'email',
	'phone',
	'cookie',
	'cookies',
	'authorization',
	'token',
	'session',
	'secret',
	'customerName',
	'customerPhone',
	'name',
]);

function redact(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(redact);
	if (value && typeof value === 'object') {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			out[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? '[REDACTED]' : redact(v);
		}
		return out;
	}
	return value;
}

export const logger = pino({
	level: getEnv().NODE_ENV === 'production' ? 'info' : 'debug',
	timestamp: pino.stdTimeFunctions.isoTime,
	formatters: {
		level(label) {
			return { level: label };
		},
	},
	hooks: {
		logMethod(inputArgs, method) {
			if (inputArgs.length > 1 && typeof inputArgs[0] === 'object' && inputArgs[0] !== null) {
				inputArgs[0] = redact(inputArgs[0]);
			}
			return method.apply(this, inputArgs as Parameters<typeof method>);
		},
	},
});
