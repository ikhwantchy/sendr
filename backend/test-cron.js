const cp = require('cron-parser');
console.log('Keys of require("cron-parser"):', Object.keys(cp));
console.log('Type of cp:', typeof cp);
if (cp.default) {
    console.log('Keys of cp.default:', Object.keys(cp.default));
    console.log('Type of cp.default:', typeof cp.default);
}
try {
    const interval = cp.parseExpression('* * * * *');
    console.log('Success with cp.parseExpression');
} catch (e) {
    console.log('Failed with cp.parseExpression:', e.message);
}
try {
    const interval = (cp.default || cp).parseExpression('* * * * *');
    console.log('Success with (cp.default || cp).parseExpression');
} catch (e) {
    console.log('Failed with (cp.default || cp).parseExpression:', e.message);
}
