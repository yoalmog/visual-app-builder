// AI Provider Factory
import { AIProvider } from '../core/AIProvider';
import { MockAIProvider } from './MockAIProvider';

export class ProviderFactory {
  private static mockInstance: MockAIProvider | null = null;

  public static getProvider(name = 'mock'): AIProvider {
    switch (name.toLowerCase()) {
      case 'mock':
      default:
        if (!this.mockInstance) {
          this.mockInstance = new MockAIProvider();
        }
        return this.mockInstance;
    }
  }

  public static resetMock(): void {
    this.mockInstance = null;
  }
}
