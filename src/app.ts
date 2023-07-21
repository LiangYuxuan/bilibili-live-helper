import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import cron from 'node-cron';

import logger from './logger.js';
import main from './main.js';
import pushToPushDeer from './push.js';

dotenv.config();

const config = {
    login: !!parseInt(process.env.LOGIN ?? '', 10),
    watchVideo: !!parseInt(process.env.WATCH_VIDEO ?? '', 10),
    shareVideo: !!parseInt(process.env.SHARE_VIDEO ?? '', 10),
    liveDailySign: !!parseInt(process.env.LIVE_DAILY_SIGN ?? '', 10),
    groupDailySign: !!parseInt(process.env.GROUP_DAILY_SIGN ?? '', 10),
    medalDanmu: !!parseInt(process.env.MEDAL_DANMU ?? '', 10),
    medalDanmuContent: (process.env.MEDAL_DANMU_CONTENT ?? '').split(','),
    sendGift: !!parseInt(process.env.SEND_GIFT ?? '', 10),
    roomIDs:
        (process.env.ROOM_ID ?? '').split(',').map((value) => parseInt(value, 10)).filter((value) => !Number.isNaN(value)),
    sendGiftType:
        (process.env.SEND_GIFT_TYPE ?? '').split(',').map((value) => parseInt(value, 10)).filter((value) => !Number.isNaN(value)),
    sendGiftTime: Number.isNaN(parseInt(process.env.SEND_GIFT_TIME ?? '', 10)) ? 1 : parseInt(process.env.SEND_GIFT_TIME ?? '', 10),
    likeLive: !!parseInt(process.env.LIKE_LIVE ?? '', 10),
    shareLive: !!parseInt(process.env.SHARE_LIVE ?? '', 10),
    watchLive: !!parseInt(process.env.WATCH_LIVE ?? '', 10),
    getCoupon: !!parseInt(process.env.GET_COUPON ?? '', 10),
    useCoupon: !!parseInt(process.env.USE_COUPON ?? '', 10),
    useCouponMode: Number.isNaN(parseInt(process.env.USE_COUPON_MODE ?? '', 10)) ? 1 : parseInt(process.env.USE_COUPON_MODE ?? '', 10),
    useCouponTime: Number.isNaN(parseInt(process.env.USE_COUPON_TIME ?? '', 10)) ? 1 : parseInt(process.env.USE_COUPON_TIME ?? '', 10),
    useCouponRest: !!parseInt(process.env.USE_COUPON_REST ?? '', 10),
    chargeMsg: process.env.CHARGE_MSG ?? '',
};
const pushKey = process.env.PUSHKEY ?? '';
const cronExp = process.env.CRON_EXP ?? '';

let cookies = process.env.COOKIES?.trim() ?? '';
if (cookies.length === 0) {
    try {
        cookies = fs.readFileSync(path.resolve(process.cwd(), '.cookies'), { encoding: 'utf-8' }).trim();
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
        logger.error(error);
        reportLog = [
            [false, (error as Error).message],
        ];
    }

    if (pushKey.length > 0) {
        const status = isAllSuccess && (reportLog.reduce(
            (prev, [success]) => {
                if (prev >= 3) {
                    return prev;
                }

                return success ? 0 : prev + 1;
            },
            0,
        ) < 3);
        const reportText = reportLog.map((value) => `${value[0] ? '✅' : '❌'}${value[1]}`).join('\n\n');
        await pushToPushDeer(pushKey, `# ${status ? '✅B站直播日常成功' : '❌B站直播日常失败'}`, reportText);
    } else {
        logger.warn('未设定PushKey');
    }
};

if (cronExp.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    cron.schedule(cronExp, mainHandler, {
        timezone: 'Asia/Shanghai',
    });
} else {
    logger.warn('未设定定时执行表达式');
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
mainHandler();
