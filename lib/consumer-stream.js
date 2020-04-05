'use strict';

const { Readable } = require('stream');

// 私有方法名
const init = Symbol();
const start = Symbol();
const onCrash = Symbol();
const run = Symbol();

class ConsumerStream extends Readable {
  // 私有变量
  #consumer;
  #kafka;
  #config;
  #topic;
  #connected;
  #started;
  #paused;

  constructor(kafka, options) {
    super();
    this.#kafka = kafka;
    this.#config = options.config;
    this.#topic = options.topic;
    this[init]();
  }

  [init]() {
    this.#connected = false;
    this.#started = false;
    this.#paused = false;
  }

  // 继承方法
  _read() {
    (async () => {
      try {
        await this[start]();
      } catch (e) {
        this.destroy(e);
      }
    })();
  }

  async [start]() {
    if (!this.#connected) {
      this.#connected = true;
      this.#consumer = this.#kafka.consumer(this.#config);
      await this.#consumer.connect();
      await this.#consumer.subscribe(this.#topic);
      this.#consumer.on("consumer.crash", this[onCrash]);
    }
    if (!this.#started) {
      this.#started = true;
      await this[run]();
    }
    if (this.#paused) {
      this.#paused = false;
    }
  }

  [onCrash] = async (err) => {
    console.error(err);
    this[init]();
    await this[start]();
  };

  async [run]() {
    await this.#consumer.run({
      // 取消自动提交Offset，目的为了每次都只消费最新的数据
      autoCommit: false,
      eachBatchAutoResolve: false,
      eachBatch: async ({ batch, resolveOffset, heartbeat }) => {
        if (this.#paused) {
          return;
        }
        for (const message of batch.messages) {
          if (this.#paused) {
            break;
          }
          const continueToPush = this.push(message.value);
          resolveOffset(message.offset);
          await heartbeat();
          if (!continueToPush) {
            this.#paused = true;
          }
        }
      },
    });
  }

  // 继承方法
  _destroy(error) {
    this.#consumer.disconnect();
    super.destroy(error === null ? undefined : error);
  }
}

exports.ConsumerStream = ConsumerStream;
