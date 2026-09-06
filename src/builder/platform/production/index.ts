// Phase 10 Production Adapters & Factory Environment Selector
import {
  LocalDatabaseScalingProvider,
  LocalCacheProvider,
  LocalBackupProvider,
  LocalWorkerProvider,
  LocalEventBusProvider,
  DatabaseScalingProvider,
  CacheProvider,
  BackupProvider,
  WorkerProvider,
  EventBusProvider,
} from '../enterprise/InfrastructureProviders';
import { LocalOAuthProvider, OAuthProvider } from '../enterprise/DeveloperEcosystem';
import { LocalAdvancedDeploymentEngine, AdvancedDeploymentEngine } from '../enterprise/ExperimentationAndDeployments';
import { LocalSSOProvider, SSOProvider } from '../enterprise/IdentityAndSecurity';

import { PostgresDatabaseScalingProvider } from './PostgresDatabaseScalingProvider';
import { RedisCacheProvider } from './RedisCacheProvider';
import { S3BackupProvider } from './S3BackupProvider';
import { MessageBrokerQueueProvider } from './MessageBrokerQueueProvider';
import { OidcSSOProvider } from './OidcSSOProvider';
import { HttpOAuthProvider } from './HttpOAuthProvider';
import { ProxyAdvancedDeploymentEngine } from './ProxyAdvancedDeploymentEngine';

export {
  PostgresDatabaseScalingProvider,
  RedisCacheProvider,
  S3BackupProvider,
  MessageBrokerQueueProvider,
  OidcSSOProvider,
  HttpOAuthProvider,
  ProxyAdvancedDeploymentEngine,
};

// Check if production adapters are explicitly enabled via environment variables
export function isProductionAdapterEnabled(adapterKey: string): boolean {
  if (process.env.NODE_ENV === 'test' && !process.env.FORCE_PRODUCTION_ADAPTERS) {
    return false;
  }
  if (process.env.ENABLE_ALL_PRODUCTION_ADAPTERS === 'true') {
    return true;
  }
  const envVar = `ENABLE_PROD_${adapterKey.toUpperCase()}_ADAPTER`;
  return process.env[envVar] === 'true';
}

// 1. Database Scaling Provider Factory
export function getDatabaseScalingProvider(): DatabaseScalingProvider {
  if (isProductionAdapterEnabled('database')) {
    return new PostgresDatabaseScalingProvider();
  }
  return new LocalDatabaseScalingProvider();
}

// 2. Cache Provider Factory
export function getCacheProvider(): CacheProvider {
  if (isProductionAdapterEnabled('cache')) {
    return new RedisCacheProvider();
  }
  return new LocalCacheProvider();
}

// 3. Backup Provider Factory
export function getBackupProvider(): BackupProvider {
  if (isProductionAdapterEnabled('backup')) {
    return new S3BackupProvider();
  }
  return new LocalBackupProvider();
}

// 4. Worker Provider Factory
export function getWorkerProvider(): WorkerProvider {
  if (isProductionAdapterEnabled('worker')) {
    return new MessageBrokerQueueProvider();
  }
  return new LocalWorkerProvider();
}

// 5. Event Bus Provider Factory
export function getEventBusProvider(): EventBusProvider {
  if (isProductionAdapterEnabled('event_bus')) {
    return new MessageBrokerQueueProvider();
  }
  return new LocalEventBusProvider();
}

// 6. SSO Provider Factory
export function getSSOProvider(): SSOProvider {
  if (isProductionAdapterEnabled('sso')) {
    return new OidcSSOProvider();
  }
  return new LocalSSOProvider();
}

// 7. OAuth Provider Factory
export function getOAuthProvider(): OAuthProvider {
  if (isProductionAdapterEnabled('oauth')) {
    return new HttpOAuthProvider();
  }
  return new LocalOAuthProvider();
}

// 8. Advanced Deployment Engine Factory
export function getAdvancedDeploymentEngine(): AdvancedDeploymentEngine {
  if (isProductionAdapterEnabled('deployments')) {
    return new ProxyAdvancedDeploymentEngine();
  }
  return new LocalAdvancedDeploymentEngine();
}
