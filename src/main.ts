import logger from './logger.js';
import {getUserInfo} from './api.js';
import {getFullMedalList, Medal} from './utils.js';

import login from './modules/login.js';
import watch from './modules/watch.js';
import share from './modules/share.js';
import getCoupon from './modules/getCoupon.js';
import useCoupon from './modules/useCoupon.js';
import signin from './modules/signin.js';
import groupSignIn from './modules/groupSignin.js';
import danmu from './modules/danmu.js';
import gift from './modules/gift.js';
import likeLive from './modules/likeLive.js';
import shareLive from './modules/shareLive.js';
import watchLive from './modules/watchLive.js';

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

export default async (cookies: string, config: Config): Promise<[boolean, [boolean, string][]]> => {
    const [userInfo, medals] = await Promise.all([
        getUserInfo(cookies),
        getFullMedalList(cookies),
    ]);

    logger.debug('UserInfo: %o', userInfo);
    logger.debug('Medals: %o', medals);

    const uid = userInfo.uid;
    const reportLog: [boolean, string][] = [];

    const castTable: [
        boolean, string, (
            cookies: string, {uid, medals, danmuList, roomIDs, sendGiftType, sendGiftTime}: {
                uid: number,
                medals: Medal[],
                useCouponMode: number,
                useCouponTime: number,
                useCouponRest: boolean,
                chargeMsg: string,
                danmuList: string[],
                roomIDs: number[],
                sendGiftType: number[],
                sendGiftTime: number},
        ) => Promise<[boolean, string][]>
    ][] = [
        [config.login, '????????????', login],
        [config.watchVideo, '??????????????????', watch],
        [config.shareVideo, '??????????????????', share],
        [config.getCoupon, '??????B??????', getCoupon],
        [config.useCoupon, '??????B??????', useCoupon],
        [config.liveDailySign, '???????????????', signin],
        [config.groupDailySign, '???????????????', groupSignIn],
        [config.medalDanmu, '??????????????????', danmu],
        [config.sendGift, '??????????????????', gift],
        [config.likeLive, '???????????????', likeLive],
        [config.shareLive, '???????????????', shareLive],
        [config.watchLive, '???????????????', watchLive],
    ];

    let isAllSuccess = true;
    for (const [cast, name, module] of castTable) {
        if (cast) {
            for (let i = 0; i < 3; i++) {
                try {
                    reportLog.push(...await module(cookies, {
                        uid: uid,
                        medals: medals,
                        useCouponMode: config.useCouponMode,
                        useCouponTime: config.useCouponTime,
                        useCouponRest: config.useCouponRest,
                        chargeMsg: config.chargeMsg,
                        danmuList: config.medalDanmuContent,
                        roomIDs: config.roomIDs,
                        sendGiftType: config.sendGiftType,
                        sendGiftTime: config.sendGiftTime,
                    }));
                    break;
                } catch (error) {
                    isAllSuccess = false;
                    if (error instanceof Array) {
                        reportLog.push(...error);
                    } else {
                        logger.error(error);
                        reportLog.push([false, `${name}??????: ${(error as Error).message}`]);
                    }
                }
            }
        }
    }

    return [isAllSuccess, reportLog];
};
