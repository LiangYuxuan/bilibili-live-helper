import util from 'util';

import logger from '../logger.js';
import {getWearedMedal, wearMedal, takeOffMedal, getRoomInfo, sendDanmu} from './../api.js';
import {Medal} from './../utils.js';

export default async (
    cookies: string, {medals, danmuList}: {medals: Medal[], danmuList: string[]},
): Promise<[boolean, string][]> => {
    const reportLog: [boolean, string][] = [];

    try {
        const wearedMedal = (await getWearedMedal(cookies))?.medal_id;

        logger.debug('Weared Medal: %o', wearedMedal);

        for (const medal of medals) {
            let roomID = medal.roomID;
            if (roomID < 10000) {
                for (let i = 0; i < 3; i++) {
                    try {
                        const roomInfo = await getRoomInfo(cookies, roomID);
                        roomID = roomInfo.room_id;
                        break;
                    } catch (error) {
                        logger.error('房间%d信息获取失败', medal.roomID);
                        reportLog.push([false, util.format('房间%d信息获取失败', medal.roomID)]);
                    }
                }
            }
            if (roomID < 10000) {
                // failed to get room info, skip this medal
                continue;
            }

            await wearMedal(cookies, medal.medalID);

            logger.debug('Wear Medal: %o', medal);

            await new Promise((resolve) => setTimeout(resolve, 2000));

            for (let i = 0; i < 3; i++) {
                try {
                    const danmu = danmuList[Math.floor(Math.random() * danmuList.length)];

                    logger.debug('Send danmu %s to Room %d (%d) (%s)', danmu, roomID, medal.roomID, medal.targetName);

                    await sendDanmu(cookies, danmu, roomID);

                    const logText = '粉丝勋章%s (%s) 打卡成功: ' +
                        (medal.level > 20 ? '粉丝勋章已点亮' : '粉丝勋章已点亮 (亲密度+100)');
                    logger.info(logText, medal.medalName, medal.targetName);
                    reportLog.push([true, util.format(logText, medal.medalName, medal.targetName)]);

                    break;
                } catch (error) {
                    logger.error('粉丝勋章%s (%s) 打卡失败', medal.medalName, medal.targetName);
                    reportLog.push([false, util.format('粉丝勋章%s (%s) 打卡失败', medal.medalName, medal.targetName)]);
                    await new Promise((resolve) => setTimeout(resolve, 3000));
                }
            }

            await new Promise((resolve) => setTimeout(resolve, 3000));
        }

        if (wearedMedal) {
            await wearMedal(cookies, wearedMedal);
            logger.debug('Restore weared medal %d', wearedMedal);
        } else {
            await takeOffMedal(cookies);
            logger.debug('Take off weared medal');
        }

        logger.info('粉丝勋章打卡成功');
        reportLog.push([true, '粉丝勋章打卡成功']);
    } catch (error) {
        logger.error(error);
        reportLog.push([false, '粉丝勋章打卡失败']);
        throw reportLog;
    }

    return reportLog;
};
