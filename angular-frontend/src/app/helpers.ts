export const displayDate = (value:{processedAt?:string;originatedAt?:string}) => value.processedAt || value.originatedAt || '';
export const utilization = (balance:number, limit:number) => limit > 0 ? Math.max(0, Math.min(100, Math.round((balance / limit) * 100))) : 0;
export const retryMessage = (status:number) => status === 412 ? 'This record changed elsewhere. Reload the latest details and try again.' : status === 428 ? 'The latest record version is required. Reload before trying again.' : '';
