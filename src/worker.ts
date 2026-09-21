import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ReportWorkerService } from './modules/reports/report-worker.service';

async function bootstrap(): Promise<void> {
  process.env.TZ = 'UTC';
  const app = await NestFactory.createApplicationContext(AppModule, { bufferLogs: true });
  app.enableShutdownHooks();
  app.flushLogs();
  const worker = app.get(ReportWorkerService);
  worker.start();
  let stopping = false;
  const shutdown = (): void => {
    if (stopping) return;
    stopping = true;
    void worker
      .stop()
      .then(
        () => app.close(),
        () => app.close(),
      )
      .then(() => undefined);
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  Logger.log('Report worker started', 'Bootstrap');
}
void bootstrap();
