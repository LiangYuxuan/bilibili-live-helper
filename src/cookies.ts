/* eslint-disable @typescript-eslint/naming-convention */

import assert from 'assert';
import fs from 'fs';
import got from 'got';
import qrcode from 'qrcode-terminal';

const UserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36';

interface LoginUrlData {
    code: number;
    status: boolean;
    ts: number;
    data: {
        url: string;
        oauthKey: string;
    };
}

const getLoginUrl = async () => {
    const result: LoginUrlData = await got.get('https://passport.bilibili.com/qrcode/getLoginUrl', {
        headers: {
            'User-Agent': UserAgent,
            Referer: 'https://passport.bilibili.com/',
        },
    }).json();

    assert(result.code === 0, '获取登录二维码失败');

    return result.data;
};

interface LoginInfoData {
    code?: number;
    message?: string;
    ts?: number;
    status: boolean;
    data: {
        url: string;
    } | number;
}

const getLoginInfo = async (oauthKey: string) => {
    const result: LoginInfoData = await got.post('https://passport.bilibili.com/qrcode/getLoginInfo', {
        headers: {
            'User-Agent': UserAgent,
            Referer: 'https://passport.bilibili.com/',
        },
        form: {
            oauthKey,
        },
    }).json();

    return result;
};

const checkLogin = async (oauthKey: string) => {
    const startTime = Date.now();

    while (Date.now() - startTime < 180 * 1000) {
        const { status, data } = await getLoginInfo(oauthKey);

        if (status && typeof data === 'object') {
            return data.url;
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error('二维码扫描超时');
};

(async () => {
    const { url: qrcodeContent, oauthKey } = await getLoginUrl();

    qrcode.generate(qrcodeContent, {
        small: true,
    });

    console.log('请使用哔哩哔哩手机客户端扫描二维码登录');

    const url = await checkLogin(oauthKey);

    await got.get(url, {
        headers: {
            'User-Agent': UserAgent,
            Referer: 'https://passport.bilibili.com/',
        },
    });

    console.log('登录成功，正在获取获取LIVE_BUVID...');

    let DedeUserID = url.match(/DedeUserID=([^&]+)/)?.[1];
    let DedeUserID__ckMd5 = url.match(/DedeUserID__ckMd5=([^&]+)/)?.[1];
    let SESSDATA = url.match(/SESSDATA=([^&]+)/)?.[1];
    let bili_jct = url.match(/bili_jct=([^&]+)/)?.[1];

    assert(DedeUserID, '解析登录URL失败: 未找到DedeUserID');
    assert(DedeUserID__ckMd5, '解析登录URL失败: 未找到DedeUserID__ckMd5');
    assert(SESSDATA, '解析登录URL失败: 未找到SESSDATA');
    assert(bili_jct, '解析登录URL失败: 未找到bili_jct');

    DedeUserID = decodeURI(DedeUserID);
    DedeUserID__ckMd5 = decodeURI(DedeUserID__ckMd5);
    SESSDATA = decodeURI(SESSDATA);
    bili_jct = decodeURI(bili_jct);

    let cookies = `DedeUserID=${DedeUserID}; DedeUserID__ckMd5=${DedeUserID__ckMd5}; SESSDATA=${SESSDATA}; bili_jct=${bili_jct}`;

    const request = await got.get('https://api.live.bilibili.com/gift/v3/live/gift_config', {
        headers: {
            'User-Agent': UserAgent,
            Referer: 'https://live.bilibili.com/',
            Cookie: cookies,
        },
    });

    const header = request.headers['set-cookie'];

    assert(header, '获取LIVE_BUVID失败: 未找到Set-Cookie头');

    let LIVE_BUVID: string | undefined;

    header.forEach((text) => {
        const match = text.match(/LIVE_BUVID=([^;]+)/);

        if (match) {
            [LIVE_BUVID] = match;
        }
    });

    assert(LIVE_BUVID, '获取LIVE_BUVID失败: 未找到LIVE_BUVID');

    cookies = `${cookies}; LIVE_BUVID=${LIVE_BUVID}`;

    fs.writeFileSync('.cookies', cookies);

    console.log('获取Cookies成功，已经写入.cookies文件。');
})().catch(console.log);
