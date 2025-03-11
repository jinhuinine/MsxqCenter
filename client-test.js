// 位置同步客户端测试工具
const WebSocket = require('ws');
const readline = require('readline');

// 创建命令行接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 默认服务器地址
let serverUrl = 'ws://localhost:3000';

// 询问服务器地址
rl.question('请输入服务器地址 (默认: ws://localhost:3000): ', (answer) => {
  if (answer.trim() !== '') {
    serverUrl = answer;
  }
  
  console.log(`连接到服务器: ${serverUrl}`);
  
  // 创建WebSocket连接
  const ws = new WebSocket(serverUrl);
  
  // 连接建立
  ws.on('open', () => {
    console.log('已连接到服务器');
    
    // 模拟客户端IP
    const clientIP = '192.168.1.' + Math.floor(Math.random() * 255);
    console.log(`模拟客户端IP: ${clientIP}`);
    
    // 发送位置更新
    function sendLocationUpdate() {
      // 生成随机位置数据
      const transforms = [
        [
          parseFloat((Math.random() * 100).toFixed(1)),  // x
          parseFloat((Math.random() * 100).toFixed(1)),  // y
          parseFloat((Math.random() * 360 - 180).toFixed(1)),  // yaw
          parseFloat((Math.random() * 3 + 0.5).toFixed(1))  // scale
        ],
        [
          parseFloat((Math.random() * 100).toFixed(1)),
          parseFloat((Math.random() * 100).toFixed(1)),
          parseFloat((Math.random() * 360 - 180).toFixed(1)),
          parseFloat((Math.random() * 3 + 0.5).toFixed(1))
        ]
      ];
      
      const message = {
        type: 'LocationUpdate',
        clientIP: clientIP,
        transforms: transforms
      };
      
      ws.send(JSON.stringify(message));
      console.log('已发送位置更新:', message);
    }
    
    // 定期发送位置更新
    const interval = setInterval(sendLocationUpdate, 2000);
    
    // 接收消息
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        console.log('收到消息:', message);
      } catch (error) {
        console.error('解析消息错误:', error);
      }
    });
    
    // 连接关闭
    ws.on('close', () => {
      console.log('与服务器的连接已关闭');
      clearInterval(interval);
      rl.close();
    });
    
    // 错误处理
    ws.on('error', (error) => {
      console.error('WebSocket错误:', error);
      clearInterval(interval);
      rl.close();
    });
    
    // 命令行控制
    console.log('\n命令:');
    console.log('  send - 手动发送位置更新');
    console.log('  exit - 退出程序');
    
    rl.on('line', (input) => {
      if (input === 'send') {
        sendLocationUpdate();
      } else if (input === 'exit') {
        console.log('关闭连接...');
        clearInterval(interval);
        ws.close();
        rl.close();
      } else {
        console.log('未知命令. 可用命令: send, exit');
      }
    });
  });
}); 