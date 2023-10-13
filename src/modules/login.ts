import { reportVideoClick } from '../api.ts';

export default async (cookies: string): Promise<void> => {
    await reportVideoClick(cookies);
};
