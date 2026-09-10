// AppGenerator — removed.
// All application generation is now handled dynamically by GeminiProvider.
// Prompts like "Build me a restaurant app" are sent to Gemini which returns
// real, custom AIOperation arrays tailored to the user's specific request.
//
// This file is kept as an empty stub to avoid breaking any legacy imports.

export class AppGenerator {
  /** @deprecated Use GeminiProvider — real AI generation replaces all hardcoded templates. */
  public static generateRestaurantApp(): never {
    throw new Error(
      '[AppGenerator] Hardcoded templates have been removed. Use GeminiProvider for real AI generation.'
    );
  }

  /** @deprecated Use GeminiProvider — real AI generation replaces all hardcoded templates. */
  public static generateCrmApp(): never {
    throw new Error(
      '[AppGenerator] Hardcoded templates have been removed. Use GeminiProvider for real AI generation.'
    );
  }
}
