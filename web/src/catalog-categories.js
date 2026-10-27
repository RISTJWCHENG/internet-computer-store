export function normalizeCategories(categories, allowedCategories) {
  const result = Array.isArray(categories)
    ? categories.filter(category => category === 'Caffeine Apps' || allowedCategories.includes(category))
    : [];
  return result.length ? result : ['Other'];
}
