import { Injectable } from '@nestjs/common';
import { ControllerMetadata, DtoMetadata, PropertyMetadata, TypeMetadata, ValidatorMetadata, RouteMetadata, ParamMetadata } from '../interfaces';
import { OpenApiSpec, PathItemObject, OperationObject, ParameterObject, RequestBodyObject, ResponseObject, SchemaObject, TagObject } from '../interfaces/openapi.interface';
import { AutoDocsOptions } from '../interfaces/options.interface';

@Injectable()
export class OpenApiGenerator {
  private schemas: Map<string, SchemaObject> = new Map();
  private tags: Map<string, TagObject> = new Map();

  /**
   * Generate complete OpenAPI 3.0 specification from controller metadata
   */
  generate(controllers: ControllerMetadata[], options: AutoDocsOptions): OpenApiSpec {
    // Reset state
    this.schemas.clear();
    this.tags.clear();

    // Generate tags from categories
    this.generateTags(controllers);

    // Generate paths from controllers
    const paths = this.generatePaths(controllers, options);

    // Build OpenAPI spec
    const spec: OpenApiSpec = {
      openapi: '3.0.0',
      info: {
        title: options.title,
        version: options.version,
        description: options.description || 'Auto-generated API documentation',
        ...(options.contact && { contact: options.contact }),
      },
      servers: options.servers || this.generateDefaultServers(options, controllers),
      tags: Array.from(this.tags.values()).sort((a, b) => a.name.localeCompare(b.name)),
      paths,
      components: {
        schemas: Object.fromEntries(this.schemas),
        securitySchemes: options.includeSecurity !== false
          ? {
              bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Enter your JWT token in the format: Bearer {token}',
              },
            }
          : undefined,
      },
    };

    return spec;
  }

  /**
   * Generate tags from controller categories
   */
  private generateTags(controllers: ControllerMetadata[]): void {
    const categorySet = new Set<string>();

    for (const controller of controllers) {
      if (controller.category && !categorySet.has(controller.category)) {
        categorySet.add(controller.category);

        // Use controller description or generate from category name
        const description = controller.description ||
                          `${controller.category} related endpoints`;

        this.tags.set(controller.category, {
          name: controller.category,
          description,
        });
      }
    }
  }

  /**
   * Generate paths object from controllers
   */
  private generatePaths(controllers: ControllerMetadata[], options: AutoDocsOptions): Record<string, PathItemObject> {
    const paths: Record<string, PathItemObject> = {};

    for (const controller of controllers) {
      for (const route of controller.routes) {
        // Build path based on versioning configuration
        let fullPath: string;

        if (options.versioning?.enabled && controller.version) {
          // Use detected version from file path
          const versionPrefix = options.versioning.prefix || '/api';
          fullPath = this.combinePaths(versionPrefix, controller.version, controller.path, route.path);
        } else if (options.versioning?.enabled && options.versioning.fallback) {
          // Use fallback prefix when version not detected
          fullPath = this.combinePaths(options.versioning.fallback, controller.path, route.path);
        } else {
          // Use globalPrefix (backwards compatible)
          fullPath = this.combinePaths(options.globalPrefix || '', controller.path, route.path);
        }

        // Convert :param to {param} for OpenAPI
        fullPath = fullPath.replace(/:(\w+)/g, '{$1}');

        // Initialize path item if not exists
        if (!paths[fullPath]) {
          paths[fullPath] = {};
        }

        // Create operation object
        const operation = this.createOperation(route, controller);

        // Add operation to path item
        const method = route.httpMethod.toLowerCase();
        switch (method) {
          case 'get':
            paths[fullPath].get = operation;
            break;
          case 'post':
            paths[fullPath].post = operation;
            break;
          case 'put':
            paths[fullPath].put = operation;
            break;
          case 'patch':
            paths[fullPath].patch = operation;
            break;
          case 'delete':
            paths[fullPath].delete = operation;
            break;
          case 'options':
            paths[fullPath].options = operation;
            break;
          case 'head':
            paths[fullPath].head = operation;
            break;
        }
      }
    }

    return paths;
  }

  /**
   * Create operation object for a route
   */
  private createOperation(route: RouteMetadata, controller: ControllerMetadata): OperationObject {
    const operation: OperationObject = {
      summary: route.description || `${route.httpMethod} ${route.path}`,
      description: route.description,
      tags: controller.category ? [controller.category] : undefined,
      operationId: `${controller.name}_${route.name}`,
      parameters: this.createParameters(route.params || []),
      responses: {
        '200': {
          description: 'Successful response',
          content: route.responseType
            ? {
                'application/json': {
                  schema: this.convertDtoToSchema(route.responseType),
                },
              }
            : undefined,
        },
        '400': {
          description: 'Bad request',
        },
        '401': {
          description: 'Unauthorized',
        },
        '500': {
          description: 'Internal server error',
        },
      },
      security: route.isPublic ? undefined : [{ bearerAuth: [] }],
    };

    // Add request body if needed (POST, PUT, PATCH)
    if (['POST', 'PUT', 'PATCH'].includes(route.httpMethod)) {
      if (route.requestBody) {
        operation.requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: this.convertDtoToSchema(route.requestBody),
            },
          },
        };
      }
    }

    return operation;
  }

  /**
   * Create parameters array from route params
   */
  private createParameters(params: ParamMetadata[]): ParameterObject[] | undefined {
    const parameters: ParameterObject[] = [];

    for (const param of params) {
      if (param.in === 'path' || param.in === 'query') {
        parameters.push({
          name: param.name,
          in: param.in,
          required: param.in === 'path' || param.required,
          schema: this.convertTypeToSchema(param.type),
          description: param.description,
        });
      }
    }

    return parameters.length > 0 ? parameters : undefined;
  }

  /**
   * Convert DtoMetadata to OpenAPI SchemaObject
   */
  private convertDtoToSchema(dto: DtoMetadata): SchemaObject {
    const schema: SchemaObject = {
      type: 'object',
      properties: {},
    };

    const required: string[] = [];

    for (const prop of dto.properties) {
      schema.properties![prop.name] = this.convertPropertyToSchema(prop);

      if (prop.required) {
        required.push(prop.name);
      }
    }

    if (required.length > 0) {
      schema.required = required;
    }

    if (dto.description) {
      schema.description = dto.description;
    }

    return schema;
  }

  /**
   * Convert TypeMetadata to OpenAPI SchemaObject
   */
  private convertTypeToSchema(typeMetadata: TypeMetadata | undefined): SchemaObject {
    if (!typeMetadata) {
      return { type: 'object' };
    }

    const schema: SchemaObject = {};

    // Handle primitives
    if (typeMetadata.isPrimitive) {
      schema.type = typeMetadata.type as any;
      if (typeMetadata.format) {
        schema.format = typeMetadata.format;
      }
      return schema;
    }

    // Handle arrays
    if (typeMetadata.isArray && typeMetadata.elementType) {
      return {
        type: 'array',
        items: this.convertTypeToSchema(typeMetadata.elementType),
      };
    }

    // Handle enums
    if (typeMetadata.isEnum && typeMetadata.enumValues) {
      return {
        type: 'string',
        enum: typeMetadata.enumValues,
      };
    }

    // Handle objects/classes
    if (typeMetadata.properties) {
      schema.type = 'object';
      schema.properties = {};
      const required: string[] = [];

      for (const prop of typeMetadata.properties) {
        schema.properties[prop.name] = this.convertPropertyToSchema(prop);

        // Check if required
        const isRequired = prop.validators?.some(v => v.name === 'IsNotEmpty' || v.constraints?.required === true);
        const isOptional = prop.validators?.some(v => v.name === 'IsOptional' || v.constraints?.required === false);

        if (isRequired && !isOptional) {
          required.push(prop.name);
        }
      }

      if (required.length > 0) {
        schema.required = required;
      }
    }

    return schema;
  }

  /**
   * Convert PropertyMetadata to OpenAPI SchemaObject
   */
  private convertPropertyToSchema(property: PropertyMetadata): SchemaObject {
    const schema: SchemaObject = {};

    // Start with type metadata
    if (property.type) {
      const baseSchema = this.convertTypeToSchema(property.type);
      Object.assign(schema, baseSchema);
    }

    // Apply validator constraints
    if (property.validators) {
      for (const validator of property.validators) {
        this.applyValidatorConstraints(schema, validator);
      }
    }

    // Add description from JSDoc
    if (property.description) {
      schema.description = property.description;
    }

    return schema;
  }

  /**
   * Apply validator constraints to schema
   */
  private applyValidatorConstraints(schema: SchemaObject, validator: ValidatorMetadata): void {
    if (!validator.constraints) return;

    // Type constraints
    if (validator.constraints.type) {
      schema.type = validator.constraints.type as any;
    }

    // Format constraints
    if (validator.constraints.format) {
      schema.format = validator.constraints.format;
    }

    // String constraints
    if (validator.constraints.minLength !== undefined) {
      schema.minLength = validator.constraints.minLength;
    }
    if (validator.constraints.maxLength !== undefined) {
      schema.maxLength = validator.constraints.maxLength;
    }
    if (validator.constraints.pattern) {
      schema.pattern = validator.constraints.pattern;
    }

    // Number constraints
    if (validator.constraints.minimum !== undefined) {
      schema.minimum = validator.constraints.minimum;
    }
    if (validator.constraints.maximum !== undefined) {
      schema.maximum = validator.constraints.maximum;
    }

    // Array constraints
    if (validator.constraints.minItems !== undefined) {
      schema.minItems = validator.constraints.minItems;
    }
    if (validator.constraints.maxItems !== undefined) {
      schema.maxItems = validator.constraints.maxItems;
    }

    // Enum constraints
    if (validator.constraints.enum) {
      schema.enum = validator.constraints.enum;
    }
  }

  /**
   * Generate default server configurations based on options
   */
  private generateDefaultServers(options: AutoDocsOptions, controllers: ControllerMetadata[]): Array<{ url: string; description: string }> {
    const servers: Array<{ url: string; description: string }> = [];

    if (options.versioning?.enabled) {
      // Get unique versions from controllers
      const versions = new Set<string>();
      for (const controller of controllers) {
        if (controller.version) {
          versions.add(controller.version);
        }
      }

      // Generate servers for each version
      if (versions.size > 0) {
        const versionPrefix = options.versioning.prefix || '/api';
        for (const version of Array.from(versions).sort()) {
          servers.push({
            url: `${versionPrefix}/${version}`,
            description: `API ${version.toUpperCase()}`,
          });
        }
      } else if (options.versioning.fallback) {
        // Use fallback if no versions detected
        servers.push({
          url: options.versioning.fallback,
          description: 'API Server',
        });
      }
    } else if (options.globalPrefix) {
      // Use globalPrefix (backwards compatible)
      servers.push({
        url: options.globalPrefix,
        description: 'API Server',
      });
    }

    // If no servers generated, return a relative path server
    if (servers.length === 0) {
      servers.push({
        url: options.baseServerURL || '/',
        description: options.baseServerURL
          ? 'Base Server'
          : 'Current Server (editable in dropdown)',
      });
    }

    return servers;
  }

  /**
   * Combine multiple path segments
   */
  private combinePaths(...segments: string[]): string {
    return segments
      .filter(Boolean)
      .map(segment => segment.replace(/^\/+|\/+$/g, ''))
      .filter(Boolean)
      .join('/');
  }
}
