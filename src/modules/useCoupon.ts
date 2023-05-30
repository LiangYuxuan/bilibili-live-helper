import util from 'util';

import logger from '../logger.js';
import {
    getUserCoupon, doElectricPay, sendElectricMessage, createOrder, getElectricMonth,
} from '../api.js';

export default async (cookies: string, {
    uid, useCouponMode, useCouponTime, useCouponRest, chargeMsg,
}:
{
    uid: number, useCouponMode: number, useCouponTime: number,
    useCouponRest: boolean, chargeMsg: string
}): Promise<[boolean, string][]> => {
    const reportLog: [boolean, string][] = [];

    const today = new Date();
    const prev = new Date(today.getTime() - 31 * 24 * 60 * 60 * 1000);

    const todayText = `${today.toISOString().slice(0, 10)} 23:59:59`;
    const prevText = `${prev.toISOString().slice(0, 10)} 00:00:00`;

    const coupons = await getUserCoupon(cookies, prevText, todayText, today.getTime());
    const balance = coupons.result
        .filter(
            (value) => value.couponBalance > 0 && value.couponDueTime > today.getTime()
                && value.couponDueTime - today.getTime() < useCouponTime * 24 * 60 * 60 * 1000,
        )
        .reduce((prev, curr) => prev + curr.couponBalance, 0);

    if (balance === 0) {
        logger.info('目前没有即将过期的B币卷。');
        reportLog.push([true, '目前没有即将过期的B币卷。']);
    } else {
        logger.info('目前有%d个即将过期的B币卷。', balance);
        reportLog.push([true, util.format('目前有%d个即将过期的B币卷。', balance)]);

        if (useCouponMode === 1 && (!useCouponRest || balance >= 2)) {
            // use for charge
            if (balance < 2) {
                logger.warn('无法为自己充电，B币卷剩余小于2B币。');
                reportLog.push([false, '无法为自己充电，B币卷剩余小于2B币。']);
            } else {
                await getElectricMonth(cookies, uid); // would be failed if not enabled electric

                const order = await doElectricPay(cookies, balance, uid, 'up', uid, true);
                await sendElectricMessage(cookies, order.order_no, chargeMsg);

                logger.info('使用B币卷成功: 为自己充电%d个B币成功。', balance);
                reportLog.push([true, util.format('使用B币卷成功: 为自己充电%d个B币成功。', balance)]);
            }
        } else if (
            useCouponMode === 2
            || (useCouponMode === 1 && useCouponRest && balance < 2)
        ) {
            // use for battery
            await createOrder(
                cookies,
                balance * 1000,
                balance * 1000,
                0,
                undefined,
                undefined,
                balance,
            );

            logger.info('使用B币卷成功: 为自己兑换%d个B币(%d个电池)成功。', balance, balance * 10);
            reportLog.push([true, util.format('使用B币卷成功: 为自己兑换%d个B币(%d个电池)成功。', balance, balance * 10)]);
        } else {
            throw new Error(`不支持的模式: ${useCouponMode}`);
        }
    }

    return reportLog;
};
