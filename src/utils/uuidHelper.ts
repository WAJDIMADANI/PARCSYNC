export const uuidOrNull = (value: string | null | undefined): string | null => {
  if (!value || value.trim() === '') {
    return null;
  }
  return value;
};

export const sanitizeUuidFields = <T extends Record<string, any>>(
  data: T,
  uuidFields: (keyof T)[]
): T => {
  const sanitized = { ...data };

  uuidFields.forEach(field => {
    if (field in sanitized) {
      sanitized[field] = uuidOrNull(sanitized[field] as string) as any;
    }
  });

  return sanitized;
};
