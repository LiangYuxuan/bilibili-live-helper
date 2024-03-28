import winston from 'winston';

const logger = winston.createLogger({
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
                winston.format.colorize(),
                winston.format.printf((info) => `[${info.timestamp as string}] ${info.level}: ${info.message as string}`),
            ),
        }),
    ],
});

let isAllSuccess = true;
const pushText = [] as string[];
const expose = {
    debug: (text: string) => {
        logger.debug(text);
    },
    info: (text: string, allSuccess = true) => {
        isAllSuccess &&= allSuccess;

        logger.info(text);
        pushText.push(`✅${text}`);
    },
    warn: (text: string, allSuccess = true) => {
        isAllSuccess &&= allSuccess;

        logger.warn(text);
        pushText.push(`⚠️${text}`);
    },
    error: (text: string, allSuccess = false) => {
        isAllSuccess &&= allSuccess;

        logger.error(text);
        pushText.push(`❌${text}`);
    },
    getPushInfo: () => ({
        isAllSuccess,
        pushText,
    }),
    clearPushInfo: () => {
        isAllSuccess = true;
        pushText.length = 0;
    },
};

export default expose;
