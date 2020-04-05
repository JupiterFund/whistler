'use strict';

const { Kafka } = require('kafkajs');
const { asapScheduler } = require('rxjs');
const { publish, subscribeOn, observeOn } = require('rxjs/operators');
const { streamToRx } = require('rxjs-stream');

const { ConsumerStream } = require('./consumer-stream');

class KafkaClient {
  // 私有变量
  #kafka;
  #streams = new Map();
  #observables = new Map();

  constructor() {
    // 连接Kafka源
    this.#kafka = new Kafka({
      clientId: 'whistler',
      brokers: ['kafka:9092']
    });
  }

  subscribe(topics=[]) {
    for (let topic of topics) {
      let stream = new ConsumerStream(this.#kafka, {
        config: { 
          groupId: 'whistler-group' 
        },
        topic: { 
          topic, 
          fromBeginning: false 
        },
      });
      // Avoid memory leak
      stream.setMaxListeners(8);
      stream.on('error', console.error);
      this.#streams.set(topic, stream);
    }
  }

  createObservable(topic) {
    if (this.#streams.has(topic)) {
      const stream = this.#streams.get(topic);
      // 将Kafka流转换为RxJS可订阅模式
      let observable = streamToRx(stream)
        .pipe(
          subscribeOn(asapScheduler),
          observeOn(asapScheduler),
          publish()
        );
      observable.connect();
      this.#observables.set(topic, observable);
      return observable;
    }
  }

  destroy() {
    for (let stream of this.#streams.values()) {
      stream._destroy({ message: 'Process was interrupted' });
    }
  }
}

exports.KafkaClient = KafkaClient;
