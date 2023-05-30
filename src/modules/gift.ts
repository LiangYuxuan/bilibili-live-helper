import util from 'util';

import logger from '../logger.js';
import {
    getGiftBagList, getGiftConfig, doRoomInit, sendGiftBag,
} from '../api.js';
import { getFullMedalList } from '../utils.js';

export default async (cookies: string, {
    uid, roomIDs, sendGiftType, sendGiftTime,
}:
{ uid: number, roomIDs: number[], sendGiftType: number[], sendGiftTime: number }): Promise<[boolean, string][]> => {
    const reportLog: [boolean, string][] = [];

    try {
        if (roomIDs.length > 0) {
            const [medals, gifts, giftInfo] = await Promise.all([
                getFullMedalList(cookies),
                getGiftBagList(cookies),
                getGiftConfig(cookies),
            ]);

            const values: Map<number, number> = new Map();
            giftInfo.forEach((value) => values.set(value.id, Math.ceil(value.price / 100)));
            values.set(30607, 50);

            const pending = gifts.list.filter((value) => (
                sendGiftType.includes(value.gift_id)
                    && value.expire_at - gifts.time < 60 * 60 * 24 * sendGiftTime
            )).sort((left, right) => {
                if (left.expire_at !== right.expire_at) {
                    return left.expire_at - right.expire_at;
                }

                return (values.get(right.gift_id) ?? 0) - (values.get(left.gift_id) ?? 0);
            });

            logger.debug('Pending Gifts: %o', pending);

            for (const roomID of roomIDs) {
                const medal = medals.filter((value) => value.roomID === roomID)[0];
                if (!medal) {
                    logger.error('无法找到房间%d对应的粉丝勋章', roomID);
                    reportLog.push([false, util.format('无法找到房间%d对应的粉丝勋章', roomID)]);
                    continue;
                }

                let roomInfo;
                try {
                    roomInfo = await doRoomInit(cookies, roomID);
                } catch (error) {
                    logger.error('房间%d信息获取失败', roomID);
                    reportLog.push([false, util.format('房间%d信息获取失败', roomID)]);
                    continue;
                }

                let restIntimacy = medal.dayLimit - medal.todayIntimacy;
                logger.debug('%s Daily Intimacy Rest %d', medal.medalName, restIntimacy);

                for (const gift of pending) {
                    if (gift.gift_num === 0) continue;

                    const value = values.get(gift.gift_id);
                    if (value === undefined) continue;

                    const sendNum = Math.min(Math.floor(restIntimacy / value), gift.gift_num);
                    if (sendNum === 0) continue;

                    logger.debug(
                        'Send Gift %s (%d) %d/%d to %s',
                        gift.gift_name,
                        gift.gift_id,
                        sendNum,
                        gift.gift_num,
                        medal.medalName,
                    );

                    try {
                        await sendGiftBag(
                            cookies,
                            uid,
                            gift.gift_id,
                            medal.targetID,
                            sendNum,
                            gift.bag_id,
                            roomInfo.room_id,
                            Math.round(Date.now() / 1000),
                        );

                        gift.gift_num -= sendNum;
                        restIntimacy -= value * sendNum;

                        logger.info(
                            '向%s送出礼物%sx%d成功: 获得亲密度%d (今日距离上限%d)',
                            medal.medalName,
                            gift.gift_name,
                            sendNum,
                            value * sendNum,
                            restIntimacy,
                        );
                        reportLog.push([true, util.format(
                            '向%s送出礼物%sx%d成功: 获得亲密度%d (今日距离上限%d)',
                            medal.medalName,
                            gift.gift_name,
                            sendNum,
                            value * sendNum,
                            restIntimacy,
                        )]);
                    } catch (error) {
                        logger.error('向%s送出礼物%sx%d失败', medal.medalName, gift.gift_name, sendNum);
                        reportLog.push([false, util.format('向%s送出礼物%sx%d失败', medal.medalName, gift.gift_name, sendNum)]);
                        throw error;
                    }
                }
            }
        } else {
            logger.warn('无自动送礼目标直播间');
            reportLog.push([true, '无自动送礼目标直播间']);
        }

        logger.info('赠送背包礼物成功');
        reportLog.push([true, '赠送背包礼物成功']);
    } catch (error) {
        logger.error(error);
        reportLog.push([false, '赠送背包礼物失败']);
        throw reportLog;
    }

    return reportLog;
};
