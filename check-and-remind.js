const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

const VACCINE_SCHEDULE = [
  { date: '2026-06-01', name: '乙肝第二针' },
  { date: '2026-07-15', name: '百白破第一针' },
  { date: '2026-09-01', name: '脊髓灰质炎疫苗' },
  { date: '2026-10-15', name: '百白破第二针' }
];

const USER_ID = process.env.VACCINE_USER_ID || 'ou_bd04f76cf94e31b0efd3be52b49caaac';

function getToday() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

function getTomorrow() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

function checkVaccineDates() {
  const today = getToday();
  const tomorrow = getTomorrow();
  const reminders = [];

  VACCINE_SCHEDULE.forEach(vaccine => {
    if (vaccine.date === today) {
      reminders.push(`今天（${vaccine.date}）要带宝宝去打${vaccine.name}哦！`);
    } else if (vaccine.date === tomorrow) {
      reminders.push(`明天（${vaccine.date}）要带宝宝去打${vaccine.name}，别忘了！`);
    }
  });

  return reminders;
}

async function sendFeishuMessage(message) {
  try {
    console.log('发送飞书消息:', message);
    const { stdout, stderr } = await execAsync(
      `lark-cli im +messages-send --user-id ${USER_ID} --text "${message}" --as user`
    );
    console.log('消息发送成功:', stdout);
    return true;
  } catch (error) {
    console.error('发送消息失败:', error);
    return false;
  }
}

async function createCalendarEvents() {
  console.log('正在创建疫苗日程...');
  for (const vaccine of VACCINE_SCHEDULE) {
    const startTime = new Date(`${vaccine.date}T09:00+08:00`);
    const endTime = new Date(`${vaccine.date}T10:00+08:00`);
    
    try {
      const { stdout, stderr } = await execAsync(
        `lark-cli calendar +create --summary "宝宝打疫苗: ${vaccine.name}" --start "${startTime.toISOString()}" --end "${endTime.toISOString()}" --description "记得带宝宝去打${vaccine.name}" --as user`
      );
      console.log(`成功创建日程: ${vaccine.date} - ${vaccine.name}`);
    } catch (error) {
      console.error(`创建日程失败 ${vaccine.date} - ${vaccine.name}:`, error);
    }
  }
}

async function main() {
  console.log('=== 疫苗提醒检查 ===');
  console.log('检查日期:', getToday());

  const reminders = checkVaccineDates();

  if (reminders.length > 0) {
    console.log('\n发现需要提醒的事项:');
    reminders.forEach(msg => console.log('-', msg));
    
    for (const msg of reminders) {
      await sendFeishuMessage(msg);
    }
  } else {
    console.log('\n最近没有需要提醒的疫苗接种');
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--create-calendar')) {
    createCalendarEvents();
  } else {
    main();
  }
}

module.exports = {
  checkVaccineDates,
  sendFeishuMessage,
  VACCINE_SCHEDULE
};
