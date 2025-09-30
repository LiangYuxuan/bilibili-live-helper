import util from 'node:util';

import {
    getWearedMedal, wearMedal, takeOffMedal, getRoomInfo, sendDanmu,
} from '../api.ts';
import logger from '../logger.ts';
import { retry, delay } from '../utils.ts';

import type { Medal } from '../utils.ts';

export default async (
    cookies: string,
    { medals, danmuList }: { medals: Medal[], danmuList: string[] },
): Promise<void> => {
    const wearedMedal = (await getWearedMedal(cookies))?.medal_id;

    logger.debug(util.format('Weared Medal: %o', wearedMedal));

    for (const medal of medals) {
        let { roomID } = medal;
        if (roomID < 10000) {
            // eslint-disable-next-line no-await-in-loop
            const roomInfo = await retry(
                () => getRoomInfo(cookies, roomID),
                3,
                1000,
                `房间${medal.roomID.toString()}信息获取成功`,
                `房间${medal.roomID.toString()}信息获取失败`,
            );
            roomID = roomInfo.room_id;
        }

        // eslint-disable-next-line no-await-in-loop
        await wearMedal(cookies, medal.medalID);

        logger.debug(util.format('Wear Medal: %o', medal));

        // eslint-disable-next-line no-await-in-loop
        await delay(2000);

        const danmu = danmuList[Math.floor(Math.random() * danmuList.length)];

        logger.debug(`Send danmu ${danmu} to Room ${roomID.toString()} (${medal.roomID.toString()}) (${medal.targetName})`);

        // eslint-disable-next-line no-await-in-loop
        await retry(
            async () => {
                for (let i = 0; i < 10; i += 1) {
                    // eslint-disable-next-line no-await-in-loop
                    await sendDanmu(cookies, danmu, roomID);

                    // eslint-disable-next-line no-await-in-loop
                    await delay(1000);
                }
            },
            3,
            5000,
            `粉丝勋章${medal.medalName} (${medal.targetName}) 打卡成功`,
            `粉丝勋章${medal.medalName} (${medal.targetName}) 打卡失败`,
        );

        // eslint-disable-next-line no-await-in-loop
        await delay(4000);
    }

    if (wearedMedal !== undefined) {
        await wearMedal(cookies, wearedMedal);
        logger.debug(`Restore weared medal ${wearedMedal.toString()}`);
    } else {
        await takeOffMedal(cookies);
        logger.debug('Take off weared medal');
    }
};
