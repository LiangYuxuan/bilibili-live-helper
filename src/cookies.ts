/* eslint-disable @typescript-eslint/naming-convention */

import { createDecipheriv, createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
    local_storage_data?: Record<string, Record<string, string>>,
    update_time: string,
}

const COOKIES = process.env.COOKIES?.trim() ?? '';
const COOKIE_CLOUD_URL = process.env.COOKIE_CLOUD_URL?.trim() ?? '';
const COOKIE_CLOUD_UUID = process.env.COOKIE_CLOUD_UUID?.trim() ?? '';
const COOKIE_CLOUD_KEY = process.env.COOKIE_CLOUD_KEY?.trim() ?? '';

const evpkdf = (
    password: Buffer,
    salt: Buffer,
    keySize: number,
    ivSize: number,
): {
    key: Buffer,
    iv: Buffer,
} => {
    const hashLength = 16;
    const times = Math.ceil((keySize + ivSize) / hashLength);
    const derivedKey = Buffer.alloc(keySize + ivSize);

    let digest = Buffer.alloc(0);
    for (let i = 0; i < times; i += 1) {
        const data = Buffer.concat([
            digest,
            password,
            salt,
        ]);

        digest = createHash('md5').update(data).digest();

        digest.copy(derivedKey, i * hashLength);
    }

    return {
        key: derivedKey.subarray(0, keySize),
        iv: derivedKey.subarray(keySize, keySize + ivSize),
    };
};

const isDomainMatch = (cookieDomain: string, domain: string): boolean => {
    if (cookieDomain.startsWith('.')) {
        return domain.endsWith(cookieDomain.substring(1));
    }

    return domain === cookieDomain;
};

export default async (host: string, domain: string): Promise<string> => {
    if (COOKIES.length > 0) {
        logger.info('使用环境变量中的Cookies');
        return COOKIES;
    }

    if (
        COOKIE_CLOUD_URL.length > 0
        && COOKIE_CLOUD_UUID.length > 0
        && COOKIE_CLOUD_KEY.length > 0
    ) {
        const res = await fetch(`${COOKIE_CLOUD_URL}/get/${COOKIE_CLOUD_UUID}`);
        const json = await res.json() as EncryptedCookiesData | undefined;
        if (json?.encrypted !== undefined) {
            const encrypted = Buffer.from(json.encrypted, 'base64');
            // prefix + salt + ciphertext, prefix = 'Salted__'
            const salt = encrypted.subarray(8, 16);
            const ciphertext = encrypted.subarray(16);

            const hash = createHash('md5').update(`${COOKIE_CLOUD_UUID}-${COOKIE_CLOUD_KEY}`);
            const secret = hash.digest().toString('hex').substring(0, 16);
            const { key, iv } = evpkdf(Buffer.from(secret, 'utf-8'), salt, 32, 16);

            const cipher = createDecipheriv('aes-256-cbc', key, iv);
            const text = Buffer.concat([
                cipher.update(ciphertext),
                cipher.final(),
            ]).toString('utf-8');
            const data = JSON.parse(text) as CookiesData;

            if (data.cookie_data[host]) {
                logger.info('使用CookieCloud中的Cookies');

                const cookies = data.cookie_data[host]
                    .filter((cookie) => isDomainMatch(cookie.domain, domain))
                    .map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');

                return cookies;
            }

            logger.warn(`CookieCloud中未找到${host}的Cookies`);
        }

        logger.warn('CookieCloud中未找到Cookies');
    }

    const cookiesFile = path.resolve(fileURLToPath(import.meta.url), '..', '..', '.cookies');
    const cookies = await fs.readFile(cookiesFile, { encoding: 'utf-8' });

    logger.info('使用本地文件的Cookies');

    return cookies;
};
