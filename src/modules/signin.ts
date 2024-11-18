import { doLiveDailySign } from '../api.ts';
import logger from '../logger.ts';

export default async (cookies: string): Promise<void> => {
    const message = await doLiveDailySign(cookies);
    logger.info(`直播签到: ${message}`);
};
