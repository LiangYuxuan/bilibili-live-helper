import logger from '../logger.ts';
import { getNavInfo, getPrivilege, receivePrivilege } from '../api.ts';

export default async (cookies: string): Promise<void> => {
    const info = await getNavInfo(cookies);
    if (info.vip.type !== 2) {
        logger.info('不是年度大会员，跳过领取B币卷。');
    } else {
        const privilege = await getPrivilege(cookies);
        const filtered = privilege.list.filter((value) => value.type === 1 && value.state === 0);
        if (filtered.length === 0) {
            logger.info('没有可领取的B币卷，跳过领取B币卷。');
        } else {
            await receivePrivilege(cookies, 1);

            logger.info('领取B币卷成功');
        }
    }
};
