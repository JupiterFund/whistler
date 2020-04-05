'use strict';

const { Server, ServerCredentials } = require('@grpc/grpc-js');

const { ServiceDefinitionFactory } = require('./service-definition-factory');

class GRPCServer extends Server {
  // 私有变量
  #kafkaClient;
  #subscriptions = [];

  constructor(kafkaClient) {
    super();
    this.#kafkaClient = kafkaClient;
    this.init();
  }

  init() {
    this.addDashboardsService();
    // TODO: add more services
  }

  addDashboardsService() {
    const topic = 'factor.ctp.profit.5min';
    this.#kafkaClient.subscribe([topic]);
    const observable = this.#kafkaClient.createObservable(topic);
    const serviceDefinitionFactory = new ServiceDefinitionFactory();
    const serviceDefinition = serviceDefinitionFactory.get('jupiter.monitoring.dashboard.v1.DashboardsService');
    this.addService(serviceDefinition.service, {
      getByteStream: (call) => {
        console.log('Incoming request', call.request);
        const cancel = () => {
          // 取消订阅
          subscription.unsubscribe();
          call.end();
        };
        const subscription = observable.subscribe(data => {
          if (call.call.stream.closed) {
            // 潜在内存泄漏
            // 客户端已经取消请求，服务器端没有及时被通知，
            // 导致连接生成大量Buffer资源，占用RSS内存
            console.log('Connection was already closed');
            cancel();
          } else {
            call.write({ data });
          }
        });
        this.#subscriptions.push(subscription);
        call
          .on('error', (err) => {
            console.error(err);
            cancel();
          })
          .on('cancelled', () => {
            console.log('Client side closed connection');
            cancel();
          });
      }
    });
  }

  start() {
    const ip = process.env.IP || '0.0.0.0';
    const port = process.env.PORT || 9090;
    super.bindAsync(`${ip}:${port}`, ServerCredentials.createInsecure(), (err, port) => {
      if (err) {
        console.error(err);
      } else {
        super.start();
      }
    });
  }

  stop() {
    console.log('Unsubscribe all remaining subscriptions');
    this.#subscriptions
      .filter(subscription => !subscription.isStopped)
      .forEach(subscription => subscription.unsubscribe());
    // this.#kafkaClient.destroy();
    console.log('Starting shutdown of grpc server...');
    this.tryShutdown((err) => {
      if (err) {
        console.error(err);
        console.log('Force shutdown');
        this.forceShutdown();
      }
      console.log('Server gracefully shutted down');
    });
  }
}

exports.GRPCServer = GRPCServer;
