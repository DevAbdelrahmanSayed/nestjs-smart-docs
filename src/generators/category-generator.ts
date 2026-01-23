import { Injectable } from '@nestjs/common';
import { ControllerMetadata } from '../interfaces';
import { AutoDocsOptions } from '../interfaces/options.interface';

@Injectable()
export class CategoryGenerator {
  /**
   * Apply category mapping from configuration
   */
  applyCategoryMapping(
    controllers: ControllerMetadata[],
    categoryMapping?: Record<string, string>,
  ): ControllerMetadata[] {
    if (!categoryMapping) {
      return controllers;
    }

    return controllers.map(controller => {
      const mappedCategory = this.findMappedCategory(controller.category, categoryMapping);

      return {
        ...controller,
        category: mappedCategory || controller.category,
      };
    });
  }

  /**
   * Find mapped category from configuration
   * Supports exact match and partial match
   */
  private findMappedCategory(
    category: string,
    mapping: Record<string, string>,
  ): string | undefined {
    // Exact match
    if (mapping[category]) {
      return mapping[category];
    }

    // Normalize category for comparison (lowercase, no spaces/dashes)
    const normalizedCategory = category.toLowerCase().replace(/[\s-]+/g, '');

    // Check for normalized match
    for (const [key, value] of Object.entries(mapping)) {
      const normalizedKey = key.toLowerCase().replace(/[\s-]+/g, '');

      if (normalizedCategory === normalizedKey) {
        return value;
      }

      // Partial match (e.g., "Admin - Auth" matches "admin")
      if (normalizedCategory.startsWith(normalizedKey)) {
        return value;
      }
    }

    return undefined;
  }

  /**
   * Get all unique categories from controllers
   */
  getCategories(controllers: ControllerMetadata[]): string[] {
    const categories = new Set<string>();

    for (const controller of controllers) {
      if (controller.category) {
        categories.add(controller.category);
      }
    }

    return Array.from(categories).sort();
  }

  /**
   * Group controllers by category
   */
  groupByCategory(controllers: ControllerMetadata[]): Record<string, ControllerMetadata[]> {
    const grouped: Record<string, ControllerMetadata[]> = {};

    for (const controller of controllers) {
      const category = controller.category || 'Uncategorized';

      if (!grouped[category]) {
        grouped[category] = [];
      }

      grouped[category].push(controller);
    }

    return grouped;
  }
}
