import assert from 'assert';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

import logger from './logger.js';
import {
    reportVideoClick, reportVideoHeartbeat, reportShare, getUserInfo,
    getNewDynamic, DynamicCard, doLiveDailySign, getGroupList, doGroupSign,
    getRoomInfo, sendDanmu, getGiftBagList, getGiftConfig, sendGiftBag,
    enterRoomHeartbeat, inRoomHeartbeat,
} from './api.js';
import {getFullMedalList, Medal, calcHeartbeatHMAC} from './utils.js';

dotenv.config();

let cookies = process.env.COOKIES ?? '';
if (cookies.length === 0) {
    try {
        cookies = fs.readFileSync(path.resolve(process.cwd(), '.cookies'), {encoding: 'utf-8'});
    } catch (error) {
        logger.crit('载入.cookies文件失败: %o', error);
        process.exit(-1);
    }
}

const loadConfig = () => {
    return {
        login: !!parseInt(process.env.LOGIN ?? ''),
        watchVideo: !!parseInt(process.env.WATCH_VIDEO ?? ''),
        shareVideo: !!parseInt(process.env.SHARE_VIDEO ?? ''),
        liveDailySign: !!parseInt(process.env.LIVE_DAILY_SIGN ?? ''),
        groupDailySign: !!parseInt(process.env.GROUP_DAILY_SIGN ?? ''),
        medalDanmu: !!parseInt(process.env.MEDAL_DANMU ?? ''),
        medalDanmuContent: (process.env.MEDAL_DANMU_CONTENT ?? '').split(','),
        littleHeart: !!parseInt(process.env.LITTLE_HEART ?? ''),
        sendGift: !!parseInt(process.env.SEND_GIFT ?? ''),
        roomID:
            (process.env.ROOM_ID ?? '').split(',').map((value) => parseInt(value)).filter((value) => !isNaN(value)),
        sendGiftType:
            (process.env.SEND_GIFT_TYPE ?? '').split(',').map((value) => parseInt(value)).filter((value) => !isNaN(value)),
        sendGiftTime: parseInt(process.env.SEND_GIFT_TIME ?? '') ?? 1,
    };
};

const extractBUVID = (cookies: string): string | undefined => {
    const target = cookies.split(';').filter((value) => /^\s*LIVE_BUVID=/.test(value));
    return target.length > 0 ? target[0].replace(/^\s*LIVE_BUVID=(.*)\s*/, '$1') : undefined;
};

const littleHeartRoom = async (originRoomID: number, targetID: number): Promise<void> => {
    const roomInfo = await getRoomInfo(cookies, originRoomID);
    const roomID = roomInfo.room_id;
    const parentAreaID = roomInfo.parent_area_id;
    const areaID = roomInfo.area_id;

    const buvid = extractBUVID(cookies);

    assert(buvid !== undefined, '获取LIVE_BUVID值失败');

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

const littleHeartHandler = async (medals: Medal[], retry = false): Promise<void> => {
    const gifts = await getGiftBagList(cookies);
    const count = gifts.list.map((value) => {
        return (
            value.gift_id === 30607 && value.expire_at - gifts.time > 60 * 60 * 24 * 6
        ) ? value.gift_num : 0;
    }).reduce((prev, curr) => prev + curr, 0);

    if (count >= 24) {
        if (!retry) {
            logger.info('获取小心心成功: 今天已经完成');
        }
        return;
    }

    const rest = 24 - count;
    const loopTime = Math.ceil(rest / medals.length);

    logger.debug('Little Heart %d / 24', count);

    for (let i = 0; i < loopTime; ++i) {
        for (const medal of medals) {
            logger.debug('Starting heartbeat on %s (%d %d)', medal.targetName, medal.roomID, medal.targetID);
            littleHeartRoom(medal.roomID, medal.targetID).catch((error) => {
                logger.error('房间%s心跳失败', medal.targetName);
                logger.error(error);
            });

            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        await new Promise((resolve) => setTimeout(resolve, 6 * 60 * 1000));
    }

    return littleHeartHandler(medals, true);
};

(async () => {
    const config = loadConfig();

    logger.debug('Config: %o', config);

    let uid = NaN;
    try {
        const userInfo = await getUserInfo(cookies);
        logger.debug('UserInfo: %o', userInfo);

        uid = userInfo.uid;
    } catch (error) {
        logger.crit(error);
        process.exit(-2);
    }

    const medals = await getFullMedalList(cookies);

    logger.debug('Medals: %o', medals);

    if (config.login) {
        // 登录
        try {
            await reportVideoClick(cookies);
            logger.info('主站每日签到成功');
        } catch (error) {
            logger.error(error);
        }
    }

    if (config.watchVideo || config.shareVideo) {
        try {
            const dynamics = await getNewDynamic(cookies, uid, 8);
            const firstCard: DynamicCard = JSON.parse(dynamics.cards[0].card);

            logger.debug('Dynamic Card: %o', firstCard);

            if (config.watchVideo) {
                // 观看视频
                try {
                    await reportVideoHeartbeat(
                        cookies, firstCard.aid, firstCard.cid, uid,
                        Math.round(Date.now() / 1000),
                    );
                    logger.info('主站观看视频(aid: %d)成功', firstCard.aid);
                } catch (error) {
                    logger.error(error);
                }
            }

            if (config.shareVideo) {
                // 分享视频
                try {
                    const message = await reportShare(cookies, firstCard.aid);
                    logger.info('主站分享视频(aid: %d)成功: %s', firstCard.aid, message);
                } catch (error) {
                    logger.error(error);
                }
            }
        } catch (error) {
            logger.error(error);
        }
    }

    if (config.liveDailySign) {
        // 直播区签到
        try {
            const message = await doLiveDailySign(cookies);
            logger.info('直播区每日签到成功: %s', message);
        } catch (error) {
            logger.error(error);
        }
    }

    if (config.groupDailySign) {
        // 应援团签到
        try {
            const groups = (await getGroupList(cookies)).list.filter((value) => {
                if (value.owner_uid === uid) {
                    // 自己不能给自己的应援团应援
                    return false;
                }

                for (const medal of medals) {
                    if (medal.targetID === value.owner_uid) {
                        // 不给20或40级粉丝牌的应援团签到
                        return medal.level !== 20 && medal.level !== 40;
                    }
                }
            });

            logger.debug('Filtered Group: %o', groups);

            await Promise.all(groups.map(async (value) => {
                const result = await doGroupSign(cookies, value.group_id, value.owner_uid);
                logger.info(
                    '应援团(%d, %d)每日签到成功: %s',
                    value.group_id, value.owner_uid,
                    result.status === 1 ? '今天已经应援过啦' : `${value.fans_medal_name}亲密度+${result.add_num}`,
                );
            }));

            logger.info('应援团每日签到完成');
        } catch (error) {
            logger.error(error);
        }
    }

    if (config.medalDanmu) {
        // 粉丝勋章打卡弹幕
        const danmuList = config.medalDanmuContent;

        for (const medal of medals) {
            try {
                let roomID = medal.roomID;
                if (roomID < 10000) {
                    try {
                        const roomInfo = await getRoomInfo(cookies, roomID);
                        roomID = roomInfo.room_id;
                    } catch (error) {
                        logger.error('房间%d信息获取失败', medal.roomID);
                        throw error;
                    }
                }

                const danmu = danmuList[Math.floor(Math.random() * danmuList.length)];
                logger.debug('Send danmu %s to Room %d (%d) (%s)', danmu, roomID, medal.roomID, medal.targetName);

                await sendDanmu(cookies, danmu, roomID);

                if (medal.level > 20) {
                    logger.info('粉丝勋章%s (%s) 打卡成功: 粉丝勋章已点亮', medal.medalName, medal.targetName);
                } else {
                    logger.info('粉丝勋章%s (%s) 打卡成功: 粉丝勋章已点亮，亲密度+100', medal.medalName, medal.targetName);
                }
            } catch (error) {
                logger.error('粉丝勋章%s (%s) 打卡失败', medal.medalName, medal.targetName);
                logger.error(error);
            }

            await new Promise((resolve) => setTimeout(resolve, 3000));
        }
    }

    if (config.sendGift) {
        // 自动送礼
        if (config.roomID.length > 0) {
            try {
                const [medals, gifts, giftInfo] = await Promise.all([
                    getFullMedalList(cookies),
                    getGiftBagList(cookies),
                    getGiftConfig(cookies),
                ]);

                const values: Map<number, number> = new Map();
                giftInfo.forEach((value) => values.set(value.id, Math.ceil(value.price / 100)));
                values.set(30607, 50);

                const pending = gifts.list.filter((value) => {
                    return (
                        config.sendGiftType.includes(value.gift_id) &&
                        value.expire_at - gifts.time < 60 * 60 * 24 * config.sendGiftTime
                    );
                }).sort((left, right) => {
                    if (left.expire_at !== right.expire_at) {
                        return left.expire_at - right.expire_at;
                    }

                    return (values.get(right.gift_id) ?? 0) - (values.get(left.gift_id) ?? 0);
                });

                logger.debug('Pending Gifts: %o', pending);

                for (const roomID of config.roomID) {
                    const medal = medals.filter((value) => value.roomID === roomID)[0];
                    if (!medal) continue;

                    let restIntimacy = medal.dayLimit - medal.todayIntimacy;
                    logger.debug('%s Daily Intimacy Rest %d', medal.medalName, restIntimacy);

                    for (const gift of pending) {
                        if (gift.gift_num === 0) continue;

                        const value = values.get(gift.gift_id);
                        if (value === undefined) continue;

                        const sendNum = Math.min(Math.floor(restIntimacy / value), gift.gift_num);
                        if (sendNum === 0) continue;

                        logger.debug(
                            'Send Gift %s (%d) %d/%d to %s',
                            gift.gift_name, gift.gift_id, sendNum, gift.gift_num, medal.medalName,
                        );

                        try {
                            await sendGiftBag(
                                cookies, uid, gift.gift_id, medal.targetID, sendNum,
                                gift.bag_id, roomID, Math.round(Date.now() / 1000),
                            );

                            gift.gift_num -= sendNum;
                            restIntimacy -= value * sendNum;

                            logger.info(
                                '向%s送出礼物%sx%d成功: 获得亲密度%d，今日距离上限%d',
                                medal.medalName, gift.gift_name, sendNum,
                                value * sendNum, restIntimacy,
                            );
                        } catch (error) {
                            logger.error('向%s送出礼物%sx%d失败', medal.medalName, gift.gift_name, sendNum);
                            logger.error(error);
                        }
                    }
                }
            } catch (error) {
                logger.error(error);
            }
        } else {
            logger.error('无自动送礼目标直播间');
        }
    }

    if (config.littleHeart) {
        // 自动获取小心心
        try {
            await littleHeartHandler(medals);
            logger.info('获取小心心成功');
        } catch (error) {
            logger.error(error);
        }
    }
})();
