
import { AppError } from "../../server/utils/AppError";
import { errorHandler } from "../../server/middleware/error.middleware";
import { Logger } from "../../server/utils/logger";

// Mock objects
const req: any = { path: '/test' };
const res: any = {
    statusCode: 200,
    status: function (code: number) {
        this.statusCode = code;
        return this;
    },
    json: function (data: any) {
        console.log('Response:', JSON.stringify(data, null, 2));
        this.data = data;
        return this;
    }
};
const next: any = () => { };

// Mock Logger to avoid noise
Logger.error = (msg, meta) => console.log(`[Logger.error] ${msg}`, meta);
Logger.warn = (msg, meta) => console.log(`[Logger.warn] ${msg}`, meta);

async function runTests() {
    console.log('--- Test 1: Operational AppError (400) ---');
    const error1 = new AppError('Invalid Input', 400, 'INVALID_INPUT', { field: 'email' });
    errorHandler(error1, req, res, next);

    if (res.statusCode === 400 && res.data.success === false && res.data.error.code === 'INVALID_INPUT') {
        console.log('✅ Test 1 Passed');
    } else {
        console.error('❌ Test 1 Failed');
    }

    console.log('\n--- Test 2: Unknown Error (500) ---');
    const error2 = new Error('Database exploded');
    errorHandler(error2, req, res, next);

    if (res.statusCode === 500 && res.data.success === false && res.data.error.code === 'INTERNAL_SERVER_ERROR') {
        console.log('✅ Test 2 Passed');
    } else {
        console.error('❌ Test 2 Failed');
    }
}

runTests().catch(console.error);
