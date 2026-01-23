import { Injectable } from '@nestjs/common';
import { Project, SourceFile, ClassDeclaration, Decorator, SyntaxKind } from 'ts-morph';
import * as path from 'path';
import { ControllerMetadata } from '../interfaces';
import { RouteScanner } from './route-scanner';
import { ModuleScanner } from './module-scanner';

@Injectable()
export class ControllerScanner {
  private project: Project;
  private routeScanner: RouteScanner;
  private moduleScanner: ModuleScanner;

  constructor(private readonly sourcePath: string) {
    this.project = new Project({
      tsConfigFilePath: this.findTsConfigPath(),
    });
    this.routeScanner = new RouteScanner(this.project);
    this.moduleScanner = new ModuleScanner();
  }

  /**
   * Scan directory recursively and find all controllers
   */
  async scanControllers(): Promise<ControllerMetadata[]> {
    const controllers: ControllerMetadata[] = [];

    // Add source files to project
    this.project.addSourceFilesAtPaths(`${this.sourcePath}/**/*.ts`);

    // Get all source files
    const sourceFiles = this.project.getSourceFiles();

    for (const sourceFile of sourceFiles) {
      const fileControllers = this.extractControllersFromFile(sourceFile);
      controllers.push(...fileControllers);
    }

    return controllers;
  }

  /**
   * Extract controller metadata from a single file
   */
  private extractControllersFromFile(sourceFile: SourceFile): ControllerMetadata[] {
    const controllers: ControllerMetadata[] = [];

    // Get all classes in the file
    const classes = sourceFile.getClasses();

    for (const classDeclaration of classes) {
      // Check if class has @Controller decorator
      const controllerDecorator = this.findControllerDecorator(classDeclaration);

      if (controllerDecorator) {
        const metadata = this.buildControllerMetadata(classDeclaration, controllerDecorator, sourceFile);
        if (metadata) {
          controllers.push(metadata);
        }
      }
    }

    return controllers;
  }

  /**
   * Find @Controller decorator on a class
   */
  private findControllerDecorator(classDeclaration: ClassDeclaration): Decorator | undefined {
    const decorators = classDeclaration.getDecorators();
    return decorators.find(dec => {
      const decoratorName = dec.getName();
      return decoratorName === 'Controller';
    });
  }

  /**
   * Build controller metadata from class declaration
   */
  private buildControllerMetadata(
    classDeclaration: ClassDeclaration,
    controllerDecorator: Decorator,
    sourceFile: SourceFile,
  ): ControllerMetadata | null {
    try {
      const controllerPath = this.extractControllerPath(controllerDecorator);
      const filePath = sourceFile.getFilePath();
      const className = classDeclaration.getName() || 'UnknownController';

      // Extract JSDoc comments
      const jsDocs = classDeclaration.getJsDocs();
      const description = jsDocs.length > 0
        ? jsDocs[0].getDescription().trim()
        : undefined;

      // Detect category from module (not file path)
      const category = this.detectCategoryFromModule(className);

      // Detect version from file path (e.g., v1, v2, v3)
      const version = this.detectVersionFromPath(filePath);

      // Extract guards from class decorators
      const guards = this.extractGuardsFromClass(classDeclaration);

      // Scan routes using RouteScanner
      const routes = this.routeScanner.scanRoutes(classDeclaration, controllerPath);

      return {
        name: className,
        path: controllerPath,
        filePath,
        category,
        version,
        description,
        routes,
        guards,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract controller path from @Controller() decorator
   */
  private extractControllerPath(decorator: Decorator): string {
    const args = decorator.getArguments();

    if (args.length === 0) {
      return '/';
    }

    const firstArg = args[0];

    // Handle string literal
    if (firstArg.getKind() === SyntaxKind.StringLiteral) {
      const path = firstArg.getText().replace(/['"]/g, '');
      return path || '/';
    }

    // Handle template literal
    if (firstArg.getKind() === SyntaxKind.TemplateExpression ||
        firstArg.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral) {
      const path = firstArg.getText().replace(/`/g, '');
      return path || '/';
    }

    return '/';
  }

  /**
   * Detect category from NestJS module that contains the controller
   * Examples:
   * - AdminModule -> "Admin"
   * - AdminAuthModule -> "Admin Auth"
   * - MessagingModule -> "Messaging"
   * - ObjectModule -> "Object"
   */
  private detectCategoryFromModule(controllerName: string): string {
    const sourceFiles = this.project.getSourceFiles();
    const category = this.moduleScanner.findModuleForController(controllerName, sourceFiles);

    // Fallback to file path detection if module not found
    if (!category) {
      const sourceFile = sourceFiles.find(sf => {
        const classes = sf.getClasses();
        return classes.some(c => c.getName() === controllerName);
      });

      if (sourceFile) {
        return this.detectCategoryFromPath(sourceFile.getFilePath());
      }

      return 'Uncategorized';
    }

    return category;
  }

  /**
   * Detect category from file path (fallback method)
   * Examples:
   * - src/api/v1/admin/admin.controller.ts -> "Admin"
   * - src/api/v1/admin/auth/auth.controller.ts -> "Admin - Authentication"
   * - src/api/v1/messaging/controllers/messages.controller.ts -> "Messaging"
   */
  public detectCategoryFromPath(filePath: string): string {
    // Normalize path separators
    const normalizedPath = filePath.replace(/\\/g, '/');

    // Extract the portion after 'src/api/v1/' or 'src/'
    let relevantPath = '';

    if (normalizedPath.includes('/api/v1/')) {
      const parts = normalizedPath.split('/api/v1/');
      relevantPath = parts[1] || '';
    } else if (normalizedPath.includes('/src/')) {
      const parts = normalizedPath.split('/src/');
      relevantPath = parts[1] || '';
    } else {
      relevantPath = normalizedPath;
    }

    // Remove filename and 'controllers' directory if present
    const pathParts = relevantPath
      .replace(/\.controller\.ts$/, '')
      .replace(/\.ts$/, '')
      .split('/')
      .filter(part => part && part !== 'controllers' && !part.endsWith('.controller'));

    if (pathParts.length === 0) {
      return 'Uncategorized';
    }

    // Create category name from path
    // Example: ['admin', 'auth'] -> "Admin - Auth"
    const humanizedParts = pathParts.map(part => this.humanizeCategoryName(part));

    // Remove duplicate consecutive parts (e.g., ['Admin', 'Admin'] -> ['Admin'])
    const deduplicated = this.deduplicateCategoryParts(humanizedParts);

    if (deduplicated.length === 1) {
      return deduplicated[0];
    }

    return deduplicated.join(' - ');
  }

  /**
   * Detect API version from file path
   * Examples:
   * - src/api/v1/admin/admin.controller.ts -> "v1"
   * - src/api/v2/user/user.controller.ts -> "v2"
   * - src/api/v3/messaging/messages.controller.ts -> "v3"
   * - src/admin/admin.controller.ts -> undefined (no version)
   */
  public detectVersionFromPath(filePath: string): string | undefined {
    // Normalize path separators
    const normalizedPath = filePath.replace(/\\/g, '/');

    // Match version pattern: /v1/, /v2/, /v3/, etc.
    const versionMatch = normalizedPath.match(/\/(v\d+)\//);

    return versionMatch ? versionMatch[1] : undefined;
  }

  /**
   * Remove duplicate consecutive parts from category
   * Examples:
   * - ['Admin', 'Admin'] -> ['Admin']
   * - ['Object', 'Object'] -> ['Object']
   * - ['Admin', 'Auth'] -> ['Admin', 'Auth']
   */
  private deduplicateCategoryParts(parts: string[]): string[] {
    if (parts.length <= 1) return parts;

    const result: string[] = [parts[0]];

    for (let i = 1; i < parts.length; i++) {
      const normalized = parts[i].toLowerCase().replace(/[\s-]/g, '');
      const prevNormalized = parts[i - 1].toLowerCase().replace(/[\s-]/g, '');

      // Only add if not duplicate of previous part
      if (normalized !== prevNormalized) {
        result.push(parts[i]);
      }
    }

    return result;
  }

  /**
   * Humanize category name from path segment
   * Examples:
   * - 'admin' -> 'Admin'
   * - 'admin-auth' -> 'Admin Auth'
   * - 'messaging' -> 'Messaging'
   */
  private humanizeCategoryName(segment: string): string {
    return segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Extract guards from class-level decorators
   */
  private extractGuardsFromClass(classDeclaration: ClassDeclaration): string[] {
    const guards: string[] = [];
    const decorators = classDeclaration.getDecorators();

    for (const decorator of decorators) {
      const decoratorName = decorator.getName();

      if (decoratorName === 'UseGuards') {
        const args = decorator.getArguments();
        for (const arg of args) {
          const guardName = arg.getText();
          guards.push(guardName);
        }
      }
    }

    return guards;
  }

  /**
   * Find tsconfig.json in the project
   */
  private findTsConfigPath(): string {
    const possiblePaths = [
      path.join(process.cwd(), 'tsconfig.json'),
      path.join(this.sourcePath, '../tsconfig.json'),
      path.join(this.sourcePath, '../../tsconfig.json'),
    ];

    for (const tsConfigPath of possiblePaths) {
      try {
        if (require('fs').existsSync(tsConfigPath)) {
          return tsConfigPath;
        }
      } catch (error) {
        // Continue to next path
      }
    }

    // Return undefined to let ts-morph use default configuration
    return undefined as any;
  }
}
