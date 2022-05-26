import assert from 'assert';
import util from 'util';

import CryptoJS from 'crypto-js';

import logger from '../logger.js';
import {getRoomInfo, enterRoomHeartbeat, inRoomHeartbeat} from './../api.js';
import {Medal} from './../utils.js';

const extractBUVID = (cookies: string): string | undefined => {
    const target = cookies.split(';').filter((value) => /^\s*LIVE_BUVID=/.test(value));
    return target.length > 0 ? target[0].replace(/^\s*LIVE_BUVID=(.*)\s*/, '$1') : undefined;
};

const calcHeartbeatHMAC = (
    key: string, rules: number[],
    parentAreaID: number, areaID: number, sequence: number, roomID: number,
    buvid: string, uuid: string,
    ets: number, time: number, ts: number,
): string => {
    const data = {
        platform: 'web',
        parent_id: parentAreaID,
        area_id: areaID,
        seq_id: sequence,
        room_id: roomID,
        buvid: buvid,
        uuid: uuid,
        ets: ets,
        time: time,
        ts: ts,
    };
    let result = JSON.stringify(data);

    /* eslint-disable new-cap */
    for (const rule of rules) {
        if (rule === 0) {
            result = CryptoJS.HmacMD5(result, key).toString(CryptoJS.enc.Hex);
        } else if (rule === 1) {
            result = CryptoJS.HmacSHA1(result, key).toString(CryptoJS.enc.Hex);
        } else if (rule === 2) {
            result = CryptoJS.HmacSHA256(result, key).toString(CryptoJS.enc.Hex);
        } else if (rule === 3) {
            result = CryptoJS.HmacSHA224(result, key).toString(CryptoJS.enc.Hex);
        } else if (rule === 4) {
            result = CryptoJS.HmacSHA512(result, key).toString(CryptoJS.enc.Hex);
        } else if (rule === 5) {
            result = CryptoJS.HmacSHA384(result, key).toString(CryptoJS.enc.Hex);
        }
    }
    /* eslint-enable new-cap */

    return result;
};

const roomHeartbeat = async (
    cookies: string, buvid: string, originRoomID: number, targetID: number,
): Promise<void> => {
    const roomInfo = await getRoomInfo(cookies, originRoomID);
    const roomID = roomInfo.room_id;
    const parentAreaID = roomInfo.parent_area_id;
    const areaID = roomInfo.area_id;

    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (t) => {
        const e = 16 * Math.random() | 0;
        return ('x' === t ? e : 3 & e | 8).toString(16);
    });
    let sequence = 0;

    logger.debug('Enter Room Heartbeat in %d (%d)', originRoomID, roomID);
    const result = await enterRoomHeartbeat(
        cookies, JSON.stringify([parentAreaID, areaID, sequence, roomID]),
        JSON.stringify([buvid, uuid]), targetID, Date.now(), 0, JSON.stringify([]),
    );
    sequence += 1;

    let duration = 0;
    let nextTime = result.heartbeat_interval;
    let timestamp = result.timestamp;
    let key = result.secret_key;
    let rules = result.secret_rule;
    while (duration < 30 * 60) {
        await new Promise((resolve) => setTimeout(resolve, nextTime * 1000));
        duration += nextTime;

        const now = Date.now();
        const hmac = calcHeartbeatHMAC(
            key, rules, parentAreaID, areaID, sequence, roomID,
            buvid, uuid, timestamp, nextTime, now,
        );

        logger.debug('In Room Heartbeat in %d (%d) (%d) +%ds', originRoomID, roomID, sequence, duration);
        const result = await inRoomHeartbeat(
            cookies, hmac, JSON.stringify([parentAreaID, areaID, sequence, roomID]),
            JSON.stringify([buvid, uuid]), targetID, timestamp, key, nextTime, now,
        );

        sequence += 1;
        nextTime = result.heartbeat_interval;
        timestamp = result.timestamp;
        key = result.secret_key;
        rules = result.secret_rule;
    }
};

const safeRoomHeartbeat = async (
    reportLog: [boolean, string][], cookies: string, buvid: string,
    originRoomID: number, targetID: number, targetName: string,
): Promise<void> => {
    for (let i = 0; i < 3; i++) {
        try {
            logger.info('开始观看直播间 %s (%d)', targetName, originRoomID);
            reportLog.push([true, util.format('开始观看直播间 %s (%d)', targetName, originRoomID)]);

            await roomHeartbeat(cookies, buvid, originRoomID, targetID);

            logger.info('观看直播间 %s (%d) 完成', targetName, originRoomID);
            reportLog.push([true, util.format('观看直播间 %s (%d) 完成', targetName, originRoomID)]);

            return;
        } catch (error) {
            logger.error('观看直播间 %s (%d) 失败', targetName, originRoomID);
            logger.error(error);

            reportLog.push([false, util.format('观看直播间 %s (%d) 失败', targetName, originRoomID)]);
            reportLog.push([false, (error as Error).message]);
        }
    }
};

export default async (
    cookies: string, {medals}: {medals: Medal[]},
): Promise<[boolean, string][]> => {
    const reportLog: [boolean, string][] = [];

    const buvid = extractBUVID(cookies);

    assert(buvid !== undefined, '获取LIVE_BUVID值失败');

    const allRooms = [];
    for (const medal of medals) {
        if (medal.level >= 20) {
            continue;
        }

        allRooms.push(
            safeRoomHeartbeat(
                reportLog, cookies, buvid,
                medal.roomID, medal.targetID, medal.targetName,
            ),
        );

        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    try {
        await Promise.all(allRooms);
        logger.info('直播间观看成功');
        reportLog.push([true, '直播间观看成功']);
    } catch (error) {
        logger.error(error);
        reportLog.push([false, '直播间观看失败']);
        throw reportLog;
    }

    return reportLog;
};
