import winston from 'winston';

export default winston.createLogger({
    format: winston.format.combine(
        winston.format.errors({
            stack: false,
        }),
        winston.format.splat(),
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss.SSS ZZ',
        }),
    ),
    transports: [
        new winston.transports.Console({
            level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
            format: winston.format.combine(
                winston.format((info) => {
                    // eslint-disable-next-line no-param-reassign
                    info.level = info.level.toUpperCase();
                    return info;
                })(),
                winston.format.colorize(),
                winston.format.printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`),
            ),
        }),
    ],
});
