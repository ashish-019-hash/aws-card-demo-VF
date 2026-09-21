import { CP037_TABLE } from './cp037.table';

export interface DecodeContext {
  dataset: string;
  record: number;
  field: string;
  offset: number;
}
export class Cp037DecodeError extends Error {
  constructor(
    message: string,
    readonly context: DecodeContext,
  ) {
    super(
      `${message} (${context.dataset} record ${context.record}, ${context.field}, byte ${context.offset})`,
    );
  }
}

export function decodeCp037(bytes: Uint8Array, context?: DecodeContext): string {
  let output = '';
  for (let index = 0; index < bytes.length; index += 1) {
    const value = bytes[index];
    if (value === undefined)
      throw new Cp037DecodeError(
        'Missing byte',
        context ?? { dataset: 'unknown', record: 0, field: 'unknown', offset: index },
      );
    const decoded = CP037_TABLE[value];
    if (decoded === undefined)
      throw new Cp037DecodeError(
        `No CP037 mapping for 0x${value.toString(16).padStart(2, '0')}`,
        context ?? { dataset: 'unknown', record: 0, field: 'unknown', offset: index },
      );
    output += decoded;
  }
  return output;
}

export function assertCp037Adapter(): void {
  const sentinel = decodeCp037(Buffer.from([0x40, 0xf0, 0xf9, 0xc1, 0xd1]));
  if (sentinel !== ' 09AJ') throw new Error(`CP037 self-test failed: ${JSON.stringify(sentinel)}`);
}
