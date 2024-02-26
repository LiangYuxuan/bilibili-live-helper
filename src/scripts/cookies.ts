/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/naming-convention */

import assert from 'assert';
import fs from 'fs';
import got from 'got';
import qrcode from 'qrcode-terminal';

import { delay } from '../utils.ts';

const UserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36';

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
    const result: LoginUrlData = await got.get('https://passport.bilibili.com/x/passport-login/web/qrcode/generate', {
        headers: {
            'User-Agent': UserAgent,
            Referer: 'https://www.bilibili.com/',
        },
    }).json();

    assert(result.code === 0, '获取登录二维码失败');

    return result.data;
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
    const res = await got.get('https://passport.bilibili.com/x/passport-login/web/qrcode/poll', {
        headers: {
            'User-Agent': UserAgent,
            Referer: 'https://www.bilibili.com/',
        },
        searchParams: {
            qrcode_key,
        },
    });

    const cookies = res.headers['set-cookie']?.map((text: string) => text.split(';')[0].split('=')) as [string, string][] | undefined;
    const result = JSON.parse(res.body) as LoginInfoData;

    return {
        ...result,
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
            return new Map(cookies ?? []);
        }

        if (data.code === 86038) {
            break;
        }

        if (data.code === 86090 && !isScanned) {
            console.log('二维码已扫描');
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

    qrcode.generate(qrcodeContent, {
        small: true,
    });

    console.log('请使用哔哩哔哩手机客户端扫描二维码登录');

    const cookies = await checkLogin(qrcode_key);

    console.log('登录成功，正在获取获取LIVE_BUVID...');

    const DedeUserID = cookies.get('DedeUserID');
    const DedeUserID__ckMd5 = cookies.get('DedeUserID__ckMd5');
    const SESSDATA = cookies.get('SESSDATA');
    const bili_jct = cookies.get('bili_jct');

    assert(DedeUserID, '获取Cookies失败: 未找到DedeUserID');
    assert(DedeUserID__ckMd5, '获取Cookies失败: 未找到DedeUserID__ckMd5');
    assert(SESSDATA, '获取Cookies失败: 未找到SESSDATA');
    assert(bili_jct, '获取Cookies失败: 未找到bili_jct');

    const cookiesText = `DedeUserID=${DedeUserID}; DedeUserID__ckMd5=${DedeUserID__ckMd5}; SESSDATA=${SESSDATA}; bili_jct=${bili_jct}`;

    const request = await got.get('https://api.live.bilibili.com/gift/v3/live/gift_config', {
        headers: {
            'User-Agent': UserAgent,
            Referer: 'https://live.bilibili.com/',
            Cookie: cookiesText,
        },
    });

    const LIVE_BUVID = request.headers['set-cookie']?.find((text: string) => text.startsWith('LIVE_BUVID'))?.split(';')[0];

    assert(LIVE_BUVID, '获取LIVE_BUVID失败: 未找到LIVE_BUVID');

    fs.writeFileSync('.cookies', `${cookiesText}; ${LIVE_BUVID}`);

    console.log('获取Cookies成功，已经写入.cookies文件。');
})().catch(console.log);
