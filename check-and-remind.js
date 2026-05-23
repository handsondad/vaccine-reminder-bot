const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 加载 .env 文件中的环境变量
dotenv.config();

const execAsync = promisify(exec);

// 配置 - 从环境变量读取敏感信息
const BASE_TOKEN = process.env.VACCINE_BASE_TOKEN;
const TABLE_ID = process.env.VACCINE_TABLE_ID;
const USER_ID = process.env.VACCINE_USER_ID;

// 验证必要配置
if (!BASE_TOKEN || !TABLE_ID) {
  console.error('❌ 错误: 缺少必要的环境变量配置！');
  console.error('请确保在 .env 文件中设置了:');
  console.error('  VACCINE_BASE_TOKEN=你的多维表格Token');
  console.error('  VACCINE_TABLE_ID=你的表格ID');
  console.error('  VACCINE_USER_ID=你的飞书用户ID');
  console.error('');
  console.error('参考 .env.example 文件创建 .env 文件');
  process.exit(1);
}

// 验证 USER_ID
if (!USER_ID) {
  console.error('❌ 错误: 缺少 VACCINE_USER_ID 配置！');
  console.error('请确保在 .env 文件中设置了 VACCINE_USER_ID');
  console.error('参考 .env.example 文件创建 .env 文件');
  process.exit(1);
}

// 从飞书多维表格读取疫苗记录
async function fetchVaccineRecords() {
  try {
    console.log('正在从飞书多维表格读取疫苗记录...');
    const command = `lark-cli base +record-list --base-token ${BASE_TOKEN} --table-id ${TABLE_ID} --limit 100 --as user`;
    const { stdout } = await execAsync(command);
    
    // 解析输出
    const lines = stdout.split('\n').filter(line => line.trim());
    
    // 查找记录数据部分（跳过表头）
    const records = [];
    let inData = false;
    
    for (const line of lines) {
      // 跳过元数据行
      if (line.includes('Meta:') || line.includes('count=')) {
        const countMatch = line.match(/count=(\d+)/);
        if (countMatch) {
          console.log(`共找到 ${countMatch[1]} 条记录`);
        }
        continue;
      }
      
      // 跳过表头
      if (line.includes('---') || line.includes('_record_id')) {
        continue;
      }
      
      // 跳过空行
      if (!line.trim()) {
        continue;
      }
      
      // 尝试解析行数据
      const parts = line.split('|').filter(p => p.trim() && !p.includes('---'));
      if (parts.length >= 3) {
        // 格式：record_id | 文本 | 单选 | 附件 | 日期
        const recordId = parts[0].trim();
        const text = parts.length > 1 ? parts[1].trim() : '';
        const select = parts.length > 2 ? parts[2].trim() : '';
        const date = parts.length > 4 ? parts[4].trim() : '';
        
        if (recordId && recordId !== '_record_id') {
          // 使用文本或单选作为疫苗名称，日期作为接种日期
          const name = text || select;
          const vaccineDate = date;
          
          if (name && vaccineDate) {
            records.push({
              record_id: recordId,
              name: name,
              date: vaccineDate
            });
          }
        }
      }
    }
    
    console.log(`成功解析 ${records.length} 条疫苗记录\n`);
    return records;
    
  } catch (error) {
    console.error('读取疫苗记录失败:', error.message);
    return [];
  }
}

function getDateRange() {
  const dates = [];
  const today = new Date();
  
  for (let i = 0; i <= 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  return dates;
}

function getDaysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(dateStr);
  targetDate.setHours(0, 0, 0, 0);
  const diffTime = targetDate - today;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function checkVaccineDates(records) {
  const dateRange = getDateRange();
  const reminders = [];

  console.log('检查日期范围: 从', dateRange[0], '到', dateRange[7], '（提前一周提醒）\n');

  records.forEach(vaccine => {
    const vaccineDate = vaccine.date.split(' ')[0];
    
    if (dateRange.includes(vaccineDate)) {
      const daysUntil = getDaysUntil(vaccineDate);
      
      if (daysUntil === 0) {
        reminders.push(`今天（${vaccineDate}）要带宝宝去打${vaccine.name}哦！`);
      } else if (daysUntil === 1) {
        reminders.push(`明天（${vaccineDate}）要带宝宝去打${vaccine.name}，别忘了！`);
      } else if (daysUntil > 1 && daysUntil <= 7) {
        reminders.push(`${daysUntil}天后（${vaccineDate}）要带宝宝去打${vaccine.name}，记得提前安排！`);
      }
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
    console.log('消息发送成功');
    return true;
  } catch (error) {
    console.error('发送消息失败:', error);
    return false;
  }
}

async function createCalendarEvents() {
  // 从多维表格读取疫苗记录
  const records = await fetchVaccineRecords();
  
  if (records.length === 0) {
    console.log('没有找到疫苗记录，无法创建日程');
    return;
  }
  
  console.log('正在为', records.length, '条疫苗记录创建日历日程...\n');
  
  for (const vaccine of records) {
    const vaccineDate = vaccine.date.split(' ')[0]; // 只取日期部分
    const startTime = new Date(`${vaccineDate}T09:00+08:00`);
    const endTime = new Date(`${vaccineDate}T10:00+08:00`);
    
    try {
      const { stdout, stderr } = await execAsync(
        `lark-cli calendar +create --summary "宝宝打疫苗: ${vaccine.name}" --start "${startTime.toISOString()}" --end "${endTime.toISOString()}" --description "记得带宝宝去打${vaccine.name}" --as user`
      );
      console.log(`✓ 成功创建日程: ${vaccineDate} - ${vaccine.name}`);
    } catch (error) {
      console.error(`✗ 创建日程失败 ${vaccineDate} - ${vaccine.name}:`, error.message);
    }
  }
}

async function main() {
  console.log('=== 疫苗提醒检查 ===');
  console.log('从飞书多维表格读取疫苗记录...\n');

  // 从多维表格读取疫苗记录
  const records = await fetchVaccineRecords();
  
  if (records.length > 0) {
    console.log('疫苗记录列表:');
    records.forEach((v, i) => {
      console.log(`  ${i + 1}. ${v.name} - ${v.date}`);
    });
    console.log('');
  }

  // 检查是否有今天或明天的疫苗
  const reminders = checkVaccineDates(records);

  if (reminders.length > 0) {
    console.log('发现需要提醒的事项:');
    reminders.forEach(msg => console.log('  -', msg));
    console.log('');
    
    for (const msg of reminders) {
      await sendFeishuMessage(msg);
    }
  } else {
    console.log('今天和明天都没有需要提醒的疫苗接种 ✓');
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
  fetchVaccineRecords,
  createCalendarEvents
};
