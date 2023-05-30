import { getMedalList, MedalList, FansMedal } from './api.js';

export interface Medal {
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

export const getFullMedalList = async (cookies: string): Promise<Medal[]> => {
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

export const showMedalStatus = async (cookies: string) => {
    const medals = (await getFullMedalList(cookies)).sort((a, b) => {
        if (a.level !== b.level) {
            return a.intimacy - b.intimacy;
        }

        return a.level - b.level;
    });
    console.log('Name\tLevel\tCurrent\tTotal\tToday\tRemain');
    medals.forEach((value) => {
        const name = value.medalName;
        const { level } = value;
        const current = value.intimacy;
        const next = value.nextIntimacy;
        const today = value.todayIntimacy;
        const remain = Math.ceil((value.nextIntimacy - value.intimacy) / value.todayIntimacy);
        console.log(`${name}\t${level}\t${current}\t${next}\t+${today}\t${remain} dys`);
    });
};
