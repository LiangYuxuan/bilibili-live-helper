import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

import logger from './logger.js';
import main from './main.js';

dotenv.config();

const config = {
    login: !!parseInt(process.env.LOGIN ?? ''),
    watchVideo: !!parseInt(process.env.WATCH_VIDEO ?? ''),
    shareVideo: !!parseInt(process.env.SHARE_VIDEO ?? ''),
    liveDailySign: !!parseInt(process.env.LIVE_DAILY_SIGN ?? ''),
    groupDailySign: !!parseInt(process.env.GROUP_DAILY_SIGN ?? ''),
    medalDanmu: !!parseInt(process.env.MEDAL_DANMU ?? ''),
    medalDanmuContent: (process.env.MEDAL_DANMU_CONTENT ?? '').split(','),
    littleHeart: !!parseInt(process.env.LITTLE_HEART ?? ''),
    sendGift: !!parseInt(process.env.SEND_GIFT ?? ''),
    roomIDs:
        (process.env.ROOM_ID ?? '').split(',').map((value) => parseInt(value)).filter((value) => !isNaN(value)),
    sendGiftType:
        (process.env.SEND_GIFT_TYPE ?? '').split(',').map((value) => parseInt(value)).filter((value) => !isNaN(value)),
    sendGiftTime: parseInt(process.env.SEND_GIFT_TIME ?? '') ?? 1,
};

let cookies = process.env.COOKIES ?? '';
if (cookies.length === 0) {
    try {
        cookies = fs.readFileSync(path.resolve(process.cwd(), '.cookies'), {encoding: 'utf-8'});
    } catch (error) {
        logger.crit('载入.cookies文件失败: %o', error);
        process.exit(-1);
    }
}

const mainHandler = async () => {
    await main(cookies, config);
};

mainHandler();
