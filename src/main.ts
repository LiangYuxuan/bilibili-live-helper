import logger from './logger.js';
import {getUserInfo} from './api.js';
import {getFullMedalList, Medal} from './utils.js';

import login from './modules/login.js';
import watch from './modules/watch.js';
import share from './modules/share.js';
import signin from './modules/signin.js';
import groupSignIn from './modules/groupSignin.js';
import danmu from './modules/danmu.js';
import gift from './modules/gift.js';
// import heartbeat from './modules/heartbeat.js';

interface Config {
    login: boolean,
    watchVideo: boolean,
    shareVideo: boolean,
    liveDailySign: boolean,
    groupDailySign: boolean,
    medalDanmu: boolean,
    medalDanmuContent: string[],
    littleHeart: boolean,
    sendGift: boolean,
    roomIDs: number[],
    sendGiftType: number[],
    sendGiftTime: number,
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
                danmuList: string[],
                roomIDs: number[],
                sendGiftType: number[],
                sendGiftTime: number},
        ) => Promise<[boolean, string][]>
    ][] = [
        [config.login, '主站签到', login],
        [config.watchVideo, '主站观看视频', watch],
        [config.shareVideo, '主站分享视频', share],
        [config.liveDailySign, '直播区签到', signin],
        [config.groupDailySign, '应援团签到', groupSignIn],
        [config.medalDanmu, '粉丝勋章弹幕', danmu],
        [config.sendGift, '赠送背包礼物', gift],
        // [config.littleHeart, '获取小心心', heartbeat],
    ];

    let isAllSuccess = true;
    for (const [cast, name, module] of castTable) {
        if (cast) {
            for (let i = 0; i < 3; i++) {
                try {
                    reportLog.push(...await module(cookies, {
                        uid: uid,
                        medals: medals,
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
                        reportLog.push([false, `${name}失败: ${(error as Error).message}`]);
                    }
                }
            }
        }
    }

    return [isAllSuccess, reportLog];
};
