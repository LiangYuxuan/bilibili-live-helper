import util from 'node:util';

import {
    getGiftBagList, getGiftConfig, doRoomInit, sendGiftBag,
} from '../api.ts';
import logger from '../logger.ts';
import { getFullMedalList } from '../utils.ts';

export default async (cookies: string, {
    uid, roomIDs, sendGiftType, sendGiftTime,
}:
{
    uid: number,
    roomIDs: number[],
    sendGiftType: number[],
    sendGiftTime: number,
}): Promise<void> => {
    if (roomIDs.length === 0) {
        logger.warn('无自动送礼目标直播间');
        return;
    }

    const [
        medals,
        gifts,
        giftInfo,
    ] = await Promise.all([
        getFullMedalList(cookies),
        getGiftBagList(cookies, roomIDs[0]),
        getGiftConfig(cookies),
    ]);

    const values = new Map<number, number>();
    giftInfo.forEach((value) => values.set(value.id, Math.ceil(value.price / 100)));
    values.set(30607, 50);

    const pending = gifts.list.filter((value) => (
        sendGiftType.includes(value.gift_id)
        && value.expire_at - (Date.now() / 1000) < 60 * 60 * 24 * sendGiftTime
    )).sort((left, right) => {
        if (left.expire_at !== right.expire_at) {
            return left.expire_at - right.expire_at;
        }

        return (values.get(right.gift_id) ?? 0) - (values.get(left.gift_id) ?? 0);
    });

    logger.debug(util.format('Pending Gifts: %o', pending));

    for (const roomID of roomIDs) {
        // eslint-disable-next-line no-await-in-loop
        const roomInfo = await doRoomInit(cookies, roomID);
        const medal = medals.find((value) => value.roomID === roomID);

        let restIntimacy = medal ? (medal.dayLimit - medal.todayIntimacy) : 1500;
        logger.debug(`Room ${roomID.toString()} Daily Intimacy Rest ${restIntimacy.toString()}`);

        for (const gift of pending) {
            const value = values.get(gift.gift_id);
            const sendNum = value !== undefined
                ? Math.min(Math.floor(restIntimacy / value), gift.gift_num)
                : 0;

            if (value !== undefined && sendNum > 0) {
                logger.debug(`Send Gift ${gift.gift_name} (${gift.gift_id.toString()}) ${sendNum.toString()}/${gift.gift_num.toString()} to room ${roomID.toString()}`);

                // eslint-disable-next-line no-await-in-loop
                await sendGiftBag(
                    cookies,
                    uid,
                    gift.gift_id,
                    roomInfo.uid,
                    sendNum,
                    gift.bag_id,
                    roomInfo.room_id,
                    Math.round(Date.now() / 1000),
                );

                gift.gift_num -= sendNum;
                restIntimacy -= value * sendNum;

                logger.info(`向${roomID.toString()}送出礼物${gift.gift_name}x${sendNum.toString()}成功: 获得亲密度${(value * sendNum).toString()} (今日距离上限${restIntimacy.toString()})`);
            }
        }
    }
};
