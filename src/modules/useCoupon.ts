import util from 'node:util';

import {
    getUserCoupon, createOrder,
} from '../api.ts';
import logger from '../logger.ts';

export default async (
    cookies: string,
    { useCouponTime }: { useCouponTime: number },
): Promise<void> => {
    const today = new Date();
    const prev = new Date(today.getTime() - 31 * 24 * 60 * 60 * 1000);

    const todayText = `${today.toISOString().slice(0, 10)} 23:59:59`;
    const prevText = `${prev.toISOString().slice(0, 10)} 00:00:00`;

    const coupons = await getUserCoupon(cookies, prevText, todayText, today.getTime());

    logger.debug(util.format('Coupons: %o', coupons));

    const balance = coupons.result
        .filter(
            (value) => value.couponBalance > 0 && value.couponDueTime > today.getTime()
                && value.couponDueTime - today.getTime() < useCouponTime * 24 * 60 * 60 * 1000,
        )
        .reduce((total, curr) => total + curr.couponBalance, 0);

    if (balance === 0) {
        logger.info('目前没有即将过期的B币卷。');
    } else {
        logger.info(`目前有${balance.toString()}个即将过期的B币卷。`);

        // use for battery
        await createOrder(
            cookies,
            balance * 1000,
            balance * 1000,
            0,
            balance,
        );

        logger.info(`使用B币卷成功: 为自己兑换${balance.toString()}个B币(${(balance * 10).toString()}个电池)成功。`);
    }
};
