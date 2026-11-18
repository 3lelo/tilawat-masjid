/**
 * Arabic Text Normalization Utility
 * Matches the SQL stored function `normalize_arabic` identically:
 * 1. Removes tashkeel (diacritics: fatha, damma, kasra, tanwin, shadda, sukun, dagger alif) and tatweel (ـ)
 * 2. Normalizes alef variants (أ, إ, آ, ٱ -> ا)
 * 3. ى -> ي
 * 4. ة -> ه
 * 5. ؤ -> و
 * 6. ئ -> ي
 * 7. Converts Eastern Arabic-Indic digits (٠-٩) and Persian digits (۰-۹) to Western digits (0-9)
 * 8. Converts Latin characters to lowercase
 * 9. Collapses multiple whitespace characters and trims
 */
export function normalizeArabic(input: string | null | undefined): string {
  if (!input) return '';

  let text = input;

  // 1. Remove Tashkeel (diacritics: \u064B - \u065F, \u0670) and Tatweel (\u0640)
  text = text.replace(/[\u064B-\u065F\u0670\u0640]/g, '');

  // 2. Convert Eastern Arabic-Indic and Persian digits to Western digits
  const easternDigits: { [key: string]: string } = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  };
  text = text.replace(/[٠-٩۰-۹]/g, (digit) => easternDigits[digit] || digit);

  // 3. Normalize Alef variants (أ, إ, آ, ٱ) -> ا
  text = text.replace(/[أإآٱ]/g, 'ا');

  // 4. ى -> ي
  text = text.replace(/ى/g, 'ي');

  // 5. ة -> ه
  text = text.replace(/ة/g, 'ه');

  // 6. ؤ -> و
  text = text.replace(/ؤ/g, 'و');

  // 7. ئ -> ي
  text = text.replace(/ئ/g, 'ي');

  // 8. Lowercase Latin characters
  text = text.toLowerCase();

  // 9. Collapse multiple spaces and trim
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}
