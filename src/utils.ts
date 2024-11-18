import { getMedalList } from './api.ts';
import logger from './logger.ts';

import type { MedalList, FansMedal } from './api.ts';

const delay = (ms: number): Promise<void> => new Promise((resolve) => {
    setTimeout(resolve, ms);
});

const retry = async <T>(
    func: () => Promise<T>,
    times: number,
    errorDelayMS: number,
    successMessage: string | ((res: T) => string),
    errorMessage: string,
): Promise<T> => {
    let currentTimes = 0;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
        try {
            // eslint-disable-next-line no-await-in-loop
            const result = await func();

            if (typeof successMessage === 'function') {
                logger.info(successMessage(result));
            } else {
                logger.info(successMessage);
            }

            return result;
        } catch (error) {
            currentTimes += 1;
            if (currentTimes >= times) {
                logger.error(`${errorMessage}: ${(error as Error).message}`);
                throw error;
            }

            logger.warn(`${errorMessage}: ${(error as Error).message}`);

            if (errorDelayMS > 0) {
                // eslint-disable-next-line no-await-in-loop
                await delay(errorDelayMS);
            }
        }
    }
};

interface Medal {
    targetID: number;
    targetName: string;
    roomID: number;
    medalID: number;
    medalName: string;
    medalColorStart: number;
    medalColorEnd: number;
    medalColorBorder: number;

    level: number;
    isLighted: boolean;
    canDelete: boolean;
    intimacy: number;
    todayIntimacy: number;
    nextIntimacy: number;
    dayLimit: number;

    status: boolean;
    guardLevel: number;
    guardMedalTitle: string;
}

const handleMedalList = (list: FansMedal[]): Medal[] => {
    const result: Medal[] = [];

    list.forEach((value) => {
        const medal: Medal = {
            targetID: value.target_id,
            targetName: value.target_name,
            roomID: value.roomid,
            medalID: value.medal_id,
            medalName: value.medal_name,
            medalColorStart: value.medal_color_start,
            medalColorEnd: value.medal_color_end,
            medalColorBorder: value.medal_color_border,

            level: value.level,
            isLighted: value.is_lighted !== 0,
            canDelete: value.can_deleted,
            intimacy: value.intimacy,
            todayIntimacy: value.today_feed,
            nextIntimacy: value.next_intimacy,
            dayLimit: value.day_limit,

            status: value.status !== 0,
            guardLevel: value.guard_level,
            guardMedalTitle: value.guard_medal_title,
        };

        result.push(medal);
    });

    return result;
};

const getFullMedalList = async (cookies: string): Promise<Medal[]> => {
    const firstPage = await getMedalList(cookies);
    const length = firstPage.page_info.total_page;
    let result = handleMedalList(firstPage.items);

    const allPages: Promise<MedalList>[] = [];
    for (let i = 2; i <= length; i += 1) {
        allPages.push(getMedalList(cookies, i));
    }
    (await Promise.all(allPages)).forEach((value) => {
        result = result.concat(handleMedalList(value.items));
    });

    return result;
};

export {
    delay,
    retry,
    getFullMedalList,
};

export type {
    Medal,
};
