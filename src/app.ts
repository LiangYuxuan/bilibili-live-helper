import 'dotenv/config';
import cron from 'node-cron';

import logger from './logger.ts';
import getCookies from './cookies.ts';
import main from './main.ts';
import pushToPushDeer from './push.ts';

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

const coreHandler = async () => {
    await main(await getCookies(), config);
};

const mainHandler = () => {
    coreHandler()
        .catch((error: unknown) => {
            logger.error((error as Error).message);
        })
        .finally(() => {
            if (pushKey.length > 0) {
                const { isAllSuccess, pushText } = logger.getPushInfo();
                pushToPushDeer(pushKey, `# ${isAllSuccess ? '✅B站直播日常成功' : '❌B站直播日常失败'}`, pushText.join('\n\n'))
                    .then(() => {
                        logger.clearPushInfo();
                    })
                    .catch((error: unknown) => {
                        logger.error((error as Error).message);
                    });
            } else {
                logger.warn('未设定PushKey');
            }
        });
};

if (cronExp.length > 0) {
    cron.schedule(cronExp, mainHandler, {
        timezone: 'Asia/Shanghai',
    });
} else {
    logger.warn('未设定定时执行表达式');
}

mainHandler();
