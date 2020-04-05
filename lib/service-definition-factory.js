'use strict';

const path = require('path');
const protoLoader = require('@grpc/proto-loader');
const grpc = require('@grpc/grpc-js');

class ServiceDefinitionFactory {
  #options = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: ['../node_modules']
  };
  #packageObject;

  constructor() {
    // TODO: read all protos under jupiterapis directory
    const protoDir = path.join(__dirname, '../node_modules/jupiterapis');
    const dashboardsServiceProto = path.join(protoDir, 'jupiter/monitoring/dashboard/v1/dashboards_service.proto');
    const packageDefinition = protoLoader.loadSync(dashboardsServiceProto, this.#options);
    this.#packageObject = grpc.loadPackageDefinition(packageDefinition);
  }

  get(serviceFqn) {
    const nameComponents = serviceFqn.split('.');
    return nameComponents.reduce((acc, curr) => acc[curr], this.#packageObject);
  }
}

exports.ServiceDefinitionFactory = ServiceDefinitionFactory;
