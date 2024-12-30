import {createLogger, format, transports} from "winston";

const {printf} = format;

const printFormat = printf(({level, message, label, timestamp}) => {
    return `${timestamp} ${level}: ${message}`;
});

const logger = createLogger({
    transports: [new transports.Console()],
    format: format.combine(
        format.colorize({all: true}),
        format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
        printFormat
    )
});

module.exports = logger;
