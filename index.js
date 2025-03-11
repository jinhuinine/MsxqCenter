// 局域网位置数据同步系统 - 主入口点
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const os = require('os');

// 创建Express应用和HTTP服务器
const app = express();
const server = http.createServer(app);

// 创建WebSocket服务器
const wss = new WebSocket.Server({ server });

// 存储客户端连接
const clients = new Map();

// 获取本机IP地址
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // 跳过非IPv4和内部IP
      if (iface.family !== 'IPv4' || iface.internal !== false) continue;
      return iface.address;
    }
  }
  return '127.0.0.1';
}

const serverIP = getLocalIP();

// WebSocket连接处理
wss.on('connection', (ws, req) => {
  const clientIP = req.socket.remoteAddress.replace(/^::ffff:/, '');
  console.log(`新客户端连接: ${clientIP}`);
  
  // 存储客户端连接
  clients.set(clientIP, ws);
  
  // 发送欢迎消息
  ws.send(JSON.stringify({
    type: 'ConnectionEstablished',
    message: `已连接到位置同步服务器 (${serverIP})`
  }));
  
  // 消息处理
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // 验证消息格式
      if (data.type !== 'LocationUpdate' || !data.clientIP || !Array.isArray(data.transforms)) {
        console.error('收到无效消息格式:', data);
        return;
      }
      
      console.log(`收到来自 ${data.clientIP} 的位置更新`);
      
      // 创建广播消息
      const broadcastMessage = JSON.stringify({
        type: 'LocationBroadcast',
        sourceIP: data.clientIP,
        transforms: data.transforms
      });
      
      // 广播给其他客户端
      clients.forEach((client, ip) => {
        // 不发送给原始发送者
        if (ip !== data.clientIP && client.readyState === WebSocket.OPEN) {
          client.send(broadcastMessage);
        }
      });
    } catch (error) {
      console.error('处理消息时出错:', error);
    }
  });
  
  // 连接关闭处理
  ws.on('close', () => {
    console.log(`客户端断开连接: ${clientIP}`);
    clients.delete(clientIP);
  });
  
  // 错误处理
  ws.on('error', (error) => {
    console.error(`客户端 ${clientIP} 连接错误:`, error);
    clients.delete(clientIP);
  });
});

// 添加一个简单的状态页面
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>位置同步服务器</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          h1 { color: #333; }
          .info { background-color: #f4f4f4; padding: 20px; border-radius: 5px; }
          .clients { margin-top: 20px; }
        </style>
      </head>
      <body>
        <h1>位置同步服务器</h1>
        <div class="info">
          <p>服务器IP: ${serverIP}</p>
          <p>WebSocket端口: ${PORT}</p>
          <p>连接客户端数: ${clients.size}</p>
        </div>
        <div class="clients">
          <h2>已连接客户端:</h2>
          <ul id="clientList">
            ${Array.from(clients.keys()).map(ip => `<li>${ip}</li>`).join('')}
          </ul>
        </div>
        <script>
          // 简单的自动刷新
          setTimeout(() => location.reload(), 5000);
        </script>
      </body>
    </html>
  `);
});

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`位置同步服务器运行在 http://${serverIP}:${PORT}`);
  console.log(`WebSocket服务器运行在 ws://${serverIP}:${PORT}`);
}); 