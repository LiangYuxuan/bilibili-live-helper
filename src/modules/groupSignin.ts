import util from 'node:util';

import logger from '../logger.ts';
import { getGroupList, doGroupSign } from '../api.ts';
import { retry, Medal } from '../utils.ts';

export default async (
    cookies: string,
    { uid, medals }: { uid: number, medals: Medal[] },
): Promise<void> => {
    const groups = (await getGroupList(cookies)).list.filter((value) => {
        if (value.owner_uid === uid) {
            // 自己不能给自己的应援团应援
            return false;
        }

        const medal = medals.find((item) => item.targetID === value.owner_uid);
        if (medal && medal.level < 20) {
            // 给20级以下粉丝牌的应援团签到
            return true;
        }

        return false;
    });

    logger.debug(util.format('Filtered Group: %o', groups));

    await Promise.all(groups.map((value) => retry(
        () => doGroupSign(cookies, value.group_id, value.owner_uid),
        3,
        1000,
        (res) => `应援团(${value.fans_medal_name})签到成功: ${res.status === 1 ? '今天已经完成应援' : `亲密度+${res.add_num.toString()}`}`,
        `应援团(${value.fans_medal_name})签到失败`,
    )));
};
