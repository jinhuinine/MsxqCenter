// 位置同步客户端测试工具 (安全版本)
const WebSocket = require('ws');
const readline = require('readline');
const crypto = require('crypto');

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
    // 验证URL格式
    try {
      new URL(answer);
      serverUrl = answer;
    } catch (e) {
      console.error('无效的URL格式，使用默认地址');
    }
  }
  
  console.log(`连接到服务器: ${serverUrl}`);
  
  // 创建WebSocket连接
  const ws = new WebSocket(serverUrl);
  
  // 重连逻辑
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const reconnectInterval = 3000; // 3秒
  
  function connect() {
    // 连接建立
    ws.on('open', () => {
      console.log('已连接到服务器');
      reconnectAttempts = 0; // 重置重连计数
      
      // 生成随机客户端IP (仅用于测试)
      const clientIP = '192.168.1.' + Math.floor(Math.random() * 255);
      console.log(`模拟客户端IP: ${clientIP}`);
      
      // 发送位置更新
      function sendLocationUpdate() {
        try {
          // 生成随机位置数据 (使用整数值和真实ID)
          const transforms = [
            {
              id: clientIP + ":Test01",
              data: [
                Math.floor(Math.random() * 3000),       // x: 0-3000 整数
                Math.floor(Math.random() * 3000),       // y: 0-3000 整数
                Math.floor(Math.random() * 360 - 180),  // yaw: -180 to 180 整数
                1                                       // scale: 固定为1
              ]
            },
            {
              id: clientIP + ":Test02",
              data: [
                Math.floor(Math.random() * 3000),
                Math.floor(Math.random() * 3000),
                Math.floor(Math.random() * 4) * 90,     // yaw: 0, 90, 180, 270
                1
              ]
            },
            {
              id: clientIP + ":Test03",
              data: [
                Math.floor(Math.random() * 3000),
                Math.floor(Math.random() * 3000),
                -120,                                   // yaw: 固定为-120
                1
              ]
            },
            {
              id: clientIP + ":Test04",
              data: [
                Math.floor(Math.random() * 3000),
                Math.floor(Math.random() * 3000),
                Math.floor(Math.random() * 360 - 180),
                1
              ]
            },
            {
              id: clientIP + ":Test05",
              data: [
                Math.floor(Math.random() * 3000),
                Math.floor(Math.random() * 3000),
                Math.floor(Math.random() * 360 - 180),
                1
              ]
            },
            {
              id: clientIP + ":Test06",
              data: [
                Math.floor(Math.random() * 3000),
                Math.floor(Math.random() * 3000),
                Math.floor(Math.random() * 360 - 180),
                1
              ]
            },
            {
              id: clientIP + ":Test07",
              data: [
                Math.floor(Math.random() * 3000),
                Math.floor(Math.random() * 3000),
                Math.floor(Math.random() * 360 - 180),
                1
              ]
            },
            {
              id: clientIP + ":Test08",
              data: [
                Math.floor(Math.random() * 3000),
                Math.floor(Math.random() * 3000),
                Math.floor(Math.random() * 360 - 180),
                1
              ]
            },
            {
              id: clientIP + ":Test09",
              data: [
                Math.floor(Math.random() * 3000),
                Math.floor(Math.random() * 3000),
                Math.floor(Math.random() * 360 - 180),
                1
              ]
            },
            {
              id: clientIP + ":Test10",
              data: [
                Math.floor(Math.random() * 3000),
                Math.floor(Math.random() * 3000),
                Math.floor(Math.random() * 360 - 180),
                1
              ]
            },
            {
              id: clientIP + ":Test11",
              data: [
                Math.floor(Math.random() * 3000),
                Math.floor(Math.random() * 3000),
                Math.floor(Math.random() * 360 - 180),
                1
              ]
            },
            {
              id: clientIP + ":Test12",
              data: [
                Math.floor(Math.random() * 3000),
                Math.floor(Math.random() * 3000),
                Math.floor(Math.random() * 360 - 180),
                1
              ]
            },
            {
              id: clientIP + ":Test13",
              data: [
                Math.floor(Math.random() * 3000),
                Math.floor(Math.random() * 3000),
                Math.floor(Math.random() * 360 - 180),
                1
              ]
            },
            {
              id: clientIP + ":Test14",
              data: [
                Math.floor(Math.random() * 3000),
                Math.floor(Math.random() * 3000),
                Math.floor(Math.random() * 360 - 180),
                1
              ]
            },
            {
              id: clientIP + ":Test15",
              data: [
                Math.floor(Math.random() * 3000),
                Math.floor(Math.random() * 3000),
                Math.floor(Math.random() * 360 - 180),
                1
              ]
            },
            {
              id: clientIP + ":Test16",
              data: [
                Math.floor(Math.random() * 3000),
                Math.floor(Math.random() * 3000),
                Math.floor(Math.random() * 360 - 180),
                1
              ]
            }
          ];
          
          // 验证消息格式
          const isValid = transforms.every(transform => 
            transform && typeof transform.id === 'string' && 
            Array.isArray(transform.data) && transform.data.length === 4 &&
            transform.data.every(val => typeof val === 'number' && isFinite(val))
          );
          
          if (!isValid) {
            console.error('无效的transforms数据格式');
            return;
          }
          
          const message = {
            type: 'LocationUpdate',
            clientIP: clientIP,
            transforms: transforms
          };
          
          ws.send(JSON.stringify(message));
          console.log('已发送位置更新');
        } catch (error) {
          console.error('发送位置更新失败:', error);
        }
      }
      
      // 定期发送位置更新 (使用安全的间隔)
      const interval = setInterval(sendLocationUpdate, 200);
      
      // 接收消息
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('收到消息:', message);
        } catch (error) {
          console.error('解析消息错误:', error);
        }
      });
      
      // 连接关闭
      ws.on('close', (code, reason) => {
        console.log(`与服务器的连接已关闭: ${code} ${reason}`);
        clearInterval(interval);
        
        // 尝试重连
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          console.log(`尝试重连 (${reconnectAttempts}/${maxReconnectAttempts})...`);
          setTimeout(() => {
            ws.removeAllListeners();
            connect();
          }, reconnectInterval);
        } else {
          console.log('达到最大重连次数，退出程序');
          rl.close();
        }
      });
      
      // 错误处理
      ws.on('error', (error) => {
        console.error('WebSocket错误:', error);
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
  }
  
  connect();
  
  // 设置连接超时
  const connectionTimeout = setTimeout(() => {
    if (ws.readyState !== WebSocket.OPEN) {
      console.error('连接超时');
      ws.terminate();
      rl.close();
    }
  }, 10000);
  
  ws.on('open', () => {
    clearTimeout(connectionTimeout);
  });
}); 