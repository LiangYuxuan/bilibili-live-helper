import util from 'util';

import logger from '../logger.js';
import {getRoomInfo, trigerInteract} from './../api.js';
import {getFullMedalList} from './../utils.js';

export default async (cookies: string): Promise<[boolean, string][]> => {
    const reportLog: [boolean, string][] = [];

    try {
        const medals = await getFullMedalList(cookies);

        for (const medal of medals) {
            if (medal.level >= 20) {
                continue;
            }

            let roomID = medal.roomID;
            if (roomID < 10000) {
                let fetchStatus = false;
                for (let i = 0; i < 3; i++) {
                    try {
                        const roomInfo = await getRoomInfo(cookies, roomID);
                        roomID = roomInfo.room_id;
                        fetchStatus = true;
                        break;
                    } catch (error) {
                        logger.error('房间%d信息获取失败', medal.roomID);
                        reportLog.push([false, util.format('房间%d信息获取失败', medal.roomID)]);
                    }
                }
                if (!fetchStatus) {
                    // failed to get room info, skip this medal
                    logger.error('跳过徽章%d', medal.medalName);
                    reportLog.push([false, util.format('跳过徽章%d', medal.medalName)]);
                    continue;
                }
            }

            for (let count = 0; count < 3; count++) {
                for (let i = 0; i < 3; i++) {
                    try {
                        logger.debug('Share Room %d (%d) (%s)', roomID, medal.roomID, medal.targetName);

                        await trigerInteract(cookies, roomID);

                        logger.info('粉丝勋章%s (%s) 分享房间成功 (%d/3)', medal.medalName, medal.targetName, count + 1);
                        reportLog.push([true, util.format('粉丝勋章%s (%s) 分享房间成功 (%d/3)', medal.medalName, medal.targetName, count + 1)]);

                        break;
                    } catch (error) {
                        logger.error('粉丝勋章%s (%s) 分享房间失败 (%d/3)', medal.medalName, medal.targetName, count + 1);
                        reportLog.push([false, util.format('粉丝勋章%s (%s) 分享房间失败 (%d/3)', medal.medalName, medal.targetName, count + 1)]);
                        await new Promise((resolve) => setTimeout(resolve, 5000));
                    }
                }

                await new Promise((resolve) => setTimeout(resolve, 4000));
            }
        }

        logger.info('直播间分享成功');
        reportLog.push([true, '直播间分享成功']);
    } catch (error) {
        logger.error(error);
        reportLog.push([false, '直播间分享失败']);
        throw reportLog;
    }

    return reportLog;
};
