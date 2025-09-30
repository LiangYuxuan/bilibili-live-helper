import { getRoomInfo, trigerInteract } from '../api.ts';
import logger from '../logger.ts';
import { retry, delay } from '../utils.ts';

import type { Medal } from '../utils.ts';

export default async (
    cookies: string,
    { medals }: { medals: Medal[] },
): Promise<void> => {
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

        logger.debug(`Share Room ${roomID.toString()} (${medal.roomID.toString()}) (${medal.targetName})`);

        // eslint-disable-next-line no-await-in-loop
        await retry(
            () => trigerInteract(cookies, roomID),
            3,
            5000,
            `粉丝勋章${medal.medalName} (${medal.targetName}) 分享房间成功`,
            `粉丝勋章${medal.medalName} (${medal.targetName}) 分享房间失败`,
        );

        // eslint-disable-next-line no-await-in-loop
        await delay(4000);
    }
};
