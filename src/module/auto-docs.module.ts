import { DynamicModule, Module, OnModuleInit } from '@nestjs/common';
import { AutoDocsService } from './auto-docs.service';
import { ScalarController } from '../ui/scalar-controller';
import { AutoDocsOptions } from '../interfaces/options.interface';
import { ControllerScanner } from '../scanner/controller-scanner';
import { OpenApiGenerator } from '../generators/openapi-generator';
import { CategoryGenerator } from '../generators/category-generator';

@Module({})
export class AutoDocsModule implements OnModuleInit {
  constructor(private readonly autoDocsService: AutoDocsService) {}

  async onModuleInit() {
    if (this.autoDocsService) {
      await this.autoDocsService.initialize();
    }
  }

  /**
   * Register AutoDocs module with configuration
   */
  static forRoot(options: AutoDocsOptions): DynamicModule {
    // Apply defaults
    const mergedOptions: AutoDocsOptions = {
      sourcePath: 'src',
      docsPath: '/docs',
      specPath: '/docs-json',
      scanOnStart: true,
      watchMode: false,
      includeSecurity: true,
      ...options,
    };

    return {
      module: AutoDocsModule,
      controllers: [ScalarController],
      providers: [
        {
          provide: 'AUTO_DOCS_OPTIONS',
          useValue: mergedOptions,
        },
        {
          provide: ControllerScanner,
          useFactory: (options: AutoDocsOptions) => {
            return new ControllerScanner(options.sourcePath || 'src');
          },
          inject: ['AUTO_DOCS_OPTIONS'],
        },
        OpenApiGenerator,
        CategoryGenerator,
        {
          provide: AutoDocsService,
          useFactory: (
            options: AutoDocsOptions,
            scanner: ControllerScanner,
            generator: OpenApiGenerator,
            categoryGen: CategoryGenerator,
          ) => {
            return new AutoDocsService(options, scanner, generator, categoryGen);
          },
          inject: ['AUTO_DOCS_OPTIONS', ControllerScanner, OpenApiGenerator, CategoryGenerator],
        },
      ],
      exports: [AutoDocsService],
    };
  }

  /**
   * Register AutoDocs module asynchronously
   */
  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<AutoDocsOptions> | AutoDocsOptions;
    inject?: any[];
  }): DynamicModule {
    return {
      module: AutoDocsModule,
      controllers: [ScalarController],
      providers: [
        {
          provide: 'AUTO_DOCS_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: ControllerScanner,
          useFactory: (opts: AutoDocsOptions) => {
            return new ControllerScanner(opts.sourcePath || 'src');
          },
          inject: ['AUTO_DOCS_OPTIONS'],
        },
        OpenApiGenerator,
        CategoryGenerator,
        {
          provide: AutoDocsService,
          useFactory: (
            opts: AutoDocsOptions,
            scanner: ControllerScanner,
            generator: OpenApiGenerator,
            categoryGen: CategoryGenerator,
          ) => {
            return new AutoDocsService(opts, scanner, generator, categoryGen);
          },
          inject: ['AUTO_DOCS_OPTIONS', ControllerScanner, OpenApiGenerator, CategoryGenerator],
        },
      ],
      exports: [AutoDocsService],
    };
  }
}
