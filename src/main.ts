import util from 'node:util';

import { getUserInfo } from './api.ts';
import logger from './logger.ts';
import danmu from './modules/danmu.ts';
import getCoupon from './modules/getCoupon.ts';
import gift from './modules/gift.ts';
import groupSignIn from './modules/groupSignin.ts';
import likeLive from './modules/likeLive.ts';
import login from './modules/login.ts';
import share from './modules/share.ts';
import shareLive from './modules/shareLive.ts';
import signin from './modules/signin.ts';
import useCoupon from './modules/useCoupon.ts';
import watch from './modules/watch.ts';
import watchLive from './modules/watchLive.ts';
import { retry, getFullMedalList } from './utils.ts';

import type { Medal } from './utils.ts';

interface Config {
    login: boolean,
    watchVideo: boolean,
    shareVideo: boolean,
    liveDailySign: boolean,
    groupDailySign: boolean,
    medalDanmu: boolean,
    medalDanmuContent: string[],
    sendGift: boolean,
    roomIDs: number[],
    sendGiftType: number[],
    sendGiftTime: number,
    likeLive: boolean,
    shareLive: boolean,
    watchLive: boolean,
    getCoupon: boolean,
    useCoupon: boolean,
    useCouponMode: number,
    useCouponTime: number,
    useCouponRest: boolean,
    chargeMsg: string,
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
                uid, medals, danmuList, roomIDs, sendGiftType, sendGiftTime,
            }: {
                uid: number,
                medals: Medal[],
                useCouponMode: number,
                useCouponTime: number,
                useCouponRest: boolean,
                chargeMsg: string,
                danmuList: string[],
                roomIDs: number[],
                sendGiftType: number[],
                sendGiftTime: number,
            },
        ) => Promise<void>,
    ][] = [
        [
            config.login,
            '主站签到',
            login,
        ],
        [
            config.watchVideo,
            '主站观看视频',
            watch,
        ],
        [
            config.shareVideo,
            '主站分享视频',
            share,
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
            config.liveDailySign,
            '直播区签到',
            signin,
        ],
        [
            config.groupDailySign,
            '应援团签到',
            groupSignIn,
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
                        useCouponMode: config.useCouponMode,
                        useCouponTime: config.useCouponTime,
                        useCouponRest: config.useCouponRest,
                        chargeMsg: config.chargeMsg,
                        danmuList: config.medalDanmuContent,
                        roomIDs: config.roomIDs,
                        sendGiftType: config.sendGiftType,
                        sendGiftTime: config.sendGiftTime,
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
