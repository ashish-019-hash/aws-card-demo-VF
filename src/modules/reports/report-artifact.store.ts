import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface StoredReportArtifact {
  content: Buffer;
  sha256: string;
  length: number;
  contentType: string;
  filename: string;
}

@Injectable()
export class ReportArtifactStore {
  constructor(private readonly dataSource: DataSource) {}

  async put(id: string, artifact: StoredReportArtifact): Promise<void> {
    await this.dataSource.query(
      `UPDATE report_jobs SET artifact = $2, artifact_sha256 = $3, artifact_length = $4,
       artifact_content_type = $5, artifact_filename = $6, updated_at = clock_timestamp() WHERE id = $1`,
      [
        id,
        artifact.content,
        artifact.sha256,
        artifact.length,
        artifact.contentType,
        artifact.filename,
      ],
    );
  }

  async get(id: string): Promise<StoredReportArtifact | null> {
    const rows: Array<{
      artifact: Buffer;
      artifact_sha256: string;
      artifact_length: number;
      artifact_content_type: string;
      artifact_filename: string;
    }> = await this.dataSource.query(
      `SELECT artifact, artifact_sha256, artifact_length, artifact_content_type, artifact_filename FROM report_jobs WHERE id = $1 AND status = 'completed'`,
      [id],
    );
    const row = rows[0];
    return row === undefined
      ? null
      : {
          content: row.artifact,
          sha256: row.artifact_sha256,
          length: row.artifact_length,
          contentType: row.artifact_content_type,
          filename: row.artifact_filename,
        };
  }
}
