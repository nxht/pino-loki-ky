import ky from 'ky'

interface QueryRangeResponse<StreamType extends Record<string, string>> {
  status: string
  data: {
    resultType: string
    result: {
      stream: StreamType
      values: [string, string][]
    }[]
  }
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class LokiClient {
  static client = ky.extend({
    prefixUrl: process.env.LOKI_HOST!,
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${process.env.LOKI_USERNAME}:${process.env.LOKI_PASSWORD}`,
      ).toString('base64')}`,
    },
  })

  static getLogs(query: string) {
    return this.client
      .get('loki/api/v1/query', { searchParams: { query, limit: 10 } })
      .json<QueryRangeResponse<any>>()
  }
}
