export function getStorage<T>(storage: Storage, key: string): T | null {
  try {
    const item = storage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error getting item from storage for key "${key}":`, error);
    return null;
  }
}

export function setStorage<T>(storage: Storage, key: string, value: T): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting item to storage for key "${key}":`, error);
  }
}
