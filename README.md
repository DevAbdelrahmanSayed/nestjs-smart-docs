# nestjs-smart-docs

> Automatic API documentation generator for NestJS applications with zero configuration required.

[![npm version](https://img.shields.io/npm/v/nestjs-smart-docs.svg)](https://www.npmjs.com/package/nestjs-smart-docs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why This Package?

Stop wasting time writing decorators for every endpoint. This package automatically scans your NestJS controllers using TypeScript AST parsing and generates beautiful, interactive API documentation with zero configuration.

**Perfect for:**
- Large codebases with many controllers
- Teams who want to focus on building features, not writing docs
- Projects that need versioned APIs (v1, v2, v3)
- Anyone tired of maintaining decorator-heavy code

## Features

- **🔍 Zero Configuration** - Just install and it works
- **📦 Automatic Scanning** - Detects all controllers, routes, DTOs, and validation rules
- **🎨 Beautiful UI** - Modern Scalar interface with dark mode
- **🌐 Multi-Version Support** - Auto-detects v1, v2, v3 from your file structure
- **🏷️ Smart Categorization** - Organizes endpoints by module hierarchy
- **✅ Validation Integration** - Extracts class-validator rules automatically
- **🚀 TypeScript First** - Full type safety with no compromises

## Installation

```bash
npm install nestjs-smart-docs
```

## Quick Start

### 1. Add to Your App Module

```typescript
import { Module } from '@nestjs/common';
import { AutoDocsModule } from 'nestjs-smart-docs';

@Module({
  imports: [
    AutoDocsModule.forRoot({
      title: 'My API Documentation',
      version: '1.0.0',
      description: 'RESTful API for my awesome application',
      sourcePath: 'src',
      globalPrefix: '/api/v1',
    }),
  ],
})
export class AppModule {}
```

### 2. Start Your Application

```bash
npm run start:dev
```

### 3. View Your Documentation

- **Interactive UI**: http://localhost:3000/docs
- **OpenAPI JSON**: http://localhost:3000/docs-json

That's it! No decorators needed.

## How It Works

The package scans your codebase at startup and:

1. **Finds all controllers** using TypeScript AST parsing (ts-morph)
2. **Extracts routes** from `@Get()`, `@Post()`, `@Put()`, `@Patch()`, `@Delete()` decorators
3. **Analyzes DTOs** to understand request/response types
4. **Reads validation rules** from class-validator decorators
5. **Detects API versions** from your folder structure (e.g., `src/api/v1/`, `src/api/v2/`)
6. **Generates OpenAPI 3.0 spec** with all the information
7. **Serves beautiful Scalar UI** for interactive documentation

## Multi-Version API Support

If you have versioned APIs, the package automatically detects them:

```
src/
├── api/
│   ├── v1/
│   │   ├── users/
│   │   │   └── users.controller.ts  → /api/v1/users
│   │   └── posts/
│   │       └── posts.controller.ts  → /api/v1/posts
│   └── v2/
│       ├── users/
│       │   └── users.controller.ts  → /api/v2/users
│       └── posts/
│           └── posts.controller.ts  → /api/v2/posts
```

Enable versioning in your configuration:

```typescript
AutoDocsModule.forRoot({
  title: 'My API',
  version: '2.0.0',
  versioning: {
    enabled: true,
    prefix: '/api',
    fallback: '/api/v1', // For controllers without version
  },
})
```

The documentation will include separate server URLs for each version:
- `/api/v1` - API Version 1
- `/api/v2` - API Version 2

By default, relative paths are used. To add environment-specific URLs, use the `servers` option (see "Configuring Server URLs" below).

## Configuring Server URLs

By default, the package generates relative server URLs (e.g., `/api/v1`). To add your own server URLs for different environments:

### Single Environment

```typescript
AutoDocsModule.forRoot({
  title: 'My API',
  version: '1.0.0',
  globalPrefix: '/api/v1',
  servers: [
    {
      url: 'https://api.example.com/api/v1',
      description: 'Production Server',
    },
  ],
})
```

### Multiple Environments

```typescript
AutoDocsModule.forRoot({
  title: 'My API',
  version: '1.0.0',
  globalPrefix: '/api/v1',
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local Development',
    },
    {
      url: 'https://staging-api.example.com',
      description: 'Staging Environment',
    },
    {
      url: 'https://api.example.com',
      description: 'Production Server',
    },
  ],
})
```

### With Versioning Enabled

When versioning is enabled, you can specify servers for each version:

```typescript
AutoDocsModule.forRoot({
  title: 'My API',
  version: '2.0.0',
  versioning: {
    enabled: true,
    prefix: '/api',
  },
  servers: [
    {
      url: 'http://localhost:3000/api/v1',
      description: 'Local - API V1',
    },
    {
      url: 'http://localhost:3000/api/v2',
      description: 'Local - API V2',
    },
    {
      url: 'https://api.example.com/api/v1',
      description: 'Production - API V1',
    },
    {
      url: 'https://api.example.com/api/v2',
      description: 'Production - API V2',
    },
  ],
})
```

**Note:** When you provide the `servers` option, it overrides the auto-generated servers. If you don't provide it, the package will automatically generate relative URLs based on your `globalPrefix` or `versioning` configuration.

## Configuration Options

```typescript
interface AutoDocsOptions {
  // Required
  title: string;                    // API title
  version: string;                  // API version

  // Optional
  description?: string;             // API description
  contact?: {                       // Contact information
    name?: string;
    email?: string;
    url?: string;
  };
  sourcePath?: string;              // Source code path (default: 'src')
  globalPrefix?: string;            // API prefix (e.g., '/api/v1')
  docsPath?: string;                // Docs UI path (default: '/docs')
  specPath?: string;                // OpenAPI spec path (default: '/docs-json')

  // Versioning
  versioning?: {
    enabled: boolean;               // Enable auto-version detection
    prefix?: string;                // Version prefix (default: '/api')
    fallback?: string;              // Fallback for non-versioned controllers
  };

  // Servers
  servers?: Array<{
    url: string;
    description: string;
  }>;

  // UI Theme
  theme?: {
    primaryColor?: string;          // Primary color (default: '#00f2ff')
    darkMode?: boolean;             // Enable dark mode (default: true)
    logo?: string;                  // Logo URL
  };

  // Advanced
  categoryMapping?: Record<string, string>;  // Custom category names
  exclude?: string[];                        // Paths to exclude from scanning
  includeSecurity?: boolean;                 // Include JWT auth (default: true)
}
```

## Examples

### Basic Setup

```typescript
AutoDocsModule.forRoot({
  title: 'CRM API',
  version: '1.0.0',
  globalPrefix: '/api/v1',
})
```

### With Contact Information

```typescript
AutoDocsModule.forRoot({
  title: 'My API',
  version: '1.0.0',
  description: 'RESTful API for my application',
  contact: {
    name: 'API Support Team',
    email: 'support@example.com',
    url: 'https://example.com/support',
  },
})
```

### With Custom Theme

```typescript
AutoDocsModule.forRoot({
  title: 'My API',
  version: '1.0.0',
  theme: {
    primaryColor: '#3b82f6',
    darkMode: true,
    logo: 'https://example.com/logo.png',
  },
})
```

### With Custom Categories

```typescript
AutoDocsModule.forRoot({
  title: 'My API',
  version: '1.0.0',
  categoryMapping: {
    'admin': 'Administration',
    'admin/auth': 'Admin Authentication',
    'messaging': 'Messaging Platform',
    'object': 'CRM Objects',
  },
})
```

## How Categories Work

The package automatically creates categories based on your folder structure:

```
src/api/v1/admin/admin.controller.ts          → Category: "Admin"
src/api/v1/admin/auth/auth.controller.ts      → Category: "Admin - Auth"
src/api/v1/messaging/messages.controller.ts   → Category: "Messaging"
src/api/v1/object/field/field.controller.ts   → Category: "Object - Field"
```

You can override these with `categoryMapping` if needed.

## Validation Integration

The package automatically extracts validation rules from class-validator:

```typescript
class CreateUserDto {
  @IsEmail()
  email: string;  // → Detected as 'email' format in OpenAPI

  @IsString()
  @MinLength(8)
  @MaxLength(50)
  password: string;  // → Detected as string with min/max length

  @IsOptional()
  @IsInt()
  @Min(18)
  age?: number;  // → Detected as optional integer with minimum
}
```

This information appears in the generated documentation automatically.

## Comparison with Other Tools

| Feature | nestjs-smart-docs | @nestjs/swagger | nest-scramble |
|---------|---------------------------|-----------------|---------------|
| Zero decorators | ✅ | ❌ | ✅ |
| Auto-categorization | ✅ | ❌ | ❌ |
| Multi-version support | ✅ | ⚠️ Manual | ❌ |
| Modern UI (Scalar) | ✅ | ❌ (SwaggerUI) | ❌ |
| Class-validator integration | ✅ | ⚠️ Manual | ❌ |
| Maintained | ✅ | ✅ | ❌ (abandoned) |
| Setup time | < 5 min | > 30 min | < 5 min |

## Requirements

- **NestJS**: 10.x or 11.x
- **TypeScript**: 5.0+
- **Node.js**: 18+

## FAQ

### Do I need to add decorators to my controllers?

No! Just use the standard NestJS decorators you already have (`@Controller()`, `@Get()`, etc.). The package does the rest.

### Can I customize the documentation for specific endpoints?

Yes, you can add JSDoc comments to your controller methods:

```typescript
/**
 * Get user profile
 *
 * Retrieves the authenticated user's profile information including
 * email, name, and workspace details.
 */
@Get('profile')
async getProfile() {
  // ...
}
```

The package will extract this description automatically.

### Does it work with monorepos?

Yes! Just set the `sourcePath` to your application's source directory:

```typescript
AutoDocsModule.forRoot({
  title: 'My API',
  version: '1.0.0',
  sourcePath: 'apps/api/src',
})
```

### How do I exclude certain controllers?

Use the `exclude` option:

```typescript
AutoDocsModule.forRoot({
  title: 'My API',
  version: '1.0.0',
  exclude: ['**/internal/**', '**/test/**'],
})
```

### Does it affect application performance?

The scanning happens once at startup. There's no runtime overhead for your API requests.

## Troubleshooting

### Documentation doesn't show any endpoints

Make sure:
- Your `sourcePath` points to the correct directory
- Your controllers use standard NestJS decorators
- The application has read access to the source files

### Categories are not showing correctly

Try using `categoryMapping` to customize category names:

```typescript
AutoDocsModule.forRoot({
  title: 'My API',
  version: '1.0.0',
  categoryMapping: {
    'your-folder-name': 'Your Custom Category Name',
  },
})
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT © [Abdelrahman Sayed](https://github.com/DevAbdelrahmanSayed)

## Author

**Abdelrahman Sayed**
- Email: devabdelr2hman@gmail.com
- GitHub: [@DevAbdelrahmanSayed](https://github.com/DevAbdelrahmanSayed)

## Support

- 🐛 Issues: [GitHub Issues](https://github.com/DevAbdelrahmanSayed/nestjs-auto-docs/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/DevAbdelrahmanSayed/nestjs-auto-docs/discussions)

## Built With

- [ts-morph](https://github.com/dsherret/ts-morph) - TypeScript compiler API wrapper
- [Scalar](https://github.com/scalar/scalar) - Beautiful API documentation UI
- [NestJS](https://nestjs.com/) - Progressive Node.js framework

---

Made with ❤️ by [Abdelrahman Sayed](https://github.com/DevAbdelrahmanSayed)
