/**
 * OpenTelemetry Tracing Configuration
 * Jaeger를 통한 분산 트레이싱 설정
 * 
 * 중요: 이 파일은 앱의 가장 첫 번째 import여야 합니다!
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { AwsInstrumentation } from '@opentelemetry/instrumentation-aws-sdk';

const serviceName = process.env.OTEL_SERVICE_NAME || 'auth-service';
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317';
const serviceVersion = process.env.APP_VERSION || '1.0.0';
const environment = process.env.ENV || 'development';

const traceExporter = new OTLPTraceExporter({
  url: otlpEndpoint,
});

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
  }),
  traceExporter,
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    new PgInstrumentation({
      enhancedDatabaseReporting: true,
    }),
    new AwsInstrumentation({
      suppressInternalInstrumentation: true,
    }),
  ],
});

// 즉시 시작 (import 시점에 실행)
sdk.start();
console.log(`OpenTelemetry initialized - service: ${serviceName}, endpoint: ${otlpEndpoint}`);

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('OpenTelemetry terminated'))
    .catch((error) => console.error('Error terminating OpenTelemetry', error))
    .finally(() => process.exit(0));
});

export { sdk };

