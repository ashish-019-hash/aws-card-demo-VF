import { ReportWorkerService } from '../../src/modules/reports/report-worker.service';
import type { ReportJobRepository } from '../../src/modules/reports/report-job.repository';
import type { ReportQueryRepository } from '../../src/modules/reports/report-query.repository';
import type { ReportJobRecord } from '../../src/modules/reports/report-types';

const job: ReportJobRecord = {
  id: '11111111-1111-1111-1111-111111111111',
  status: 'processing',
  reportKind: 'custom',
  timestampMode: 'processed-or-original',
  rangeStart: '2099-01-01',
  rangeEnd: '2099-01-01',
  attempts: 1,
  nextAttemptAt: '2099-01-01 00:00:00+00',
  leaseToken: '22222222-2222-2222-2222-222222222222',
  leaseOwner: 'test-worker',
  leaseExpiresAt: '2099-01-01 00:01:00+00',
  completedAt: null,
  artifactSha256: null,
  artifactLength: null,
  artifactContentType: null,
  artifactFilename: null,
  artifactMetadata: null,
  warnings: [],
  errorMessage: null,
  createdAt: '2099-01-01 00:00:00+00',
  updatedAt: '2099-01-01 00:00:00+00',
};

describe('ReportWorkerService empty report completion', () => {
  it('completes an empty report with its valid five-line artifact', async () => {
    const complete = jest.fn<Promise<boolean>, [string, string, unknown]>().mockResolvedValue(true);
    const jobs = {
      heartbeat: jest.fn().mockResolvedValue(true),
      complete,
      fail: jest.fn(),
    } as unknown as ReportJobRepository;
    const queries = {
      snapshot: jest.fn().mockResolvedValue([]),
    } as unknown as ReportQueryRepository;
    const config = {
      getOrThrow: jest.fn(
        (key: string) =>
          ({
            reportLeaseSeconds: 30,
            reportMaxAttempts: 3,
            reportWorkerPollMs: 1,
            reportRetryDelaySeconds: 1,
          })[key],
      ),
    };
    const worker = new ReportWorkerService(jobs, queries, config as never);

    await (worker as unknown as { process(value: ReportJobRecord): Promise<void> }).process(job);

    expect(complete).toHaveBeenCalledTimes(1);
    const call = complete.mock.calls[0];
    if (!call) throw new Error('Expected completion call');
    const report = call[2] as {
      bytes: Buffer;
      metadata: { detailCount: number; pageCount: number };
    };
    expect(report.bytes.length).toBe(669);
    expect(report.bytes.toString('ascii').split('\n')).toHaveLength(5);
    expect(report.metadata).toMatchObject({ detailCount: 0, pageCount: 1 });
    expect((jobs as unknown as { fail: jest.Mock }).fail).not.toHaveBeenCalled();
  });
});
