// 局域网位置数据同步系统 - 简化版 (仅WebSocket)
const WebSocket = require('ws');
const os = require('os');

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

// 安全地解析JSON
function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

// 创建WebSocket服务器
const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

console.log(`位置同步服务器运行在 ws://${serverIP}:${PORT}`);

// WebSocket连接处理
wss.on('connection', (ws, req) => {
  // 安全地获取客户端IP
  const clientIP = (req.headers['x-forwarded-for']?.split(',')[0].trim() || 
                   req.socket.remoteAddress || '').replace(/^::ffff:/, '');
  
  console.log(`新客户端连接: ${clientIP}`);
  
  // 设置心跳检测
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  
  // 存储客户端连接
  clients.set(clientIP, ws);
  
  // 发送欢迎消息
  try {
    ws.send(JSON.stringify({
      type: 'ConnectionEstablished',
      message: `已连接到位置同步服务器 (${serverIP})`
    }));
  } catch (error) {
    console.error('发送欢迎消息失败:', error);
  }
  
  // 消息处理
  ws.on('message', (message) => {
    const data = safeJsonParse(message);
    if (!data) {
      console.error('收到无效JSON格式消息');
      return;
    }
    
    // 验证消息格式
    if (data.type !== 'LocationUpdate' || !data.clientIP || !Array.isArray(data.transforms)) {
      console.error('收到无效消息格式:', data);
      return;
    }
    
    // 验证transforms数据 (新格式)
    const isValidTransforms = data.transforms.every(transform => 
      transform && typeof transform === 'object' && 
      typeof transform.id === 'string' && 
      Array.isArray(transform.data) && transform.data.length === 4 &&
      transform.data.every(val => typeof val === 'number' && isFinite(val))
    );
    
    if (!isValidTransforms) {
      console.error('收到无效的transforms数据:', data.transforms);
      return;
    }
    
    // 记录收到的消息
    console.log(`收到来自 ${data.clientIP} 的位置更新，共 ${data.transforms.length} 个变换矩阵`);
    
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
        try {
          client.send(broadcastMessage);
        } catch (error) {
          console.error(`向客户端 ${ip} 发送消息失败:`, error);
        }
      }
    });
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

// 心跳检测间隔
const heartbeatInterval = setInterval(() => {
  clients.forEach((ws, ip) => {
    if (ws.isAlive === false) {
      console.log(`客户端 ${ip} 心跳超时，断开连接`);
      ws.terminate();
      clients.delete(ip);
      return;
    }
    
    ws.isAlive = false;
    ws.ping();
  });
}, 30000); // 30秒检查一次

// 优雅关闭
process.on('SIGINT', () => {
  console.log('正在关闭服务器...');
  
  clearInterval(heartbeatInterval);
  
  wss.close(() => {
    console.log('WebSocket服务器已关闭');
    process.exit(0);
  });
});