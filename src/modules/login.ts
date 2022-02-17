import logger from './../logger.js';
import {reportVideoClick} from './../api.js';

export default async (cookies: string): Promise<[boolean, string][]> => {
    const reportLog: [boolean, string][] = [];

    try {
        await reportVideoClick(cookies);
        logger.info('主站签到成功');
        reportLog.push([true, '主站签到成功']);
    } catch (error) {
        logger.error(error);
        reportLog.push([false, `主站签到失败: ${(error as Error).message}`]);
        throw reportLog;
    }

    return reportLog;
};
