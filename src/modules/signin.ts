import util from 'util';

import logger from '../logger.js';
import { doLiveDailySign } from '../api.js';

export default async (cookies: string): Promise<[boolean, string][]> => {
    const reportLog: [boolean, string][] = [];

    try {
        const message = await doLiveDailySign(cookies);
        logger.info('直播区签到成功: %s', message);
        reportLog.push([true, util.format('直播区签到成功: %s', message)]);
    } catch (error) {
        logger.error(error);
        reportLog.push([false, `直播区签到失败: ${(error as Error).message}`]);
    }

    return reportLog;
};
