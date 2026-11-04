import util from 'node:util';

import {
    getUserCoupon, createOrder,
} from '../api.ts';
import logger from '../logger.ts';

export default async (
    cookies: string,
    { useCouponTime }: { useCouponTime: number },
): Promise<void> => {
    const today = Temporal.Now.plainDateISO('Asia/Shanghai');
    const prev = today.subtract({ days: 31 });

    const todayText = `${today.toString()} 23:59:59`;
    const prevText = `${prev.toString()} 00:00:00`;

    const now = Temporal.Now.instant();
    const useCouponDuration = Temporal.Duration.from({ days: useCouponTime });

    const coupons = await getUserCoupon(cookies, prevText, todayText, now.epochMilliseconds);

    logger.debug(util.format('Coupons: %o', coupons));

    const balance = coupons.result
        .filter((value) => {
            if (value.couponBalance <= 0) {
                return false;
            }

            const due = Temporal.Instant.fromEpochMilliseconds(value.couponDueTime);
            const dueDuration = now.until(due);

            return dueDuration.sign === 1
                && Temporal.Duration.compare(dueDuration, useCouponDuration) <= 0;
        })
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
