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

    /* Custom Server Section Styles (Integrated) */
    .custom-server-section {
      margin: 16px 0;
      padding: 16px;
      background: ${darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
      border-radius: 8px;
      border: 1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
    }

    .custom-server-section h4 {
      margin: 0 0 12px 0;
      font-size: 13px;
      font-weight: 600;
      color: ${darkMode ? '#e0e0e0' : '#333333'};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .custom-server-section .input-group {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }

    .custom-server-section input {
      flex: 1;
      padding: 10px 12px;
      border: 1px solid ${darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
      border-radius: 6px;
      font-size: 13px;
      background: ${darkMode ? '#2a2a2a' : '#ffffff'};
      color: ${darkMode ? '#ffffff' : '#333333'};
      font-family: 'Courier New', monospace;
      outline: none;
      transition: all 0.2s ease;
    }

    .custom-server-section input:focus {
      border-color: ${primaryColor};
      box-shadow: 0 0 0 2px ${this.hexToRgba(primaryColor, 0.1)};
    }

    .custom-server-section input::placeholder {
      color: ${darkMode ? '#666666' : '#999999'};
    }

    .custom-server-section button {
      padding: 10px 16px;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .custom-server-section button.primary {
      background: linear-gradient(135deg, ${primaryColor} 0%, ${this.adjustColor(primaryColor, -30)} 100%);
      color: #ffffff;
      box-shadow: 0 2px 6px ${this.hexToRgba(primaryColor, 0.3)};
    }

    .custom-server-section button.primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 3px 10px ${this.hexToRgba(primaryColor, 0.4)};
    }

    .custom-server-section button.secondary {
      background: ${darkMode ? '#2a2a2a' : '#f0f0f0'};
      color: ${darkMode ? '#ffffff' : '#333333'};
      border: 1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
    }

    .custom-server-section button.secondary:hover {
      background: ${darkMode ? '#333333' : '#e5e5e5'};
    }

    .custom-server-section .saved-url {
      font-size: 12px;
      color: ${primaryColor};
      font-family: 'Courier New', monospace;
      padding: 8px 12px;
      background: ${darkMode ? 'rgba(0, 242, 255, 0.1)' : 'rgba(0, 242, 255, 0.05)'};
      border-radius: 4px;
      margin-top: 8px;
      word-break: break-all;
      border: 1px dashed ${this.hexToRgba(primaryColor, 0.3)};
    }

    /* Custom Domain Panel Styles (FAB - Hidden) */
    #custom-domain-fab {
      display: none !important;
    }

    #old-custom-domain-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      background: linear-gradient(135deg, ${primaryColor} 0%, ${this.adjustColor(primaryColor, -30)} 100%);
      border-radius: 50%;
      cursor: pointer;
      z-index: 10000;
      box-shadow: 0 4px 16px ${this.hexToRgba(primaryColor, 0.4)};
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      border: 2px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
    }

    #custom-domain-fab:hover {
      transform: translateY(-2px) scale(1.05);
      box-shadow: 0 6px 24px ${this.hexToRgba(primaryColor, 0.5)};
    }

    #custom-domain-fab:active {
      transform: translateY(0) scale(0.98);
    }

    #panel-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      z-index: 9999;
      backdrop-filter: blur(4px);
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translate(-50%, -45%);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%);
      }
    }

    #custom-domain-panel {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: ${darkMode ? '#1e1e1e' : '#ffffff'};
      border-radius: 16px;
      padding: 0;
      width: 90%;
      max-width: 500px;
      z-index: 10000;
      box-shadow: 0 12px 48px rgba(0, 0, 0, ${darkMode ? '0.6' : '0.3'});
      border: 1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
      animation: slideIn 0.3s ease;
      overflow: hidden;
    }

    #custom-domain-panel .panel-header {
      background: linear-gradient(135deg, ${primaryColor} 0%, ${this.adjustColor(primaryColor, -30)} 100%);
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
    }

    #custom-domain-panel .panel-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #ffffff;
    }

    #custom-domain-panel .panel-header button {
      background: transparent;
      border: none;
      color: #ffffff;
      font-size: 28px;
      line-height: 1;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s ease;
    }

    #custom-domain-panel .panel-header button:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    #custom-domain-panel .panel-body {
      padding: 24px;
    }

    #custom-domain-panel .panel-body label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: ${darkMode ? '#e0e0e0' : '#333333'};
      margin-bottom: 8px;
      margin-top: 16px;
    }

    #custom-domain-panel .panel-body label:first-child {
      margin-top: 0;
    }

    #current-server {
      padding: 12px 16px;
      background: ${darkMode ? '#2a2a2a' : '#f5f5f5'};
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      color: ${primaryColor};
      border: 1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
      word-break: break-all;
    }

    #custom-url-input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid ${darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
      border-radius: 8px;
      font-size: 14px;
      background: ${darkMode ? '#2a2a2a' : '#ffffff'};
      color: ${darkMode ? '#ffffff' : '#333333'};
      font-family: 'Courier New', monospace;
      transition: all 0.2s ease;
      outline: none;
    }

    #custom-url-input:focus {
      border-color: ${primaryColor};
      box-shadow: 0 0 0 3px ${this.hexToRgba(primaryColor, 0.1)};
    }

    #custom-url-input::placeholder {
      color: ${darkMode ? '#666666' : '#999999'};
    }

    .panel-actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }

    .panel-actions button {
      flex: 1;
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      outline: none;
    }

    #save-custom-url {
      background: linear-gradient(135deg, ${primaryColor} 0%, ${this.adjustColor(primaryColor, -30)} 100%);
      color: #ffffff;
      box-shadow: 0 2px 8px ${this.hexToRgba(primaryColor, 0.3)};
    }

    #save-custom-url:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px ${this.hexToRgba(primaryColor, 0.4)};
    }

    #save-custom-url:active {
      transform: translateY(0);
    }

    #clear-custom-url {
      background: ${darkMode ? '#2a2a2a' : '#f5f5f5'};
      color: ${darkMode ? '#ffffff' : '#333333'};
      border: 1px solid ${darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
    }

    #clear-custom-url:hover {
      background: ${darkMode ? '#333333' : '#e0e0e0'};
    }
  </style>
</head>
<body>
  <!-- Custom Domain Floating Action Button -->
  <div id="custom-domain-fab" title="Custom Server URL">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  </div>

  <!-- Custom Domain Panel Overlay -->
  <div id="panel-overlay" style="display: none;"></div>

  <!-- Custom Domain Panel -->
  <div id="custom-domain-panel" style="display: none;">
    <div class="panel-header">
      <h3>Custom Server URL</h3>
      <button id="close-panel" title="Close">&times;</button>
    </div>
    <div class="panel-body">
      <label>Current Server:</label>
      <div id="current-server">Loading...</div>

      <label>Enter Custom Domain:</label>
      <input type="url" id="custom-url-input" placeholder="https://api.example.com" />

      <div class="panel-actions">
        <button id="save-custom-url">Save & Apply</button>
        <button id="clear-custom-url">Clear Saved URL</button>
      </div>
    </div>
  </div>

  <script
    id="api-reference"
  ></script>

  <script>
    // Custom server URL persistence
    const STORAGE_KEY = 'scalar-custom-server-url';
    const PERSIST_ENABLED = ${this.options.persistServerUrl !== false};

    // Try to load saved server URL from localStorage (if persistence is enabled)
    const savedServerUrl = PERSIST_ENABLED ? localStorage.getItem(STORAGE_KEY) : null;

    // Fetch and modify the spec to include custom server
    fetch('${specUrl}')
      .then(function(response) { return response.json(); })
      .then(function(spec) {
        // Add custom server URL if it exists
        if (savedServerUrl) {
          try {
            const customUrl = JSON.parse(savedServerUrl);
            const customServer = { url: customUrl, description: 'Custom Server (saved)' };

            // Ensure servers array exists
            if (!spec.servers) {
              spec.servers = [];
            }

            // Check if custom URL already exists
            const urlExists = spec.servers.some(function(server) {
              return server.url === customUrl;
            });

            // Add custom server at the beginning if it doesn't exist
            if (!urlExists) {
              spec.servers.unshift(customServer);
            }
          } catch (e) {
            console.error('Error parsing saved server URL:', e);
            localStorage.removeItem(STORAGE_KEY);
          }
        }

        // Initialize Scalar with the modified spec
        initializeScalar(spec);
      })
      .catch(function(error) {
        console.error('Failed to load OpenAPI spec:', error);
      });

    function initializeScalar(spec) {
      var configuration = {
        theme: '${darkMode ? 'dark' : 'light'}',
        layout: 'modern',
        showSidebar: true,
        hideModels: false,
        hideDownloadButton: false,
        darkMode: ${darkMode},
        spec: spec,
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

      var apiReference = document.getElementById('api-reference');
      apiReference.dataset.configuration = JSON.stringify(configuration);
    }
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

    // Custom Domain Panel Functionality
    (function initCustomDomainPanel() {
      const fab = document.getElementById('custom-domain-fab');
      const panel = document.getElementById('custom-domain-panel');
      const overlay = document.getElementById('panel-overlay');
      const closeBtn = document.getElementById('close-panel');
      const saveBtn = document.getElementById('save-custom-url');
      const clearBtn = document.getElementById('clear-custom-url');
      const urlInput = document.getElementById('custom-url-input');
      const currentServerDiv = document.getElementById('current-server');

      // Function to update current server display
      function updateCurrentServer() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            const url = JSON.parse(saved);
            currentServerDiv.textContent = url;
          } catch (e) {
            currentServerDiv.textContent = 'Default (from config)';
          }
        } else {
          currentServerDiv.textContent = 'Default (from config)';
        }
      }

      // Function to close panel
      function closePanel() {
        panel.style.display = 'none';
        overlay.style.display = 'none';
        urlInput.value = '';
      }

      // Function to open panel
      function openPanel() {
        panel.style.display = 'block';
        overlay.style.display = 'block';
        updateCurrentServer();
        urlInput.focus();
      }

      // Event listeners
      fab.addEventListener('click', openPanel);
      closeBtn.addEventListener('click', closePanel);
      overlay.addEventListener('click', closePanel);

      // Escape key to close
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && panel.style.display === 'block') {
          closePanel();
        }
      });

      // Save custom URL
      saveBtn.addEventListener('click', function() {
        const url = urlInput.value.trim();

        if (!url) {
          alert('Please enter a URL');
          return;
        }

        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          alert('Please enter a valid URL starting with http:// or https://');
          return;
        }

        // Save to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(url));
        console.log('Custom server URL saved:', url);

        // Reload page to apply
        location.reload();
      });

      // Clear saved URL
      clearBtn.addEventListener('click', function() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) {
          alert('No custom URL is currently saved');
          return;
        }

        if (confirm('Are you sure you want to clear the saved custom server URL?')) {
          localStorage.removeItem(STORAGE_KEY);
          console.log('Custom server URL cleared');
          location.reload();
        }
      });

      // Enter key in input to save
      urlInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          saveBtn.click();
        }
      });

      // Initialize current server display
      updateCurrentServer();

      // Hide the FAB - we'll inject UI into Scalar's server selector instead
      if (fab) fab.style.display = 'none';
    })();

    // Inject custom domain UI into Scalar's server selector area
    (function injectCustomDomainUI() {
      // Wait for Scalar to initialize
      setTimeout(function checkForScalarUI() {
        // Try to find Scalar's server selector
        const scalarContainer = document.querySelector('.scalar-api-reference, [data-proxy-url], .references-classic, .api-client__server');

        if (!scalarContainer) {
          // Retry if Scalar hasn't loaded yet
          setTimeout(checkForScalarUI, 500);
          return;
        }

        // Create custom domain section
        const customSection = document.createElement('div');
        customSection.className = 'custom-server-section';
        customSection.innerHTML = \`
          <h4>Custom Server</h4>
          <div class="input-group">
            <input type="url"
                   id="custom-server-input"
                   placeholder="https://your-api.com"
                   value="\${savedServerUrl ? JSON.parse(savedServerUrl) : ''}"
            />
            <button class="primary" id="apply-custom-server">Add</button>
            <button class="secondary" id="clear-custom-server">Clear</button>
          </div>
          \${savedServerUrl ? \`<div class="saved-url">✓ Using: \${JSON.parse(savedServerUrl)}</div>\` : ''}
        \`;

        // Try to find the best place to inject
        const serverSelector = scalarContainer.querySelector('select, [role="combobox"], .server-select');

        if (serverSelector && serverSelector.parentElement) {
          // Insert after the server selector
          serverSelector.parentElement.appendChild(customSection);
        } else {
          // Fallback: prepend to container
          scalarContainer.prepend(customSection);
        }

        // Event handlers
        document.getElementById('apply-custom-server').addEventListener('click', function() {
          const input = document.getElementById('custom-server-input');
          const url = input.value.trim();

          if (!url) {
            alert('Please enter a server URL');
            return;
          }

          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            alert('URL must start with http:// or https://');
            return;
          }

          localStorage.setItem(STORAGE_KEY, JSON.stringify(url));
          location.reload();
        });

        document.getElementById('clear-custom-server').addEventListener('click', function() {
          if (confirm('Clear custom server URL?')) {
            localStorage.removeItem(STORAGE_KEY);
            location.reload();
          }
        });

      }, 1000); // Initial delay to let Scalar load
    })();
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
