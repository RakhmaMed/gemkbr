import type { APIRoute } from 'astro';
import { getAuth } from '../../../server/auth/auth';

export const ALL: APIRoute = async (context) => {
	return getAuth().handler(context.request);
};
