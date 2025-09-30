import assert from 'node:assert';

import {
    HmacMD5,
    HmacSHA1,
    HmacSHA256,
    HmacSHA224,
    HmacSHA512,
    HmacSHA384,
    Hex,
} from 'crypto-es';

import { getRoomInfo, enterRoomHeartbeat, inRoomHeartbeat } from '../api.ts';
import logger from '../logger.ts';
import { retry, delay } from '../utils.ts';

import type { Medal } from '../utils.ts';

const extractBUVID = (cookies: string): string | undefined => {
    const target = cookies.split(';').filter((value) => /^\s*LIVE_BUVID=/.test(value));
    return target.length > 0 ? target[0].replace(/^\s*LIVE_BUVID=(.*)\s*/, '$1') : undefined;
};

const calcHeartbeatHMAC = (
    key: string,
    rules: number[],
    parentAreaID: number,
    areaID: number,
    sequence: number,
    roomID: number,
    buvid: string,
    uuid: string,
    ets: number,
    time: number,
    ts: number,
): string => {
    const data = {
        platform: 'web',
        // eslint-disable-next-line @typescript-eslint/naming-convention
        parent_id: parentAreaID,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        area_id: areaID,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        seq_id: sequence,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        room_id: roomID,
        buvid,
        uuid,
        ets,
        time,
        ts,
    };

    return rules.reduce((prev, rule) => {
        switch (rule) {
            case 0:
                return HmacMD5(prev, key).toString(Hex);
            case 1:
                return HmacSHA1(prev, key).toString(Hex);
            case 2:
                return HmacSHA256(prev, key).toString(Hex);
            case 3:
                return HmacSHA224(prev, key).toString(Hex);
            case 4:
                return HmacSHA512(prev, key).toString(Hex);
            case 5:
                return HmacSHA384(prev, key).toString(Hex);
            default:
                return prev;
        }
    }, JSON.stringify(data));
};

const roomHeartbeat = async (
    cookies: string,
    buvid: string,
    originRoomID: number,
    targetID: number,
): Promise<void> => {
    const roomInfo = await getRoomInfo(cookies, originRoomID);
    const roomID = roomInfo.room_id;
    const parentAreaID = roomInfo.parent_area_id;
    const areaID = roomInfo.area_id;

    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (t) => {
        // eslint-disable-next-line no-bitwise
        const e = 16 * Math.random() | 0;
        // eslint-disable-next-line no-bitwise, @stylistic/no-mixed-operators
        return (t === 'x' ? e : 3 & e | 8).toString(16);
    });
    let sequence = 0;

    logger.debug(`Enter Room Heartbeat in ${originRoomID.toString()} (${roomID.toString()})`);
    const result = await enterRoomHeartbeat(
        cookies,
        JSON.stringify([
            parentAreaID,
            areaID,
            sequence,
            roomID,
        ]),
        JSON.stringify([buvid, uuid]),
        targetID,
        Date.now(),
        0,
        JSON.stringify([]),
    );
    sequence += 1;

    let duration = 0;
    let nextTime = result.heartbeat_interval;
    let { timestamp } = result;
    let key = result.secret_key;
    let rules = result.secret_rule;
    while (duration < 25 * 60) { // 25 minutes
        // eslint-disable-next-line no-await-in-loop
        await delay(nextTime * 1000);
        duration += nextTime;

        const now = Date.now();
        const hmac = calcHeartbeatHMAC(
            key,
            rules,
            parentAreaID,
            areaID,
            sequence,
            roomID,
            buvid,
            uuid,
            timestamp,
            nextTime,
            now,
        );

        logger.debug(`In Room Heartbeat in ${originRoomID.toString()} (${roomID.toString()}) (${sequence.toString()}) +${duration.toString()}s`);
        // eslint-disable-next-line no-await-in-loop
        const res = await inRoomHeartbeat(
            cookies,
            hmac,
            JSON.stringify([
                parentAreaID,
                areaID,
                sequence,
                roomID,
            ]),
            JSON.stringify([buvid, uuid]),
            targetID,
            timestamp,
            key,
            nextTime,
            now,
        );

        sequence += 1;
        nextTime = res.heartbeat_interval;
        timestamp = res.timestamp;
        key = res.secret_key;
        rules = res.secret_rule;
    }
};

export default async (
    cookies: string,
    { medals, watchLiveRoomIDs }: { medals: Medal[], watchLiveRoomIDs: number[] },
) => {
    const buvid = extractBUVID(cookies);

    assert(buvid !== undefined, '获取LIVE_BUVID值失败');

    for (const roomID of watchLiveRoomIDs) {
        const medal = medals.find((value) => value.roomID === roomID);

        if (medal !== undefined) {
            // eslint-disable-next-line no-await-in-loop
            await retry(
                () => {
                    logger.info(`开始观看直播间 ${medal.targetName} (${medal.roomID.toString()})`);
                    return roomHeartbeat(cookies, buvid, medal.roomID, medal.targetID);
                },
                3,
                1000,
                `观看直播间 ${medal.targetName} (${medal.roomID.toString()}) 完成`,
                `观看直播间 ${medal.targetName} (${medal.roomID.toString()}) 失败`,
            );
        } else {
            logger.warn(`未找到直播间 ${roomID.toString()} 对应的粉丝勋章，跳过观看直播。`);
        }
    }
};
