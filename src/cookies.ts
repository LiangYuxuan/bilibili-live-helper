import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import CryptoES from 'crypto-es';
import got from 'got';

import logger from './logger.ts';

interface EncryptedCookiesData {
    encrypted: string,
}

interface Cookie {
    domain: string,
    expirationDate?: number,
    hostOnly: boolean,
    httpOnly: boolean,
    name: string,
    path: string,
    sameSite: 'no_restriction' | 'lax' | 'strict' | 'unspecified',
    secure: boolean,
    session: boolean,
    storeId: string,
    value: string,
}

interface CookiesData {
    cookie_data: Record<string, Cookie[] | undefined>,
    local_storage_data: Record<string, Record<string, string>>,
    update_time: string,
}

const COOKIES = process.env.COOKIES?.trim() ?? '';
const COOKIE_CLOUD_URL = process.env.COOKIE_CLOUD_URL?.trim() ?? '';
const COOKIE_CLOUD_UUID = process.env.COOKIE_CLOUD_UUID?.trim() ?? '';
const COOKIE_CLOUD_KEY = process.env.COOKIE_CLOUD_KEY?.trim() ?? '';

export default async (): Promise<string> => {
    if (COOKIES.length > 0) {
        logger.info('使用环境变量中的Cookies');
        return COOKIES;
    }

    if (
        COOKIE_CLOUD_URL.length > 0
        && COOKIE_CLOUD_UUID.length > 0
        && COOKIE_CLOUD_KEY.length > 0
    ) {
        const response = await got.get(`${COOKIE_CLOUD_URL}/get/${COOKIE_CLOUD_UUID}`)
            .json<EncryptedCookiesData>();
        if (response.encrypted) {
            const key = CryptoES.MD5(`${COOKIE_CLOUD_UUID}-${COOKIE_CLOUD_KEY}`).toString().substring(0, 16);
            const text = CryptoES.AES.decrypt(response.encrypted, key).toString(CryptoES.enc.Utf8);
            const data = JSON.parse(text) as CookiesData;

            if (data.cookie_data['bilibili.com']) {
                logger.info('使用CookieCloud中的Cookies');

                const cookies = data.cookie_data['bilibili.com']
                    .filter((cookie) => cookie.domain === 'bilibili.com' || cookie.domain === '.bilibili.com' || cookie.domain === 'www.bilibili.com')
                    .map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');

                return cookies;
            }
        }

        logger.warn('CookieCloud中未找到bilibili.com的Cookies');
    }

    const cookiesFile = path.resolve(fileURLToPath(import.meta.url), '..', '..', '.cookies');
    const cookies = await fs.readFile(cookiesFile, { encoding: 'utf-8' });

    logger.info('使用本地文件的Cookies');

    return cookies;
};
