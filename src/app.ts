import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import cron from 'node-cron';

import logger from './logger.js';
import main from './main.js';
import {pushToPushDeer} from './push.js';

dotenv.config();

const config = {
    login: !!parseInt(process.env.LOGIN ?? ''),
    watchVideo: !!parseInt(process.env.WATCH_VIDEO ?? ''),
    shareVideo: !!parseInt(process.env.SHARE_VIDEO ?? ''),
    liveDailySign: !!parseInt(process.env.LIVE_DAILY_SIGN ?? ''),
    groupDailySign: !!parseInt(process.env.GROUP_DAILY_SIGN ?? ''),
    medalDanmu: !!parseInt(process.env.MEDAL_DANMU ?? ''),
    medalDanmuContent: (process.env.MEDAL_DANMU_CONTENT ?? '').split(','),
    sendGift: !!parseInt(process.env.SEND_GIFT ?? ''),
    roomIDs:
        (process.env.ROOM_ID ?? '').split(',').map((value) => parseInt(value)).filter((value) => !isNaN(value)),
    sendGiftType:
        (process.env.SEND_GIFT_TYPE ?? '').split(',').map((value) => parseInt(value)).filter((value) => !isNaN(value)),
    sendGiftTime: parseInt(process.env.SEND_GIFT_TIME ?? '') ?? 1,
    like: !!parseInt(process.env.LIKE ?? ''),
};
const pushKey = process.env.PUSHKEY ?? '';
const cronExp = process.env.CRON_EXP ?? '';

let cookies = process.env.COOKIES?.trim() ?? '';
if (cookies.length === 0) {
    try {
        cookies = fs.readFileSync(path.resolve(process.cwd(), '.cookies'), {encoding: 'utf-8'}).trim();
    } catch (error) {
        logger.crit('载入.cookies文件失败: %o', error);
        process.exit(-1);
    }
}

const mainHandler = async () => {
    let isAllSuccess = false;
    let reportLog: [boolean, string][];
    try {
        [isAllSuccess, reportLog] = await main(cookies, config);
    } catch (error) {
        if (error instanceof Array) {
            reportLog = error;
        } else {
            logger.error(error);
            reportLog = [
                [false, (error as Error).message],
            ];
        }
    }

    if (pushKey.length > 0) {
        const status = isAllSuccess && (reportLog.reduce(
            (prev, [success]) => prev >= 3 ? 3 : (success ? 0 : prev + 1), 0,
        ) < 3);
        const reportText = reportLog.map((value) => `${value[0] ? '✅' : '❌'}${value[1]}`).join('\n\n');
        await pushToPushDeer(pushKey, '# ' + (status ? '✅B站直播日常成功' : '❌B站直播日常失败'), reportText);
    } else {
        logger.warn('未设定PushKey');
    }
};

if (cronExp.length > 0) {
    cron.schedule(cronExp, mainHandler, {
        timezone: 'Asia/Shanghai',
    });
} else {
    logger.warn('未设定定时执行表达式');
}

mainHandler();
