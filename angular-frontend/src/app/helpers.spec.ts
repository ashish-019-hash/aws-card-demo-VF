import { displayDate, retryMessage, utilization } from './helpers';
describe('workflow helpers',()=>{
 it('prefers processedAt and falls back to originatedAt',()=>{expect(displayDate({processedAt:'2022-06-02',originatedAt:'2022-06-01'})).toBe('2022-06-02');expect(displayDate({originatedAt:'2022-06-01'})).toBe('2022-06-01');});
 it('guards utilization against invalid credit limits',()=>{expect(utilization(20,100)).toBe(20);expect(utilization(20,0)).toBe(0);expect(utilization(-20,100)).toBe(0);expect(utilization(200,100)).toBe(100);});
 it('explains concurrency preconditions',()=>{expect(retryMessage(412)).toContain('changed');expect(retryMessage(428)).toContain('required');});
});
