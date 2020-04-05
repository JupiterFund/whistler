'use strict';

const { GRPCServer } = require('./lib/grpc-server');
const { KafkaClient } = require('./lib/kafka-client');

const kafkaClient = new KafkaClient();
const server = new GRPCServer(kafkaClient);
server.start();

// 检查内存溢出情况代码
// TODO: to be removed
// const interval = setInterval(()=> {
//   const used = process.memoryUsage();
//   for (let key in used) {
//     console.log(`${key} ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
//   }
//   console.log('==================');
// }, 5000);

const gracefulShutdown = (signal) => {
  console.log('Received process signal: ', signal);
  // clearImmediate(interval);
  console.log('Destroy kafka client');
  kafkaClient.destroy();
  server.stop();
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
