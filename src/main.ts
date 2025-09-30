import util from 'node:util';

import { getUserInfo } from './api.ts';
import logger from './logger.ts';
import danmu from './modules/danmu.ts';
import getCoupon from './modules/getCoupon.ts';
import gift from './modules/gift.ts';
import likeLive from './modules/likeLive.ts';
import login from './modules/login.ts';
import shareLive from './modules/shareLive.ts';
import useCoupon from './modules/useCoupon.ts';
import watchLive from './modules/watchLive.ts';
import { retry, getFullMedalList } from './utils.ts';

import type { Medal } from './utils.ts';

interface Config {
    login: boolean,
    medalDanmu: boolean,
    medalDanmuContent: string[],
    sendGift: boolean,
    roomIDs: number[],
    sendGiftType: number[],
    sendGiftTime: number,
    likeLive: boolean,
    shareLive: boolean,
    watchLive: boolean,
    watchLiveRoomIDs: number[],
    getCoupon: boolean,
    useCoupon: boolean,
    useCouponTime: number,
}

export default async (cookies: string, config: Config) => {
    const [userInfo, medals] = await Promise.all([
        getUserInfo(cookies),
        getFullMedalList(cookies),
    ]);

    logger.debug(util.format('UserInfo: %o', userInfo));
    logger.debug(util.format('Medals: %o', medals));

    const { uid } = userInfo;

    const castTable: [
        boolean, string, (
            cookies: string, {
                uid, medals, danmuList, roomIDs, sendGiftType, sendGiftTime, watchLiveRoomIDs,
            }: {
                uid: number,
                medals: Medal[],
                useCouponTime: number,
                danmuList: string[],
                roomIDs: number[],
                sendGiftType: number[],
                sendGiftTime: number,
                watchLiveRoomIDs: number[],
            },
        ) => Promise<void>,
    ][] = [
        [
            config.login,
            '主站签到',
            login,
        ],
        [
            config.getCoupon,
            '领取B币卷',
            getCoupon,
        ],
        [
            config.useCoupon,
            '使用B币卷',
            useCoupon,
        ],
        [
            config.medalDanmu,
            '粉丝勋章弹幕',
            danmu,
        ],
        [
            config.sendGift,
            '赠送背包礼物',
            gift,
        ],
        [
            config.likeLive,
            '直播间点赞',
            likeLive,
        ],
        [
            config.shareLive,
            '直播间分享',
            shareLive,
        ],
        [
            config.watchLive,
            '直播间观看',
            watchLive,
        ],
    ];

    for (const [
        cast,
        name,
        module,
    ] of castTable) {
        if (cast) {
            try {
                // eslint-disable-next-line no-await-in-loop
                await retry(
                    () => module(cookies, {
                        uid,
                        medals,
                        useCouponTime: config.useCouponTime,
                        danmuList: config.medalDanmuContent,
                        roomIDs: config.roomIDs,
                        sendGiftType: config.sendGiftType,
                        sendGiftTime: config.sendGiftTime,
                        watchLiveRoomIDs: config.watchLiveRoomIDs,
                    }),
                    3,
                    1000,
                    `${name}成功`,
                    `${name}失败`,
                );
            } catch {
                // nothing to do
            }
        }
    }
};
