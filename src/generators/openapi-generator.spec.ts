import { OpenApiGenerator } from './openapi-generator';
import { ControllerMetadata, RouteMetadata } from '../interfaces';
import { AutoDocsOptions } from '../interfaces/options.interface';

describe('OpenApiGenerator', () => {
  let generator: OpenApiGenerator;

  beforeEach(() => {
    generator = new OpenApiGenerator();
  });

  describe('generate - with versioning disabled', () => {
    it('should use globalPrefix for all paths', () => {
      const controllers: ControllerMetadata[] = [
        {
          name: 'AdminController',
          path: 'admin',
          filePath: 'src/api/v1/admin/admin.controller.ts',
          category: 'Admin',
          version: 'v1',
          routes: [
            {
              name: 'getProfile',
              httpMethod: 'GET',
              path: 'profile',
              fullPath: '/admin/profile',
              isPublic: false,
            } as RouteMetadata,
          ],
        },
      ];

      const options: AutoDocsOptions = {
        title: 'Test API',
        version: '1.0',
        globalPrefix: '/api/v1',
      };

      const spec = generator.generate(controllers, options);

      // Should use globalPrefix, not detected version
      expect(spec.paths).toHaveProperty('api/v1/admin/profile');
      expect(spec.servers).toHaveLength(1);
      expect(spec.servers[0].url).toBe('/api/v1');
    });
  });

  describe('generate - with versioning enabled', () => {
    it('should use detected version from controller', () => {
      const controllers: ControllerMetadata[] = [
        {
          name: 'AdminController',
          path: 'admin',
          filePath: 'src/api/v1/admin/admin.controller.ts',
          category: 'Admin',
          version: 'v1',
          routes: [
            {
              name: 'getProfile',
              httpMethod: 'GET',
              path: 'profile',
              fullPath: '/admin/profile',
              isPublic: false,
            } as RouteMetadata,
          ],
        },
      ];

      const options: AutoDocsOptions = {
        title: 'Test API',
        version: '1.0',
        versioning: {
          enabled: true,
          prefix: '/api',
        },
      };

      const spec = generator.generate(controllers, options);

      // Should use detected version
      expect(spec.paths).toHaveProperty('api/v1/admin/profile');
      expect(spec.servers).toContainEqual({
        url: '/api/v1',
        description: 'API V1',
      });
    });

    it('should handle multiple versions', () => {
      const controllers: ControllerMetadata[] = [
        {
          name: 'AdminControllerV1',
          path: 'admin',
          filePath: 'src/api/v1/admin/admin.controller.ts',
          category: 'Admin',
          version: 'v1',
          routes: [
            {
              name: 'getProfile',
              httpMethod: 'GET',
              path: 'profile',
              fullPath: '/admin/profile',
              isPublic: false,
            } as RouteMetadata,
          ],
        },
        {
          name: 'AdminControllerV2',
          path: 'admin',
          filePath: 'src/api/v2/admin/admin.controller.ts',
          category: 'Admin',
          version: 'v2',
          routes: [
            {
              name: 'getProfile',
              httpMethod: 'GET',
              path: 'profile',
              fullPath: '/admin/profile',
              isPublic: false,
            } as RouteMetadata,
          ],
        },
      ];

      const options: AutoDocsOptions = {
        title: 'Test API',
        version: '1.0',
        versioning: {
          enabled: true,
          prefix: '/api',
        },
      };

      const spec = generator.generate(controllers, options);

      // Should have paths for both versions
      expect(spec.paths).toHaveProperty('api/v1/admin/profile');
      expect(spec.paths).toHaveProperty('api/v2/admin/profile');

      // Should have servers for both versions (2 total: 1 per version)
      expect(spec.servers).toHaveLength(2);
      expect(spec.servers).toContainEqual({
        url: '/api/v1',
        description: 'API V1',
      });
      expect(spec.servers).toContainEqual({
        url: '/api/v2',
        description: 'API V2',
      });
    });

    it('should use fallback when version not detected', () => {
      const controllers: ControllerMetadata[] = [
        {
          name: 'AdminController',
          path: 'admin',
          filePath: 'src/admin/admin.controller.ts',
          category: 'Admin',
          version: undefined, // No version detected
          routes: [
            {
              name: 'getProfile',
              httpMethod: 'GET',
              path: 'profile',
              fullPath: '/admin/profile',
              isPublic: false,
            } as RouteMetadata,
          ],
        },
      ];

      const options: AutoDocsOptions = {
        title: 'Test API',
        version: '1.0',
        versioning: {
          enabled: true,
          prefix: '/api',
          fallback: '/api/v1',
        },
      };

      const spec = generator.generate(controllers, options);

      // Should use fallback
      expect(spec.paths).toHaveProperty('api/v1/admin/profile');
      expect(spec.servers).toHaveLength(1);
      expect(spec.servers[0].url).toBe('/api/v1');
    });

    it('should handle custom version prefix', () => {
      const controllers: ControllerMetadata[] = [
        {
          name: 'AdminController',
          path: 'admin',
          filePath: 'src/api/v1/admin/admin.controller.ts',
          category: 'Admin',
          version: 'v1',
          routes: [
            {
              name: 'getProfile',
              httpMethod: 'GET',
              path: 'profile',
              fullPath: '/admin/profile',
              isPublic: false,
            } as RouteMetadata,
          ],
        },
      ];

      const options: AutoDocsOptions = {
        title: 'Test API',
        version: '1.0',
        versioning: {
          enabled: true,
          prefix: '/rest/api', // Custom prefix
        },
      };

      const spec = generator.generate(controllers, options);

      // Should use custom prefix
      expect(spec.paths).toHaveProperty('rest/api/v1/admin/profile');
      expect(spec.servers[0].url).toBe('/rest/api/v1');
    });
  });

  describe('generate - tags and categories', () => {
    it('should generate tags from categories', () => {
      const controllers: ControllerMetadata[] = [
        {
          name: 'AdminController',
          path: 'admin',
          filePath: 'src/api/v1/admin/admin.controller.ts',
          category: 'Admin',
          routes: [
            {
              name: 'getProfile',
              httpMethod: 'GET',
              path: 'profile',
              fullPath: '/admin/profile',
              isPublic: false,
            } as RouteMetadata,
          ],
        },
        {
          name: 'UserController',
          path: 'user',
          filePath: 'src/api/v1/user/user.controller.ts',
          category: 'User',
          routes: [
            {
              name: 'getProfile',
              httpMethod: 'GET',
              path: 'profile',
              fullPath: '/user/profile',
              isPublic: false,
            } as RouteMetadata,
          ],
        },
      ];

      const options: AutoDocsOptions = {
        title: 'Test API',
        version: '1.0',
      };

      const spec = generator.generate(controllers, options);

      // Should have tags for both categories
      expect(spec.tags).toHaveLength(2);
      expect(spec.tags?.map(t => t.name)).toContain('Admin');
      expect(spec.tags?.map(t => t.name)).toContain('User');
    });

    it('should deduplicate tags from same category', () => {
      const controllers: ControllerMetadata[] = [
        {
          name: 'AdminController',
          path: 'admin',
          filePath: 'src/api/v1/admin/admin.controller.ts',
          category: 'Admin',
          routes: [
            {
              name: 'getProfile',
              httpMethod: 'GET',
              path: 'profile',
              fullPath: '/admin/profile',
              isPublic: false,
            } as RouteMetadata,
          ],
        },
        {
          name: 'AdminAuthController',
          path: 'admin/auth',
          filePath: 'src/api/v1/admin/auth/auth.controller.ts',
          category: 'Admin', // Same category
          routes: [
            {
              name: 'login',
              httpMethod: 'POST',
              path: 'login',
              fullPath: '/admin/auth/login',
              isPublic: true,
            } as RouteMetadata,
          ],
        },
      ];

      const options: AutoDocsOptions = {
        title: 'Test API',
        version: '1.0',
      };

      const spec = generator.generate(controllers, options);

      // Should have only one tag for Admin category
      expect(spec.tags).toHaveLength(1);
      expect(spec.tags?.[0].name).toBe('Admin');
    });
  });

  describe('generate - security schemes', () => {
    it('should include bearerAuth by default', () => {
      const controllers: ControllerMetadata[] = [];
      const options: AutoDocsOptions = {
        title: 'Test API',
        version: '1.0',
      };

      const spec = generator.generate(controllers, options);

      expect(spec.components?.securitySchemes).toBeDefined();
      expect(spec.components?.securitySchemes?.bearerAuth).toEqual({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token in the format: Bearer {token}',
      });
    });

    it('should exclude security when includeSecurity is false', () => {
      const controllers: ControllerMetadata[] = [];
      const options: AutoDocsOptions = {
        title: 'Test API',
        version: '1.0',
        includeSecurity: false,
      };

      const spec = generator.generate(controllers, options);

      expect(spec.components?.securitySchemes).toBeUndefined();
    });
  });

  describe('generate - route parameters', () => {
    it('should convert :param to {param} for path parameters', () => {
      const controllers: ControllerMetadata[] = [
        {
          name: 'AdminController',
          path: 'admin',
          filePath: 'src/api/v1/admin/admin.controller.ts',
          category: 'Admin',
          routes: [
            {
              name: 'getById',
              httpMethod: 'GET',
              path: ':id',
              fullPath: '/admin/:id',
              isPublic: false,
            } as RouteMetadata,
          ],
        },
      ];

      const options: AutoDocsOptions = {
        title: 'Test API',
        version: '1.0',
        globalPrefix: '/api/v1',
      };

      const spec = generator.generate(controllers, options);

      // Should convert :id to {id}
      expect(spec.paths).toHaveProperty('api/v1/admin/{id}');
    });

    it('should handle multiple path parameters', () => {
      const controllers: ControllerMetadata[] = [
        {
          name: 'AdminController',
          path: 'admin',
          filePath: 'src/api/v1/admin/admin.controller.ts',
          category: 'Admin',
          routes: [
            {
              name: 'getResource',
              httpMethod: 'GET',
              path: ':userId/resource/:resourceId',
              fullPath: '/admin/:userId/resource/:resourceId',
              isPublic: false,
            } as RouteMetadata,
          ],
        },
      ];

      const options: AutoDocsOptions = {
        title: 'Test API',
        version: '1.0',
        globalPrefix: '/api/v1',
      };

      const spec = generator.generate(controllers, options);

      // Should convert both parameters
      expect(spec.paths).toHaveProperty('api/v1/admin/{userId}/resource/{resourceId}');
    });
  });

  describe('baseServerURL configuration', () => {
    it('should use baseServerURL when no servers are generated', () => {
      const options: AutoDocsOptions = {
        title: 'Test API',
        version: '1.0.0',
        baseServerURL: 'https://api.example.com',
      };

      const spec = generator.generate([], options);

      expect(spec.servers).toHaveLength(1);
      expect(spec.servers[0]).toEqual({
        url: 'https://api.example.com',
        description: 'Base Server',
      });
    });

    it('should not override manually configured servers', () => {
      const options: AutoDocsOptions = {
        title: 'Test API',
        version: '1.0.0',
        baseServerURL: 'https://api.example.com',
        servers: [
          { url: 'https://custom.example.com', description: 'Custom' },
        ],
      };

      const spec = generator.generate([], options);

      expect(spec.servers).toHaveLength(1);
      expect(spec.servers[0].url).toBe('https://custom.example.com');
    });

    it('should provide helpful description when no baseServerURL', () => {
      const options: AutoDocsOptions = {
        title: 'Test API',
        version: '1.0.0',
      };

      const spec = generator.generate([], options);

      expect(spec.servers[0].description).toContain('editable');
    });

    it('should work with versioning enabled', () => {
      const controllers: ControllerMetadata[] = [
        {
          name: 'AdminController',
          path: 'admin',
          filePath: 'src/api/v1/admin/admin.controller.ts',
          category: 'Admin',
          version: 'v1',
          routes: [
            {
              name: 'getProfile',
              httpMethod: 'GET',
              path: 'profile',
              fullPath: '/admin/profile',
              isPublic: false,
            } as RouteMetadata,
          ],
        },
      ];

      const options: AutoDocsOptions = {
        title: 'Test API',
        version: '1.0.0',
        baseServerURL: 'https://api.example.com',
        versioning: {
          enabled: true,
          prefix: '/api',
        },
      };

      const spec = generator.generate(controllers, options);

      // Should generate versioned servers without baseServerURL prefix
      // (baseServerURL only applies when no servers are generated)
      expect(spec.servers).toHaveLength(1);
      expect(spec.servers[0].url).toBe('/api/v1');
    });

    it('should use baseServerURL when versioning is enabled but no versions detected', () => {
      const controllers: ControllerMetadata[] = [
        {
          name: 'HealthController',
          path: 'health',
          filePath: 'src/health/health.controller.ts',
          category: 'Health',
          routes: [
            {
              name: 'check',
              httpMethod: 'GET',
              path: '',
              fullPath: '/health',
              isPublic: true,
            } as RouteMetadata,
          ],
        },
      ];

      const options: AutoDocsOptions = {
        title: 'Test API',
        version: '1.0.0',
        baseServerURL: 'https://api.example.com',
        versioning: {
          enabled: true,
          prefix: '/api',
        },
      };

      const spec = generator.generate(controllers, options);

      // Should use baseServerURL as fallback
      expect(spec.servers).toHaveLength(1);
      expect(spec.servers[0].url).toBe('https://api.example.com');
    });
  });
});
