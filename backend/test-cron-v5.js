const cp = require('cron-parser');
const parser = cp.default || cp;

console.log('Type of parser:', typeof parser);
console.log('Keys of parser:', Object.keys(parser));

try {
    const interval = parser.parse('* * * * *');
    console.log('Success with parser.parse!');
    console.log('Next run:', interval.next().toString());
} catch (e) {
    console.log('Failed with parser.parse:', e.message);
}

// Try another way based on what I saw in index.js
const { CronExpressionParser } = require('cron-parser');
try {
    const interval = CronExpressionParser.parse('* * * * *');
    console.log('Success with CronExpressionParser.parse!');
} catch (e) {
    console.log('Failed with CronExpressionParser.parse:', e.message);
}
