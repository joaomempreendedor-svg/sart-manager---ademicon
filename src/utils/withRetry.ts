export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) {
        console.error("Operation failed after all retries.", error);
        throw error;
      }
      
      console.warn(`Attempt ${i + 1} failed. Retrying in ${delay * (i + 1)}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  // This line should be unreachable but is required for TypeScript
  throw new Error('All retry attempts failed');
};