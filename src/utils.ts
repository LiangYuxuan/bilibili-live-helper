import CryptoJS from 'crypto-js';

import {getMedalList, MedalList, FansMedalList} from './api.js';

export interface Medal {
    userID: number;
    targetID: number;
    targetName: string;
    targetFace: string;
    roomID: number;
    liveStreamStatus: boolean;
    medalID: number;
    medalName: string;
    medalColor: number;
    medalColorStart: number;
    medalColorEnd: number;
    medalColorBorder: number;

    level: number;
    isReceived: boolean;
    isLighted: boolean;
    canDelete: boolean;
    receiveTime: number;
    lastWearTime: number;
    score: number;
    intimacy: number;
    todayIntimacy: number;
    nextIntimacy: number;
    dayLimit: number;

    status: boolean;
    masterStatus: boolean;
    masterAvailable: boolean;
    guardType: number;
    guardLevel: number;
    guardMedalTitle: string;
}

const handleMedalList = (list: FansMedalList[]): Medal[] => {
    const result: Medal[] = [];

    list.forEach((value) => {
        const medal: Medal = {
            userID: value.uid,
            targetID: value.target_id,
            targetName: value.target_name,
            targetFace: value.target_face,
            roomID: value.roomid,
            liveStreamStatus: value.live_stream_status !== 0,
            medalID: value.medal_id,
            medalName: value.medal_name,
            medalColor: value.medal_color,
            medalColorStart: value.medal_color_start,
            medalColorEnd: value.medal_color_end,
            medalColorBorder: value.medal_color_border,

            level: value.level,
            isReceived: value.is_receive !== 0,
            isLighted: value.is_lighted !== 0,
            canDelete: value.can_delete,
            receiveTime: Date.parse(value.receive_time),
            lastWearTime: value.last_wear_time,
            score: value.score,
            intimacy: value.intimacy,
            todayIntimacy: value.today_intimacy,
            nextIntimacy: value.next_intimacy,
            dayLimit: value.day_limit,

            status: value.status !== 0,
            masterStatus: value.master_status !== 0,
            masterAvailable: value.master_available !== 0,
            guardType: value.guard_type,
            guardLevel: value.guard_level,
            guardMedalTitle: value.guard_medal_title,
        };

        result.push(medal);
    });

    return result;
};

export const getFullMedalList = async (cookies: string): Promise<Medal[]> => {
    const firstPage = await getMedalList(cookies);
    const length = firstPage.pageinfo.totalpages;
    let result = handleMedalList(firstPage.fansMedalList);

    const allPages: Promise<MedalList>[] = [];
    for (let i = 2; i <= length; ++i) {
        allPages.push(getMedalList(cookies, i));
    }
    (await Promise.all(allPages)).forEach((value) => {
        result = result.concat(handleMedalList(value.fansMedalList));
    });

    return result;
};

export const showMedalStatus = async (cookies: string) => {
    const medals = (await getFullMedalList(cookies)).sort((a, b) => b.score - a.score);
    console.log('Name\tLevel\tCurrent\tTotal\tToday\tRemain');
    medals.forEach((value) => {
        const name = value.medalName;
        const level = value.level;
        const current = value.intimacy;
        const next = value.nextIntimacy;
        const today = value.todayIntimacy;
        const remain = Math.ceil((value.nextIntimacy - value.intimacy) / value.todayIntimacy);
        console.log(`${name}\t${level}\t${current}\t${next}\t+${today}\t${remain} dys`);
    });
};

export const calcHeartbeatHMAC = (
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
