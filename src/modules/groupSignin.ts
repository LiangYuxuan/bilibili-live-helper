import util from 'util';

import logger from '../logger.js';
import {getGroupList, doGroupSign} from './../api.js';
import {Medal} from './../utils.js';

export default async (
    cookies: string, {uid, medals}: {uid: number, medals: Medal[]},
): Promise<[boolean, string][]> => {
    const reportLog: [boolean, string][] = [];

    try {
        const groups = (await getGroupList(cookies)).list.filter((value) => {
            if (value.owner_uid === uid) {
                // 自己不能给自己的应援团应援
                return false;
            }

            for (const medal of medals) {
                if (medal.targetID === value.owner_uid) {
                    // 不给20或40级粉丝牌的应援团签到
                    return medal.level !== 20 && medal.level !== 40;
                }
            }
        });

        logger.debug('Filtered Group: %o', groups);

        await Promise.all(groups.map(async (value) => {
            for (let i = 0; i < 3; i++) {
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
                    reportLog.push([false, util.format(
                        '应援团(%s)签到失败: %s', value.fans_medal_name, (error as Error).message,
                    )]);
                }
            }
        }));

        logger.info('应援团签到成功');
        reportLog.push([true, '应援团签到成功']);
    } catch (error) {
        logger.error(error);
        reportLog.push([false, '应援团签到失败']);
        throw reportLog;
    }

    return reportLog;
};
