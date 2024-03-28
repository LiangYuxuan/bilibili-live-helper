import logger from '../logger.ts';
import { getRoomInfo, likeInteract } from '../api.ts';
import { retry, delay, Medal } from '../utils.ts';

export default async (
    cookies: string,
    { medals }: { medals: Medal[] },
): Promise<void> => {
    // eslint-disable-next-line no-restricted-syntax
    for (const medal of medals.filter((value) => value.level < 20)) {
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

        logger.debug(`Send like to Room ${roomID.toString()} (${medal.roomID.toString()}) (${medal.targetName})`);

        // eslint-disable-next-line no-await-in-loop
        await retry(
            () => likeInteract(cookies, roomID, medal.targetID, Date.now()),
            3,
            5000,
            `粉丝勋章${medal.medalName} (${medal.targetName}) 点赞房间成功`,
            `粉丝勋章${medal.medalName} (${medal.targetName}) 点赞房间失败`,
        );

        // eslint-disable-next-line no-await-in-loop
        await delay(4000);
    }
};
