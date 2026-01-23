import { Controller, Get, Res, Inject } from '@nestjs/common';
import { Response } from 'express';
import { AutoDocsService } from '../module/auto-docs.service';
import { AutoDocsOptions } from '../interfaces/options.interface';

@Controller()
export class ScalarController {
  constructor(
    private readonly autoDocsService: AutoDocsService,
    @Inject('AUTO_DOCS_OPTIONS') private readonly options: AutoDocsOptions,
  ) {}

  /**
   * Serve Scalar UI HTML page
   */
  @Get('docs')
  getScalarUI(@Res() res: Response) {
    const specUrl = this.options.specPath || '/docs-json';
    const html = this.generateScalarHtml(specUrl);

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  /**
   * Serve OpenAPI specification JSON
   */
  @Get('docs-json')
  getOpenApiSpec(@Res() res: Response) {
    const spec = this.autoDocsService.getOpenApiSpec();
    res.setHeader('Content-Type', 'application/json');
    res.send(spec);
  }

  /**
   * Get documentation statistics
   */
  @Get('docs/stats')
  getStats() {
    return this.autoDocsService.getStats();
  }

  /**
   * Trigger manual rescan (development only)
   */
  @Get('docs/rescan')
  async rescan() {
    if (process.env.NODE_ENV === 'production') {
      return {
        error: 'Rescan is disabled in production',
      };
    }

    await this.autoDocsService.scan();

    return {
      message: 'Rescan completed',
      stats: this.autoDocsService.getStats(),
    };
  }

  /**
   * Generate Scalar HTML page
   */
  private generateScalarHtml(specUrl: string): string {
    const theme = this.options.theme || {};
    const primaryColor = theme.primaryColor || '#00f2ff';
    const darkMode = theme.darkMode !== false;

    return `
<!DOCTYPE html>
<html>
<head>
  <title>${this.options.title} - API Documentation</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html {
      height: 100%;
      overflow-y: auto;
    }

    body {
      margin: 0;
      padding: 0;
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
    }

    /* Custom scrollbar */
    ::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }

    ::-webkit-scrollbar-track {
      background: ${darkMode ? '#1a1a1a' : '#f1f1f1'};
    }

    ::-webkit-scrollbar-thumb {
      background: ${primaryColor};
      border-radius: 5px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: ${this.adjustColor(primaryColor, -20)};
    }

    /* Header gradient */
    .scalar-app {
      background: ${darkMode
        ? 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)'
        : 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)'};
    }

    /* Sidebar styling */
    .sidebar {
      border-right: 1px solid ${darkMode ? '#2a2a2a' : '#e0e0e0'} !important;
      background: ${darkMode ? 'rgba(15, 15, 15, 0.95)' : 'rgba(255, 255, 255, 0.95)'} !important;
      backdrop-filter: blur(10px);
    }

    /* Content area */
    .scalar-card {
      border-radius: 12px !important;
      box-shadow: 0 4px 20px rgba(0, 0, 0, ${darkMode ? '0.3' : '0.1'}) !important;
    }

    /* Accent color elements */
    .scalar-button--primary,
    .http-method {
      background: linear-gradient(135deg, ${primaryColor} 0%, ${this.adjustColor(primaryColor, -30)} 100%) !important;
      box-shadow: 0 2px 10px ${this.hexToRgba(primaryColor, 0.3)} !important;
    }

    /* Code blocks */
    pre, code {
      border-radius: 8px !important;
      background: ${darkMode ? '#0d1117' : '#f6f8fa'} !important;
    }

    /* Tags */
    .tag {
      border-radius: 6px !important;
      padding: 4px 12px !important;
      font-weight: 600 !important;
      letter-spacing: 0.5px !important;
    }
  </style>
</head>
<body>
  <script
    id="api-reference"
    data-url="${specUrl}"
  ></script>

  <script>
    // Custom server URL persistence
    const STORAGE_KEY = 'scalar-custom-server-url';
    const PERSIST_ENABLED = ${this.options.persistServerUrl !== false};

    // Try to load saved server URL from localStorage (if persistence is enabled)
    const savedServerUrl = PERSIST_ENABLED ? localStorage.getItem(STORAGE_KEY) : null;

    var configuration = {
      theme: '${darkMode ? 'dark' : 'light'}',
      layout: 'modern',
      showSidebar: true,
      hideModels: false,
      hideDownloadButton: false,
      darkMode: ${darkMode},
      ${this.options.baseServerURL ? `baseServerURL: '${this.escapeHtml(this.options.baseServerURL)}',` : ''}
      ${this.options.hideClientButton !== undefined ? `hideClientButton: ${this.options.hideClientButton},` : ''}
      customCss: \`
        .scalar-api-reference {
          --scalar-color-1: ${primaryColor};
          --scalar-color-accent: ${primaryColor};
          --scalar-border-radius: 12px;
          --scalar-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
          overflow-y: auto !important;
          height: 100vh !important;
        }

        .scalar-api-reference__container {
          overflow-y: auto !important;
          height: 100% !important;
        }

        .scalar-api-reference__content {
          overflow-y: auto !important;
        }

        /* Enhanced HTTP method badges */
        .http-method--get {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        }

        .http-method--post {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
        }

        .http-method--put {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
        }

        .http-method--patch {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
        }

        .http-method--delete {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
        }

        /* Sidebar enhancements */
        .sidebar-section {
          margin-bottom: 8px;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .sidebar-section:hover {
          background: ${darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
          transform: translateX(4px);
        }

        /* Endpoint cards */
        .endpoint-card {
          border-radius: 12px;
          border: 1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
          margin-bottom: 16px;
          transition: all 0.3s ease;
        }

        .endpoint-card:hover {
          border-color: ${primaryColor};
          box-shadow: 0 4px 20px ${this.hexToRgba(primaryColor, 0.2)};
          transform: translateY(-2px);
        }

        /* Response examples */
        .response-example {
          border-radius: 8px;
          overflow: hidden;
        }

        /* Search bar */
        .search-input {
          border-radius: 10px;
          border: 2px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
          transition: all 0.2s ease;
        }

        .search-input:focus {
          border-color: ${primaryColor};
          box-shadow: 0 0 0 3px ${this.hexToRgba(primaryColor, 0.1)};
        }

        /* Category headers */
        .category-header {
          font-weight: 700;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: ${primaryColor};
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 2px solid ${primaryColor};
        }

        /* Try it button */
        .try-it-button {
          background: linear-gradient(135deg, ${primaryColor} 0%, ${this.adjustColor(primaryColor, -30)} 100%);
          border: none;
          border-radius: 8px;
          padding: 10px 24px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 10px ${this.hexToRgba(primaryColor, 0.3)};
        }

        .try-it-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px ${this.hexToRgba(primaryColor, 0.4)};
        }

        /* Fix scrolling issues */
        .references-classic,
        .references-layout {
          overflow-y: auto !important;
        }

        main {
          overflow-y: auto !important;
        }
      \`,
    };

    // If we have a saved custom server URL, override the servers configuration
    if (savedServerUrl) {
      try {
        const savedUrl = JSON.parse(savedServerUrl);
        configuration.servers = [
          {
            url: savedUrl,
            description: 'Custom Server (saved)'
          }
        ];
      } catch (e) {
        // Invalid JSON, clear it
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    var apiReference = document.getElementById('api-reference');
    apiReference.dataset.configuration = JSON.stringify(configuration);
  </script>

  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@latest"></script>

  <script>
    // Listen for server changes and persist to localStorage (only if enabled)
    if (PERSIST_ENABLED) {
      window.addEventListener('load', function() {
        // Wait for Scalar to fully initialize
        setTimeout(function() {
        // Find the server dropdown/input in the Scalar UI
        const serverInputs = document.querySelectorAll('input[type="text"]');

        serverInputs.forEach(function(input) {
          // Check if this looks like a server URL input
          if (input.value && (input.value.startsWith('http') || input.value.startsWith('/'))) {
            // Listen for changes
            input.addEventListener('change', function(e) {
              const newServerUrl = e.target.value;
              if (newServerUrl) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(newServerUrl));
                console.log('Custom server URL saved:', newServerUrl);
              }
            });

            input.addEventListener('blur', function(e) {
              const newServerUrl = e.target.value;
              if (newServerUrl) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(newServerUrl));
                console.log('Custom server URL saved:', newServerUrl);
              }
            });
          }
        });

        // Also monitor for dynamically added server selectors
        const observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
              if (node.nodeType === 1) { // Element node
                const inputs = node.querySelectorAll ? node.querySelectorAll('input[type="text"]') : [];
                inputs.forEach(function(input) {
                  if (input.value && (input.value.startsWith('http') || input.value.startsWith('/'))) {
                    input.addEventListener('change', function(e) {
                      const newServerUrl = e.target.value;
                      if (newServerUrl) {
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(newServerUrl));
                        console.log('Custom server URL saved:', newServerUrl);
                      }
                    });
                  }
                });
              }
            });
          });
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        }, 1000); // Wait 1 second for Scalar to initialize
      });
    }

    // Helper function to clear saved server URL (available in browser console)
    window.clearCustomServer = function() {
      if (PERSIST_ENABLED) {
        localStorage.removeItem(STORAGE_KEY);
        console.log('Custom server URL cleared. Refresh the page to see default servers.');
        location.reload();
      } else {
        console.log('Server URL persistence is disabled in configuration.');
      }
    };
  </script>
</body>
</html>
    `.trim();
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Adjust color brightness
   */
  private adjustColor(color: string, amount: number): string {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Convert hex color to rgba
   */
  private hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
