import util from 'util';

import logger from '../logger.js';
import {getNewDynamic, DynamicCard, reportVideoHeartbeat} from './../api.js';

export default async (cookies: string, {uid}: {uid: number}): Promise<[boolean, string][]> => {
    const reportLog: [boolean, string][] = [];

    try {
        const dynamics = await getNewDynamic(cookies, uid, 8);
        const firstCard: DynamicCard = JSON.parse(dynamics.cards[0].card);

        logger.debug('Dynamic Card: %o', firstCard);

        await reportVideoHeartbeat(
            cookies, firstCard.aid, firstCard.cid, uid,
            Math.round(Date.now() / 1000),
        );
        logger.info('主站观看视频(aid: %d)成功', firstCard.aid);
        reportLog.push([true, util.format('主站观看视频(aid: %d)成功', firstCard.aid)]);
    } catch (error) {
        logger.error(error);
        reportLog.push([false, `主站观看视频失败: ${(error as Error).message}`]);
        throw reportLog;
    }

    return reportLog;
};
