export const addDays = (value: Date | string, days: number): Date => {
  const date = new Date(value);
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
};

export const formatDayMonth = (value: Date | string): string =>
  new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
  });

export const isOnOrAfter = (left: Date | string, right: Date | string): boolean =>
  new Date(left).getTime() >= new Date(right).getTime();
