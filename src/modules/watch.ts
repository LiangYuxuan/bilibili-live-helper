import util from 'node:util';

import logger from '../logger.ts';
import { getNewDynamic, DynamicCard, reportVideoHeartbeat } from '../api.ts';

export default async (cookies: string, { uid }: { uid: number }): Promise<void> => {
    const dynamics = await getNewDynamic(cookies, uid, 8);
    const firstCard = JSON.parse(dynamics.cards[0].card) as DynamicCard;

    logger.debug(util.format('Dynamic Card: %o', firstCard));

    await reportVideoHeartbeat(
        cookies,
        firstCard.aid,
        firstCard.cid,
        uid,
        Math.round(Date.now() / 1000),
    );

    logger.info(`观看视频(aid: ${firstCard.aid.toString()})`);
};
