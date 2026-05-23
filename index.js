const cron = require('node-cron');
const { checkVaccineDates, sendFeishuMessage } = require('./check-and-remind');

console.log('=== 疫苗提醒机器人启动 ===');
console.log('每天早上 8 点自动检查并提醒');
console.log('按 Ctrl+C 停止服务');

cron.schedule('0 8 * * *', async () => {
  console.log('\n[定时任务触发]', new Date().toLocaleString());
  
  const reminders = checkVaccineDates();
  
  if (reminders.length > 0) {
    console.log('发现需要提醒的事项:');
    reminders.forEach(msg => console.log('-', msg));
    
    for (const msg of reminders) {
      await sendFeishuMessage(msg);
    }
  } else {
    console.log('最近没有需要提醒的疫苗接种');
  }
});

process.on('SIGINT', () => {
  console.log('\n服务已停止');
  process.exit(0);
});
