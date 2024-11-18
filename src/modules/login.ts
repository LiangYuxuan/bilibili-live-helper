import { getNavInfo } from '../api.ts';

export default async (cookies: string): Promise<void> => {
    await getNavInfo(cookies);
};
