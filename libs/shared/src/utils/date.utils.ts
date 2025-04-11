export const formatDate = (date: Date): string => {
  return date.toISOString();
};

export const getCurrentTimestamp = (): number => {
  return Date.now();
}; 