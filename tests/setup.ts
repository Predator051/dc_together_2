import { beforeEach } from 'vitest';

// Bot runs are one long busy loop. The runner reports "test started" on a 100 ms throttle and waits up to
// a minute for the answer; a test that holds the loop longer than that ends with "Timeout calling
// onTaskUpdate". Let the report go out and come back before every test.
beforeEach(() => new Promise<void>((r) => setTimeout(r, 150)));
