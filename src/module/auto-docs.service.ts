import { Injectable, Logger } from '@nestjs/common';
import { ControllerScanner } from '../scanner/controller-scanner';
import { OpenApiGenerator } from '../generators/openapi-generator';
import { CategoryGenerator } from '../generators/category-generator';
import { AutoDocsOptions } from '../interfaces/options.interface';
import { OpenApiSpec } from '../interfaces/openapi.interface';
import { ControllerMetadata } from '../interfaces';

@Injectable()
export class AutoDocsService {
  private readonly logger = new Logger(AutoDocsService.name);
  private openApiSpec: OpenApiSpec | null = null;
  private controllers: ControllerMetadata[] = [];
  private lastScanTime: Date | null = null;

  constructor(
    private readonly options: AutoDocsOptions,
    private readonly controllerScanner: ControllerScanner,
    private readonly openApiGenerator: OpenApiGenerator,
    private readonly categoryGenerator: CategoryGenerator,
  ) {}

  /**
   * Initialize the service (scan controllers and generate spec)
   */
  async initialize(): Promise<void> {
    this.logger.log('Initializing AutoDocs service...');

    try {
      await this.scan();
      this.logger.log(`✅ AutoDocs initialized successfully - Found ${this.controllers.length} controllers`);
    } catch (error) {
      this.logger.error('Failed to initialize AutoDocs', error);
      throw error;
    }
  }

  /**
   * Scan controllers and generate OpenAPI spec
   */
  async scan(): Promise<void> {
    this.logger.log('Scanning controllers...');

    try {
      // Scan all controllers
      let controllers = await this.controllerScanner.scanControllers();

      this.logger.log(`Found ${controllers.length} controllers`);

      // Apply category mapping if configured
      if (this.options.categoryMapping) {
        controllers = this.categoryGenerator.applyCategoryMapping(
          controllers,
          this.options.categoryMapping,
        );
      }

      // Log categories
      const categories = this.categoryGenerator.getCategories(controllers);
      this.logger.log(`Categories: ${categories.join(', ')}`);

      // Store controllers
      this.controllers = controllers;

      // Generate OpenAPI spec
      this.openApiSpec = this.openApiGenerator.generate(controllers, this.options);

      this.lastScanTime = new Date();

      this.logger.log('✅ Scan completed successfully');
    } catch (error) {
      this.logger.error('Failed to scan controllers', error);
      throw error;
    }
  }

  /**
   * Get the generated OpenAPI specification
   */
  getOpenApiSpec(): OpenApiSpec {
    if (!this.openApiSpec) {
      throw new Error('OpenAPI spec not generated. Call initialize() first.');
    }

    return this.openApiSpec;
  }

  /**
   * Get all scanned controllers
   */
  getControllers(): ControllerMetadata[] {
    return this.controllers;
  }

  /**
   * Get controllers grouped by category
   */
  getControllersByCategory(): Record<string, ControllerMetadata[]> {
    return this.categoryGenerator.groupByCategory(this.controllers);
  }

  /**
   * Get last scan time
   */
  getLastScanTime(): Date | null {
    return this.lastScanTime;
  }

  /**
   * Get scan statistics
   */
  getStats() {
    const categories = this.categoryGenerator.getCategories(this.controllers);
    const totalRoutes = this.controllers.reduce((sum, ctrl) => sum + ctrl.routes.length, 0);

    return {
      totalControllers: this.controllers.length,
      totalRoutes,
      totalCategories: categories.length,
      categories,
      lastScanTime: this.lastScanTime,
    };
  }
}
