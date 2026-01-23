export interface AutoDocsOptions {
  /**
   * API title shown in documentation
   */
  title: string;

  /**
   * API version
   */
  version: string;

  /**
   * API description (optional)
   */
  description?: string;

  /**
   * Contact information for API support (optional)
   */
  contact?: {
    name?: string;
    email?: string;
    url?: string;
  };

  /**
   * Source directory to scan for controllers
   * @default 'src'
   */
  sourcePath?: string;

  /**
   * Global API prefix (e.g., '/api/v1')
   * Will be prepended to all paths in OpenAPI spec
   */
  globalPrefix?: string;

  /**
   * Path where documentation UI will be served
   * @default '/docs'
   */
  docsPath?: string;

  /**
   * Path where OpenAPI JSON spec will be served
   * @default '/docs-json'
   */
  specPath?: string;

  /**
   * API server configurations
   */
  servers?: ServerConfig[];

  /**
   * Theme customization options
   */
  theme?: ThemeConfig;

  /**
   * Custom category mapping for module-based categorization
   * Key: module path (e.g., 'admin/auth')
   * Value: display name (e.g., 'Admin Authentication')
   */
  categoryMapping?: Record<string, string>;

  /**
   * Scan controllers on module initialization
   * @default true
   */
  scanOnStart?: boolean;

  /**
   * Re-scan on file changes (development mode only)
   * @default false
   */
  watchMode?: boolean;

  /**
   * Paths to exclude from scanning (glob patterns)
   */
  exclude?: string[];

  /**
   * Include security scheme in OpenAPI spec
   * @default true
   */
  includeSecurity?: boolean;

  /**
   * Custom security scheme configuration
   */
  securityScheme?: SecuritySchemeConfig;

  /**
   * API versioning configuration
   * Enables automatic version detection from file paths
   */
  versioning?: VersioningConfig;

  /**
   * Base URL to prefix all relative server URLs
   * Useful for testing against different domains
   * Example: 'https://api.example.com' will convert '/api/v1' to 'https://api.example.com/api/v1'
   * @default undefined
   */
  baseServerURL?: string;

  /**
   * Hide the API client button in Scalar UI
   * Set to true if you want to disable the "Try it" functionality
   * @default false
   */
  hideClientButton?: boolean;

  /**
   * Persist custom server URL in browser localStorage
   * When enabled, users' custom server selections are saved and restored on page refresh
   * @default true
   */
  persistServerUrl?: boolean;
}

export interface VersioningConfig {
  /**
   * Enable versioning support
   * @default false
   */
  enabled: boolean;

  /**
   * Versioning strategy
   * - 'path': Auto-detect from file path (e.g., src/api/v1/... → /api/v1/...)
   * - 'decorator': Use NestJS @Version() decorator (future feature)
   * @default 'path'
   */
  strategy?: 'path' | 'decorator';

  /**
   * Prefix to prepend before version (e.g., '/api')
   * Combined with detected version: /api + /v1 = /api/v1/...
   * @default '/api'
   */
  prefix?: string;

  /**
   * Fallback prefix when no version detected
   * Used for controllers without version in path
   */
  fallback?: string;
}

export interface ServerConfig {
  url: string;
  description?: string;
}

export interface ThemeConfig {
  /**
   * Primary color (hex format)
   * @default '#00f2ff'
   */
  primaryColor?: string;

  /**
   * Enable dark mode
   * @default true
   */
  darkMode?: boolean;

  /**
   * Custom logo URL
   */
  logo?: string;
}

export interface SecuritySchemeConfig {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  description?: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
}
