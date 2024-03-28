import util from 'node:util';

import logger from '../logger.ts';
import { getNewDynamic, DynamicCard, reportShare } from '../api.ts';

export default async (cookies: string, { uid }: { uid: number }): Promise<void> => {
    const dynamics = await getNewDynamic(cookies, uid, 8);
    const firstCard = JSON.parse(dynamics.cards[0].card) as DynamicCard;

    logger.debug(util.format('Dynamic Card: %o', firstCard));

    await reportShare(cookies, firstCard.aid);

    logger.info(`分享视频(aid: ${firstCard.aid.toString()})`);
};
