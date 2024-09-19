import ky, { HTTPError } from 'ky';
import type { KyInstance } from 'ky';

import debug from './debug';
import { LogBuilder } from './log_builder';
import type { LokiOptions, PinoLog } from './types';

/**
 * Responsible for pushing logs to Loki
 */
export class LogPusher {
  #options: LokiOptions;
  #logBuilder: LogBuilder;
  #client: KyInstance;

  constructor(options: LokiOptions) {
    this.#options = options;

    const headers = options.headers ?? {};
    if (options.basicAuth) {
      headers.Authorization = `Basic ${Buffer.from(
        `${options.basicAuth.username}:${options.basicAuth.password}`,
      ).toString('base64')}`;
    }

    this.#client = ky.extend({
      ...(this.#options.host && { prefixUrl: this.#options.host }),
      timeout: this.#options.timeout ?? 30_000,
      headers,
    });

    this.#logBuilder = new LogBuilder({
      levelMap: options.levelMap,
      propsToLabels: options.propsToLabels,
    });
  }

  /**
   * Handle push failures
   */
  async #handleFailure(err: unknown) {
    if (this.#options.silenceErrors === true) {
      return;
    }

    if (err instanceof HTTPError) {
      if (err.response) {
        const requestBody = await err.request.json();

        try {
          const responseBody = await err.response.json();

          console.error(
            'Got error when trying to send log to Loki\n',
            err,
            '\nrequestBody: ',
            requestBody,
            '\nresponseBody:',
            responseBody,
          );
          return;
        } catch (_e) {
          console.error(
            'Got error when trying to send log to Loki\n',
            err,
            '\nrequestBody: ',
            requestBody,
          );
          return;
        }
      }
    }

    console.error(
      'Got unknown error when trying to send log to Loki, error output:',
      err,
    );
  }

  /**
   * Push one or multiples logs entries to Loki
   */
  async push(logs: PinoLog[] | PinoLog) {
    if (!Array.isArray(logs)) {
      // biome-ignore lint/style/noParameterAssign: expected
      logs = [logs];
    }

    const lokiLogs = logs.map((log) =>
      this.#logBuilder.build({
        log,
        replaceTimestamp: this.#options.replaceTimestamp,
        additionalLabels: this.#options.labels,
        convertArrays: this.#options.convertArrays,
      }),
    );

    debug(`[LogPusher] pushing ${lokiLogs.length} logs to Loki`);

    try {
      await this.#client.post('loki/api/v1/push', {
        json: { streams: lokiLogs },
      });
    } catch (e) {
      await this.#handleFailure(e);
    }

    debug(`[LogPusher] pushed ${lokiLogs.length} logs to Loki`, {
      logs: lokiLogs,
    });
  }
}
