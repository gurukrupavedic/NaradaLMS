import pino from 'pino'

function getTransport(): pino.LoggerOptions<never, boolean> {
  if (process.env.NODE_ENV === 'production') {
    return {}
  }

  return {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  }
}

const logger = pino(getTransport())
export default logger
