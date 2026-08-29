# nestjs-smart-docs

> Generates OpenAPI docs for a NestJS app by reading your TypeScript source, so you never write another `@ApiProperty`.

[![npm version](https://img.shields.io/npm/v/nestjs-smart-docs.svg)](https://www.npmjs.com/package/nestjs-smart-docs)
[![downloads](https://img.shields.io/npm/dm/nestjs-smart-docs.svg)](https://www.npmjs.com/package/nestjs-smart-docs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`@nestjs/swagger` builds its schemas from decorator metadata at runtime. TypeScript types
are erased by then, so it can't see that `email` is a `string` — which is why it needs an
`@ApiProperty()` on every field of every DTO before the documentation is worth reading.

This package doesn't run at that layer. It parses your source files with the TypeScript
compiler API (via [ts-morph](https://github.com/dsherret/ts-morph)), where the types are
still there, and reads your controllers, DTOs, and `class-validator` rules directly. You
add one module import and get an OpenAPI 3.0 spec and a [Scalar](https://scalar.com) UI
out of the code you already wrote.

---

## Why I built it

I was building the API for a CRM with a large versioned controller tree, and documenting
it with `@nestjs/swagger` meant repeating myself constantly — every DTO field already had
a TypeScript type and usually a `class-validator` decorator saying exactly what it was,
and then I had to write a third declaration in `@ApiProperty()` to tell Swagger the same
thing again. Doing that across every controller in the project is a lot of typing that
produces no behaviour and drifts out of date the moment someone edits a field.

The information was already in the codebase. It just wasn't being read. So I wrote
something that reads it, and later pulled it out of that project into its own package.

---

## Features

- **No decorators required.** Uses the `@Controller()`, `@Get()`, `@Post()` decorators you
  already have. Nothing to add, nothing to keep in sync.
- **Reads your DTOs properly.** TypeScript types, optionality, nested objects, unions, and
  inline object types all come through.
- **`class-validator` rules become schema constraints.** `@IsEmail()` becomes
  `format: email`; `@MinLength(8)` becomes `minLength: 8`.
- **Automatic categorization** from your folder hierarchy, with an override when the
  inferred name isn't what you want.
- **Multi-version APIs** detected from file paths — `src/api/v1/` and `src/api/v2/` become
  separate servers in the spec.
- **Scalar UI** with dark mode and theming, served alongside the raw OpenAPI JSON.
- **Test against any domain** from inside the UI, without changing code or redeploying.
- **JSDoc as the escape hatch** — a doc comment above a handler becomes its description.

---

## Installation

```bash
npm install nestjs-smart-docs
```

**Requirements:** NestJS 10 or 11 · TypeScript 5+ · Node 18+

---

## Quick start

```typescript
import { Module } from '@nestjs/common';
import { AutoDocsModule } from 'nestjs-smart-docs';

@Module({
  imports: [
    AutoDocsModule.forRoot({
      title: 'My API',
      version: '1.0.0',
      description: 'RESTful API for my application',
      sourcePath: 'src',
      globalPrefix: '/api/v1',
    }),
  ],
})
export class AppModule {}
```

Start the app and you have:

- **Interactive UI** — `http://localhost:3000/docs`
- **OpenAPI 3.0 JSON** — `http://localhost:3000/docs-json`

> **Important:** the scan globs `sourcePath/**/*.ts` and resolves a `tsconfig.json`, so
> **both must be present wherever the app runs** — including production. Deploy only a
> compiled `dist/` and you get an empty spec. Ship `src/` and `tsconfig.json` alongside it,
> or generate the spec at build time. See [Design decisions](#design-decisions).

---

## How it works

A four-stage pipeline, run once on `onModuleInit`:

```
  your source files
         │
         ▼
  ┌──────────────────────────────────────────────────────┐
  │ 1. SCAN            scanner/                          │
  │    ControllerScanner  find @Controller classes       │
  │    RouteScanner       @Get/@Post/@Put/@Patch/@Delete │
  │    DtoAnalyzer        resolve DTO types              │
  │    ValidatorExtractor read class-validator rules     │
  └────────────────────────┬─────────────────────────────┘
                           ▼
  ┌──────────────────────────────────────────────────────┐
  │ 2. METADATA        interfaces/                       │
  │    AST nodes → ControllerMetadata, RouteMetadata,    │
  │    DtoMetadata, PropertyMetadata, ValidatorMetadata  │
  └────────────────────────┬─────────────────────────────┘
                           ▼
  ┌──────────────────────────────────────────────────────┐
  │ 3. GENERATE        generators/                       │
  │    OpenApiGenerator   metadata → OpenAPI 3.0         │
  │    CategoryGenerator  folder tree → tags             │
  │    ExampleGenerator   schemas → example values       │
  └────────────────────────┬─────────────────────────────┘
                           ▼
  ┌──────────────────────────────────────────────────────┐
  │ 4. SERVE           ui/ScalarController               │
  │    GET /docs  →  Scalar UI                           │
  │    GET /docs-json  →  the raw spec                   │
  └──────────────────────────────────────────────────────┘
```

The spec is built once at startup and cached, so **there is no per-request overhead** on
your API. The cost is paid at boot.

---

## Multi-version APIs

Versions are inferred from where the controller lives:

```
src/
└── api/
    ├── v1/users/users.controller.ts   →  /api/v1/users
    └── v2/users/users.controller.ts   →  /api/v2/users
```

```typescript
AutoDocsModule.forRoot({
  title: 'My API',
  version: '2.0.0',
  versioning: {
    enabled: true,
    prefix: '/api',
    fallback: '/api/v1',   // controllers with no version in their path
  },
})
```

Each detected version becomes its own server entry in the spec.

---

## Categories

Categories come from the folder hierarchy:

```
src/api/v1/admin/admin.controller.ts          →  "Admin"
src/api/v1/admin/auth/auth.controller.ts      →  "Admin - Auth"
src/api/v1/messaging/messages.controller.ts   →  "Messaging"
```

Override any of them when the inferred name reads badly:

```typescript
AutoDocsModule.forRoot({
  title: 'My API',
  version: '1.0.0',
  categoryMapping: {
    admin: 'Administration',
    'admin/auth': 'Admin Authentication',
    object: 'CRM Objects',
  },
})
```

---

## Validation rules become schema constraints

```typescript
class CreateUserDto {
  @IsEmail()
  email: string;              // → type: string, format: email

  @IsString()
  @MinLength(8)
  @MaxLength(50)
  password: string;           // → type: string, minLength: 8, maxLength: 50

  @IsOptional()
  @IsInt()
  @Min(18)
  age?: number;               // → type: integer, minimum: 18, not in `required`
}
```

No `@ApiProperty` anywhere, and the constraints can't drift from the validation, because
they *are* the validation.

---

## Documenting an endpoint

A JSDoc comment above the handler becomes its summary and description:

```typescript
/**
 * Get user profile
 *
 * Retrieves the authenticated user's profile including email, name,
 * and workspace details.
 */
@Get('profile')
async getProfile() { /* ... */ }
```

---

## Configuration

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `string` | — | **Required.** API title |
| `version` | `string` | — | **Required.** API version |
| `description` | `string` | — | Shown under the title |
| `contact` | `{ name?, email?, url? }` | — | Support contact in the spec |
| `sourcePath` | `string` | `'src'` | Directory to scan. Must exist at runtime |
| `globalPrefix` | `string` | — | Prepended to every path, e.g. `/api/v1` |
| `docsPath` | `string` | `'/docs'` | Where the UI is served |
| `specPath` | `string` | `'/docs-json'` | Where the raw OpenAPI JSON is served |
| `versioning` | `VersioningConfig` | disabled | Path-based version detection |
| `servers` | `{ url, description }[]` | — | Explicit server list |
| `baseServerURL` | `string` | — | Makes relative server URLs absolute |
| `theme` | `{ primaryColor?, darkMode?, logo? }` | `#00f2ff`, dark | UI theming |
| `categoryMapping` | `Record<string, string>` | — | Override inferred category names |
| `exclude` | `string[]` | — | Glob patterns to skip while scanning |
| `includeSecurity` | `boolean` | `true` | Emit a security scheme |
| `securityScheme` | `SecuritySchemeConfig` | bearer JWT | Custom auth scheme |
| `scanOnStart` | `boolean` | `true` | Scan during `onModuleInit` |
| `watchMode` | `boolean` | `false` | Re-scan on file change (dev only) |
| `hideClientButton` | `boolean` | `false` | Hide Scalar's "Try it" button |
| `persistServerUrl` | `boolean` | `true` | Remember a custom server URL in `localStorage` |

### Async configuration

```typescript
AutoDocsModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    title: config.get('API_TITLE'),
    version: config.get('API_VERSION'),
    baseServerURL: config.get('PUBLIC_API_URL'),
  }),
})
```

---

## API

```typescript
import {
  AutoDocsModule, AutoDocsService,
  ControllerScanner, RouteScanner, DtoAnalyzer, ValidatorExtractor,
  OpenApiGenerator, CategoryGenerator, ExampleGenerator,
} from 'nestjs-smart-docs';
```

### `AutoDocsModule`

| Method | Returns | Description |
| --- | --- | --- |
| `forRoot(options)` | `DynamicModule` | Register with static options |
| `forRootAsync({ useFactory, inject })` | `DynamicModule` | Register with options resolved from DI |

### `AutoDocsService`

Exported by the module, so you can inject it and use the spec yourself — writing it to a
file at build time, diffing it in CI, or serving it from your own route.

| Method | Returns | Description |
| --- | --- | --- |
| `initialize()` | `Promise<void>` | Runs the scan (called for you on module init) |
| `scan()` | `Promise<void>` | Re-scan and rebuild the spec |
| `getOpenApiSpec()` | `OpenApiSpec` | The generated OpenAPI 3.0 document |
| `getControllers()` | `ControllerMetadata[]` | Raw scanned metadata |
| `getControllersByCategory()` | `Record<string, ControllerMetadata[]>` | Grouped by category |
| `getLastScanTime()` | `Date \| null` | When the spec was last built |
| `getStats()` | `object` | Counts of controllers, routes, and categories |

The scanners and generators are exported individually too, if you want to run part of the
pipeline outside NestJS.

---

## Design decisions

**Static AST analysis instead of runtime reflection.** This is the whole premise. Runtime
decorator metadata can't recover an erased TypeScript type, which is the reason
`@nestjs/swagger` needs `@ApiProperty` at all; reading the source with ts-morph means the
type information is still intact and nothing has to be restated. **Cost:** the package
needs your `.ts` files *and* a resolvable `tsconfig.json` wherever it runs — the scanner
globs `sourcePath/**/*.ts` and constructs a ts-morph `Project` from your tsconfig. A
deployment that ships only a compiled `dist/` scans nothing and produces an empty spec
unless you also ship the sources or generate the spec at build time. It also can't see anything assembled at runtime — dynamically
registered routes are invisible to it, by construction.

**Scalar instead of Swagger UI.** Better defaults, a usable dark mode, and a built-in API
client. **Cost:** one more dependency, and a UI your team may not recognise if they came
expecting Swagger.

**Categories inferred from folder structure.** Most NestJS projects already group
controllers by domain, so the directory tree is a free, always-current source of
organisation — no `@ApiTags` to maintain. **Cost:** it is opinionated about layout. A flat
folder of thirty controllers produces one enormous category, and the fix is
`categoryMapping`, which is exactly the manual configuration the package exists to avoid.

**Versioning detected from file paths.** `strategy: 'path'` reads `src/api/v1/…` and emits
one server per version. **Cost:** NestJS's own `@Version()` decorator is *not* supported —
`strategy: 'decorator'` is declared in the types and marked as future work. If your
versioning is decorator-based rather than folder-based, this package won't detect it, and
the option name promising otherwise is a fair thing to hold against it.

**Zero required decorators, JSDoc as the only escape hatch.** Types and validators carry
the schema; a doc comment carries the prose. **Cost:** less per-field control than
`@ApiProperty` gives you. There is no way to attach a bespoke example or description to an
individual DTO property — if you need that level of hand-tuning, this is the wrong tool
and `@nestjs/swagger` is the right one.

---

## How it compares to `@nestjs/swagger`

Not better, different — the trade is annotation effort against runtime independence.

| | nestjs-smart-docs | @nestjs/swagger |
| --- | --- | --- |
| Source of truth | your TypeScript source, read via AST | decorator metadata, read at runtime |
| Decorators to write | none | `@ApiProperty` per field for real schemas |
| Needs `src/` at runtime | **yes** | no |
| Sees dynamically-built routes | no | yes |
| Per-field examples and descriptions | no | yes |
| Categorization | folder hierarchy, automatic | `@ApiTags`, manual |
| Version detection | folder path, automatic | manual / `@Version()` |
| UI | Scalar | Swagger UI |

Pick this one if your DTOs are plain classes with `class-validator` decorators and you
want the docs to follow the code for free. Pick `@nestjs/swagger` if you need fine-grained
control over the emitted schema, or if you can't ship source to production.

---

## Testing strategy

```bash
npm test              # jest
npm run test:coverage
```

Tests sit next to the code they cover. The weight is on the scanner, because that is where
the risk is: `route-scanner.spec.ts` is the largest suite in the package, with
`controller-scanner`, `module-scanner`, `openapi-generator`, and `path-utils` alongside it,
plus an integration spec covering version detection end to end.

That split is deliberate. The scanners are the part that meets code this package has never
seen — every unusual DTO shape, inline type, union, or decorator arrangement in someone
else's project is an input, so they get fixture-driven tests. The Scalar controller is
mostly a template and is not unit-tested; the failure mode there is visual, and a test
asserting on markup would break on every UI tweak without catching anything real.

`prepublishOnly` runs the build and the full suite, so a failing test blocks publication.

---

## FAQ

**Do I need to add decorators to my controllers?**
No. Standard NestJS decorators are all it reads.

**Does it slow down my API?**
No. Scanning happens once at startup and the spec is cached; there is no per-request cost.
Startup takes slightly longer, proportional to how much source there is to parse.

**Does it work in a monorepo?**
Yes — point `sourcePath` at the app: `sourcePath: 'apps/api/src'`.

**How do I exclude controllers?**
`exclude: ['**/internal/**', '**/test/**']`

**Will it work if I only deploy `dist/`?**
Not as-is — the scanner needs the `.ts` files and a `tsconfig.json`. Either ship those
alongside `dist/`, or call `autoDocsService.getOpenApiSpec()` at build time, write the
result to a JSON file, and serve that.

---

## Troubleshooting

**No endpoints appear.** Usually `sourcePath` — check it points at the directory that
actually contains your controllers, relative to the process working directory, and that
those files are present at runtime.

**Categories read badly.** Override them with `categoryMapping`.

**Paths are missing a prefix.** Set `globalPrefix`, or enable `versioning` if your prefix
is a version segment.

---

## Status

Published and working. `v1.2.1` is current, released January 2026, with roughly 1,500
downloads to date and around 300 a month. No issues are open.

This is a small package maintained in spare time — it does what the README describes and
gets attention when something breaks. Bug reports and pull requests are welcome; treat
feature requests as "maybe, eventually" rather than a roadmap.

---

## Contributing

1. Fork and branch (`git checkout -b feature/thing`)
2. Add tests — scanner changes especially need a fixture
3. `npm test && npm run lint`
4. Open a PR describing what changed and why

---

## Built with

- [ts-morph](https://github.com/dsherret/ts-morph) — TypeScript compiler API wrapper
- [Scalar](https://github.com/scalar/scalar) — the documentation UI
- [NestJS](https://nestjs.com/)

## License

MIT © [Abdelrahman Sayed](https://github.com/DevAbdelrahmanSayed)

- **Issues:** [github.com/DevAbdelrahmanSayed/nestjs-smart-docs/issues](https://github.com/DevAbdelrahmanSayed/nestjs-smart-docs/issues)
- **npm:** [nestjs-smart-docs](https://www.npmjs.com/package/nestjs-smart-docs)
