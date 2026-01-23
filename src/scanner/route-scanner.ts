import { ClassDeclaration, MethodDeclaration, Decorator, SyntaxKind, Project } from 'ts-morph';
import { RouteMetadata, ParamMetadata, HttpMethod, DtoMetadata, PropertyMetadata } from '../interfaces';
import { DtoAnalyzer } from './dto-analyzer';

export class RouteScanner {
  private dtoAnalyzer: DtoAnalyzer;
  private project: Project;

  constructor(project: Project) {
    this.project = project;
    this.dtoAnalyzer = new DtoAnalyzer();
  }

  /**
   * Scan all routes in a controller class
   */
  scanRoutes(classDeclaration: ClassDeclaration, controllerPath: string): RouteMetadata[] {
    const routes: RouteMetadata[] = [];
    const methods = classDeclaration.getMethods();

    for (const method of methods) {
      const route = this.extractRoute(method, controllerPath);
      if (route) {
        routes.push(route);
      }
    }

    return routes;
  }

  /**
   * Extract route metadata from a method
   */
  private extractRoute(method: MethodDeclaration, controllerPath: string): RouteMetadata | null {
    const decorators = method.getDecorators();

    // Find HTTP method decorator (@Get, @Post, @Put, @Patch, @Delete)
    const httpDecorator = this.findHttpDecorator(decorators);

    if (!httpDecorator) {
      return null;
    }

    const httpMethod = httpDecorator.getName().toUpperCase() as HttpMethod;
    const routePath = this.extractRoutePath(httpDecorator);
    const fullPath = this.combinePaths(controllerPath, routePath);

    // Extract JSDoc description
    const jsDocs = method.getJsDocs();
    const description = jsDocs.length > 0
      ? jsDocs[0].getDescription().trim()
      : undefined;

    // Extract parameters
    const params = this.extractParameters(method);

    // Extract request body DTO
    const requestBody = this.extractRequestBody(method);

    // Extract response type
    const responseType = this.extractResponseType(method);

    // Extract guards
    const guards = this.extractGuards(method);

    // Check if public route
    const isPublic = this.isPublicRoute(method);

    return {
      name: method.getName(),
      httpMethod,
      path: routePath,
      fullPath,
      description,
      params,
      requestBody,
      responseType,
      guards,
      isPublic,
    };
  }

  /**
   * Extract request body DTO from @Body() parameter
   */
  private extractRequestBody(method: MethodDeclaration): DtoMetadata | undefined {
    const parameters = method.getParameters();

    for (const param of parameters) {
      const decorators = param.getDecorators();
      const bodyDecorator = decorators.find(dec => dec.getName() === 'Body');

      if (bodyDecorator) {
        const paramType = param.getType();
        const typeName = paramType.getText();

        // Skip primitive types
        if (['string', 'number', 'boolean', 'any', 'unknown', 'string | undefined'].includes(typeName)) {
          return undefined;
        }

        // Try to find DTO class
        const dtoClass = this.findDtoClass(typeName);
        if (dtoClass) {
          return this.analyzeDtoClass(dtoClass);
        }

        // If not a class, try to analyze inline object type
        const inlineDto = this.analyzeInlineType(paramType, typeName);
        if (inlineDto) {
          return inlineDto;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract response type from method return type
   */
  private extractResponseType(method: MethodDeclaration): DtoMetadata | undefined {
    let returnType = method.getReturnType();
    let typeName = returnType.getText();

    // Remove Promise<> wrapper
    const promiseMatch = typeName.match(/Promise<(.+)>$/);
    if (promiseMatch) {
      typeName = promiseMatch[1];
      // Get the unwrapped type
      const typeArgs = returnType.getTypeArguments();
      if (typeArgs.length > 0) {
        returnType = typeArgs[0];
      }
    }

    // Skip primitive types and void
    if (['void', 'string', 'number', 'boolean', 'any', 'unknown'].includes(typeName)) {
      return undefined;
    }

    // Try to find DTO class
    const dtoClass = this.findDtoClass(typeName);
    if (dtoClass) {
      return this.analyzeDtoClass(dtoClass);
    }

    // If not a class, try to analyze inline object type
    const inlineDto = this.analyzeInlineType(returnType, typeName);
    if (inlineDto) {
      return inlineDto;
    }

    return undefined;
  }

  /**
   * Analyze inline object types and union types
   */
  private analyzeInlineType(type: any, typeName: string): DtoMetadata | undefined {
    // Handle union types - try to find the first analyzable type
    if (type.isUnion()) {
      const unionTypes = type.getUnionTypes();
      for (const unionType of unionTypes) {
        const unionTypeName = unionType.getText();

        // Skip null, undefined, and primitive types
        if (['null', 'undefined', 'void'].includes(unionTypeName)) {
          continue;
        }

        // Try to analyze this union member
        const dtoClass = this.findDtoClass(unionTypeName);
        if (dtoClass) {
          return this.analyzeDtoClass(dtoClass);
        }

        // Try to analyze as inline type
        if (unionType.isObject()) {
          const inlineDto = this.analyzeInlineObjectType(unionType, unionTypeName);
          if (inlineDto && inlineDto.properties.length > 0) {
            return inlineDto;
          }
        }
      }
      return undefined;
    }

    // Handle inline object types
    if (type.isObject()) {
      return this.analyzeInlineObjectType(type, typeName);
    }

    return undefined;
  }

  /**
   * Analyze inline object type literal (e.g., { message: string; data: any })
   */
  private analyzeInlineObjectType(type: any, typeName: string): DtoMetadata | undefined {
    try {
      const properties: PropertyMetadata[] = [];
      const typeProperties = type.getProperties();

      if (!typeProperties || typeProperties.length === 0) {
        return undefined;
      }

      // Get the compiler type and type checker
      const compilerType = type.compilerType;
      const checker = this.project.getTypeChecker().compilerObject;

      for (const prop of typeProperties) {
        const propName = prop.getName();

        // Get the property symbol, then its type
        const propSymbol = checker.getPropertyOfType(compilerType, propName);

        if (propSymbol) {
          const propCompilerType = checker.getTypeOfSymbol(propSymbol);

          if (propCompilerType) {
            // Wrap the compiler type back into a ts-morph Type using the context's factory
            const propType = type._context.compilerFactory.getType(propCompilerType);

            const typeMetadata = this.dtoAnalyzer.analyzeType(propType);
            const isOptional = propType.isNullable() || propType.isUndefined();

            properties.push({
              name: propName,
              type: typeMetadata,
              required: !isOptional,
              description: undefined,
              validators: [],
              example: this.generateExampleValue(propName, typeMetadata),
            });
          }
        }
      }

      if (properties.length === 0) {
        return undefined;
      }

      return {
        name: 'InlineType',
        properties,
        description: undefined,
      };
    } catch (error) {
      // If we can't analyze the inline type, return undefined
      return undefined;
    }
  }

  /**
   * Find DTO class by name
   */
  private findDtoClass(typeName: string) {
    // Clean up type name (remove array brackets, etc.)
    let cleanTypeName = typeName.replace(/\[\]$/, '').trim();

    // Extract class name from import path: import("/path/to/dto").DtoName -> DtoName
    const importMatch = cleanTypeName.match(/import\(["'](.+?)["']\)\.(\w+)/);
    if (importMatch) {
      const importPath = importMatch[1];
      cleanTypeName = importMatch[2];

      // Try to find the source file by import path
      const sourceFile = this.project.getSourceFile(importPath + '.ts') ||
                         this.project.getSourceFile(importPath + '.dto.ts');

      if (sourceFile) {
        const classes = sourceFile.getClasses();
        const found = classes.find(cls => cls.getName() === cleanTypeName);
        if (found) return found;
      }
    }

    // Fallback: search all source files
    const sourceFiles = this.project.getSourceFiles();
    return this.dtoAnalyzer.findDtoByName(cleanTypeName, sourceFiles);
  }

  /**
   * Analyze DTO class to extract properties
   */
  private analyzeDtoClass(dtoClass: any): DtoMetadata {
    const className = dtoClass.getName() || 'Unknown';
    const properties: PropertyMetadata[] = [];

    // Get class properties
    const classProperties = dtoClass.getProperties();

    for (const prop of classProperties) {
      const propName = prop.getName();
      const propType = prop.getType();

      // Extract JSDoc description
      const jsDocs = prop.getJsDocs();
      const description = jsDocs.length > 0
        ? jsDocs[0].getDescription().trim()
        : undefined;

      // Analyze property type
      const typeMetadata = this.dtoAnalyzer.analyzeType(propType);

      // Check if required (no ? and no initializer)
      const required = !prop.hasQuestionToken() && !prop.hasInitializer();

      // Extract validators from decorators
      const validators = this.extractPropertyValidators(prop);

      properties.push({
        name: propName,
        type: typeMetadata,
        required,
        description,
        validators,
        example: this.generateExampleValue(propName, typeMetadata),
      });
    }

    // Get class JSDoc description
    const classJsDocs = dtoClass.getJsDocs();
    const classDescription = classJsDocs.length > 0
      ? classJsDocs[0].getDescription().trim()
      : undefined;

    return {
      name: className,
      properties,
      description: classDescription,
    };
  }

  /**
   * Extract validators from property decorators
   */
  private extractPropertyValidators(prop: any): any[] {
    const validators: any[] = [];
    const decorators = prop.getDecorators();

    const validatorNames = [
      'IsString', 'IsNumber', 'IsBoolean', 'IsEmail', 'IsUrl', 'IsUUID',
      'IsDate', 'IsEnum', 'IsArray', 'IsOptional', 'IsNotEmpty',
      'Min', 'Max', 'MinLength', 'MaxLength', 'Length',
      'Matches', 'IsIn', 'IsNotIn',
    ];

    for (const decorator of decorators) {
      const decoratorName = decorator.getName();

      if (validatorNames.includes(decoratorName)) {
        const args = decorator.getArguments().map(arg => arg.getText());
        validators.push({
          name: decoratorName,
          args,
        });
      }
    }

    return validators;
  }

  /**
   * Generate example value based on property name and type
   */
  private generateExampleValue(propName: string, typeMetadata: any): any {
    const lowerName = propName.toLowerCase();

    // Based on property name
    if (lowerName.includes('email')) return 'user@example.com';
    if (lowerName.includes('name')) return 'Example Name';
    if (lowerName.includes('phone')) return '+1234567890';
    if (lowerName.includes('url') || lowerName.includes('link')) return 'https://example.com';
    if (lowerName.includes('password')) return '********';
    if (lowerName.includes('id')) return '123e4567-e89b-12d3-a456-426614174000';

    // Based on type
    if (typeMetadata.type === 'string') return 'example string';
    if (typeMetadata.type === 'number') return 123;
    if (typeMetadata.type === 'boolean') return true;
    if (typeMetadata.isArray) return [];
    if (typeMetadata.isEnum && typeMetadata.enumValues?.length > 0) {
      return typeMetadata.enumValues[0];
    }

    return null;
  }

  /**
   * Find HTTP method decorator
   */
  private findHttpDecorator(decorators: Decorator[]): Decorator | undefined {
    const httpMethods = ['Get', 'Post', 'Put', 'Patch', 'Delete', 'Options', 'Head'];
    return decorators.find(dec => httpMethods.includes(dec.getName()));
  }

  /**
   * Extract route path from decorator
   */
  private extractRoutePath(decorator: Decorator): string {
    const args = decorator.getArguments();

    if (args.length === 0) {
      return '';
    }

    const firstArg = args[0];

    // Handle string literal
    if (firstArg.getKind() === SyntaxKind.StringLiteral) {
      return firstArg.getText().replace(/['"]/g, '');
    }

    // Handle template literal
    if (firstArg.getKind() === SyntaxKind.TemplateExpression ||
        firstArg.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral) {
      return firstArg.getText().replace(/`/g, '');
    }

    return '';
  }

  /**
   * Combine controller path and route path
   */
  private combinePaths(base: string, path: string): string {
    // Handle empty paths
    if (!base && !path) return '/';
    if (!base) return `/${path}`.replace(/\/+/g, '/');
    if (!path) return `/${base}`.replace(/\/+/g, '/');

    // Combine paths
    const parts = [base, path]
      .map(p => p.trim())
      .filter(p => p && p !== '/')
      .join('/')
      .replace(/\/+/g, '/');

    return `/${parts}`;
  }

  /**
   * Extract parameters from method
   */
  private extractParameters(method: MethodDeclaration): ParamMetadata[] {
    const params: ParamMetadata[] = [];
    const parameters = method.getParameters();

    for (const param of parameters) {
      const decorators = param.getDecorators();

      for (const decorator of decorators) {
        const decoratorName = decorator.getName();

        // Skip @Body as it's handled separately
        if (decoratorName === 'Body') continue;

        if (['Param', 'Query', 'Headers'].includes(decoratorName)) {
          const paramMetadata = this.buildParamMetadata(param, decorator, decoratorName);
          if (paramMetadata) {
            params.push(paramMetadata);
          }
        }
      }
    }

    return params;
  }

  /**
   * Build parameter metadata
   */
  private buildParamMetadata(param: any, decorator: Decorator, decoratorName: string): ParamMetadata | null {
    const args = decorator.getArguments();
    const paramName = args.length > 0
      ? args[0].getText().replace(/['"]/g, '')
      : param.getName();

    const paramType = param.getType();
    const typeName = paramType.getText();

    // Determine parameter location
    let location: 'path' | 'query' | 'header' | 'body' = 'query';
    if (decoratorName === 'Param') location = 'path';
    else if (decoratorName === 'Headers') location = 'header';

    return {
      name: paramName,
      in: location,
      type: {
        type: typeName,
        isPrimitive: paramType.isString() || paramType.isNumber() || paramType.isBoolean(),
        isArray: paramType.isArray(),
        isEnum: paramType.isEnum(),
        isOptional: param.hasQuestionToken() || param.hasInitializer(),
      },
      required: location === 'path',
    };
  }

  /**
   * Extract guards from method decorators
   */
  private extractGuards(method: MethodDeclaration): string[] {
    const guards: string[] = [];
    const decorators = method.getDecorators();

    for (const decorator of decorators) {
      if (decorator.getName() === 'UseGuards') {
        const args = decorator.getArguments();
        for (const arg of args) {
          guards.push(arg.getText());
        }
      }
    }

    return guards;
  }

  /**
   * Check if route is public (no authentication)
   */
  private isPublicRoute(method: MethodDeclaration): boolean {
    const decorators = method.getDecorators();
    return decorators.some(dec =>
      ['Public', 'SkipAuth', 'SkipGuard', 'SkipAllGuards'].includes(dec.getName())
    );
  }
}
