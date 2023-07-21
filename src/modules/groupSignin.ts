import util from 'util';

import logger from '../logger.js';
import { getGroupList, doGroupSign } from '../api.js';
import { Medal } from '../utils.js';

export default async (
    cookies: string,
    { uid, medals }: { uid: number, medals: Medal[] },
): Promise<[boolean, string][]> => {
    const reportLog: [boolean, string][] = [];

    try {
        const groups = (await getGroupList(cookies)).list.filter((value) => {
            if (value.owner_uid === uid) {
                // 自己不能给自己的应援团应援
                return false;
            }

            const medal = medals
                .filter((item) => item.targetID === value.owner_uid)[0] as Medal | undefined;
            if (medal && medal.level < 20) {
                // 给20级以下粉丝牌的应援团签到
                return true;
            }

            return false;
        });

        logger.debug('Filtered Group: %o', groups);

        await Promise.all(groups.map(async (value) => {
            for (let i = 0; i < 3; i += 1) {
                try {
                    const result = await doGroupSign(cookies, value.group_id, value.owner_uid);
                    logger.info(
                        '应援团(%s)签到成功: %s',
                        value.fans_medal_name,
                        result.status === 1 ? '今天已经完成应援' : `亲密度+${result.add_num}`,
                    );
                    reportLog.push([true, util.format(
                        '应援团(%s)签到成功: %s',
                        value.fans_medal_name,
                        result.status === 1 ? '今天已经完成应援' : `亲密度+${result.add_num}`,
                    )]);
                    break;
                } catch (error) {
                    logger.error('应援团(%s)签到失败: %s', value.fans_medal_name, (error as Error).message);
                    reportLog.push([false, util.format('应援团(%s)签到失败: %s', value.fans_medal_name, (error as Error).message)]);
                }
            }
        }));

        logger.info('应援团签到成功');
        reportLog.push([true, '应援团签到成功']);
    } catch (error) {
        logger.error(error);
        reportLog.push([false, '应援团签到失败']);
    }

    return reportLog;
};
