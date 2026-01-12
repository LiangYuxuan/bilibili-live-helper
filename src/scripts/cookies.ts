/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable import-x/no-unused-modules */

import assert from 'node:assert';
import fs from 'node:fs';

import QRCode from 'qrcode';

import userAgent from '../userAgent.ts';
import { delay } from '../utils.ts';

interface LoginUrlData {
    code: number,
    message: boolean,
    ttl: number,
    data: {
        url: string,
        qrcode_key: string,
    },
}

const getLoginUrl = async () => {
    const headers = new Headers();
    headers.set('User-Agent', userAgent);
    headers.set('Referer', 'https://www.bilibili.com/');

    const req = await fetch('https://passport.bilibili.com/x/passport-login/web/qrcode/generate', { headers });
    const res = await req.json() as LoginUrlData;

    assert(res.code === 0, '获取登录二维码失败');

    return res.data;
};

interface LoginInfoData {
    code: number,
    message: string,
    ttl: number,
    data: {
        url: '',
        refresh_token: '',
        timestamp: 0,
        code: 86101,
        message: '未扫码',
    } | {
        url: '',
        refresh_token: '',
        timestamp: 0,
        code: 86038,
        message: '二维码已失效',
    } | {
        url: '',
        refresh_token: '',
        timestamp: 0,
        code: 86090,
        message: '二维码已扫码未确认',
    } | {
        url: string,
        refresh_token: string,
        timestamp: number,
        code: 0,
        message: '',
    },
}

const getLoginInfo = async (qrcode_key: string) => {
    const headers = new Headers();
    headers.set('User-Agent', userAgent);
    headers.set('Referer', 'https://www.bilibili.com/');

    const params = new URLSearchParams();
    params.set('qrcode_key', qrcode_key);

    const req = await fetch(`https://passport.bilibili.com/x/passport-login/web/qrcode/poll?${params.toString()}`, { headers });
    const cookies = req.headers.getSetCookie().map((text: string) => text.split(';')[0].split('=') as [string, string]);

    const res = await req.json() as LoginInfoData;

    return {
        ...res,
        cookies,
    };
};

const checkLogin = async (qrcode_key: string) => {
    const startTime = Date.now();
    let isScanned = false;

    while (Date.now() - startTime < 3 * 60 * 1000) {
        // eslint-disable-next-line no-await-in-loop
        const { data, cookies } = await getLoginInfo(qrcode_key);

        if (data.code === 0) {
            return new Map(cookies);
        }

        if (data.code === 86038) {
            break;
        }

        if (data.code === 86090 && !isScanned) {
            console.info('二维码已扫描');
            isScanned = true;
        }

        // eslint-disable-next-line no-await-in-loop
        await delay(2000);
    }

    console.error('二维码已失效');
    throw new Error('二维码已失效');
};

(async () => {
    const { url: qrcodeContent, qrcode_key } = await getLoginUrl();

    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    console.info(await QRCode.toString(qrcodeContent, { type: 'terminal', small: true }));

    console.info('请使用哔哩哔哩手机客户端扫描二维码登录');

    const cookies = await checkLogin(qrcode_key);

    console.info('登录成功，正在获取获取LIVE_BUVID...');

    const DedeUserID = cookies.get('DedeUserID');
    const DedeUserID__ckMd5 = cookies.get('DedeUserID__ckMd5');
    const SESSDATA = cookies.get('SESSDATA');
    const bili_jct = cookies.get('bili_jct');

    assert(DedeUserID !== undefined, '获取Cookies失败: 未找到DedeUserID');
    assert(DedeUserID__ckMd5 !== undefined, '获取Cookies失败: 未找到DedeUserID__ckMd5');
    assert(SESSDATA !== undefined, '获取Cookies失败: 未找到SESSDATA');
    assert(bili_jct !== undefined, '获取Cookies失败: 未找到bili_jct');

    const cookiesText = `DedeUserID=${DedeUserID}; DedeUserID__ckMd5=${DedeUserID__ckMd5}; SESSDATA=${SESSDATA}; bili_jct=${bili_jct}`;

    const headers = new Headers();
    headers.set('User-Agent', userAgent);
    headers.set('Referer', 'https://live.bilibili.com/');
    headers.set('Cookie', cookiesText);

    const req = await fetch('https://api.live.bilibili.com/gift/v3/live/gift_config', { headers });
    const LIVE_BUVID = req.headers.getSetCookie().find((text: string) => text.startsWith('LIVE_BUVID'))?.split(';')[0];

    assert(LIVE_BUVID !== undefined, '获取LIVE_BUVID失败: 未找到LIVE_BUVID');

    fs.writeFileSync('.cookies', `${cookiesText}; ${LIVE_BUVID}`);

    console.info('获取Cookies成功，已经写入.cookies文件。');
})().catch((error: unknown) => {
    console.error(error);
});
