import assert from 'assert';
import util from 'util';

import CryptoJS from 'crypto-js';

import logger from '../logger.js';
import {getGiftBagList, getRoomInfo, enterRoomHeartbeat, inRoomHeartbeat} from './../api.js';
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
    while (duration < 300) {
        await new Promise((resolve) => setTimeout(resolve, nextTime * 1000));
        duration += nextTime;

        const now = Date.now();
        const hmac = calcHeartbeatHMAC(
            key, rules, parentAreaID, areaID, sequence, roomID,
            buvid, uuid, timestamp, nextTime, now,
        );

        logger.debug('In Room Heartbeat in %d (%d) (%d)', originRoomID, roomID, sequence);
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

const getLittleHeart = async (
    reportLog: [boolean, string][], cookies: string, buvid: string, medals: Medal[], rest: number,
): Promise<void> => {
    const loopTime = Math.ceil(rest / medals.length);

    for (let i = 0; i < loopTime; ++i) {
        for (const medal of medals) {
            logger.debug('Starting heartbeat on %s (%d %d)', medal.targetName, medal.roomID, medal.targetID);

            roomHeartbeat(cookies, buvid, medal.roomID, medal.targetID).catch((error) => {
                logger.error('房间%s心跳失败', medal.targetName);
                logger.error(error);

                reportLog.push([false, util.format('房间%s心跳失败', medal.targetName)]);
                reportLog.push([false, (error as Error).message]);
            });

            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        await new Promise((resolve) => setTimeout(resolve, 6 * 60 * 1000));
    }
};

const getLittleHeartCount = async (cookies: string): Promise<number> => {
    const gifts = await getGiftBagList(cookies);
    return gifts.list.map((value) => {
        return (
            value.gift_id === 30607 && value.expire_at - gifts.time > 60 * 60 * 24 * 6
        ) ? value.gift_num : 0;
    }).reduce((prev, curr) => prev + curr, 0);
};

export default async (
    cookies: string, {medals}: {medals: Medal[]},
): Promise<[boolean, string][]> => {
    const reportLog: [boolean, string][] = [];

    try {
        let count = await getLittleHeartCount(cookies);
        if (count >= 24) {
            logger.info('获取小心心成功: 今天已经完成');
            reportLog.push([true, '获取小心心成功: 今天已经完成']);
            return reportLog;
        }

        logger.debug('Little Heart %d / 24', count);

        const buvid = extractBUVID(cookies);

        assert(buvid !== undefined, '获取LIVE_BUVID值失败');

        logger.info('开始获取小心心');
        reportLog.push([true, '开始获取小心心']);

        while (count < 24) {
            await getLittleHeart(reportLog, cookies, buvid, medals, 24 - count);
            count = await getLittleHeartCount(cookies);
        }

        logger.info('获取小心心成功');
        reportLog.push([true, '获取小心心成功']);
    } catch (error) {
        logger.error(error);
        reportLog.push([false, '获取小心心失败']);
        throw reportLog;
    }

    return reportLog;
};
